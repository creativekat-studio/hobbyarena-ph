import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ALL_PRODUCTS, INVENTORY } from "../data/mockData.js";
import { productImage } from "../data/mediaAssets.js";
import { DEFAULT_DEPOSIT_PERCENT } from "./preorder.js";

/**
 * Inventory store — stock levels, storefront publish state, and custom products.
 *
 * MOCK: persists to localStorage. When Firebase is wired, replace with a
 * `products` / `inventory` Firestore collection; keep this hook API stable.
 */

const STORAGE_KEY = "hobbyarena:inventory";

function seedInventory() {
  return INVENTORY.map((row, index) => ({
    ...row,
    image: productImage(row.id),
    published: index % 5 !== 0,
    custom: false,
  }));
}

function rowToProduct(row) {
  const catalog = ALL_PRODUCTS.find((product) => product.id === row.id);
  if (catalog) {
    const isPreorder = row.type === "Pre-order" || catalog.tag === "Pre-order";
    return {
      ...catalog,
      stock: row.stock,
      image: row.image ?? catalog.image ?? productImage(row.id),
      rating: typeof row.rating === "number" ? row.rating : catalog.rating,
      reviews: typeof row.reviews === "number" ? row.reviews : catalog.reviews,
      category: row.category ?? catalog.category ?? "tcg",
      descriptionSections: row.descriptionSections ?? catalog.descriptionSections,
      ...(isPreorder
        ? {
            preorderEndsAt: row.preorderEndsAt ?? catalog.preorderEndsAt ?? null,
            depositPercent:
              typeof row.depositPercent === "number"
                ? row.depositPercent
                : catalog.depositPercent ?? DEFAULT_DEPOSIT_PERCENT,
          }
        : {}),
    };
  }
  const isPreorder = row.type === "Pre-order";
  return {
    id: row.id,
    name: row.name,
    line: row.line,
    price: row.price,
    stock: row.stock,
    rating: row.rating ?? 4.5,
    reviews: row.reviews ?? 0,
    accent: row.accent ?? "#2563EB",
    tag: isPreorder ? "Pre-order" : "Sealed",
    image: row.image ?? null,
    descriptionSections: row.descriptionSections ?? [
      {
        title: "Product details",
        intro: "Details for this product will be added soon.",
      },
    ],
    ...(isPreorder
      ? {
          preorderEndsAt: row.preorderEndsAt ?? null,
          depositPercent: typeof row.depositPercent === "number" ? row.depositPercent : DEFAULT_DEPOSIT_PERCENT,
        }
      : {}),
  };
}

function loadInventory() {
  if (typeof window === "undefined") return seedInventory();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedInventory();
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return seedInventory();

    const seed = seedInventory();
    const seedIds = new Set(seed.map((row) => row.id));
    const byId = new Map(stored.map((row) => [row.id, row]));

    const merged = seed.map((row) => {
      const saved = byId.get(row.id);
      if (!saved) return row;
      return {
        ...row,
        name: saved.name ?? row.name,
        line: saved.line ?? row.line,
        type: saved.type ?? row.type,
        price: typeof saved.price === "number" ? saved.price : row.price,
        cost: typeof saved.cost === "number" ? saved.cost : row.cost,
        stock: typeof saved.stock === "number" ? saved.stock : row.stock,
        reorderAt: typeof saved.reorderAt === "number" ? saved.reorderAt : row.reorderAt,
        rating: typeof saved.rating === "number" ? saved.rating : row.rating,
        reviews: typeof saved.reviews === "number" ? saved.reviews : row.reviews,
        published: typeof saved.published === "boolean" ? saved.published : row.published,
        image: saved.image ?? row.image,
        preorderEndsAt: saved.preorderEndsAt ?? row.preorderEndsAt ?? null,
        depositPercent:
          typeof saved.depositPercent === "number" ? saved.depositPercent : row.depositPercent,
        category: saved.category ?? row.category ?? "tcg",
        descriptionSections: saved.descriptionSections ?? row.descriptionSections,
      };
    });

    const custom = stored
      .filter((row) => !seedIds.has(row.id))
      .map((row) => ({
        reorderAt: 3,
        custom: true,
        published: Boolean(row.published),
        image: row.image ?? null,
        ...row,
      }));

    return [...merged, ...custom];
  } catch {
    return seedInventory();
  }
}

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [items, setItems] = useState(loadInventory);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const setPublished = useCallback((id, published) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, published } : row)));
  }, []);

  const setPublishedMany = useCallback((ids, published) => {
    const idSet = new Set(ids);
    setItems((prev) =>
      prev.map((row) => (idSet.has(row.id) ? { ...row, published } : row)),
    );
  }, []);

  const togglePublished = useCallback((id) => {
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, published: !row.published } : row)),
    );
  }, []);

  const setStock = useCallback((id, stock) => {
    setItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, stock: Math.max(0, stock) } : row)),
    );
  }, []);

  const decrementStockForCart = useCallback((cartItems) => {
    setItems((prev) => {
      const qtyById = new Map(cartItems.filter((i) => i.tag !== "Pre-order").map((i) => [i.id, i.quantity]));
      return prev.map((row) => {
        const qty = qtyById.get(row.id);
        if (!qty || row.type === "Pre-order") return row;
        return { ...row, stock: Math.max(0, row.stock - qty) };
      });
    });
  }, []);

  const addProduct = useCallback((input) => {
    const name = input.name?.trim();
    if (!name) return null;

    const line = input.line || "Pokémon TCG";
    const type = input.type === "Pre-order" ? "Pre-order" : "Sealed";
    const price = Math.max(0, Number(input.price) || 0);
    const stock = Math.max(0, Number(input.stock) || 0);
    const cost = input.cost === "" || input.cost == null
      ? Math.round(price * 0.72)
      : Math.max(0, Number(input.cost) || 0);
    const reorderAt = Math.max(0, Number(input.reorderAt) ?? 3);
    const prefix = line.startsWith("Pokémon") ? "PKM" : "OP";
    const id = `custom-${Date.now()}`;

    const row = {
      id,
      sku: `HA-${prefix}-${String(2000 + items.length)}`,
      name,
      line,
      type,
      price,
      cost,
      stock,
      reorderAt,
      published: Boolean(input.published),
      image: input.image?.trim() || null,
      custom: true,
      accent: line.startsWith("Pokémon") ? "#2563EB" : "#06b6d4",
      rating: Math.min(5, Math.max(0, Number(input.rating) || 0)),
      reviews: Math.max(0, Number(input.reviews) || 0),
      category: type === "Pre-order" ? undefined : (input.category || "tcg"),
      descriptionSections: input.descriptionSections ?? undefined,
      ...(type === "Pre-order"
        ? {
            preorderEndsAt: input.preorderEndsAt || null,
            depositPercent: Math.min(99, Math.max(1, Number(input.depositPercent) || DEFAULT_DEPOSIT_PERCENT)),
          }
        : {}),
    };

    setItems((prev) => [...prev, row]);
    return row;
  }, [items.length]);

  const updateProduct = useCallback((id, input) => {
    const name = input.name?.trim();
    if (!name) return false;

    const line = input.line || "Pokémon TCG";
    const type = input.type === "Pre-order" ? "Pre-order" : "Sealed";
    const price = Math.max(0, Number(input.price) || 0);
    const cost = input.cost === "" || input.cost == null
      ? Math.round(price * 0.72)
      : Math.max(0, Number(input.cost) || 0);
    const stock = Math.max(0, Number(input.stock) || 0);
    const reorderAt = Math.max(0, Number(input.reorderAt) ?? 3);

    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          name,
          line,
          type,
          price,
          cost,
          stock,
          reorderAt,
          published: typeof input.published === "boolean" ? input.published : row.published,
          image: input.image?.trim() || null,
          rating: Math.min(5, Math.max(0, Number(input.rating) ?? row.rating ?? 0)),
          reviews: Math.max(0, Number(input.reviews) ?? row.reviews ?? 0),
          category: type === "Pre-order" ? undefined : (input.category ?? row.category ?? "tcg"),
          descriptionSections: input.descriptionSections !== undefined ? input.descriptionSections : row.descriptionSections,
          preorderEndsAt: type === "Pre-order" ? (input.preorderEndsAt || null) : null,
          depositPercent:
            type === "Pre-order"
              ? Math.min(99, Math.max(1, Number(input.depositPercent) || row.depositPercent || DEFAULT_DEPOSIT_PERCENT))
              : undefined,
        };
      }),
    );
    return true;
  }, []);

  const publishedIds = useMemo(
    () => new Set(items.filter((row) => row.published).map((row) => row.id)),
    [items],
  );

  const inventoryById = useMemo(
    () => new Map(items.map((row) => [row.id, row])),
    [items],
  );

  const catalogProducts = useMemo(() => items.map(rowToProduct), [items]);

  const publishedCatalog = useMemo(
    () => items.filter((row) => row.published).map(rowToProduct),
    [items],
  );

  const isPublished = useCallback((id) => publishedIds.has(id), [publishedIds]);

  const getProduct = useCallback(
    (id) => {
      const row = inventoryById.get(id);
      return row ? rowToProduct(row) : null;
    },
    [inventoryById],
  );

  const getPublishedByCategory = useCallback(
    (category) => {
      if (category === "accessories") return [];
      if (category === "sealed") return publishedCatalog.filter((product) => product.tag === "Sealed");
      if (category === "preorder") return publishedCatalog.filter((product) => product.tag === "Pre-order");
      return publishedCatalog;
    },
    [publishedCatalog],
  );

  const value = useMemo(
    () => ({
      items,
      publishedIds,
      inventoryById,
      catalogProducts,
      publishedCatalog,
      publishedProducts: publishedCatalog,
      isPublished,
      getProduct,
      getPublishedByCategory,
      setPublished,
      setPublishedMany,
      togglePublished,
      setStock,
      decrementStockForCart,
      addProduct,
      updateProduct,
    }),
    [
      items,
      publishedIds,
      inventoryById,
      catalogProducts,
      publishedCatalog,
      isPublished,
      getProduct,
      getPublishedByCategory,
      setPublished,
      setPublishedMany,
      togglePublished,
      setStock,
      decrementStockForCart,
      addProduct,
      updateProduct,
    ],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}

/** @deprecated Use getProduct from useInventory — kept for callers merging stock only. */
export function mergeProductInventory(product, inventoryById) {
  if (!product) return null;
  const row = inventoryById.get(product.id);
  if (!row) return product;
  return { ...product, stock: row.stock, image: product.image ?? row.image ?? null };
}

export { rowToProduct };
