import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS, SINGLETON_DOCS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";

function designRef(db) {
  return doc(db, COLLECTIONS.cms, SINGLETON_DOCS.cmsDesign);
}

export function subscribeDesignSettings(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    designRef(db),
    (snap) => onData(snap.exists() ? snap.data() : null),
    (error) => onError?.(error),
  );
}

export async function saveDesignSettings(settings) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");
  await setDoc(
    designRef(db),
    { ...settings, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
