import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./app.js";
import { ROLES } from "../../auth/roles.js";
import { shouldExposeAdminSession } from "../../auth/authSurface.js";

const googleProvider = new GoogleAuthProvider();

/** Mobile + in-app browsers often break signInWithPopup (COOP / blocked windows). */
export function prefersGoogleRedirect() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  if (/FBAN|FBAV|Instagram|Line\/|Twitter|MicroMessenger|WhatsApp/i.test(ua)) return true;
  return false;
}

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
  const raw = String(error?.message || error || "").trim();
  const messages = {
    "auth/invalid-credential": "Invalid email or password.",
    "auth/wrong-password": "Invalid email or password.",
    "auth/user-not-found": "No account found for this email.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/missing-email": "Enter your email address.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/expired-action-code": "This reset link has expired. Request a new one from the sign-in page.",
    "auth/invalid-action-code": "This reset link is invalid or was already used. Request a new one from the sign-in page.",
    "auth/user-disabled": "This account is disabled. Message Hobby Arena PH for help.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/popup-closed-by-user": "Sign-in cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google window. Try again — we’ll use a full-page sign-in.",
    "auth/network-request-failed": "Network issue — check your connection and try again.",
    "auth/internal-error": "Something went wrong with sign-in. Please try again.",
    "auth/account-exists-with-different-credential":
      "This email already uses a different sign-in method. Try Continue with Google, or reset your password if you signed up with email.",
    "auth/operation-not-allowed":
      "That sign-in method isn’t enabled yet. Check Firebase Console → Authentication → Sign-in method.",
    "auth/admin-restricted-operation":
      "That sign-in method isn’t available right now. Please try again, or message Hobby Arena PH for help.",
    "storage/unauthorized":
      "We couldn’t upload your payment proof. Please try a smaller image or PDF, or message Hobby Arena PH for help.",
    "storage/canceled": "Upload was cancelled. Please try again.",
    "storage/retry-limit-exceeded":
      "Upload failed after several tries. Check your connection, use a smaller image or PDF, then try again.",
    "storage/quota-exceeded":
      "Upload couldn’t finish (storage limit). Please message Hobby Arena PH so we can help complete your order.",
    "storage/invalid-format": "That file type isn’t supported. Please upload an image or PDF.",
    "storage/object-not-found": "We couldn’t find that file. Please upload your proof again.",
    "permission-denied":
      "We couldn’t save your order (permission denied). Check Firestore rules, or message Hobby Arena PH for help.",
    "unavailable": "Firebase is temporarily unavailable. Please try again in a moment.",
    "deadline-exceeded": "That request timed out. Check your connection and try again.",
  };
  if (messages[code]) return messages[code];
  return softenFirebaseMessage(raw) || "Something went wrong. Please try again.";
}

/** Rewrite technical / setup errors into guest-style guidance. */
function softenFirebaseMessage(raw) {
  if (!raw) return "";
  const text = raw.toLowerCase();

  if (
    text.includes("firebase_service_account")
    || text.includes("service account")
    || (text.includes("password reset") && text.includes("branded"))
  ) {
    return (
      "Password reset isn’t set up yet. Add FIREBASE_SERVICE_ACCOUNT_JSON "
      + "(Firebase Console → Project settings → Service accounts → Generate new private key), "
      + "then restart the API."
    );
  }

  if (
    text.includes("local api")
    || text.includes("dev:full")
    || text.includes("vercel dev")
    || text.includes("could not reach")
    || text.includes("port 3000")
  ) {
    return (
      "We couldn’t send the email because the local API isn’t running. "
      + "Start it with yarn dev:full so the storefront and /api stay connected."
    );
  }

  if (/email request failed \(\d+\)/.test(text) || /\bfailed \(5\d\d\)/.test(text)) {
    return (
      "We couldn’t send that email right now. Please try again in a few minutes, "
      + "or message Hobby Arena PH if it keeps happening."
    );
  }

  if (text.includes("resend") && (text.includes("api key") || text.includes("not configured"))) {
    return "Email sending isn’t configured yet. Add RESEND_API_KEY to your server env.";
  }

  if (
    text.includes("anonymous auth")
    || text.includes("admin-restricted-operation")
    || text.includes("operation-not-allowed")
  ) {
    return (
      "That sign-in method isn’t available right now. Please try again, "
      + "or message Hobby Arena PH for help."
    );
  }

  if (
    text.includes("storage/unauthorized")
    || (text.includes("unauthorized") && text.includes("storage"))
    || (text.includes("permission denied") && text.includes("upload"))
  ) {
    return (
      "We couldn’t upload your payment proof. Please try a smaller image or PDF, "
      + "or message Hobby Arena PH for help."
    );
  }

  if (text.includes("could not upload your proof") || text.includes("could not upload your file to storage")) {
    return (
      "We couldn’t upload your payment proof. Please try a smaller image or PDF, "
      + "or message Hobby Arena PH for help."
    );
  }

  if (text.includes("firestore is not configured") || text.includes("firebase storage is not configured")) {
    return "Checkout isn’t fully configured yet. Add your Firebase config and try again.";
  }

  if (text.includes("firebase auth is not configured") || text.includes("add your firebase config")) {
    return "Sign-in isn’t configured yet. Add your Firebase web config to .env.local.";
  }

  if (text.includes("timed out") || text.includes("timeout")) {
    return "That request timed out. Check your internet connection and try again.";
  }

  // Avoid dumping raw HTTP / stack noise to shoppers.
  if (/^error:|exception|stack|econnrefused|enotfound|fetch failed|firebaseerror/i.test(raw)) {
    return "Something went wrong. Please try again, or message Hobby Arena PH for help.";
  }

  return raw;
}

/** Password-reset / email API errors — always shopper-friendly. */
export function mapPasswordResetError(error) {
  return mapAuthError(error);
}

/** Checkout, uploads, Firestore — same friendly mapping as auth. */
export function mapFirebaseUserError(error) {
  return mapAuthError(error);
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

async function finishGoogleCredential(firebaseUser) {
  const user = await buildCustomerUser(firebaseUser);
  if (user.isAdmin) {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    throw new Error(ADMIN_CUSTOMER_BLOCK);
  }
  return user;
}

/**
 * Complete a Google redirect sign-in after the page reloads.
 * @returns {Promise<object|null>} customer profile, or null if no redirect pending
 */
export async function completeGoogleRedirectResult() {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  return finishGoogleCredential(result.user);
}

/**
 * Google sign-in. On mobile / in-app browsers uses redirect (returns `{ redirecting: true }`).
 * Desktop uses popup; falls back to redirect if the popup is blocked.
 */
export async function firebaseSignInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");

  const startRedirect = async () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("hobbyarena:googleRedirect", "1");
    }
    await signInWithRedirect(auth, googleProvider);
    return { redirecting: true };
  };

  if (prefersGoogleRedirect()) {
    return startRedirect();
  }

  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return finishGoogleCredential(credential.user);
  } catch (error) {
    const code = error?.code || "";
    if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
      return startRedirect();
    }
    throw error;
  }
}

/**
 * Email/password accounts only. Google-only members have no password to reset —
 * they should use Continue with Google. Firebase may still accept the request
 * without revealing whether the email exists (enumeration protection).
 */
export async function firebaseSendPasswordReset(email) {
  assertNotAdminCustomerEmail(email);
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const continueUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/account`
      : undefined;
  await sendPasswordResetEmail(auth, email.trim(), continueUrl ? { url: continueUrl } : undefined);
}

/** Verify a password-reset oobCode and return the account email. */
export async function firebaseVerifyPasswordResetCode(oobCode) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const code = String(oobCode || "").trim();
  if (!code) throw new Error("This reset link is missing or incomplete. Request a new one from the sign-in page.");
  return verifyPasswordResetCode(auth, code);
}

/** Complete password reset with the oobCode from the email link. */
export async function firebaseConfirmPasswordReset(oobCode, newPassword) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const code = String(oobCode || "").trim();
  const password = String(newPassword || "");
  if (!code) throw new Error("This reset link is missing or incomplete. Request a new one from the sign-in page.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  await confirmPasswordReset(auth, code, password);
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
 * Best-effort Auth session for guest checkout proof uploads.
 * Reuses any existing session (member or anonymous). Returns the uid, or null
 * when Auth is unavailable or Anonymous Auth is disabled.
 *
 * Anonymous Auth is intentionally OFF in this project — Storage rules allow
 * constrained guest writes on order-proofs, so callers must not treat a null
 * result as a hard failure.
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
      console.info("[auth] Anonymous Auth disabled — continuing as guest without a session.");
      return null;
    }
    console.warn("[auth] Anonymous sign-in failed:", error);
    return null;
  }
}
