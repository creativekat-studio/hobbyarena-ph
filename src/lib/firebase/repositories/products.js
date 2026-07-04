import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";
import { seedInventory } from "../../inventorySeed.js";

const LOCAL_INVENTORY_KEY = "hobbyarena:inventory";

function loadLocalInventory() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_INVENTORY_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return Array.isArray(stored) && stored.length ? stored : null;
  } catch {
    return null;
  }
}

function productsCollection(db) {
  return collection(db, COLLECTIONS.products);
}

function productRef(db, id) {
  return doc(db, COLLECTIONS.products, id);
}

function normalizeProduct(data, id) {
  return { ...data, id: data.id || id };
}

export async function seedProductsIfEmpty(rows = seedInventory()) {
  const db = getFirestoreDb();
  if (!db) return false;

  const snap = await getDocs(productsCollection(db));
  if (!snap.empty) return false;

  const batch = writeBatch(db);
  rows.forEach((row) => {
    batch.set(productRef(db, row.id), {
      ...row,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return true;
}

export function subscribeProducts(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData(seedInventory());
    return () => {};
  }

  let seeded = false;

  return onSnapshot(
    productsCollection(db),
    async (snap) => {
      if (snap.empty) {
        if (!seeded) {
          seeded = true;
          try {
            const local = loadLocalInventory();
            await seedProductsIfEmpty(local || seedInventory());
          } catch (error) {
            onError?.(error);
            onData(seedInventory());
          }
          return;
        }
        onData(seedInventory());
        return;
      }

      const items = snap.docs.map((entry) => normalizeProduct(entry.data(), entry.id));
      items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      onData(items);
    },
    (error) => {
      onError?.(error);
      onData(seedInventory());
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
