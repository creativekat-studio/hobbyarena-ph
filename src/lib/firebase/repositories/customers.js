import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";
import { sanitizeForFirestore } from "../sanitize.js";

function customersCollection(db) {
  return collection(db, COLLECTIONS.customers);
}

function customerRef(db, uid) {
  return doc(db, COLLECTIONS.customers, uid);
}

/** Admin — all customer profiles (requires admin Firestore rules). */
export function subscribeAllCustomers(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    customersCollection(db),
    (snap) => {
      const rows = snap.docs.map((entry) => ({
        id: entry.id,
        ...entry.data(),
      }));
      rows.sort((a, b) => String(b.joined || "").localeCompare(String(a.joined || "")));
      onData(rows);
    },
    (error) => onError?.(error),
  );
}

/** Signed-in customer — own profile doc only (matches security rules). */
export function subscribeCustomerDoc(uid, onData, onError) {
  const db = getFirestoreDb();
  if (!db || !uid) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    customerRef(db, uid),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData({ id: snap.id, ...snap.data() });
    },
    (error) => onError?.(error),
  );
}

/** @deprecated Use subscribeAllCustomers or subscribeCustomerDoc */
export function subscribeCustomers(onData, onError) {
  return subscribeAllCustomers(onData, onError);
}

export async function upsertCustomerDocument(profile) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");
  const uid = profile.uid;
  if (!uid) throw new Error("Customer uid is required.");

  const { uid: profileUid, ...rest } = profile;

  await setDoc(
    customerRef(db, profileUid),
    {
      ...sanitizeForFirestore(rest),
      uid: profileUid,
      updatedAt: serverTimestamp(),
      lastSignInAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function seedCustomersIfEmpty(rows) {
  const db = getFirestoreDb();
  if (!db || !rows.length) return false;

  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(
      customersCollection(db),
      async (snap) => {
        unsubscribe();
        if (!snap.empty) {
          resolve(false);
          return;
        }
        try {
          await Promise.all(rows.map((row) => upsertCustomerDocument(row)));
          resolve(true);
        } catch (error) {
          reject(error);
        }
      },
      reject,
    );
  });
}
