import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_DESIGN_PROPOSAL, getDesignProposal } from "../themes/index.js";
import { DEFAULT_SHOP_FILTER_LAYOUT, normalizeShopFilterLayout } from "../data/shopFilterLayout.js";
import { SHOP_NAV_LAYOUTS } from "../data/shopNav.js";
import {
  DEFAULT_COUNTDOWN_VARIANT,
  DEFAULT_PRICING_VARIANT,
  PREORDER_COUNTDOWN_VARIANTS,
  PREORDER_PRICING_VARIANTS,
} from "../data/preorderDisplay.js";
import { useFirebaseData } from "./firebase/config.js";
import { useAdminFirestoreWrite } from "./firebase/adminWriteAccess.js";
import { saveDesignSettings, subscribeDesignSettings } from "./firebase/repositories/design.js";

/**
 * Site-wide design settings — draft locally, persist to Firestore only on Save.
 * Avoids auto-write races that could overwrite sibling fields in the design doc.
 */

const STORAGE_KEY = "hobbyarena:design-settings";
const DEFAULT_NAV_LAYOUT = "dock";
const DEFAULT_COLOR_MODE = "light";

const DesignSettingsContext = createContext(null);

function normalizeProposalId(value) {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 ? parsed : DEFAULT_DESIGN_PROPOSAL;
}

function normalizeNavLayout(value) {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SHOP_NAV_LAYOUTS, value)
    ? value
    : DEFAULT_NAV_LAYOUT;
}

function normalizeCountdown(value) {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PREORDER_COUNTDOWN_VARIANTS, value)
    ? value
    : DEFAULT_COUNTDOWN_VARIANT;
}

function normalizePricing(value) {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PREORDER_PRICING_VARIANTS, value)
    ? value
    : DEFAULT_PRICING_VARIANT;
}

function normalizeColorMode(value) {
  return value === "dark" || value === "light" ? value : DEFAULT_COLOR_MODE;
}

function defaultSettings() {
  return {
    proposalId: DEFAULT_DESIGN_PROPOSAL,
    filterLayoutId: DEFAULT_SHOP_FILTER_LAYOUT,
    navLayoutId: DEFAULT_NAV_LAYOUT,
    countdownVariant: DEFAULT_COUNTDOWN_VARIANT,
    pricingVariant: DEFAULT_PRICING_VARIANT,
    defaultColorMode: getDesignProposal(DEFAULT_DESIGN_PROPOSAL).defaultMode || DEFAULT_COLOR_MODE,
  };
}

function normalizeSettings(raw) {
  const base = defaultSettings();
  if (!raw || typeof raw !== "object") return base;
  return {
    proposalId: normalizeProposalId(raw.proposalId ?? base.proposalId),
    filterLayoutId: normalizeShopFilterLayout(raw.filterLayoutId ?? base.filterLayoutId),
    navLayoutId: normalizeNavLayout(raw.navLayoutId ?? base.navLayoutId),
    countdownVariant: normalizeCountdown(raw.countdownVariant ?? base.countdownVariant),
    pricingVariant: normalizePricing(raw.pricingVariant ?? base.pricingVariant),
    defaultColorMode: normalizeColorMode(raw.defaultColorMode ?? base.defaultColorMode),
  };
}

function readCachedSettings() {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

function cacheSettingsLocally(settings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota errors */
  }
}

function settingsPayload(settings) {
  return {
    proposalId: settings.proposalId,
    filterLayoutId: settings.filterLayoutId,
    navLayoutId: settings.navLayoutId,
    countdownVariant: settings.countdownVariant,
    pricingVariant: settings.pricingVariant,
    defaultColorMode: settings.defaultColorMode,
  };
}

export function DesignSettingsProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const adminWrite = useAdminFirestoreWrite();
  const [settings, setSettings] = useState(() => readCachedSettings());
  const [hydrated, setHydrated] = useState(!firebaseEnabled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const dirtyRef = useRef(false);
  const settingsRef = useRef(settings);
  const baselineRef = useRef(normalizeSettings(settings));

  settingsRef.current = settings;
  dirtyRef.current = dirty;

  const markDirty = useCallback(() => {
    setDirty(true);
    dirtyRef.current = true;
    setSaveOk(false);
    setSaveError("");
  }, []);

  const patchSettings = useCallback(
    (patch) => {
      markDirty();
      setSettings((prev) => normalizeSettings({ ...prev, ...patch }));
    },
    [markDirty],
  );

  useEffect(() => {
    if (!firebaseEnabled) {
      setHydrated(true);
      return undefined;
    }

    return subscribeDesignSettings(
      (remote) => {
        if (remote && !dirtyRef.current) {
          const next = normalizeSettings(remote);
          setSettings(next);
          baselineRef.current = next;
          cacheSettingsLocally(next);
        }
        // Empty remote: keep local cache. Do not auto-seed Firestore.
        setHydrated(true);
      },
      (error) => console.error("[design] Firestore sync failed:", error),
    );
  }, [firebaseEnabled]);

  // Offline / non-Firebase: keep a local cache of the draft.
  useEffect(() => {
    if (firebaseEnabled) return;
    cacheSettingsLocally(settings);
  }, [settings, firebaseEnabled]);

  const saveSettings = useCallback(async () => {
    if (firebaseEnabled && (!adminWrite.ready || !adminWrite.allowed)) {
      setSaveError("Sign in as admin to save design settings.");
      return { ok: false };
    }

    const payload = settingsPayload(settingsRef.current);
    setSaving(true);
    setSaveError("");
    setSaveOk(false);
    try {
      cacheSettingsLocally(payload);
      if (firebaseEnabled) {
        await saveDesignSettings(payload);
      }
      baselineRef.current = normalizeSettings(payload);
      setDirty(false);
      dirtyRef.current = false;
      setSaveOk(true);
      return { ok: true };
    } catch (error) {
      console.error("[design] Failed to save settings:", error);
      setSaveError(error?.message || "Could not save design settings.");
      return { ok: false, error };
    } finally {
      setSaving(false);
    }
  }, [firebaseEnabled, adminWrite.ready, adminWrite.allowed]);

  const discardChanges = useCallback(() => {
    const cached = normalizeSettings(baselineRef.current);
    setSettings(cached);
    setDirty(false);
    dirtyRef.current = false;
    setSaveOk(false);
    setSaveError("");
  }, []);

  const setProposalId = useCallback((next) => patchSettings({ proposalId: next }), [patchSettings]);
  const setFilterLayoutId = useCallback((next) => patchSettings({ filterLayoutId: next }), [patchSettings]);
  const setNavLayoutId = useCallback((next) => patchSettings({ navLayoutId: next }), [patchSettings]);
  const setCountdownVariant = useCallback((next) => patchSettings({ countdownVariant: next }), [patchSettings]);
  const setPricingVariant = useCallback((next) => patchSettings({ pricingVariant: next }), [patchSettings]);
  const setDefaultColorMode = useCallback((next) => patchSettings({ defaultColorMode: next }), [patchSettings]);

  const proposal = useMemo(() => getDesignProposal(settings.proposalId), [settings.proposalId]);

  const value = useMemo(
    () => ({
      ...settings,
      proposal,
      hydrated,
      dirty,
      saving,
      saveError,
      saveOk,
      setProposalId,
      setFilterLayoutId,
      setNavLayoutId,
      setCountdownVariant,
      setPricingVariant,
      setDefaultColorMode,
      saveSettings,
      discardChanges,
      // Aliases used by existing hooks/components
      layoutId: settings.navLayoutId,
      setLayoutId: setNavLayoutId,
    }),
    [
      settings,
      proposal,
      hydrated,
      dirty,
      saving,
      saveError,
      saveOk,
      setProposalId,
      setFilterLayoutId,
      setNavLayoutId,
      setCountdownVariant,
      setPricingVariant,
      setDefaultColorMode,
      saveSettings,
      discardChanges,
    ],
  );

  return (
    <DesignSettingsContext.Provider value={value}>
      {children}
    </DesignSettingsContext.Provider>
  );
}

export function useDesignSettings() {
  const context = useContext(DesignSettingsContext);
  if (!context) {
    throw new Error("useDesignSettings must be used within a DesignSettingsProvider");
  }
  return context;
}
