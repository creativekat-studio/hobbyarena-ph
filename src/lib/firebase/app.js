import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
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
    auth = getAuth(firebaseApp);
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
    db = getFirestore(firebaseApp);
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
