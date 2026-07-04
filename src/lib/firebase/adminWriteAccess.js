import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "./app.js";
import { isAdminAccount } from "./auth.js";
import { useFirebaseData } from "./config.js";

/** Subscribe to whether the signed-in Firebase user may write admin-only collections. */
export function subscribeAdminWriteAccess(onAccess) {
  const auth = getFirebaseAuth();
  if (!auth) {
    onAccess(false);
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onAccess(false);
      return;
    }
    try {
      const token = await user.getIdTokenResult();
      onAccess(isAdminAccount(user.email, token.claims));
    } catch {
      onAccess(false);
    }
  });
}

/** { ready, allowed } — ready once auth has been checked at least once. */
export function useAdminFirestoreWrite() {
  const firebaseEnabled = useFirebaseData();
  const [access, setAccess] = useState({ ready: !firebaseEnabled, allowed: false });

  useEffect(() => {
    if (!firebaseEnabled) {
      setAccess({ ready: true, allowed: false });
      return undefined;
    }

    setAccess({ ready: false, allowed: false });
    return subscribeAdminWriteAccess((allowed) => {
      setAccess({ ready: true, allowed });
    });
  }, [firebaseEnabled]);

  return access;
}
