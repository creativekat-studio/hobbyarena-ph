import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";
import { sanitizeForFirestore } from "../sanitize.js";
import { stripOrderProofPayload } from "../../orderProofStorage.js";
import { sortOrdersByOrderNo } from "../../orderIds.js";

const SAVE_TIMEOUT_MS = 25_000;

function ordersCollection(db) {
  return collection(db, COLLECTIONS.orders);
}

function orderRef(db, id) {
  return doc(db, COLLECTIONS.orders, id);
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);
}

/** Strip proof blobs and non-essential fields before Firestore writes. */
export function compactOrderForFirestore(order) {
  const slim = stripOrderProofPayload(order);

  const lineItems = Array.isArray(slim.lineItems)
    ? slim.lineItems.map((item) => sanitizeForFirestore({
        id: item.id,
        name: item.name,
        quantity: item.quantity ?? 1,
        price: item.price ?? 0,
        lineTotal: item.lineTotal ?? 0,
        tag: item.tag ?? null,
        line: item.line ?? null,
        payment: item.payment,
        status: item.status,
        allocatedQty: item.allocatedQty ?? 0,
        depositPaid: item.depositPaid ?? 0,
        balanceDue: item.balanceDue ?? 0,
        refundAmount: item.refundAmount ?? 0,
      }))
    : [];

  const trail = Array.isArray(slim.trail)
    ? slim.trail.map((entry) => sanitizeForFirestore({
        id: entry.id,
        at: entry.at,
        title: entry.title,
        status: entry.status,
        payment: entry.payment,
        note: entry.note ?? "",
        lineItemId: entry.lineItemId ?? null,
        lineItemName: entry.lineItemName ?? null,
        ...(entry.attachment
          ? {
              attachment: {
                label: entry.attachment.label ?? "Proof of payment",
                type: entry.attachment.type ?? "image",
                stored: true,
                kind: entry.attachment.kind ?? null,
                lineItemId: entry.attachment.lineItemId ?? entry.lineItemId ?? null,
              },
            }
          : {}),
      }))
    : [];

  return sanitizeForFirestore({
    id: slim.id,
    customer: slim.customer,
    email: slim.email,
    phone: slim.phone ?? "",
    type: slim.type,
    items: slim.items,
    lineItems,
    qty: slim.qty ?? 1,
    subtotal: slim.subtotal ?? 0,
    shippingFee: slim.shippingFee ?? 0,
    total: slim.total ?? 0,
    fullSubtotal: slim.fullSubtotal ?? slim.total ?? 0,
    balanceDue: slim.balanceDue ?? 0,
    refundAmount: slim.refundAmount ?? 0,
    depositPercent: slim.depositPercent ?? 30,
    allocatedQty: slim.allocatedQty ?? 0,
    payment: slim.payment,
    status: slim.status,
    fulfillment: slim.fulfillment ?? "delivery",
    region: slim.region ?? null,
    address: slim.address ?? null,
    notes: slim.notes ?? "",
    hasProof: Boolean(slim.hasProof),
    guest: Boolean(slim.guest),
    userId: slim.userId ?? null,
    date: slim.date,
    notificationSeen: Boolean(slim.notificationSeen),
    manual: Boolean(slim.manual),
    trail,
  });
}

function prepareOrderDoc(order) {
  return compactOrderForFirestore(order);
}

function mapSnapshot(snap) {
  const orders = snap.docs.map((entry) => ({
    id: entry.id,
    ...entry.data(),
  }));
  return sortOrdersByOrderNo(orders);
}

/** Admin — all orders (requires admin Firestore rules). */
export function subscribeAllOrders(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    ordersCollection(db),
    (snap) => onData(mapSnapshot(snap)),
    (error) => onError?.(error),
  );
}

/** Customer — own orders only (filtered query matches security rules). */
export function subscribeCustomerOrders(email, onData, onError) {
  const db = getFirestoreDb();
  if (!db || !email) {
    onData([]);
    return () => {};
  }

  const q = query(ordersCollection(db), where("email", "==", email.trim()));

  return onSnapshot(
    q,
    (snap) => onData(mapSnapshot(snap)),
    (error) => onError?.(error),
  );
}

/** Create a new order — uses create rule (no merge). */
export async function createOrder(order) {
  const db = getFirestoreDb();
  if (!db || !order?.id) throw new Error("Firestore is not configured.");

  const payload = prepareOrderDoc(order);
  const ref = orderRef(db, order.id);

  await withTimeout(
    setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    SAVE_TIMEOUT_MS,
    "Order save",
  );
}

export async function upsertOrder(order) {
  const db = getFirestoreDb();
  if (!db || !order?.id) throw new Error("Firestore is not configured.");

  await withTimeout(
    setDoc(
      orderRef(db, order.id),
      { ...prepareOrderDoc(order), updatedAt: serverTimestamp() },
      { merge: true },
    ),
    SAVE_TIMEOUT_MS,
    "Order update",
  );
}

export async function upsertOrders(orders) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");
  if (!orders.length) return;

  const batch = writeBatch(db);
  orders.forEach((order) => {
    if (!order?.id) return;
    batch.set(
      orderRef(db, order.id),
      { ...prepareOrderDoc(order), updatedAt: serverTimestamp() },
      { merge: true },
    );
  });
  await withTimeout(batch.commit(), SAVE_TIMEOUT_MS, "Order batch save");
}
