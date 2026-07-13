import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let initialized = false;

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isFirebaseAdminConfigured() {
  return Boolean(readServiceAccount());
}

export function getFirebaseAdmin() {
  if (initialized && admin.getApps().length) return admin;

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) return null;

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
    || process.env.VITE_FIREBASE_STORAGE_BUCKET
    || `${serviceAccount.project_id}.firebasestorage.app`;

  // firebase-admin v12+ modular surface: getApps() / cert() (not admin.apps / credential.cert)
  if (!admin.getApps().length) {
    admin.initializeApp({
      credential: admin.cert(serviceAccount),
      storageBucket,
    });
  }

  initialized = true;
  return admin;
}

export function getAdminFirestore() {
  if (!getFirebaseAdmin()) return null;
  return getFirestore();
}

export function getAdminStorageBucket() {
  if (!getFirebaseAdmin()) return null;
  return getStorage().bucket();
}
