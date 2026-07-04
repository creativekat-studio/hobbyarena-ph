import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS, SINGLETON_DOCS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";

function cmsContentRef(db) {
  return doc(db, COLLECTIONS.cms, SINGLETON_DOCS.cmsContent);
}

export function subscribeCmsContent(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    cmsContentRef(db),
    (snap) => onData(snap.exists() ? snap.data() : null),
    (error) => onError?.(error),
  );
}

export async function saveCmsContent(content) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured.");
  await setDoc(
    cmsContentRef(db),
    { ...content, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
