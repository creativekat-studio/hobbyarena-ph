import { useSyncExternalStore } from "react";

export const CHECKOUT_CONFIRMATION_KEY = "hobbyarena:checkout-confirmation";

const listeners = new Set();
let cachedRaw = null;
let cachedSnapshot = null;

function invalidateCache() {
  cachedRaw = null;
  cachedSnapshot = null;
}

function emitChange() {
  invalidateCache();
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function parseConfirmation(raw) {
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed?.id) return null;
  return {
    id: String(parsed.id),
    total: Number(parsed.total) || 0,
    balanceDue: Number(parsed.balanceDue) || 0,
    email: parsed.email ? String(parsed.email) : "",
    userId: parsed.userId ? String(parsed.userId) : null,
  };
}

export function readCheckoutConfirmation() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_CONFIRMATION_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    cachedSnapshot = raw ? parseConfirmation(raw) : null;
    return cachedSnapshot;
  } catch {
    try {
      window.sessionStorage.removeItem(CHECKOUT_CONFIRMATION_KEY);
    } catch {
      // ignore quota / private mode
    }
    cachedRaw = null;
    cachedSnapshot = null;
    return null;
  }
}

export function writeCheckoutConfirmation(order) {
  if (typeof window === "undefined") return;
  try {
    if (order?.id) {
      window.sessionStorage.setItem(
        CHECKOUT_CONFIRMATION_KEY,
        JSON.stringify({
          id: order.id,
          total: order.total ?? 0,
          balanceDue: order.balanceDue ?? 0,
          email: order.email ?? "",
          userId: order.userId ?? null,
        }),
      );
    } else {
      window.sessionStorage.removeItem(CHECKOUT_CONFIRMATION_KEY);
    }
  } catch {
    try {
      window.sessionStorage.removeItem(CHECKOUT_CONFIRMATION_KEY);
    } catch {
      // ignore quota / private mode
    }
  }
  emitChange();
}

export function clearCheckoutConfirmation() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_CONFIRMATION_KEY);
  } catch {
    // ignore quota / private mode
  }
  emitChange();
}

export function useCheckoutConfirmation() {
  return useSyncExternalStore(subscribe, readCheckoutConfirmation, () => null);
}
