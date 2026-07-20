import { initializeApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { readFirebaseConfig, isFirebaseConfigured } from "./config.js";

let app = null;
let auth = null;
let db = null;
let storage = null;

function shouldUseEmulators() {
  return import.meta.env.VITE_FIREBASE_USE_EMULATORS === "true";
}

/** Lazily initialize Firebase — returns null when env is not configured. */
export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  if (app) return app;

  const { config, isComplete } = readFirebaseConfig();
  if (!isComplete) {
    console.warn("[firebase] Missing config keys — app not initialized.");
    return null;
  }

  app = getApps().length ? getApps()[0] : initializeApp(config);
  return app;
}

export function getFirebaseAuth() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!auth) {
    try {
      // Explicit persistence + popup/redirect resolver — more reliable on mobile Safari.
      auth = initializeAuth(firebaseApp, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
    } catch {
      // Already initialized (HMR / second caller)
      auth = getAuth(firebaseApp);
    }
    if (shouldUseEmulators()) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    }
  }
  return auth;
}

export function getFirestoreDb() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!db) {
    // ignoreUndefinedProperties: admin edit forms produce undefined fields
    // (e.g. depositPercent on sealed items) — Firestore rejects undefined by
    // default, which silently drops product/order writes.
    try {
      db = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
    } catch {
      db = getFirestore(firebaseApp);
    }
    if (shouldUseEmulators()) {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }
    // Offline persistence disabled — it can queue writes indefinitely and
    // cause checkout to hang when server rules reject background updates.
  }
  return db;
}

export function getFirebaseStorage() {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (!storage) {
    storage = getStorage(firebaseApp);
    if (shouldUseEmulators()) {
      connectStorageEmulator(storage, "127.0.0.1", 9199);
    }
  }
  return storage;
}

export { isFirebaseConfigured, getDataSource, useFirebaseData } from "./config.js";
