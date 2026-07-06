import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getDataSource } from "./firebase/config.js";
import { getFirebaseAuth } from "./firebase/app.js";
import { subscribeAllOrders, subscribeCustomerOrders, createOrder, upsertOrder } from "./firebase/repositories/orders.js";
import { isAdminAccount } from "./firebase/auth.js";
import { shouldExposeAdminSession } from "../auth/authSurface.js";
import {
  balanceAfterAllocation,
  getOrderLineItems,
  applyPaymentStatusToLineItem,
  buildStoredTrailAttachment,
  buildTrailAttachment,
  inferLineItemAfterAllocation,
  isPreorderOrder,
  itemNeedsBalanceProof,
  itemNeedsRefundDetails,
  lineItemTrailLabel,
  migrateOrderStatus,
  migratePaymentStatus,
  normalizeLineItem,
  trailEntryShowsAttachment,
  resolveOrderKind,
  resolveOrderKindForItem,
  syncOrderRollup,
  validateAllocationForStatus,
  refundedAmountForOrder,
} from "../data/orderWorkflow.js";
import { preorderBalanceDue, preorderDueNow } from "./preorder.js";
import { migrateLegacyOrderId, sortOrdersByOrderNo } from "./orderIds.js";
import {
  migrateInlineOrderProof,
  resolveOrderProofUrl,
  resolveProofAttachmentUrl,
  ensureTrailEntryAttachment,
  hydrateProofAttachment,
  storeOrderProof,
  storeBalanceProof,
  storeRefundProof,
  stripOrderProofPayload,
} from "./orderProofStorage.js";
import { queueOrderAcknowledgement, queueOrderStatusEmail } from "./emailService.js";
import { resolveOrderStatusEmailType, buildLineItemEmailContext } from "./orderEmailTriggers.js";
import { getEmailBodyOverride } from "./emailTemplatesStore.js";
import { useInventory } from "./inventoryStore.jsx";

const STORAGE_KEY = "hobbyarena:orders";

function clearLegacyOrderStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem("hobbyarena:orders-v");
}

function loadOrders() {
  if (getDataSource() === "firebase") return [];
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortOrdersByOrderNo(
      parsed.map((order) => normalizeOrder(migrateInlineOrderProof(order))),
    );
  } catch {
    return [];
  }
}

function persistOrders(orders) {
  if (getDataSource() === "firebase") return;
  if (typeof window === "undefined") return;
  const slim = orders.map(stripOrderProofPayload);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch (error) {
    console.warn("Could not persist orders:", error);
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
  const trailWithAttachments = trail.map((entry) => {
    const withItem = entry.lineItemId
      ? entry
      : (lineItems.length === 1 && !entry.lineItemId
        ? { ...entry, lineItemId: lineItems[0].id, lineItemName: entry.lineItemName ?? lineItems[0].name }
        : entry);

    const withAttachment = ensureTrailEntryAttachment(withItem, migrated);
    if (!withAttachment.attachment || !trailEntryShowsAttachment(withAttachment)) {
      return withAttachment;
    }

    // Balance/refund proofs resolve to their own file only — never the deposit.
    const kind = withAttachment.attachment.kind;
    const isDepositKind = !kind || kind === "deposit";
    const url = isDepositKind
      ? (resolveProofAttachmentUrl(migrated, withAttachment) || proofUrl)
      : resolveProofAttachmentUrl(migrated, withAttachment);
    const hydratedAttachment = hydrateProofAttachment(withAttachment.attachment, url);
    return hydratedAttachment
      ? { ...withAttachment, attachment: hydratedAttachment }
      : withAttachment;
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

export function isUnseenOrder(order) {
  return order.payment === "Pending Verification" && !order.notificationSeen;
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
  return { id: `email-${Date.now()}`, at: new Date().toISOString(), subject, body, kind, status: "pending", provider: "resend" };
}


const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const firebaseEnabled = getDataSource() === "firebase";
  const [orders, setOrders] = useState(() => (firebaseEnabled ? [] : loadOrders()));
  const [ordersError, setOrdersError] = useState(null);
  const [ordersReady, setOrdersReady] = useState(!firebaseEnabled);
  const syncingRemote = useRef(false);
  const ordersRef = useRef(orders);
  const placingOrderRef = useRef(false);

  const { restockItems, decrementStockForCart } = useInventory();
  const restockRef = useRef(restockItems);
  const decrementRef = useRef(decrementStockForCart);
  useEffect(() => {
    restockRef.current = restockItems;
    decrementRef.current = decrementStockForCart;
  }, [restockItems, decrementStockForCart]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (!firebaseEnabled) return;
    clearLegacyOrderStorage();
  }, [firebaseEnabled]);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;

    const auth = getFirebaseAuth();
    if (!auth) return undefined;

    let unsubFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubFirestore?.();
      setOrdersReady(false);

      if (!user) {
        setOrders([]);
        setOrdersError(null);
        setOrdersReady(true);
        return;
      }

      try {
        const token = await user.getIdTokenResult();
        const admin = shouldExposeAdminSession({
          isAdmin: isAdminAccount(user.email, token.claims),
        });

        unsubFirestore = admin
          ? subscribeAllOrders(
              (remoteOrders) => {
                syncingRemote.current = true;
                setOrdersError(null);
                const normalized = remoteOrders.map((order) =>
                  normalizeOrder(migrateInlineOrderProof(order)),
                );
                setOrders(normalized);
                setOrdersReady(true);
                queueMicrotask(() => {
                  syncingRemote.current = false;
                });
              },
              (error) => {
                console.error("[orders] Admin Firestore sync failed:", error);
                setOrdersError(error?.message || "Could not load orders from Firestore.");
                setOrdersReady(true);
              },
            )
          : subscribeCustomerOrders(
              user.email,
              (remoteOrders) => {
                syncingRemote.current = true;
                setOrdersError(null);
                const normalized = remoteOrders.map((order) =>
                  normalizeOrder(migrateInlineOrderProof(order)),
                );
                setOrders(normalized);
                setOrdersReady(true);
                queueMicrotask(() => {
                  syncingRemote.current = false;
                });
              },
              (error) => {
                console.error("[orders] Customer Firestore sync failed:", error);
                setOrdersError(error?.message || "Could not load your orders from Firestore.");
                setOrdersReady(true);
              },
            );
      } catch (error) {
        console.error("[orders] Auth token failed:", error);
        setOrdersError(error?.message || "Could not verify account for order sync.");
        setOrdersReady(true);
      }
    });

    return () => {
      unsubAuth();
      unsubFirestore?.();
    };
  }, [firebaseEnabled]);

  useEffect(() => {
    if (firebaseEnabled) return;
    persistOrders(orders);
  }, [orders, firebaseEnabled]);

  const api = useMemo(() => {
    const persistOrder = (order) => {
      if (!firebaseEnabled || syncingRemote.current || placingOrderRef.current || !order?.id) return;
      upsertOrder(stripOrderProofPayload(order)).catch((error) => {
        console.error("[orders] Failed to persist order update:", order.id, error);
      });
    };

    const queueStatusEmailForLineItem = (order, prevItem, nextItem, lineItems) => {
      const emailType = resolveOrderStatusEmailType(
        buildLineItemEmailContext(prevItem),
        buildLineItemEmailContext(nextItem),
      );
      if (!emailType) return;

      const rollup = syncOrderRollup(lineItems);
      const payload = {
        emailType,
        bodyOverride: getEmailBodyOverride(emailType),
        order: {
          id: order.id,
          customer: order.customer,
          email: order.email,
          phone: order.phone,
          type: order.type,
          payment: rollup.payment ?? nextItem.payment,
          status: rollup.status ?? nextItem.status,
          total: order.total,
          balanceDue: nextItem.balanceDue ?? rollup.balanceDue ?? order.balanceDue,
          refundAmount: nextItem.refundAmount ?? order.refundAmount ?? 0,
          allocatedQty: nextItem.allocatedQty ?? rollup.allocatedQty ?? order.allocatedQty,
          qty: nextItem.quantity ?? order.qty,
          date: order.date,
          items: order.items,
          lineItems,
          updatedLineItem: {
            id: nextItem.id,
            name: nextItem.name,
            quantity: nextItem.quantity ?? 1,
            tag: nextItem.tag,
            payment: nextItem.payment,
            status: nextItem.status,
            balanceDue: nextItem.balanceDue ?? 0,
            refundAmount: nextItem.refundAmount ?? 0,
            allocatedQty: nextItem.allocatedQty ?? 0,
            depositPaid: nextItem.depositPaid ?? 0,
            lineTotal: nextItem.lineTotal ?? 0,
          },
        },
      };

      queueOrderStatusEmail(payload, ({ ok, result, error }) => {
        if (!ok) {
          console.warn("[orders] Status email failed:", emailType, error);
          return;
        }
        if (result?.skipped) {
          console.warn("[orders] Status email skipped (Resend test mode):", emailType, result?.skipReason);
          return;
        }
        console.info("[orders] Status email sent:", emailType, result?.messageId);
      });
    };

    const placeOrder = async (payload) => {
      const prev = ordersRef.current;
      const summarized = summarizeItems(payload.cartItems);
      const type = payload.type ?? summarized.type;
      const { qty, label } = summarized;
      const id = makeOrderId(prev);
      const initialStatus = payload.initialStatus ?? "Pending Verification";
      const initialPayment = payload.initialPayment ?? "Pending Verification";
      const emailKind = type === "Pre-order" ? "preorder" : "purchase";
      const acknowledgement = mockOrderEmail(
        { ...payload, id, customer: payload.customer, balanceDue: payload.balanceDue },
        emailKind,
      );
      const proofUrl = payload.proofOfPayment || null;

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

      let created = { ...order, ...syncOrderRollup(lineItems) };
      setOrders((current) => [order, ...current]);

      if (firebaseEnabled) {
        placingOrderRef.current = true;
        try {
          const saved = await createOrder(created);
          if (saved.id !== created.id) {
            setOrders((current) => current.map((o) => (o.id === created.id ? saved : o)));
            created = saved;
          }
          console.info("[orders] Saved to Firestore:", created.id);
          if (proofUrl) {
            queueMicrotask(() => storeOrderProof(created.id, proofUrl));
          }
        } catch (error) {
          console.error("[orders] Failed to save new order to Firestore:", error);
          setOrders((current) => current.filter((o) => o.id !== created.id));
          throw error;
        } finally {
          placingOrderRef.current = false;
        }
      } else if (proofUrl) {
        storeOrderProof(id, proofUrl);
      }

      queueOrderAcknowledgement(created, ({ ok, result, error }) => {
        setOrders((current) => current.map((o) => {
          if (o.id !== created.id || !o.emails?.length) return o;
          const emails = [...o.emails];
          const skipped = Boolean(result?.customerSkipped);
          emails[0] = {
            ...emails[0],
            status: ok ? (skipped ? "skipped" : "sent") : "failed",
            provider: "resend",
            messageId: result?.customerMessageId ?? null,
            error: ok ? (skipped ? result?.customerSkipReason : undefined) : error,
            sentAt: ok && !skipped ? new Date().toISOString() : undefined,
          };
          return { ...o, emails };
        }));
      });

      return created;
    };

    const updateOrder = (id, patch) => {
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === id ? { ...o, ...patch } : o));
        const updated = next.find((o) => o.id === id);
        if (updated) persistOrder(updated);
        return next;
      });
    };

    const setPaymentAndStatus = (id, payment, status, lineItemId = null, note = "", attachment, draftAllocatedQty = undefined, draftRefundAmount = undefined) =>
      setOrders((prev) => {
        let persisted = null;
        const next = prev.map((o) => {
          if (o.id !== id) return o;
          const items = getOrderLineItems(o);
          const targetId = lineItemId ?? (items.length === 1 ? items[0].id : null);
          if (!targetId) return o;

          const prevItem = items.find((item) => item.id === targetId);
          if (!prevItem) return o;

          const lineItems = items.map((item) =>
            item.id === targetId
              ? applyPaymentStatusToLineItem(item, payment, status, draftAllocatedQty, draftRefundAmount)
              : item,
          );
          const targetItem = lineItems.find((item) => item.id === targetId);

          const statusUnchanged = migrateOrderStatus(prevItem.status) === migrateOrderStatus(status);
          const paymentUnchanged = prevItem.payment === payment;
          const allocUnchanged = draftAllocatedQty === undefined
            || (targetItem.allocatedQty ?? 0) === (prevItem.allocatedQty ?? 0);
          const refundUnchanged = draftRefundAmount === undefined
            || (targetItem.refundAmount ?? 0) === (prevItem.refundAmount ?? 0);
          if (statusUnchanged && paymentUnchanged && allocUnchanged && refundUnchanged) return o;

          const allocationCheck = validateAllocationForStatus(targetItem, status);
          if (!allocationCheck.ok) return o;

          // Release / restore committed stock for in-stock lines when marked Unpaid.
          // (Only in-stock lines decrement stock at checkout; pre-order lines never do.)
          if (resolveOrderKindForItem(targetItem) === "In-stock") {
            const wasReleased = Boolean(prevItem.stockReleased);
            const nowUnpaid = migratePaymentStatus(payment) === "Unpaid";
            const qty = targetItem.quantity ?? prevItem.quantity ?? 1;
            if (nowUnpaid && !wasReleased) {
              queueMicrotask(() => restockRef.current?.([{ id: targetItem.id, quantity: qty }]));
              targetItem.stockReleased = true;
            } else if (!nowUnpaid && wasReleased) {
              queueMicrotask(() => decrementRef.current?.([{ id: targetItem.id, quantity: qty, tag: targetItem.tag }]));
              targetItem.stockReleased = false;
            }
          }

          let title = "Order updated";
          if (payment !== prevItem.payment && status !== prevItem.status) {
            title = `Payment → ${payment} · Status → ${status}`;
          } else if (payment !== prevItem.payment) {
            title = `Payment → ${payment}`;
          } else {
            title = `Status → ${status}`;
          }

          const seen = payment !== "Pending Verification" ? true : o.notificationSeen;
          const rollup = syncOrderRollup(lineItems);
          const updated = {
            ...o,
            lineItems,
            ...rollup,
            refundAmount: refundedAmountForOrder({ ...o, lineItems }),
            notificationSeen: seen,
            trail: [
              ...o.trail,
              buildTrailEntry({
                title,
                status: targetItem.status,
                payment: targetItem.payment,
                note,
                attachment,
                lineItemId: targetId,
                lineItemName: lineItemTrailLabel(targetItem),
              }),
            ],
          };

          queueStatusEmailForLineItem(o, prevItem, targetItem, lineItems);

          persisted = updated;
          return updated;
        });

        if (persisted) persistOrder(persisted);
        return next;
      });

    const setStatus = (id, status, note = "") =>
      setOrders((prev) => {
        let persisted = null;
        const next = prev.map((o) => {
          if (o.id !== id) return o;
          const updated = {
            ...o,
            status,
            trail: [
              ...o.trail,
              buildTrailEntry({ title: `Status → ${status}`, status, payment: o.payment, note }),
            ],
          };
          persisted = updated;
          return updated;
        });
        if (persisted) persistOrder(persisted);
        return next;
      });

    const setPayment = (id, payment, note = "") =>
      setOrders((prev) => {
        let persisted = null;
        const next = prev.map((o) => {
          if (o.id !== id) return o;
          const seen = payment !== "Pending Verification" ? true : o.notificationSeen;
          const updated = {
            ...o,
            payment,
            notificationSeen: seen,
            trail: [
              ...o.trail,
              buildTrailEntry({ title: `Payment → ${payment}`, status: o.status, payment, note }),
            ],
          };
          persisted = updated;
          return updated;
        });
        if (persisted) persistOrder(persisted);
        return next;
      });

    const addTrailEntry = (id, entry) =>
      setOrders((prev) => {
        let persisted = null;
        const next = prev.map((o) => {
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

          const updated = {
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
          persisted = updated;
          return updated;
        });
        if (persisted) persistOrder(persisted);
        return next;
      });

    const markOrderSeen = (id) =>
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === id ? { ...o, notificationSeen: true } : o));
        const updated = next.find((o) => o.id === id);
        if (updated) persistOrder(updated);
        return next;
      });

    const markAllOrdersSeen = () =>
      setOrders((prev) => {
        const toPersist = prev.filter(isUnseenOrder);
        const next = prev.map((o) => (isUnseenOrder(o) ? { ...o, notificationSeen: true } : o));
        toPersist.forEach((order) => persistOrder({ ...order, notificationSeen: true }));
        return next;
      });

    const setAllocation = (id, allocatedQty, lineItemId = null, note = "") =>
      setOrders((prev) => {
        let persisted = null;
        const next = prev.map((o) => {
          if (o.id !== id) return o;
          const items = getOrderLineItems(o);
          const targetId = lineItemId ?? items.find((item) => resolveOrderKindForItem(item) === "Pre-order")?.id ?? items[0]?.id;
          if (!targetId) return o;

          const prevItem = items.find((item) => item.id === targetId);
          if (!prevItem) return o;

          const lineItems = items.map((item) =>
            item.id === targetId ? inferLineItemAfterAllocation(item, allocatedQty) : item,
          );
          const targetItem = lineItems.find((item) => item.id === targetId);

          const updated = {
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

          queueStatusEmailForLineItem(o, prevItem, targetItem, lineItems);

          persisted = updated;
          return updated;
        });
        if (persisted) persistOrder(persisted);
        return next;
      });

    const submitBalanceProof = async (orderId, lineItemId, proofDataUrl, customerEmail) => {
      const normalizedEmail = String(customerEmail || "").trim().toLowerCase();
      if (!normalizedEmail) throw new Error("Sign in to upload proof of payment.");

      const order = ordersRef.current.find((o) => o.id === orderId);
      if (!order || order.email?.toLowerCase() !== normalizedEmail) {
        throw new Error("Order not found.");
      }

      const items = getOrderLineItems(order);
      const item = items.find((entry) => entry.id === lineItemId);
      if (!item || !itemNeedsBalanceProof(item)) {
        throw new Error("Balance payment proof is not required for this item right now.");
      }
      if (!proofDataUrl?.startsWith("data:")) {
        throw new Error("Please upload an image or PDF receipt.");
      }

      const proofId = `bp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      if (!storeBalanceProof(orderId, lineItemId, proofDataUrl, proofId)) {
        throw new Error("Could not save proof file. Try a smaller image.");
      }

      const priorCount = (order.trail ?? []).filter(
        (entry) => entry.lineItemId === lineItemId
          && entry.attachment?.kind === "balance",
      ).length;
      const attachment = buildStoredTrailAttachment({
        label: priorCount > 0 ? `Balance payment proof #${priorCount + 1}` : "Balance payment proof",
        type: proofDataUrl.startsWith("data:application/pdf") ? "pdf" : "image",
        kind: "balance",
        lineItemId,
        proofId,
      });

      const updated = {
        ...order,
        notificationSeen: false,
        trail: [
          ...(order.trail ?? []),
          buildTrailEntry({
            title: priorCount > 0 ? "Additional balance proof uploaded" : "Balance payment proof uploaded",
            status: item.status,
            payment: "Pending Verification",
            note: `Customer uploaded proof for the remaining balance of ₱${(item.balanceDue ?? 0).toLocaleString("en-PH")}.`,
            attachment,
            lineItemId,
            lineItemName: lineItemTrailLabel(item),
          }),
        ],
      };

      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));

      if (firebaseEnabled) {
        try {
          await upsertOrder(stripOrderProofPayload(updated));
        } catch (error) {
          console.error("[orders] Failed to save balance proof trail:", error);
          throw new Error(error?.message || "Could not submit proof. Please try again.");
        }
      }

      return updated;
    };

    const submitRefundDetails = async (orderId, lineItemId, details, customerEmail) => {
      const normalizedEmail = String(customerEmail || "").trim().toLowerCase();
      if (!normalizedEmail) throw new Error("Sign in to submit refund details.");

      const order = ordersRef.current.find((o) => o.id === orderId);
      if (!order || order.email?.toLowerCase() !== normalizedEmail) {
        throw new Error("Order not found.");
      }

      const items = getOrderLineItems(order);
      const item = items.find((entry) => entry.id === lineItemId);
      if (!item || !itemNeedsRefundDetails(item)) {
        throw new Error("Refund details are not required for this item right now.");
      }

      const method = details?.method === "qr" ? "qr" : "bank";
      const noteLines = [];
      let attachment;

      if (method === "qr") {
        if (!details?.qrDataUrl?.startsWith("data:")) {
          throw new Error("Please upload your QR code image.");
        }
        if (!storeRefundProof(orderId, lineItemId, details.qrDataUrl)) {
          throw new Error("Could not save your QR code. Try a smaller image.");
        }
        attachment = buildStoredTrailAttachment({
          label: "Refund QR code",
          type: details.qrDataUrl.startsWith("data:application/pdf") ? "pdf" : "image",
          kind: "refund",
          lineItemId,
        });
        noteLines.push("Customer shared a payment QR code for the refund.");
        if (details.note?.trim()) noteLines.push(details.note.trim());
      } else {
        const bankName = details?.bankName?.trim();
        const accountName = details?.accountName?.trim();
        const accountNumber = details?.accountNumber?.trim();
        if (!bankName || !accountName || !accountNumber) {
          throw new Error("Please fill in bank name, account name, and account number.");
        }
        noteLines.push(`Refund to ${bankName} — ${accountName} (${accountNumber}).`);
        if (details.note?.trim()) noteLines.push(details.note.trim());
      }

      const updated = {
        ...order,
        notificationSeen: false,
        refundDetails: {
          ...(order.refundDetails ?? {}),
          [lineItemId]: {
            method,
            bankName: details?.bankName?.trim() || null,
            accountName: details?.accountName?.trim() || null,
            accountNumber: details?.accountNumber?.trim() || null,
            note: details?.note?.trim() || null,
            hasQr: method === "qr",
            submittedAt: new Date().toISOString(),
          },
        },
        trail: [
          ...(order.trail ?? []),
          buildTrailEntry({
            title: "Refund details submitted",
            status: item.status,
            payment: item.payment,
            note: noteLines.join(" "),
            attachment,
            lineItemId,
            lineItemName: lineItemTrailLabel(item),
          }),
        ],
      };

      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));

      if (firebaseEnabled) {
        try {
          await upsertOrder(stripOrderProofPayload(updated));
        } catch (error) {
          console.error("[orders] Failed to save refund details:", error);
          throw new Error(error?.message || "Could not submit refund details. Please try again.");
        }
      }

      return updated;
    };

    return {
      placeOrder,
      updateOrder,
      setStatus,
      setPayment,
      setPaymentAndStatus,
      setAllocation,
      addTrailEntry,
      submitBalanceProof,
      submitRefundDetails,
      markOrderSeen,
      markAllOrdersSeen,
    };
  }, [firebaseEnabled]);

  const notificationCount = useMemo(
    () => orders.filter(isUnseenOrder).length,
    [orders],
  );

  const value = useMemo(
    () => ({
      orders,
      ordersError,
      ordersReady,
      notificationCount,
      pendingCount: notificationCount,
      ...api,
    }),
    [orders, ordersError, ordersReady, notificationCount, api],
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
