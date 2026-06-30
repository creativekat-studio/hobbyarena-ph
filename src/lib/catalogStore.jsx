import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_PRODUCT_LINES,
  GENERIC_PRODUCT_TERMS,
  PREORDER_TERMS,
} from "../data/catalogDefaults.js";

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

function loadCatalog() {
  const defaults = defaultCatalog();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
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
  } catch {
    return defaults;
  }
}

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(loadCatalog);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...catalog, version: CATALOG_VERSION }));
  }, [catalog]);

  const activeLines = useMemo(
    () => catalog.lines.filter((line) => line.active !== false),
    [catalog.lines],
  );

  const activeCategories = useMemo(
    () => catalog.categories.filter((cat) => cat.active !== false && !cat.forPreorders),
    [catalog.categories],
  );

  const lineOptions = useMemo(
    () => [{ value: "all", label: "All lines" }, ...activeLines.map((line) => ({ value: line.id, label: line.label, match: line.match }))],
    [activeLines],
  );

  const addLine = useCallback((input) => {
    const label = input.label?.trim();
    if (!label) return null;
    const id = input.id?.trim() || label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const row = { id, label, match: input.match?.trim() || label, active: input.active !== false };
    setCatalog((prev) => ({ ...prev, lines: [...prev.lines, row] }));
    return row;
  }, []);

  const updateLine = useCallback((id, patch) => {
    setCatalog((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  }, []);

  const removeLine = useCallback((id) => {
    setCatalog((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.id !== id),
    }));
  }, []);

  const addCategory = useCallback((input) => {
    const label = input.label?.trim();
    if (!label) return null;
    const id = input.id?.trim() || label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const row = {
      id,
      label,
      description: input.description?.trim() || "",
      active: input.active !== false,
      forPreorders: false,
    };
    setCatalog((prev) => ({ ...prev, categories: [...prev.categories, row] }));
    return row;
  }, []);

  const updateCategory = useCallback((id, patch) => {
    setCatalog((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)),
    }));
  }, []);

  const removeCategory = useCallback((id) => {
    setCatalog((prev) => ({
      ...prev,
      categories: prev.categories.filter((cat) => cat.id !== id),
    }));
  }, []);

  const setTerms = useCallback((kind, lines) => {
    const cleaned = lines.map((line) => line.trim()).filter(Boolean);
    if (!cleaned.length) return;
    setCatalog((prev) => ({
      ...prev,
      terms: { ...prev.terms, [kind]: cleaned },
    }));
  }, []);

  const value = useMemo(
    () => ({
      lines: catalog.lines,
      categories: catalog.categories,
      terms: catalog.terms,
      activeLines,
      activeCategories,
      lineOptions,
      addLine,
      updateLine,
      removeLine,
      addCategory,
      updateCategory,
      removeCategory,
      setTerms,
    }),
    [catalog, activeLines, activeCategories, lineOptions, addLine, updateLine, removeLine, addCategory, updateCategory, removeCategory, setTerms],
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
