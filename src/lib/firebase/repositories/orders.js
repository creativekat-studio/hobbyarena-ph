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
import { checkoutProofPersisted, stripOrderProofPayload, uploadOrderProofAttachments } from "../../orderProofStorage.js";
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
        image: item.image ?? null,
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
        ...(entry.emailType ? { emailType: entry.emailType } : {}),
        ...(entry.emailTo ? { emailTo: entry.emailTo } : {}),
        ...(entry.emailStatus ? { emailStatus: entry.emailStatus } : {}),
        ...(Array.isArray(entry.emailLineItems) && entry.emailLineItems.length
          ? {
              emailLineItems: entry.emailLineItems.map((row) => ({
                lineItemId: row.lineItemId,
                lineItemName: row.lineItemName,
                quantity: row.quantity ?? 1,
                allocatedQty: row.allocatedQty ?? 0,
                payment: row.payment ?? null,
                status: row.status ?? null,
              })),
            }
          : {}),
        ...(entry.attachment
          ? {
              attachment: {
                label: entry.attachment.label ?? "Proof of payment",
                type: entry.attachment.type ?? "image",
                stored: true,
                kind: entry.attachment.kind ?? null,
                lineItemId: entry.attachment.lineItemId ?? entry.lineItemId ?? null,
                ...(entry.attachment.proofId ? { proofId: entry.attachment.proofId } : {}),
                ...(entry.attachment.storageUrl
                  ? { storageUrl: entry.attachment.storageUrl, purged: false }
                  : entry.attachment.purged
                    ? { purged: true }
                    : {}),
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
    ...(slim.refundDetails && typeof slim.refundDetails === "object"
      ? { refundDetails: slim.refundDetails }
      : {}),
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

function incrementOrderId(id) {
  const match = String(id).match(/^(HA-\d{8})(\d{4})$/);
  if (!match) return id;
  return `${match[1]}${String(Number(match[2]) + 1).padStart(4, "0")}`;
}

function retagOrderId(order, newId) {
  const oldId = order.id;
  if (!oldId || newId === oldId) return order;

  return {
    ...order,
    id: newId,
    trail: Array.isArray(order.trail)
      ? order.trail.map((entry) => ({
          ...entry,
          id: entry.id?.includes(oldId) ? entry.id.replace(oldId, newId) : entry.id,
        }))
      : order.trail,
    emails: Array.isArray(order.emails)
      ? order.emails.map((entry) => ({
          ...entry,
          subject: entry.subject?.replaceAll?.(oldId, newId) ?? entry.subject?.split(oldId).join(newId),
          body: entry.body?.replaceAll?.(oldId, newId) ?? entry.body?.split(oldId).join(newId),
        }))
      : order.emails,
  };
}

function isOrderIdCollision(error) {
  const code = String(error?.code || "");
  return code === "permission-denied" || code === "already-exists";
}

/** Create a new order — uses create rule (no merge). Retries with the next daily sequence on ID collision. */
export async function createOrder(order, { maxAttempts = 30 } = {}) {
  const db = getFirestoreDb();
  if (!db || !order?.id) throw new Error("Firestore is not configured.");

  let current = order;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    current = await uploadOrderProofAttachments(current);
    // Don't silently save an order whose proof only lives in the customer's
    // browser — surface the failure so checkout can retry.
    if (order.hasProof && !checkoutProofPersisted(current)) {
      throw new Error(
        "Could not upload your proof of payment. Please check your connection and try again with a smaller image or PDF.",
      );
    }
    const payload = prepareOrderDoc(current);
    const ref = orderRef(db, current.id);

    try {
      await withTimeout(
        setDoc(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        SAVE_TIMEOUT_MS,
        "Order save",
      );
      return current;
    } catch (error) {
      if (!isOrderIdCollision(error) || attempt === maxAttempts - 1) throw error;
      current = retagOrderId(current, incrementOrderId(current.id));
    }
  }

  throw new Error("Could not allocate a unique order ID.");
}

export async function upsertOrder(order) {
  const db = getFirestoreDb();
  if (!db || !order?.id) throw new Error("Firestore is not configured.");

  const withProofs = await uploadOrderProofAttachments(order);

  await withTimeout(
    setDoc(
      orderRef(db, withProofs.id),
      { ...prepareOrderDoc(withProofs), updatedAt: serverTimestamp() },
      { merge: true },
    ),
    SAVE_TIMEOUT_MS,
    "Order update",
  );

  return withProofs;
}

/** Customer self-service — append trail entries (balance proof, refund details) without touching other order fields. */
export async function patchCustomerOrderTrail(order) {
  const db = getFirestoreDb();
  if (!db || !order?.id) throw new Error("Firestore is not configured.");

  const withProofs = await uploadOrderProofAttachments(order);
  const compact = compactOrderForFirestore(withProofs);
  const latestEntry = compact.trail?.[compact.trail.length - 1];
  const needsProof = latestEntry?.attachment && !latestEntry.attachment.storageUrl && !latestEntry.attachment.purged;
  if (needsProof) {
    throw new Error("Could not upload proof to storage. Try a smaller image or PDF.");
  }

  const patch = {
    trail: compact.trail,
    notificationSeen: compact.notificationSeen,
    updatedAt: serverTimestamp(),
  };
  if (compact.refundDetails) {
    patch.refundDetails = compact.refundDetails;
  }

  await withTimeout(
    setDoc(orderRef(db, withProofs.id), patch, { merge: true }),
    SAVE_TIMEOUT_MS,
    "Order update",
  );

  return withProofs;
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
