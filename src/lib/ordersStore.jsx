import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ORDERS as SEED_ORDERS } from "../data/mockData.js";

/**
 * Orders store — checkout creates orders here; admin reads them.
 * MOCK: localStorage. With Firebase, use a Firestore `orders` collection.
 */

const STORAGE_KEY = "hobbyarena:orders";

export function isUnseenOrder(order) {
  return order.payment === "Pending Verification" && !order.notificationSeen;
}

function loadOrders() {
  if (typeof window === "undefined") return SEED_ORDERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_ORDERS;
  } catch {
    return SEED_ORDERS;
  }
}

function makeOrderId(orders) {
  const nums = orders
    .map((o) => parseInt(String(o.id).replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 10420) + 1;
  return `HA-${next}`;
}

function summarizeItems(cartItems) {
  const qty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const label = cartItems
    .map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name))
    .join(", ");
  const hasPreorder = cartItems.some((item) => item.tag === "Pre-order");
  const hasStock = cartItems.some((item) => item.tag !== "Pre-order");
  let type = "In-stock";
  if (hasPreorder && hasStock) type = "Mixed";
  else if (hasPreorder) type = "Pre-order";
  return { qty, label, type };
}

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(loadOrders);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const api = useMemo(() => {
    const placeOrder = (payload) => {
      let created = null;
      setOrders((prev) => {
        const { qty, label, type } = summarizeItems(payload.cartItems);
        const order = {
          id: makeOrderId(prev),
          customer: payload.customer,
          email: payload.email,
          phone: payload.phone,
          type,
          items: label,
          lineItems: payload.cartItems.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            tag: item.tag,
          })),
          qty,
          subtotal: payload.subtotal,
          shippingFee: payload.shippingFee,
          total: payload.total,
          payment: "Pending Verification",
          status: "Pending Verification",
          fulfillment: payload.fulfillment,
          region: payload.fulfillment === "pickup" ? null : payload.region,
          address: payload.fulfillment === "pickup" ? null : payload.address,
          notes: payload.notes || "",
          proofOfPayment: payload.proofOfPayment || null,
          guest: Boolean(payload.guest),
          userId: payload.userId || null,
          date: new Date().toISOString().slice(0, 10),
          notificationSeen: false,
        };
        created = order;
        return [order, ...prev];
      });
      return created;
    };

    const setStatus = (id, status) =>
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

    const setPayment = (id, payment) =>
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const seen = payment !== "Pending Verification" ? true : o.notificationSeen;
          return { ...o, payment, notificationSeen: seen };
        }),
      );

    const markOrderSeen = (id) =>
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, notificationSeen: true } : o)),
      );

    const markAllOrdersSeen = () =>
      setOrders((prev) =>
        prev.map((o) => (isUnseenOrder(o) ? { ...o, notificationSeen: true } : o)),
      );

    return { placeOrder, setStatus, setPayment, markOrderSeen, markAllOrdersSeen };
  }, []);

  const notificationCount = useMemo(
    () => orders.filter(isUnseenOrder).length,
    [orders],
  );

  const value = useMemo(
    () => ({ orders, notificationCount, pendingCount: notificationCount, ...api }),
    [orders, notificationCount, api],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrdersProvider");
  }
  return context;
}

export function getOrdersForEmail(orders, email) {
  if (!email) return [];
  return orders.filter((o) => o.email.toLowerCase() === email.toLowerCase());
}
