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
import { serializeFirestoreTime } from "../../orderTimestamps.js";
import { getFirestoreDb } from "../app.js";
import { sanitizeForFirestore } from "../sanitize.js";

function inquiriesCollection(db) {
  return collection(db, COLLECTIONS.inquiries);
}

function inquiryRef(db, id) {
  return doc(db, COLLECTIONS.inquiries, id);
}

function normalizeInquiryStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "handled") return "Handled";
  if (value === "read") return "Read";
  return "New";
}

function inquiryDate(data) {
  return serializeFirestoreTime(data.date)
    || serializeFirestoreTime(data.createdAt)
    || (typeof data.date === "string" ? data.date : null);
}

function normalizeNotificationSeen(data, status) {
  if (data.notificationSeen === true) return true;
  if (data.notificationSeen === false) return false;
  return status !== "New";
}

function normalizeInquiry(data, id) {
  const status = normalizeInquiryStatus(data.status);
  return {
    id,
    name: data.name ?? "",
    email: data.email ?? "",
    subject: data.subject ?? "",
    message: data.message ?? "",
    status,
    date: inquiryDate(data),
    notificationSeen: normalizeNotificationSeen(data, status),
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
      notificationSeen: rest.notificationSeen === true,
    }),
  );

  return normalizeInquiry({ ...rest }, id);
}

export async function updateInquiryFields(id, fields) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured");
  await updateDoc(inquiryRef(db, id), sanitizeForFirestore(fields));
}

export async function updateInquiryStatus(id, status) {
  await updateInquiryFields(id, {
    status,
    notificationSeen: status !== "New",
  });
}

export async function deleteInquiryDocument(id) {
  const db = getFirestoreDb();
  if (!db) throw new Error("Firestore is not configured");
  await deleteDoc(inquiryRef(db, id));
}

export async function markNewInquiriesRead(ids) {
  const db = getFirestoreDb();
  if (!db || !ids.length) return;

  const patch = { status: "Read", notificationSeen: true };
  if (ids.length === 1) {
    await updateDoc(inquiryRef(db, ids[0]), patch);
    return;
  }

  const batch = writeBatch(db);
  ids.forEach((id) => {
    batch.update(inquiryRef(db, id), patch);
  });
  await batch.commit();
}
