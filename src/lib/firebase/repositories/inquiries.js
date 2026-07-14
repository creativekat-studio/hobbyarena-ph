import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { COLLECTIONS } from "../../../data/firestoreSchema.js";
import { getFirestoreDb } from "../app.js";
import { sanitizeForFirestore } from "../sanitize.js";

function inquiriesCollection(db) {
  return collection(db, COLLECTIONS.inquiries);
}

function inquiryRef(db, id) {
  return doc(db, COLLECTIONS.inquiries, id);
}

function normalizeInquiry(data, id) {
  return {
    id,
    name: data.name ?? "",
    email: data.email ?? "",
    subject: data.subject ?? "",
    message: data.message ?? "",
    status: data.status ?? "New",
    date: data.date ?? null,
  };
}

export function subscribeInquiries(onData, onError) {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => {};
  }

  return onSnapshot(
    inquiriesCollection(db),
    (snap) => {
      const rows = snap.docs.map((entry) => normalizeInquiry(entry.data(), entry.id));
      rows.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      onData(rows);
    },
    (error) => onError?.(error),
  );
}

export async function createInquiryDocument(inquiry) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured");

  const { id, ...rest } = inquiry;
  if (!id) throw new Error("Inquiry id is required");

  await setDoc(
    inquiryRef(db, id),
    sanitizeForFirestore({
      name: rest.name ?? "",
      email: rest.email ?? "",
      subject: rest.subject ?? "",
      message: rest.message ?? "",
      status: rest.status ?? "New",
      date: rest.date ?? new Date().toISOString(),
    }),
  );

  return normalizeInquiry({ ...rest }, id);
}

export async function updateInquiryStatus(id, status) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured");
  await updateDoc(inquiryRef(db, id), { status });
}

export async function deleteInquiryDocument(id) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured");
  await deleteDoc(inquiryRef(db, id));
}

export async function markNewInquiriesRead(ids) {
  const db = getFirestoreDb();
  if (!db || !ids.length) return;

  if (ids.length === 1) {
    await updateDoc(inquiryRef(db, ids[0]), { status: "Read" });
    return;
  }

  const batch = writeBatch(db);
  ids.forEach((id) => {
    batch.update(inquiryRef(db, id), { status: "Read" });
  });
  await batch.commit();
}
