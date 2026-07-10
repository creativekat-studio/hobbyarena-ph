import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SHOP_FILTER_LAYOUT, normalizeShopFilterLayout } from "../data/shopFilterLayout.js";
import { useFirebaseData } from "./firebase/config.js";
import { useAdminFirestoreWrite } from "./firebase/adminWriteAccess.js";
import { saveDesignSettings, subscribeDesignSettings } from "./firebase/repositories/design.js";

const STORAGE_KEY = "hobbyarena:shop-filter-layout";

function readLocalLayoutId() {
  if (typeof window === "undefined") return DEFAULT_SHOP_FILTER_LAYOUT;
  try {
    return normalizeShopFilterLayout(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_SHOP_FILTER_LAYOUT;
  }
}

const ShopFilterLayoutContext = createContext(null);

export function ShopFilterLayoutProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const adminWrite = useAdminFirestoreWrite();
  const [layoutId, setLayoutIdState] = useState(() =>
    firebaseEnabled ? DEFAULT_SHOP_FILTER_LAYOUT : readLocalLayoutId(),
  );
  const syncingRemote = useRef(false);
  const pendingSeed = useRef(null);

  // Subscribe to the shared Firestore design doc so the layout holds site-wide.
  useEffect(() => {
    if (!firebaseEnabled) return undefined;

    return subscribeDesignSettings(
      (remote) => {
        syncingRemote.current = true;
        if (!remote || remote.filterLayoutId == null) {
          const localId = readLocalLayoutId();
          setLayoutIdState(localId);
          // Seed Firestore from local pref only if the field is missing entirely.
          pendingSeed.current = localId;
        } else {
          pendingSeed.current = null;
          setLayoutIdState(normalizeShopFilterLayout(remote.filterLayoutId));
        }
        queueMicrotask(() => {
          syncingRemote.current = false;
        });
      },
      (error) => console.error("[shop-filter-layout] Firestore sync failed:", error),
    );
  }, [firebaseEnabled]);

  // When an admin is present and Firestore has no value yet, seed it once.
  useEffect(() => {
    if (!firebaseEnabled || !adminWrite.ready || !adminWrite.allowed) return undefined;
    if (pendingSeed.current == null) return undefined;

    const seedId = pendingSeed.current;
    pendingSeed.current = null;
    saveDesignSettings({ filterLayoutId: seedId }).catch((error) => {
      console.error("[shop-filter-layout] Failed to seed Firestore:", error);
    });
    return undefined;
  }, [firebaseEnabled, adminWrite]);

  // Persist to localStorage only when Firestore isn't the source of truth.
  useEffect(() => {
    if (firebaseEnabled || syncingRemote.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, layoutId);
    } catch {
      /* ignore storage errors */
    }
  }, [layoutId, firebaseEnabled]);

  const setLayoutId = useCallback(
    (next) => {
      const normalized = normalizeShopFilterLayout(next);
      setLayoutIdState(normalized);
      if (firebaseEnabled && adminWrite.allowed) {
        saveDesignSettings({ filterLayoutId: normalized }).catch((error) => {
          console.error("[shop-filter-layout] Failed to save settings:", error);
        });
      }
    },
    [firebaseEnabled, adminWrite.allowed],
  );

  const value = useMemo(
    () => ({ layoutId, setLayoutId }),
    [layoutId, setLayoutId],
  );

  return (
    <ShopFilterLayoutContext.Provider value={value}>
      {children}
    </ShopFilterLayoutContext.Provider>
  );
}

export function useShopFilterLayout() {
  const context = useContext(ShopFilterLayoutContext);
  if (!context) {
    throw new Error("useShopFilterLayout must be used within ShopFilterLayoutProvider");
  }
  return context;
}
