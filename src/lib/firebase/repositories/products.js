import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";

function productsCollection(db) {
  return collection(db, COLLECTIONS.products);
}

function productRef(db, id) {
  return doc(db, COLLECTIONS.products, id);
}

function normalizeProduct(data, id) {
  return { ...data, id: data.id || id };
}

export function subscribeProducts(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    productsCollection(db),
    (snap) => {
      const items = snap.docs.map((entry) => normalizeProduct(entry.data(), entry.id));
      items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      onData(items);
    },
    (error) => {
      onError?.(error);
      onData([]);
    },
  );
}

export async function upsertProduct(row) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");
  const { id, ...rest } = row;
  await setDoc(
    productRef(db, id),
    { ...rest, id, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function upsertProducts(rows) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");
  const batch = writeBatch(db);
  rows.forEach((row) => {
    const { id, ...rest } = row;
    batch.set(productRef(db, id), { ...rest, id, updatedAt: serverTimestamp() }, { merge: true });
  });
  await batch.commit();
}

export async function removeProduct(id) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");
  await deleteDoc(productRef(db, id));
}
