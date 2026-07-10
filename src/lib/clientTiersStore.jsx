import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_CLIENT_TIERS } from "../data/clientTierDefaults.js";

const STORAGE_KEY = "hobbyarena:client-tiers";

function defaultState() {
  return {
    version: 1,
    tiers: DEFAULT_CLIENT_TIERS.map((t) => ({ ...t })),
  };
}

function mergePayload(parsed) {
  const defaults = defaultState();
  if (!parsed || typeof parsed !== "object") return defaults;
  const tiers = Array.isArray(parsed.tiers) && parsed.tiers.length
    ? parsed.tiers.map((t) => ({
      id: t.id || `tier_${Date.now()}`,
      name: t.name || "Tier",
      badgeColor: t.badgeColor || "#64748b",
      minSpend: Number(t.minSpend) || 0,
      maxSpend: t.maxSpend == null || t.maxSpend === "" ? null : Number(t.maxSpend),
      sortOrder: Number(t.sortOrder) || 0,
      active: t.active !== false,
    }))
    : defaults.tiers;
  return { version: 1, tiers };
}

function loadState() {
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
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const api = useMemo(() => ({
    addTier: (tier) => setState((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          id: `tier_${Date.now()}`,
          name: "New rank",
          badgeColor: "#2563EB",
          minSpend: 0,
          maxSpend: null,
          sortOrder: prev.tiers.length,
          active: true,
          ...tier,
        },
      ],
    })),
    updateTier: (id, patch) => setState((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
    removeTier: (id) => setState((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((t) => t.id !== id),
    })),
    resetTiers: () => setState(defaultState()),
  }), []);

  const value = useMemo(() => ({
    tiers: state.tiers,
    ...api,
  }), [state.tiers, api]);

  return <ClientTiersContext.Provider value={value}>{children}</ClientTiersContext.Provider>;
}

export function useClientTiers() {
  const context = useContext(ClientTiersContext);
  if (!context) throw new Error("useClientTiers must be used within a ClientTiersProvider");
  return context;
}
