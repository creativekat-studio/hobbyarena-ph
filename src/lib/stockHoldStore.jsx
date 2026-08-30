import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { checkoutHoldDurationMs, DEFAULT_CHECKOUT_HOLD_MINUTES } from "../data/checkoutSettings.js";
import { useCms } from "./cmsContent.jsx";
import { useFirebaseData } from "./firebase/config.js";
import {
  deleteStockHolds,
  putStockHolds,
  subscribeStockHolds,
} from "./firebase/repositories/stockHolds.js";

/**
 * Stock-hold (reservation) store — sealed stock and capped pre-order slots.
 *
 * When a shopper reaches the "add proof of payment" step of checkout, we place a
 * short-lived hold on the quantity they are buying. The hold reserves that stock
 * for HOLD_DURATION_MS (default 20 minutes) so a second shopper racing for the same units
 * sees them as unavailable. When the shopper completes checkout, create-order
 * commits (decrements) product stock server-side — units stay unavailable for
 * Pending Verification and every later success status (Fully Paid, Ready for
 * Pickup, Fulfilled, …). Stock returns only if the line is cancelled
 * (Unpaid / Rejected). The checkout hold is released after commit because
 * product stock already reflects the sale. If they abandon or time out, the
 * hold expires and units return for everyone.
 *
 * In pre-prod / prod (Firebase enabled) holds live in a Firestore `stockHolds`
 * collection so races resolve across devices in real time. Expiry is enforced by
 * clients ignoring past-due holds and opportunistically deleting them (a scheduled
 * Cloud Function can take over cleanup later). When Firebase is not configured
 * (local dev) we fall back to a localStorage mirror that syncs across tabs.
 */

const STORAGE_KEY = "hobbyarena:stock-holds";
const SESSION_KEY = "hobbyarena:hold-session";

export const HOLD_DURATION_MS = DEFAULT_CHECKOUT_HOLD_MINUTES * 60 * 1000;

function nowMs() {
  return Date.now();
}

function getSessionId() {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `sess-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function loadHolds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHolds(holds) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holds));
  } catch {
    // ignore quota / serialization errors
  }
}

function pruneExpired(holds, ts) {
  return holds.filter((hold) => hold.expiresAt > ts);
}

const StockHoldContext = createContext(null);

export function StockHoldProvider({ children }) {
  const { content } = useCms();
  const holdDurationMs = checkoutHoldDurationMs(content.storefront);
  const firebaseEnabled = useFirebaseData();
  const sessionId = useMemo(getSessionId, []);
  const [holds, setHolds] = useState(() => (firebaseEnabled ? [] : pruneExpired(loadHolds(), nowMs())));
  const holdsRef = useRef(holds);
  holdsRef.current = holds;

  // --- Firestore mode: subscribe to the shared holds collection ---
  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    const unsubscribe = subscribeStockHolds(
      (remote) => {
        const ts = nowMs();
        setHolds(pruneExpired(remote, ts));
        const expiredIds = remote.filter((hold) => hold.expiresAt <= ts).map((hold) => hold.id);
        if (expiredIds.length) {
          deleteStockHolds(expiredIds).catch(() => {});
        }
      },
      (error) => console.error("[stock-holds] sync failed:", error),
    );
    return unsubscribe;
  }, [firebaseEnabled]);

  // --- Local mode: persist + sync across tabs via localStorage ---
  const commitLocal = useCallback((updater) => {
    setHolds((prev) => {
      const raw = typeof updater === "function" ? updater(prev) : updater;
      const next = pruneExpired(raw, nowMs());
      saveHolds(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (firebaseEnabled || typeof window === "undefined") return undefined;
    const onStorage = (event) => {
      if (event.key && event.key !== STORAGE_KEY) return;
      setHolds(pruneExpired(loadHolds(), nowMs()));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [firebaseEnabled]);

  // --- Both modes: prune expired holds locally so countdowns/availability update ---
  useEffect(() => {
    const timer = window.setInterval(() => {
      setHolds((prev) => {
        const next = pruneExpired(prev, nowMs());
        if (next.length === prev.length) return prev;
        if (!firebaseEnabled) saveHolds(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [firebaseEnabled]);

  const heldByOthers = useCallback(
    (productId) => {
      const ts = nowMs();
      return holds
        .filter((hold) => hold.productId === productId && hold.sessionId !== sessionId && hold.expiresAt > ts)
        .reduce((sum, hold) => sum + (hold.quantity || 0), 0);
    },
    [holds, sessionId],
  );

  /** Available for the CURRENT shopper = base stock minus what OTHER shoppers hold. */
  const availableStock = useCallback(
    (productId, baseStock) => Math.max(0, (baseStock ?? 0) - heldByOthers(productId)),
    [heldByOthers],
  );

  const sessionHolds = useMemo(
    () => holds.filter((hold) => hold.sessionId === sessionId && hold.expiresAt > nowMs()),
    [holds, sessionId],
  );

  /**
   * Attempt to reserve `lines` (each {productId, quantity, name}) for this session.
   * `getStock(productId)` returns the committed base stock. Returns
   * { ok, expiresAt, shortfalls } — ok=false means someone else is holding units.
   */
  const placeHolds = useCallback(
    (lines, getStock) => {
      const ts = nowMs();
      const expiresAt = ts + holdDurationMs;
      const current = pruneExpired(holdsRef.current, ts);
      const shortfalls = [];

      for (const line of lines) {
        const othersHeld = current
          .filter((hold) => hold.productId === line.productId && hold.sessionId !== sessionId)
          .reduce((sum, hold) => sum + (hold.quantity || 0), 0);
        const available = Math.max(0, (getStock(line.productId) ?? 0) - othersHeld);
        if (available < line.quantity) {
          shortfalls.push({ productId: line.productId, name: line.name, requested: line.quantity, available });
        }
      }

      if (shortfalls.length) return { ok: false, expiresAt: null, shortfalls };

      const productIds = new Set(lines.map((line) => line.productId));
      const withoutOwn = current.filter(
        (hold) => !(hold.sessionId === sessionId && productIds.has(hold.productId)),
      );
      // Deterministic id per session+product so re-placing overwrites the same doc.
      const fresh = lines.map((line) => ({
        id: `hold-${sessionId}-${line.productId}`,
        productId: line.productId,
        name: line.name ?? null,
        quantity: line.quantity,
        sessionId,
        createdAt: ts,
        expiresAt,
      }));

      if (firebaseEnabled) {
        const staleOwnIds = current
          .filter((hold) => hold.sessionId === sessionId && productIds.has(hold.productId))
          .map((hold) => hold.id)
          .filter((id) => !fresh.some((entry) => entry.id === id));
        if (staleOwnIds.length) deleteStockHolds(staleOwnIds).catch(() => {});
        putStockHolds(fresh).catch((error) => console.error("[stock-holds] write failed:", error));
        setHolds([...withoutOwn, ...fresh]); // optimistic; snapshot will confirm
      } else {
        commitLocal([...withoutOwn, ...fresh]);
      }
      return { ok: true, expiresAt, shortfalls: [] };
    },
    [commitLocal, firebaseEnabled, holdDurationMs, sessionId],
  );

  const releaseSessionHolds = useCallback(
    (productIds = null) => {
      const own = holdsRef.current.filter((hold) => {
        if (hold.sessionId !== sessionId) return false;
        if (productIds && !productIds.includes(hold.productId)) return false;
        return true;
      });
      const ids = own.map((hold) => hold.id);
      if (!ids.length) return;

      if (firebaseEnabled) {
        deleteStockHolds(ids).catch(() => {});
        setHolds((prev) => prev.filter((hold) => !ids.includes(hold.id)));
      } else {
        commitLocal((prev) => prev.filter((hold) => !ids.includes(hold.id)));
      }
    },
    [commitLocal, firebaseEnabled, sessionId],
  );

  const value = useMemo(
    () => ({
      sessionId,
      holds,
      sessionHolds,
      heldByOthers,
      availableStock,
      placeHolds,
      releaseSessionHolds,
      holdDurationMs,
    }),
    [sessionId, holds, sessionHolds, heldByOthers, availableStock, placeHolds, releaseSessionHolds, holdDurationMs],
  );

  return <StockHoldContext.Provider value={value}>{children}</StockHoldContext.Provider>;
}

export function useStockHolds() {
  const context = useContext(StockHoldContext);
  if (!context) {
    throw new Error("useStockHolds must be used within a StockHoldProvider");
  }
  return context;
}
