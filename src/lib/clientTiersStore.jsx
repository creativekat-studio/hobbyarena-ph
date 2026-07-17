import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CLIENT_TIERS } from "../data/clientTierDefaults.js";
import { useFirebaseData } from "./firebase/config.js";
import { useAdminFirestoreWrite } from "./firebase/adminWriteAccess.js";
import { saveCatalogSettings, subscribeCatalogSettings } from "./firebase/repositories/catalog.js";

const STORAGE_KEY = "hobbyarena:client-tiers";

function defaultState() {
  return {
    version: 1,
    tiers: DEFAULT_CLIENT_TIERS.map((t) => ({ ...t })),
  };
}

function normalizeTier(tiers) {
  return (Array.isArray(tiers) ? tiers : []).map((t, index) => ({
    id: t.id || `tier_${Date.now()}_${index}`,
    name: t.name || "Tier",
    badgeColor: t.badgeColor || "#64748b",
    minSpend: Number(t.minSpend) || 0,
    maxSpend: t.maxSpend == null || t.maxSpend === "" ? null : Number(t.maxSpend),
    sortOrder: Number(t.sortOrder) || index,
    active: t.active !== false,
  }));
}

function mergePayload(parsed) {
  const defaults = defaultState();
  if (!parsed || typeof parsed !== "object") return defaults;
  const tiers = normalizeTier(parsed.tiers);
  return { version: 1, tiers: tiers.length ? tiers : defaults.tiers };
}

function cloneState(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function cacheLocally(payload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function loadCached() {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return mergePayload(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

const ClientTiersContext = createContext(null);

export function ClientTiersProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const adminWrite = useAdminFirestoreWrite();
  const [state, setState] = useState(() => loadCached());
  const [hydrated, setHydrated] = useState(!firebaseEnabled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const stateRef = useRef(state);
  const dirtyRef = useRef(false);
  const baselineRef = useRef(cloneState(state));

  stateRef.current = state;
  dirtyRef.current = dirty;

  const markDirty = useCallback(() => {
    setDirty(true);
    dirtyRef.current = true;
    setSaveOk(false);
    setSaveError("");
  }, []);

  useEffect(() => {
    if (!firebaseEnabled) {
      setHydrated(true);
      return undefined;
    }

    return subscribeCatalogSettings(
      (remote) => {
        if (remote && Array.isArray(remote.memberRanks) && remote.memberRanks.length) {
          if (!dirtyRef.current) {
            const next = mergePayload({ tiers: remote.memberRanks });
            setState(next);
            baselineRef.current = cloneState(next);
            cacheLocally(next);
          }
        }
        setHydrated(true);
      },
      (error) => console.error("[client-tiers] Firestore sync failed:", error),
    );
  }, [firebaseEnabled]);

  const saveTiers = useCallback(async () => {
    if (firebaseEnabled && (!adminWrite.ready || !adminWrite.allowed)) {
      setSaveError("Sign in as admin to save member tiers.");
      return { ok: false };
    }

    const payload = cloneState(stateRef.current);
    setSaving(true);
    setSaveError("");
    setSaveOk(false);
    try {
      cacheLocally(payload);
      if (firebaseEnabled) {
        await saveCatalogSettings({ memberRanks: payload.tiers });
      }
      baselineRef.current = cloneState(payload);
      setDirty(false);
      dirtyRef.current = false;
      setSaveOk(true);
      return { ok: true };
    } catch (error) {
      console.error("[client-tiers] Failed to save:", error);
      setSaveError(error?.message || "Could not save member tiers.");
      return { ok: false, error };
    } finally {
      setSaving(false);
    }
  }, [firebaseEnabled, adminWrite.ready, adminWrite.allowed]);

  const discardChanges = useCallback(() => {
    const cached = cloneState(baselineRef.current);
    setState(cached);
    setDirty(false);
    dirtyRef.current = false;
    setSaveOk(false);
    setSaveError("");
  }, []);

  const api = useMemo(() => ({
    addTier: (tier) => {
      markDirty();
      setState((prev) => ({
        ...prev,
        tiers: [
          ...prev.tiers,
          {
            id: `tier_${Date.now()}`,
            name: "New tier",
            badgeColor: "#2563EB",
            minSpend: 0,
            maxSpend: null,
            sortOrder: prev.tiers.length,
            active: true,
            ...tier,
          },
        ],
      }));
    },
    updateTier: (id, patch) => {
      markDirty();
      setState((prev) => ({
        ...prev,
        tiers: prev.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      }));
    },
    removeTier: (id) => {
      markDirty();
      setState((prev) => ({
        ...prev,
        tiers: prev.tiers.filter((t) => t.id !== id),
      }));
    },
    resetTiers: () => {
      markDirty();
      setState(defaultState());
    },
    saveTiers,
    discardChanges,
  }), [markDirty, saveTiers, discardChanges]);

  const value = useMemo(() => ({
    tiers: state.tiers,
    hydrated,
    dirty,
    saving,
    saveError,
    saveOk,
    ...api,
  }), [state.tiers, hydrated, dirty, saving, saveError, saveOk, api]);

  return <ClientTiersContext.Provider value={value}>{children}</ClientTiersContext.Provider>;
}

export function useClientTiers() {
  const context = useContext(ClientTiersContext);
  if (!context) throw new Error("useClientTiers must be used within a ClientTiersProvider");
  return context;
}
