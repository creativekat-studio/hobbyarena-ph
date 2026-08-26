import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { productImage } from "../data/mediaAssets.js";
import { DEFAULT_DEPOSIT_PERCENT } from "./preorder.js";
import { productMaxPerOrder, productTracksStock } from "./quantityLimits.js";
import { roundMoney } from "./money.js";
import { sortStorefrontProducts } from "./products.js";
import { useFirebaseData } from "./firebase/config.js";
import { useAdminFirestoreWrite } from "./firebase/adminWriteAccess.js";
import { subscribeProducts, upsertProduct, upsertProducts } from "./firebase/repositories/products.js";

/**
 * Inventory store — stock levels, storefront publish state, and products.
 * Source of truth is Firestore when enabled; localStorage is an offline cache only.
 */

const STORAGE_KEY = "hobbyarena:inventory";
/** Max featured products per storefront section (in-stock and pre-order each). */
export const MAX_FEATURED_PRODUCTS = 4;

function isDeletedRow(row) {
  return Boolean(row?.deletedAt || row?.deleted);
}

function isPreorderRow(row) {
  return row?.type === "Pre-order" || row?.tag === "Pre-order";
}

function countFeaturedOfKind(rows, preorder) {
  return rows.filter(
    (row) => !isDeletedRow(row) && row.featured && isPreorderRow(row) === preorder,
  ).length;
}

function featuredSlotsRemaining(rows, row) {
  const preorder = isPreorderRow(row);
  return MAX_FEATURED_PRODUCTS - countFeaturedOfKind(rows, preorder);
}

function rowToProduct(row) {
  const isPreorder = row.type === "Pre-order" || row.tag === "Pre-order";
  return {
    id: row.id,
    name: row.name,
    line: row.line,
    price: row.price,
    // Keep real inventory cost for COGS / net income (do not drop this field).
    ...(row.cost != null && row.cost !== ""
      ? { cost: Math.max(0, Number(row.cost) || 0) }
      : {}),
    stock: row.stock,
    maxPerOrder: productMaxPerOrder(row),
    rating: typeof row.rating === "number" ? row.rating : 4.5,
    reviews: typeof row.reviews === "number" ? row.reviews : 0,
    accent: row.accent ?? "#2563EB",
    tag: isPreorder ? "Pre-order" : (row.tag || "Sealed"),
    image: row.image ?? productImage(row.id) ?? null,
    category: row.category ?? "tcg",
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    comingSoon: Boolean(row.comingSoon),
    descriptionSections: row.descriptionSections ?? [
      {
        title: "Product details",
        intro: "Details for this product will be added soon.",
      },
    ],
    ...(isPreorder
      ? {
          preorderEndsAt: row.preorderEndsAt ?? null,
          depositPercent:
            typeof row.depositPercent === "number" ? row.depositPercent : DEFAULT_DEPOSIT_PERCENT,
          preorderLimited: Boolean(row.preorderLimited),
        }
      : {}),
  };
}

function loadInventory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return [];
    return stored.map((row) => ({
      reorderAt: 3,
      published: Boolean(row.published),
      featured: Boolean(row.featured),
      comingSoon: Boolean(row.comingSoon),
      deletedAt: row.deletedAt ?? null,
      image: row.image ?? null,
      ...row,
    }));
  } catch {
    return [];
  }
}

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const adminWrite = useAdminFirestoreWrite();
  const [items, setItems] = useState(() => (firebaseEnabled ? [] : loadInventory()));
  const syncingRemote = useRef(false);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;

    const unsubscribe = subscribeProducts(
      (nextItems) => {
        syncingRemote.current = true;
        setItems(nextItems);
        queueMicrotask(() => {
          syncingRemote.current = false;
        });
      },
      (error) => {
        console.error("[inventory] Firestore sync failed:", error);
      },
    );

    return unsubscribe;
  }, [firebaseEnabled]);

  useEffect(() => {
    if (firebaseEnabled || syncingRemote.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, firebaseEnabled]);

  const persistRows = useCallback(
    (rows) => {
      if (!firebaseEnabled || !adminWrite.allowed) return;
      upsertProducts(rows).catch((error) => {
        console.error("[inventory] Failed to save products:", error);
      });
    },
    [firebaseEnabled, adminWrite.allowed],
  );

  const persistRow = useCallback(
    (row) => {
      if (!firebaseEnabled || !adminWrite.allowed || !row) return;
      upsertProduct(row).catch((error) => {
        console.error("[inventory] Failed to save product:", error);
      });
    },
    [firebaseEnabled, adminWrite.allowed],
  );

  const setPublished = useCallback((id, published) => {
    setItems((prev) => {
      const next = prev.map((row) => (row.id === id ? { ...row, published } : row));
      persistRow(next.find((row) => row.id === id));
      return next;
    });
  }, [persistRow]);

  const setPublishedMany = useCallback((ids, published) => {
    const idSet = new Set(ids);
    setItems((prev) => {
      const next = prev.map((row) => (idSet.has(row.id) ? { ...row, published } : row));
      persistRows(next.filter((row) => idSet.has(row.id)));
      return next;
    });
  }, [persistRows]);

  const togglePublished = useCallback((id) => {
    setItems((prev) => {
      const next = prev.map((row) => (row.id === id ? { ...row, published: !row.published } : row));
      persistRow(next.find((row) => row.id === id));
      return next;
    });
  }, [persistRow]);

  const setFeatured = useCallback((id, featured) => {
    setItems((prev) => {
      const current = prev.find((row) => row.id === id);
      if (!current) return prev;
      if (featured && productTracksStock(current) && current.stock <= 0) return prev;
      if (featured && !current.featured && featuredSlotsRemaining(prev, current) <= 0) {
        return prev;
      }
      const next = prev.map((row) => (row.id === id ? { ...row, featured: Boolean(featured) } : row));
      persistRow(next.find((row) => row.id === id));
      return next;
    });
  }, [persistRow]);

  const setFeaturedMany = useCallback((ids, featured) => {
    const idSet = new Set(ids);
    setItems((prev) => {
      let remainingSealed = MAX_FEATURED_PRODUCTS - countFeaturedOfKind(
        prev.filter((row) => !idSet.has(row.id)),
        false,
      );
      let remainingPreorder = MAX_FEATURED_PRODUCTS - countFeaturedOfKind(
        prev.filter((row) => !idSet.has(row.id)),
        true,
      );
      const next = prev.map((row) => {
        if (!idSet.has(row.id)) return row;
        if (!featured) return { ...row, featured: false };
        if (row.featured) return row;
        if (productTracksStock(row) && row.stock <= 0) return row;
        const preorder = isPreorderRow(row);
        if (preorder) {
          if (remainingPreorder <= 0) return row;
          remainingPreorder -= 1;
        } else {
          if (remainingSealed <= 0) return row;
          remainingSealed -= 1;
        }
        return { ...row, featured: true };
      });
      persistRows(next.filter((row) => idSet.has(row.id)));
      return next;
    });
  }, [persistRows]);

  const toggleFeatured = useCallback((id) => {
    setItems((prev) => {
      const current = prev.find((row) => row.id === id);
      if (!current || isDeletedRow(current)) return prev;
      const turningOn = !current.featured;
      if (turningOn && productTracksStock(current) && current.stock <= 0) return prev;
      if (turningOn && featuredSlotsRemaining(prev, current) <= 0) {
        return prev;
      }
      const next = prev.map((row) => (row.id === id ? { ...row, featured: turningOn } : row));
      persistRow(next.find((row) => row.id === id));
      return next;
    });
  }, [persistRow]);

  const toggleComingSoon = useCallback((id) => {
    setItems((prev) => {
      const current = prev.find((row) => row.id === id);
      if (!current || isDeletedRow(current)) return prev;
      const next = prev.map((row) => (
        row.id === id ? { ...row, comingSoon: !row.comingSoon } : row
      ));
      persistRow(next.find((row) => row.id === id));
      return next;
    });
  }, [persistRow]);

  const softDeleteMany = useCallback((ids) => {
    const idSet = new Set(ids);
    const deletedAt = new Date().toISOString();
    setItems((prev) => {
      const next = prev.map((row) => (
        idSet.has(row.id)
          ? { ...row, deletedAt, published: false, featured: false, comingSoon: false }
          : row
      ));
      persistRows(next.filter((row) => idSet.has(row.id)));
      return next;
    });
  }, [persistRows]);

  const restoreMany = useCallback((ids) => {
    const idSet = new Set(ids);
    setItems((prev) => {
      const next = prev.map((row) => (
        idSet.has(row.id)
          ? { ...row, deletedAt: null, deleted: false }
          : row
      ));
      persistRows(next.filter((row) => idSet.has(row.id)));
      return next;
    });
  }, [persistRows]);

  const setStock = useCallback((id, stock) => {
    setItems((prev) => {
      const next = prev.map((row) => {
        if (row.id !== id) return row;
        const nextStock = Math.max(0, stock);
        const preorder = isPreorderRow(row);
        return {
          ...row,
          stock: nextStock,
          ...(preorder ? { preorderLimited: true } : {}),
          featured: productTracksStock({ ...row, stock: nextStock, preorderLimited: preorder ? true : row.preorderLimited }) && nextStock <= 0
            ? false
            : row.featured,
        };
      });
      persistRow(next.find((row) => row.id === id));
      return next;
    });
  }, [persistRow]);

  const decrementStockForCart = useCallback((cartItems) => {
    setItems((prev) => {
      const qtyById = new Map();
      for (const item of cartItems || []) {
        if (!item?.id) continue;
        const row = prev.find((entry) => entry.id === item.id);
        if (!row || !productTracksStock(row)) continue;
        const qty = Math.max(0, Number(item.quantity) || 0);
        if (!qty) continue;
        qtyById.set(item.id, (qtyById.get(item.id) || 0) + qty);
      }
      const next = prev.map((row) => {
        const qty = qtyById.get(row.id);
        if (!qty) return row;
        const nextStock = Math.max(0, row.stock - qty);
        return {
          ...row,
          stock: nextStock,
          ...(isPreorderRow(row) ? { preorderLimited: true } : {}),
          featured: nextStock <= 0 ? false : row.featured,
        };
      });
      persistRows(next.filter((row) => qtyById.has(row.id)));
      return next;
    });
  }, [persistRows]);

  /** Release committed stock / pre-order slots (e.g. an order marked Unpaid). */
  const restockItems = useCallback((entries) => {
    const list = Array.isArray(entries) ? entries : [entries];
    setItems((prev) => {
      const qtyById = new Map(list.filter((i) => i && i.id).map((i) => [i.id, Math.max(0, Number(i.quantity) || 0)]));
      const next = prev.map((row) => {
        const qty = qtyById.get(row.id);
        if (!qty || !productTracksStock(row)) return row;
        return { ...row, stock: Math.max(0, row.stock + qty) };
      });
      persistRows(next.filter((row) => qtyById.has(row.id)));
      return next;
    });
  }, [persistRows]);

  const addProduct = useCallback((input) => {
    const name = input.name?.trim();
    if (!name) return null;

    const line = input.line || "Pokémon TCG";
    const type = input.type === "Pre-order" ? "Pre-order" : "Sealed";
    const price = Math.max(0, Number(input.price) || 0);
    const stock = Math.max(0, Number(input.stock) || 0);
    const maxPerOrder = productMaxPerOrder(input);
    const preorderLimited = type === "Pre-order" && Boolean(input.preorderLimited);
    const cost = input.cost === "" || input.cost == null
      ? roundMoney(price * 0.72)
      : Math.max(0, Number(input.cost) || 0);
    const reorderAt = Math.max(0, Number(input.reorderAt) ?? 3);
    const prefix = line.startsWith("Pokémon") ? "PKM" : "OP";
    const id = `custom-${Date.now()}`;

    let created = null;
    setItems((prev) => {
      const draft = { type, stock, preorderLimited };
      const wantFeatured = Boolean(input.featured) && (!productTracksStock(draft) || stock > 0);
      const featured = wantFeatured && featuredSlotsRemaining(prev, { type }) > 0;
      const row = {
        id,
        sku: `HA-${prefix}-${String(2000 + prev.length)}`,
        name,
        line,
        type,
        price,
        cost,
        stock,
        maxPerOrder,
        reorderAt,
        published: Boolean(input.published),
        featured,
        comingSoon: Boolean(input.comingSoon),
        deletedAt: null,
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
              preorderLimited,
            }
          : { preorderLimited: false }),
      };
      created = row;
      persistRow(row);
      return [...prev, row];
    });
    return created;
  }, [persistRow]);

  const updateProduct = useCallback((id, input) => {
    const name = input.name?.trim();
    if (!name) return false;

    const line = input.line || "Pokémon TCG";
    const type = input.type === "Pre-order" ? "Pre-order" : "Sealed";
    const price = Math.max(0, Number(input.price) || 0);
    const cost = input.cost === "" || input.cost == null
      ? roundMoney(price * 0.72)
      : Math.max(0, Number(input.cost) || 0);
    const stock = Math.max(0, Number(input.stock) || 0);
    const maxPerOrder = productMaxPerOrder(input);
    const preorderLimited = type === "Pre-order" && Boolean(input.preorderLimited);
    const reorderAt = Math.max(0, Number(input.reorderAt) ?? 3);

    let updated = null;
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const draft = { type, stock, preorderLimited };
        const wantFeatured = (typeof input.featured === "boolean" ? input.featured : Boolean(row.featured))
          && (!productTracksStock(draft) || stock > 0);
        const sameKind = isPreorderRow(row) === (type === "Pre-order");
        let featured = false;
        if (wantFeatured) {
          if (row.featured && sameKind) {
            featured = true;
          } else {
            featured = featuredSlotsRemaining(
              prev.filter((other) => other.id !== id),
              { type },
            ) > 0;
          }
        }
        updated = {
          ...row,
          name,
          line,
          type,
          price,
          cost,
          stock,
          maxPerOrder,
          reorderAt,
          published: typeof input.published === "boolean" ? input.published : row.published,
          featured,
          comingSoon: typeof input.comingSoon === "boolean" ? input.comingSoon : Boolean(row.comingSoon),
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
          preorderLimited: type === "Pre-order" ? preorderLimited : false,
        };
        return updated;
      }),
    );
    if (updated) persistRow(updated);
    return Boolean(updated);
  }, [persistRow]);

  const activeItems = useMemo(
    () => items.filter((row) => !isDeletedRow(row)),
    [items],
  );

  const publishedIds = useMemo(
    () => new Set(activeItems.filter((row) => row.published).map((row) => row.id)),
    [activeItems],
  );

  const inventoryById = useMemo(
    () => new Map(activeItems.map((row) => [row.id, row])),
    [activeItems],
  );

  const catalogProducts = useMemo(() => activeItems.map(rowToProduct), [activeItems]);

  const publishedCatalog = useMemo(
    () => activeItems.filter((row) => row.published).map(rowToProduct),
    [activeItems],
  );

  const featuredCountSealed = useMemo(
    () => countFeaturedOfKind(items, false),
    [items],
  );

  const featuredCountPreorder = useMemo(
    () => countFeaturedOfKind(items, true),
    [items],
  );

  const featuredCount = featuredCountSealed + featuredCountPreorder;

  const featuredCatalog = useMemo(
    () => sortStorefrontProducts(
      activeItems
        .filter((row) => row.published && row.featured)
        .map(rowToProduct),
    ),
    [activeItems],
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

  const getFeaturedByCategory = useCallback(
    (category) => {
      if (category === "accessories") return [];
      if (category === "sealed") {
        return featuredCatalog
          .filter((product) => product.tag === "Sealed")
          .slice(0, MAX_FEATURED_PRODUCTS);
      }
      if (category === "preorder") {
        return featuredCatalog
          .filter((product) => product.tag === "Pre-order")
          .slice(0, MAX_FEATURED_PRODUCTS);
      }
      return featuredCatalog.slice(0, MAX_FEATURED_PRODUCTS * 2);
    },
    [featuredCatalog],
  );

  const value = useMemo(
    () => ({
      items,
      activeItems,
      publishedIds,
      inventoryById,
      catalogProducts,
      publishedCatalog,
      featuredCatalog,
      featuredCount,
      featuredCountSealed,
      featuredCountPreorder,
      maxFeatured: MAX_FEATURED_PRODUCTS,
      publishedProducts: publishedCatalog,
      isPublished,
      getProduct,
      getPublishedByCategory,
      getFeaturedByCategory,
      setPublished,
      setPublishedMany,
      togglePublished,
      setFeatured,
      setFeaturedMany,
      toggleFeatured,
      toggleComingSoon,
      softDeleteMany,
      restoreMany,
      setStock,
      decrementStockForCart,
      restockItems,
      addProduct,
      updateProduct,
    }),
    [
      items,
      activeItems,
      publishedIds,
      inventoryById,
      catalogProducts,
      publishedCatalog,
      featuredCatalog,
      featuredCount,
      featuredCountSealed,
      featuredCountPreorder,
      isPublished,
      getProduct,
      getPublishedByCategory,
      getFeaturedByCategory,
      setPublished,
      setPublishedMany,
      togglePublished,
      setFeatured,
      setFeaturedMany,
      toggleFeatured,
      toggleComingSoon,
      softDeleteMany,
      restoreMany,
      setStock,
      decrementStockForCart,
      restockItems,
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
  return {
    ...product,
    stock: row.stock,
    maxPerOrder: productMaxPerOrder(row),
    image: product.image ?? row.image ?? null,
    ...(isPreorderRow(row) ? { preorderLimited: Boolean(row.preorderLimited) } : {}),
  };
}

export { rowToProduct };
