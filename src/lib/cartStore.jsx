import { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * Shopping cart store.
 *
 * MOCK: persists to localStorage. With Firebase, cart can stay client-side until
 * checkout, then create an order document in Firestore.
 */

const STORAGE_KEY = "hobbyarena:cart";

function loadCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function canAddProduct(product) {
  const isPreorder = product.tag === "Pre-order";
  const soldOut = !isPreorder && product.stock <= 0;
  return isPreorder || !soldOut;
}

function maxQuantity(product) {
  if (product.tag === "Pre-order") return 99;
  return Math.max(product.stock, 0);
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const api = useMemo(() => {
    const addItem = (product) => {
      if (!canAddProduct(product)) return false;

      setItems((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        const limit = maxQuantity(product);

        if (existing) {
          if (existing.quantity >= limit) return prev;
          return prev.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          );
        }

        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            line: product.line,
            price: product.price,
            tag: product.tag,
            accent: product.accent,
            maxQuantity: limit,
            quantity: 1,
          },
        ];
      });
      return true;
    };

    const setQuantity = (id, quantity) => {
      setItems((prev) => {
        if (quantity <= 0) return prev.filter((item) => item.id !== id);
        return prev.map((item) => {
          if (item.id !== id) return item;
          const nextQty = Math.min(Math.max(quantity, 1), item.maxQuantity);
          return { ...item, quantity: nextQty };
        });
      });
    };

    const removeItem = (id) => setItems((prev) => prev.filter((item) => item.id !== id));

    const clearCart = () => setItems([]);

    return { addItem, setQuantity, removeItem, clearCart };
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, itemCount, subtotal, ...api }),
    [items, itemCount, subtotal, api],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
