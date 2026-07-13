import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./app.js";
import { ROLES } from "../../auth/roles.js";
import { shouldExposeAdminSession } from "../../auth/authSurface.js";

const googleProvider = new GoogleAuthProvider();

const ADMIN_CUSTOMER_BLOCK =
  "This email is reserved for admin. Sign in at /admin/login instead.";

export function useFirebaseAuth() {
  return isFirebaseConfigured();
}

function adminEmails() {
  const raw = import.meta.env.VITE_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminAccount(email, claims = {}) {
  if (claims?.admin === true) return true;
  const normalized = String(email || "").trim().toLowerCase();
  return adminEmails().includes(normalized);
}

export function assertNotAdminCustomerEmail(email) {
  if (isAdminAccount(email)) {
    throw new Error(ADMIN_CUSTOMER_BLOCK);
  }
}

export function mapAuthError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/user-not-found": "No admin account found for this email.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/popup-closed-by-user": "Sign-in cancelled.",
    "auth/account-exists-with-different-credential": "This email is linked to a different sign-in method.",
  };
  return messages[code] || error?.message || "Authentication failed.";
}

async function tokenClaims(user) {
  if (!user) return {};
  const result = await user.getIdTokenResult();
  return result.claims || {};
}

function resolveAuthProvider(firebaseUser) {
  const providerId = firebaseUser.providerData?.[0]?.providerId || "";
  if (providerId === "google.com") return "google";
  if (providerId === "password") return "password";
  return providerId || "unknown";
}

export async function buildCustomerUser(firebaseUser) {
  const claims = await tokenClaims(firebaseUser);
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Member",
    phone: firebaseUser.phoneNumber || "",
    photoURL: firebaseUser.photoURL || null,
    authProvider: resolveAuthProvider(firebaseUser),
    role: ROLES.CUSTOMER,
    isAdmin: isAdminAccount(firebaseUser.email, claims),
  };
}

export async function buildAdminUser(firebaseUser) {
  const claims = await tokenClaims(firebaseUser);
  if (!isAdminAccount(firebaseUser.email, claims)) {
    throw new Error("This account does not have admin access.");
  }
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || "Admin",
    role: ROLES.ADMIN,
  };
}

export function subscribeToAuthChanges(onCustomer, onAdmin, onReady) {
  const auth = getFirebaseAuth();
  if (!auth) {
    onReady?.();
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    // Anonymous sessions exist only so guest checkout can write proof to Storage.
    // They must not surface as a signed-in customer in the UI.
    if (!firebaseUser || firebaseUser.isAnonymous) {
      onCustomer(null);
      onAdmin(null);
      onReady?.();
      return;
    }

    try {
      const customer = await buildCustomerUser(firebaseUser);
      onCustomer(customer);
      if (shouldExposeAdminSession(customer)) {
        onAdmin({
          uid: customer.uid,
          email: customer.email,
          displayName: customer.displayName,
          role: ROLES.ADMIN,
        });
      } else {
        onAdmin(null);
      }
    } catch {
      onCustomer(null);
      onAdmin(null);
    } finally {
      onReady?.();
    }
  });
}

export async function firebaseSignInCustomer(email, password) {
  assertNotAdminCustomerEmail(email);
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return buildCustomerUser(credential.user);
}

export async function firebaseRegisterCustomer({ name, email, password }) {
  assertNotAdminCustomerEmail(email);
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  return buildCustomerUser(credential.user);
}

export async function firebaseSignInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const credential = await signInWithPopup(auth, googleProvider);
  const user = await buildCustomerUser(credential.user);
  if (user.isAdmin) {
    await signOut(auth);
    throw new Error(ADMIN_CUSTOMER_BLOCK);
  }
  return user;
}

export async function firebaseSignInAdmin(email, password) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return buildAdminUser(credential.user);
}

export async function firebaseSignOut() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

/**
 * Ensure there is a Firebase auth session for guest checkout proof uploads.
 * Reuses any existing session (member or anonymous). Returns the uid, or null
 * when Auth is unavailable. Throws when Anonymous Auth is disabled / blocked.
 */
export async function ensureAnonymousAuth() {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser.uid;
  try {
    const credential = await signInAnonymously(auth);
    return credential.user?.uid || null;
  } catch (error) {
    const code = error?.code || "";
    if (code === "auth/admin-restricted-operation" || code === "auth/operation-not-allowed") {
      throw new Error(
        "Guest checkout needs Anonymous Auth enabled in Firebase Console (Authentication → Sign-in method).",
      );
    }
    throw new Error(mapAuthError(error));
  }
}
