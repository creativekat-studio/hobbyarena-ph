import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearCheckoutConfirmation } from "./checkoutConfirmation.js";
import {
  calcPreorderPricing,
  getCountdownParts,
  getDepositPercent,
  isPreorderProduct,
  preorderBalanceDue,
  preorderDueNow,
} from "./preorder.js";
import { maxStorefrontQuantity } from "./quantityLimits.js";

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
  const fallbackMax = maxStorefrontQuantity(item);
  const maxQuantity = Math.max(quantity, Number(item.maxQuantity) || fallbackMax);

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
  if (product?.comingSoon) return false;
  const isPreorder = isPreorderProduct(product);
  if (isPreorder && getCountdownParts(product.preorderEndsAt)?.expired) return false;
  const soldOut = !isPreorder && product.stock <= 0;
  return isPreorder || !soldOut;
}

function maxQuantity(product) {
  return maxStorefrontQuantity(product);
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addPulse, setAddPulse] = useState(0);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const openCart = useCallback(() => setDrawerOpen(true), []);
  const closeCart = useCallback(() => setDrawerOpen(false), []);

  const addItem = useCallback((product, quantity = 1, options = {}) => {
    if (!canAddProduct(product)) return false;
    clearCheckoutConfirmation();
    const qty = Math.max(1, Number(quantity) || 1);

    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const limit = Math.max(
        0,
        Number(options.maxQuantity ?? maxQuantity(product)) || 0,
      );
      if (limit <= 0 && !isPreorderProduct(product)) return prev;

      const isPreorder = isPreorderProduct(product);
      const depositPercent = isPreorder ? getDepositPercent(product) : null;
      const pricing = isPreorder ? calcPreorderPricing(product.price, depositPercent) : null;
      const effectiveLimit = isPreorder ? Math.max(limit, 1) : limit;

      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, effectiveLimit);
        if (nextQty === existing.quantity && existing.maxQuantity === effectiveLimit) return prev;
        return prev.map((item) => (
          item.id === product.id
            ? { ...item, quantity: nextQty, maxQuantity: effectiveLimit }
            : item
        ));
      }

      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          line: product.line,
          price: product.price,
          cost: product.cost ?? 0,
          tag: product.tag,
          accent: product.accent,
          image: product.image,
          maxQuantity: effectiveLimit,
          quantity: Math.min(qty, effectiveLimit),
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

    // Pulse the nav cart icon; drawer opens only via View cart / cart button.
    setAddPulse((n) => n + 1);
    return true;
  }, []);

  const setQuantity = useCallback((id, quantity, options = {}) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.id !== id);
      return prev.flatMap((item) => {
        if (item.id !== id) return [item];
        const isPreorder = item.tag === "Pre-order";
        const rawLimit = Number(options.maxQuantity ?? item.maxQuantity);
        const limit = Number.isFinite(rawLimit) && rawLimit >= 0
          ? rawLimit
          : maxStorefrontQuantity(item);
        if (!isPreorder && limit <= 0) return [];
        const effectiveLimit = isPreorder ? Math.max(limit, 1) : limit;
        const nextQty = Math.min(Math.max(Number(quantity) || 1, 1), effectiveLimit);
        return [{ ...item, quantity: nextQty, maxQuantity: effectiveLimit }];
      });
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

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
    () => ({
      items,
      itemCount,
      subtotal,
      fullSubtotal,
      balanceDue,
      hasPreorder,
      drawerOpen,
      addPulse,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
    }),
    [
      items,
      itemCount,
      subtotal,
      fullSubtotal,
      balanceDue,
      hasPreorder,
      drawerOpen,
      addPulse,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      openCart,
      closeCart,
    ],
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
