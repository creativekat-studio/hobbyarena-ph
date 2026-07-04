import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { COLLECTIONS, SINGLETON_DOCS } from "../../data/firestoreSchema.js";
import { getFirestoreDb, isFirebaseConfigured } from "./app.js";
import { readFirebaseConfig } from "./config.js";

/**
 * Write + read a health doc to verify Firestore is reachable.
 * Requires Firestore rules to allow admin writes to _meta/health
 * (or temporary open rules during setup — see docs/FIREBASE-SETUP.md).
 */
export async function testFirestoreConnection() {
  if (!isFirebaseConfigured()) {
    return {
      ok: false,
      stage: "config",
      message: "Firebase env vars are not set. Copy .env.example → .env.local and fill in your project config.",
      missing: readFirebaseConfig().missing,
    };
  }

  const db = getFirestoreDb();
  if (!db) {
    return {
      ok: false,
      stage: "init",
      message: "Firebase config is incomplete — could not initialize Firestore.",
      missing: readFirebaseConfig().missing,
    };
  }

  const healthRef = doc(db, COLLECTIONS.meta, SINGLETON_DOCS.health);

  try {
    await setDoc(healthRef, {
      ping: Date.now(),
      app: "hobbyarena",
      checkedAt: serverTimestamp(),
    }, { merge: true });

    const snap = await getDoc(healthRef);
    if (!snap.exists()) {
      return { ok: false, stage: "read", message: "Write succeeded but read failed." };
    }

    return {
      ok: true,
      stage: "done",
      message: "Firestore read/write OK.",
      projectId: readFirebaseConfig().config.projectId,
      data: snap.data(),
    };
  } catch (error) {
    const code = error?.code || "unknown";
    let hint = "Check Firestore is enabled and security rules allow this test.";
    if (code === "permission-denied") {
      hint = "Permission denied — deploy firestore.rules or use temporary test rules (see docs/FIREBASE-SETUP.md).";
    }
    if (code === "unavailable") {
      hint = "Firestore unavailable — confirm the database is created in Firebase Console.";
    }

    return {
      ok: false,
      stage: "firestore",
      message: error?.message || "Firestore test failed.",
      code,
      hint,
    };
  }
}
