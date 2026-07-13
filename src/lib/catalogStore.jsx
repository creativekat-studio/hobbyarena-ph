import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LINES,
  GENERIC_PRODUCT_TERMS,
  PREORDER_TERMS,
} from "../data/catalogDefaults.js";
import { useFirebaseData } from "./firebase/config.js";
import { useAdminFirestoreWrite } from "./firebase/adminWriteAccess.js";
import { saveCatalogSettings, subscribeCatalogSettings } from "./firebase/repositories/catalog.js";

const STORAGE_KEY = "hobbyarena:catalog";
const CATALOG_VERSION = 2;

function defaultCatalog() {
  return {
    version: CATALOG_VERSION,
    lines: DEFAULT_PRODUCT_LINES.map((line) => ({ ...line })),
    categories: DEFAULT_PRODUCT_CATEGORIES.map((cat) => ({ ...cat })),
    terms: {
      generic: [...GENERIC_PRODUCT_TERMS],
      preorder: [...PREORDER_TERMS],
    },
  };
}

function mergeById(stored = [], defaults = []) {
  const map = new Map(stored.map((row) => [row.id, row]));
  defaults.forEach((row) => {
    if (!map.has(row.id)) map.set(row.id, { ...row });
  });
  return [...map.values()];
}

function mergeCatalogPayload(parsed) {
  const defaults = defaultCatalog();
  if (!parsed || typeof parsed !== "object") return defaults;
  const version = parsed.version ?? 1;

  if (version < CATALOG_VERSION) {
    return {
      version: CATALOG_VERSION,
      lines: mergeById(parsed.lines, defaults.lines),
      categories: mergeById(parsed.categories, defaults.categories),
      terms: defaults.terms,
    };
  }

  return {
    version: CATALOG_VERSION,
    lines: Array.isArray(parsed.lines) && parsed.lines.length ? parsed.lines : defaults.lines,
    categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : defaults.categories,
    terms: {
      generic: Array.isArray(parsed.terms?.generic) && parsed.terms.generic.length ? parsed.terms.generic : defaults.terms.generic,
      preorder: Array.isArray(parsed.terms?.preorder) && parsed.terms.preorder.length ? parsed.terms.preorder : defaults.terms.preorder,
    },
  };
}

function cloneCatalog(payload) {
  return JSON.parse(JSON.stringify(payload));
}

function cacheCatalogLocally(payload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, version: CATALOG_VERSION }));
  } catch {
    // ignore
  }
}

function loadCachedCatalog() {
  const defaults = defaultCatalog();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return mergeCatalogPayload(JSON.parse(raw));
  } catch {
    return defaults;
  }
}

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const adminWrite = useAdminFirestoreWrite();
  const [catalog, setCatalog] = useState(() => loadCachedCatalog());
  const [hydrated, setHydrated] = useState(!firebaseEnabled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const catalogRef = useRef(catalog);
  const dirtyRef = useRef(false);
  const baselineRef = useRef(cloneCatalog(catalog));

  catalogRef.current = catalog;
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
        if (remote) {
          if (!dirtyRef.current) {
            const next = mergeCatalogPayload(remote);
            setCatalog(next);
            baselineRef.current = cloneCatalog(next);
            cacheCatalogLocally(next);
          }
        }
        setHydrated(true);
      },
      (error) => console.error("[catalog] Firestore sync failed:", error),
    );
  }, [firebaseEnabled]);

  const saveCatalog = useCallback(async () => {
    if (firebaseEnabled && (!adminWrite.ready || !adminWrite.allowed)) {
      setSaveError("Sign in as admin to save classification changes.");
      return { ok: false };
    }

    const payload = cloneCatalog(catalogRef.current);
    setSaving(true);
    setSaveError("");
    setSaveOk(false);
    try {
      cacheCatalogLocally(payload);
      if (firebaseEnabled) {
        await saveCatalogSettings({ ...payload, version: CATALOG_VERSION });
      }
      baselineRef.current = cloneCatalog(payload);
      setDirty(false);
      dirtyRef.current = false;
      setSaveOk(true);
      return { ok: true };
    } catch (error) {
      console.error("[catalog] Failed to save settings:", error);
      setSaveError(error?.message || "Could not save classifications.");
      return { ok: false, error };
    } finally {
      setSaving(false);
    }
  }, [firebaseEnabled, adminWrite.ready, adminWrite.allowed]);

  const discardChanges = useCallback(() => {
    const cached = cloneCatalog(baselineRef.current);
    setCatalog(cached);
    setDirty(false);
    dirtyRef.current = false;
    setSaveOk(false);
    setSaveError("");
  }, []);

  const activeLines = useMemo(
    () => catalog.lines.filter((line) => line.active !== false),
    [catalog.lines],
  );

  const activeCategories = useMemo(
    () => catalog.categories.filter((cat) => cat.active !== false && !cat.forPreorders),
    [catalog.categories],
  );

  const lineOptions = useMemo(
    () => [{ value: "all", label: "All lines" }, ...activeLines.map((line) => ({ value: line.id, label: line.label, match: line.match, logo: line.logo ?? "" }))],
    [activeLines],
  );

  const addLine = useCallback((input = {}) => {
    const label = input.label?.trim() || "New line";
    const id = input.id?.trim() || `line_${Date.now().toString(36)}`;
    const row = {
      id,
      label,
      match: input.match?.trim() || label,
      logo: input.logo ?? "",
      active: input.active !== false,
    };
    markDirty();
    setCatalog((prev) => ({ ...prev, lines: [...prev.lines, row] }));
    return row;
  }, [markDirty]);

  const updateLine = useCallback((id, patch) => {
    markDirty();
    setCatalog((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  }, [markDirty]);

  const removeLine = useCallback((id) => {
    markDirty();
    setCatalog((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== id),
    }));
  }, [markDirty]);

  const addCategory = useCallback((input = {}) => {
    const label = input.label?.trim() || "New type";
    const id = input.id?.trim() || `type_${Date.now().toString(36)}`;
    const row = {
      id,
      label,
      description: input.description?.trim() || "",
      active: input.active !== false,
      forPreorders: false,
    };
    markDirty();
    setCatalog((prev) => ({ ...prev, categories: [...prev.categories, row] }));
    return row;
  }, [markDirty]);

  const updateCategory = useCallback((id, patch) => {
    markDirty();
    setCatalog((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)),
    }));
  }, [markDirty]);

  const removeCategory = useCallback((id) => {
    markDirty();
    setCatalog((prev) => ({
      ...prev,
      categories: prev.categories.filter((cat) => cat.id !== id),
    }));
  }, [markDirty]);

  const setTerms = useCallback((kind, lines) => {
    const cleaned = lines.map((line) => line.trim()).filter(Boolean);
    if (!cleaned.length) return;
    markDirty();
    setCatalog((prev) => ({
      ...prev,
      terms: { ...prev.terms, [kind]: cleaned },
    }));
  }, [markDirty]);

  const value = useMemo(
    () => ({
      lines: catalog.lines,
      categories: catalog.categories,
      terms: catalog.terms,
      activeLines,
      activeCategories,
      lineOptions,
      hydrated,
      dirty,
      saving,
      saveError,
      saveOk,
      addLine,
      updateLine,
      removeLine,
      addCategory,
      updateCategory,
      removeCategory,
      setTerms,
      saveCatalog,
      discardChanges,
    }),
    [
      catalog,
      activeLines,
      activeCategories,
      lineOptions,
      hydrated,
      dirty,
      saving,
      saveError,
      saveOk,
      addLine,
      updateLine,
      removeLine,
      addCategory,
      updateCategory,
      removeCategory,
      setTerms,
      saveCatalog,
      discardChanges,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog must be used within CatalogProvider");
  return context;
}

export function lineMatchFromOptions(lineOptions, lineValue) {
  return lineOptions.find((line) => line.value === lineValue)?.match ?? null;
}
