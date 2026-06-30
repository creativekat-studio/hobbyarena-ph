import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ORDERS as SEED_ORDERS } from "../data/mockData.js";
import {
  balanceAfterAllocation,
  getOrderLineItems,
  applyPaymentStatusToLineItem,
  buildTrailAttachment,
  inferLineItemAfterAllocation,
  isPreorderOrder,
  lineItemTrailLabel,
  migrateOrderStatus,
  migratePaymentStatus,
  normalizeLineItem,
  resolveOrderKind,
  resolveOrderKindForItem,
  syncOrderRollup,
  validateAllocationForStatus,
} from "../data/orderWorkflow.js";
import { preorderBalanceDue, preorderDueNow } from "./preorder.js";
import { migrateLegacyOrderId } from "./orderIds.js";
import {
  migrateInlineOrderProof,
  resolveOrderProofUrl,
  storeOrderProof,
  stripOrderProofPayload,
} from "./orderProofStorage.js";

const STORAGE_KEY = "hobbyarena:orders";

export function isUnseenOrder(order) {
  return order.payment === "Pending Verification" && !order.notificationSeen;
}

function loadOrders() {
  if (typeof window === "undefined") return normalizeSeedOrders(SEED_ORDERS);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeSeedOrders(SEED_ORDERS);
    const parsed = JSON.parse(raw);
    const loaded = Array.isArray(parsed) ? parsed.map((order) => normalizeOrder(migrateInlineOrderProof(order))) : normalizeSeedOrders(SEED_ORDERS);
    return loaded;
  } catch {
    return normalizeSeedOrders(SEED_ORDERS);
  }
}

function persistOrders(orders) {
  if (typeof window === "undefined") return;
  const slim = orders.map(stripOrderProofPayload);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    return;
  } catch (error) {
    if (error?.name !== "QuotaExceededError") {
      console.warn("Could not persist orders:", error);
      return;
    }
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch (error) {
    console.warn("Orders storage full — payment proofs are kept for this session only.", error);
  }
}

function normalizeSeedOrders(orders) {
  return orders.map(normalizeOrder);
}

function inferOrderType(order) {
  return resolveOrderKind(order);
}

function normalizeOrder(order) {
  const migrated = migrateLegacyOrderId(order);
  const trail = migrated.trail?.length ? migrated.trail : [{
    id: `trail-${migrated.id}-0`,
    at: `${migrated.date}T12:00:00.000Z`,
    title: "Order recorded",
    status: migrated.status,
    payment: migrated.payment,
    note: "Order imported from seed data.",
  }];
  const type = inferOrderType(migrated);
  const payment = migratePaymentStatus(migrated.payment);
  const status = migrateOrderStatus(migrated.status);
  const lineItems = getOrderLineItems({ ...migrated, payment, status });
  const rollup = syncOrderRollup(lineItems);
  const qty = rollup.qty ?? migrated.qty ?? 1;
  const allocatedQty = rollup.allocatedQty ?? migrated.allocatedQty ?? 0;
  const fullSubtotal = migrated.fullSubtotal ?? migrated.total ?? 0;
  const balanceDue = rollup.balanceDue ?? migrated.balanceDue ?? balanceAfterAllocation({ ...migrated, payment, status, fullSubtotal, lineItems }, allocatedQty);
  const proofUrl = resolveOrderProofUrl(migrated);
  const proofAttachment = attachmentFromProof(proofUrl);
  const trailWithAttachments = trail.map((entry, index) => {
    const withItem = entry.lineItemId
      ? entry
      : (lineItems.length === 1 && !entry.lineItemId
        ? { ...entry, lineItemId: lineItems[0].id, lineItemName: entry.lineItemName ?? lineItems[0].name }
        : entry);
    if (proofAttachment && index === 0 && !withItem.attachment) {
      return { ...withItem, attachment: proofAttachment };
    }
    return withItem;
  });
  return {
    depositPercent: 30,
    ...migrated,
    payment: rollup.payment ?? payment,
    status: rollup.status ?? status,
    qty,
    allocatedQty,
    fullSubtotal,
    balanceDue,
    lineItems,
    emails: migrated.emails?.length ? migrated.emails : [],
    manual: migrated.manual ?? false,
    hasProof: migrated.hasProof || Boolean(proofUrl),
    proofOfPayment: proofUrl,
    ...(type ? { type } : {}),
    trail: trailWithAttachments,
  };
}

function makeOrderId(orders) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const prefix = `HA-${y}${m}${d}`;
  const todayCount = orders.filter((o) => String(o.id).startsWith(prefix)).length;
  return `${prefix}${String(todayCount + 1).padStart(4, "0")}`;
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

function attachmentFromProof(proofUrl, label = "Proof of payment") {
  return buildTrailAttachment(proofUrl, label);
}

function buildTrailEntry({ title, status, payment, note, attachment, lineItemId, lineItemName }) {
  return {
    id: `trail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    title,
    status,
    payment,
    note: note || "",
    ...(attachment ? { attachment } : {}),
    ...(lineItemId ? { lineItemId, lineItemName } : {}),
  };
}

function mockOrderEmail(order, kind) {
  const subject = kind === "preorder"
    ? `Pre-order acknowledgement — ${order.id}`
    : `Purchase acknowledgement — ${order.id}`;
  const body = kind === "preorder"
    ? `Hi ${order.customer}, we received your pre-order ${order.id}. We'll confirm once payment is verified. Balance due: ₱${order.balanceDue ?? 0}.`
    : `Hi ${order.customer}, thank you for your order ${order.id}. We'll confirm once we receive and verify your payment.`;
  return { id: `email-${Date.now()}`, at: new Date().toISOString(), subject, body, kind };
}

const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(loadOrders);

  useEffect(() => {
    persistOrders(orders);
  }, [orders]);

  const api = useMemo(() => {
    const placeOrder = (payload) => {
      let created = null;
      setOrders((prev) => {
        const summarized = summarizeItems(payload.cartItems);
        const type = payload.type ?? summarized.type;
        const { qty, label } = summarized;
        const id = makeOrderId(prev);
        const initialStatus = payload.initialStatus ?? "Pending Verification";
        const initialPayment = payload.initialPayment ?? "Pending Verification";
        const emailKind = type === "Pre-order" ? "preorder" : "purchase";
        const acknowledgement = mockOrderEmail({ ...payload, id, customer: payload.customer, balanceDue: payload.balanceDue }, emailKind);
        const proofUrl = payload.proofOfPayment || null;
        if (proofUrl) {
          storeOrderProof(id, proofUrl);
        }

        const lineItems = payload.cartItems.map((item) => {
          const isPreorder = item.tag === "Pre-order";
          const quantity = item.quantity ?? 1;
          const lineTotal = item.price * quantity;
          const depositPaid = isPreorder ? preorderDueNow(item, quantity) : lineTotal;
          const balanceDueLine = isPreorder ? preorderBalanceDue(item, quantity) : 0;
          return normalizeLineItem({
            id: item.id,
            name: item.name,
            quantity,
            price: item.price,
            lineTotal,
            tag: item.tag,
            line: item.line,
            payment: initialPayment,
            status: initialStatus,
            allocatedQty: 0,
            depositPaid,
            balanceDue: balanceDueLine,
          }, { payment: initialPayment, status: initialStatus });
        });

        const order = {
          id,
          customer: payload.customer,
          email: payload.email,
          phone: payload.phone,
          type,
          items: label,
          lineItems,
          qty,
          subtotal: payload.subtotal,
          shippingFee: payload.shippingFee,
          total: payload.total,
          fullSubtotal: payload.fullSubtotal ?? payload.subtotal,
          balanceDue: payload.balanceDue ?? 0,
          depositPercent: payload.depositPercent ?? 30,
          allocatedQty: 0,
          payment: initialPayment,
          status: initialStatus,
          fulfillment: payload.fulfillment,
          region: payload.fulfillment === "pickup" ? null : payload.region,
          address: payload.fulfillment === "pickup" ? null : payload.address,
          notes: payload.notes || "",
          proofOfPayment: proofUrl,
          hasProof: Boolean(proofUrl),
          guest: Boolean(payload.guest),
          userId: payload.userId || null,
          date: new Date().toISOString().slice(0, 10),
          notificationSeen: false,
          manual: Boolean(payload.manual),
          emails: [acknowledgement],
          trail: lineItems.map((item, index) =>
            buildTrailEntry({
              title: payload.manual ? "Order created by admin" : "Order purchased",
              status: initialStatus,
              payment: initialPayment,
              lineItemId: item.id,
              lineItemName: lineItemTrailLabel(item),
              note: payload.manual
                ? (payload.notes?.trim() || "Manually entered by staff.")
                : "Customer placed order and uploaded proof of payment.",
              attachment: index === 0 ? attachmentFromProof(proofUrl) : undefined,
            }),
          ),
        };
        created = { ...order, ...syncOrderRollup(lineItems) };
        return [order, ...prev];
      });
      return created;
    };

    const updateOrder = (id, patch) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      );
    };

    const setPaymentAndStatus = (id, payment, status, lineItemId = null, note = "", attachment) =>
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const items = getOrderLineItems(o);
          const targetId = lineItemId ?? (items.length === 1 ? items[0].id : null);
          if (!targetId) return o;

          const lineItems = items.map((item) =>
            item.id === targetId ? applyPaymentStatusToLineItem(item, payment, status) : item,
          );
          const targetItem = lineItems.find((item) => item.id === targetId);
          const prevItem = items.find((item) => item.id === targetId);
          if (!prevItem || (prevItem.payment === payment && prevItem.status === status)) return o;

          const allocationCheck = validateAllocationForStatus(prevItem, status);
          if (!allocationCheck.ok) return o;

          let title = "Order updated";
          if (payment !== prevItem.payment && status !== prevItem.status) {
            title = `Payment → ${payment} · Status → ${status}`;
          } else if (payment !== prevItem.payment) {
            title = `Payment → ${payment}`;
          } else {
            title = `Status → ${status}`;
          }

          const seen = payment !== "Pending Verification" ? true : o.notificationSeen;
          return {
            ...o,
            lineItems,
            ...syncOrderRollup(lineItems),
            notificationSeen: seen,
            trail: [
              ...o.trail,
              buildTrailEntry({
                title,
                status,
                payment,
                note,
                attachment,
                lineItemId: targetId,
                lineItemName: lineItemTrailLabel(targetItem),
              }),
            ],
          };
        }),
      );

    const setStatus = (id, status, note = "") =>
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          return {
            ...o,
            status,
            trail: [
              ...o.trail,
              buildTrailEntry({ title: `Status → ${status}`, status, payment: o.payment, note }),
            ],
          };
        }),
      );

    const setPayment = (id, payment, note = "") =>
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const seen = payment !== "Pending Verification" ? true : o.notificationSeen;
          return {
            ...o,
            payment,
            notificationSeen: seen,
            trail: [
              ...o.trail,
              buildTrailEntry({ title: `Payment → ${payment}`, status: o.status, payment, note }),
            ],
          };
        }),
      );

    const addTrailEntry = (id, entry) =>
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const items = getOrderLineItems(o);
          const lineItem = entry.lineItemId
            ? items.find((item) => item.id === entry.lineItemId)
            : null;
          const nextLineItems = entry.status || entry.payment
            ? items.map((item) => {
                if (entry.lineItemId && item.id !== entry.lineItemId) return item;
                if (entry.lineItemId || items.length === 1) {
                  return {
                    ...item,
                    ...(entry.status ? { status: entry.status } : {}),
                    ...(entry.payment ? { payment: entry.payment } : {}),
                  };
                }
                return item;
              })
            : items;

          return {
            ...o,
            lineItems: nextLineItems,
            ...(entry.status || entry.payment ? syncOrderRollup(nextLineItems) : {}),
            trail: [
              ...o.trail,
              buildTrailEntry({
                title: entry.title,
                status: entry.status ?? o.status,
                payment: entry.payment ?? o.payment,
                note: entry.note,
                attachment: entry.attachment,
                lineItemId: entry.lineItemId ?? (items.length === 1 ? items[0].id : undefined),
                lineItemName: entry.lineItemName ?? (lineItem ? lineItemTrailLabel(lineItem) : undefined),
              }),
            ],
          };
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

    const setAllocation = (id, allocatedQty, lineItemId = null, note = "") =>
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const items = getOrderLineItems(o);
          const targetId = lineItemId ?? items.find((item) => resolveOrderKindForItem(item) === "Pre-order")?.id ?? items[0]?.id;
          if (!targetId) return o;

          const lineItems = items.map((item) =>
            item.id === targetId ? inferLineItemAfterAllocation(item, allocatedQty) : item,
          );
          const targetItem = lineItems.find((item) => item.id === targetId);

          return {
            ...o,
            lineItems,
            ...syncOrderRollup(lineItems),
            trail: [
              ...o.trail,
              buildTrailEntry({
                title: `Allocation → ${targetItem.allocatedQty}/${targetItem.quantity ?? 1}`,
                status: targetItem.status,
                payment: targetItem.payment,
                lineItemId: targetId,
                lineItemName: lineItemTrailLabel(targetItem),
                note: note || `Stock allocated for ${targetItem.allocatedQty} of ${targetItem.quantity ?? 1} unit(s).`,
              }),
            ],
          };
        }),
      );

    return {
      placeOrder,
      updateOrder,
      setStatus,
      setPayment,
      setPaymentAndStatus,
      setAllocation,
      addTrailEntry,
      markOrderSeen,
      markAllOrdersSeen,
    };
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
  if (!context) throw new Error("useOrders must be used within an OrdersProvider");
  return context;
}

export function getOrdersForEmail(orders, email) {
  if (!email) return [];
  return orders.filter((o) => o.email.toLowerCase() === email.toLowerCase());
}

export { mockOrderEmail, buildTrailEntry };
