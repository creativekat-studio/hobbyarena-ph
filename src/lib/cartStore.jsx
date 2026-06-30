import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearCheckoutConfirmation } from "./checkoutConfirmation.js";
import {
  calcPreorderPricing,
  getCountdownParts,
  getDepositPercent,
  isPreorderProduct,
  preorderBalanceDue,
  preorderDueNow,
} from "./preorder.js";

/**
 * Shopping cart store.
 *
 * MOCK: persists to localStorage. With Firebase, cart can stay client-side until
 * checkout, then create an order document in Firestore.
 */

const STORAGE_KEY = "hobbyarena:cart";

function normalizeCartItem(item) {
  if (!item || typeof item !== "object" || !item.id) return null;
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const price = Number(item.price) || 0;
  const maxQuantity = Math.max(quantity, Number(item.maxQuantity) || (item.tag === "Pre-order" ? 99 : quantity));

  return {
    ...item,
    name: item.name ?? "Product",
    line: item.line ?? "",
    tag: item.tag ?? "Sealed",
    price,
    quantity: Math.min(quantity, maxQuantity),
    maxQuantity,
  };
}

function loadCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCartItem).filter(Boolean);
  } catch {
    return [];
  }
}

function canAddProduct(product) {
  const isPreorder = isPreorderProduct(product);
  if (isPreorder && getCountdownParts(product.preorderEndsAt)?.expired) return false;
  const soldOut = !isPreorder && product.stock <= 0;
  return isPreorder || !soldOut;
}

function maxQuantity(product) {
  if (isPreorderProduct(product)) return 99;
  return Math.max(product.stock, 0);
}

function cartItemDueNow(item) {
  return preorderDueNow(item, item.quantity);
}

function cartItemBalanceDue(item) {
  return preorderBalanceDue(item, item.quantity);
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const api = useMemo(() => {
    const addItem = (product, quantity = 1) => {
      if (!canAddProduct(product)) return false;
      clearCheckoutConfirmation();
      const qty = Math.max(1, quantity);

      setItems((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        const limit = maxQuantity(product);
        const isPreorder = isPreorderProduct(product);
        const depositPercent = isPreorder ? getDepositPercent(product) : null;
        const pricing = isPreorder ? calcPreorderPricing(product.price, depositPercent) : null;

        if (existing) {
          const nextQty = Math.min(existing.quantity + qty, limit);
          if (nextQty === existing.quantity) return prev;
          return prev.map((item) => (item.id === product.id ? { ...item, quantity: nextQty } : item));
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
            image: product.image,
            maxQuantity: limit,
            quantity: Math.min(qty, limit),
            ...(isPreorder
              ? {
                  depositPercent,
                  preorderEndsAt: product.preorderEndsAt ?? null,
                  depositAmount: pricing.deposit,
                  balanceAmount: pricing.balance,
                }
              : {}),
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

  const fullSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + cartItemDueNow(item), 0),
    [items],
  );

  const balanceDue = useMemo(
    () => items.reduce((sum, item) => sum + cartItemBalanceDue(item), 0),
    [items],
  );

  const hasPreorder = useMemo(
    () => items.some((item) => isPreorderProduct(item)),
    [items],
  );

  const value = useMemo(
    () => ({ items, itemCount, subtotal, fullSubtotal, balanceDue, hasPreorder, ...api }),
    [items, itemCount, subtotal, fullSubtotal, balanceDue, hasPreorder, api],
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

export { cartItemDueNow, cartItemBalanceDue };
