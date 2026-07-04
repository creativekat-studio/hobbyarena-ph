import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";

/**
 * Stock-hold reservations (in-stock products only).
 *
 * Holds are short-lived reservations placed when a shopper reaches the payment
 * step of checkout. They live in Firestore so races are resolved across devices
 * in real time. `expiresAt` is stored as epoch milliseconds; clients treat a hold
 * as inactive once it passes and opportunistically delete expired docs. (A
 * scheduled Cloud Function could take over the cleanup / enforce atomicity later.)
 */

function holdsCollection(db) {
  return collection(db, COLLECTIONS.stockHolds);
}

function holdRef(db, id) {
  return doc(db, COLLECTIONS.stockHolds, id);
}

function normalizeHold(data, id) {
  return {
    id,
    productId: data.productId ?? "",
    name: data.name ?? null,
    quantity: Number(data.quantity) || 0,
    sessionId: data.sessionId ?? "",
    createdAt: Number(data.createdAt) || 0,
    expiresAt: Number(data.expiresAt) || 0,
  };
}

export function subscribeStockHolds(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    holdsCollection(db),
    (snap) => onData(snap.docs.map((entry) => normalizeHold(entry.data(), entry.id))),
    (error) => onError?.(error),
  );
}

export async function putStockHolds(holds) {
  const db = getFirestoreDb();
  if (!db || !holds.length) return;
  const batch = writeBatch(db);
  holds.forEach((hold) => {
    const { id, ...rest } = hold;
    batch.set(holdRef(db, id), rest);
  });
  await batch.commit();
}

export async function deleteStockHolds(ids) {
  const db = getFirestoreDb();
  if (!db || !ids.length) return;
  if (ids.length === 1) {
    await deleteDoc(holdRef(db, ids[0]));
    return;
  }
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(holdRef(db, id)));
  await batch.commit();
}
