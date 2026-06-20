import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";

/**
 * Per-user wishlist store.
 * MOCK: localStorage keyed by user uid. Requires a logged-in customer.
 */

const STORAGE_KEY = "hobbyarena:wishlists";

function loadAll() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function productSnapshot(product) {
  return {
    id: product.id,
    name: product.name,
    line: product.line,
    price: product.price,
    tag: product.tag,
    accent: product.accent,
    stock: product.stock,
    rating: product.rating,
    reviews: product.reviews,
  };
}

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user, isCustomer } = useAuth();
  const [allWishlists, setAllWishlists] = useState(loadAll);

  const userKey = isCustomer && user?.uid ? user.uid : null;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allWishlists));
  }, [allWishlists]);

  const items = useMemo(
    () => (userKey ? allWishlists[userKey] || [] : []),
    [allWishlists, userKey],
  );

  const isWishlisted = useCallback(
    (productId) => items.some((item) => item.id === productId),
    [items],
  );

  const toggle = useCallback(
    (product) => {
      if (!userKey) return false;
      setAllWishlists((prev) => {
        const current = prev[userKey] || [];
        const exists = current.some((item) => item.id === product.id);
        const next = exists
          ? current.filter((item) => item.id !== product.id)
          : [...current, productSnapshot(product)];
        return { ...prev, [userKey]: next };
      });
      return true;
    },
    [userKey],
  );

  const remove = useCallback(
    (productId) => {
      if (!userKey) return;
      setAllWishlists((prev) => ({
        ...prev,
        [userKey]: (prev[userKey] || []).filter((item) => item.id !== productId),
      }));
    },
    [userKey],
  );

  const value = useMemo(
    () => ({
      items,
      count: items.length,
      canWishlist: Boolean(userKey),
      isWishlisted,
      toggle,
      remove,
    }),
    [items, userKey, isWishlisted, toggle, remove],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
