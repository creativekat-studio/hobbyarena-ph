import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS, SINGLETON_DOCS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";

function catalogSettingsRef(db) {
  return doc(db, COLLECTIONS.catalog, SINGLETON_DOCS.catalogSettings);
}

export function subscribeCatalogSettings(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    catalogSettingsRef(db),
    (snap) => onData(snap.exists() ? snap.data() : null),
    (error) => onError?.(error),
  );
}

export async function saveCatalogSettings(catalog) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");
  await setDoc(
    catalogSettingsRef(db),
    { ...catalog, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
