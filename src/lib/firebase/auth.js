import {
  browserPopupRedirectResolver,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
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

const EMAIL_IN_USE_PASSWORD =
  "An account with this email already exists. Sign in with your password, or use Continue with Google if you registered that way.";
const EMAIL_IN_USE_GOOGLE =
  "This email is already registered with Google. Use Continue with Google instead of creating a password account.";
const EMAIL_IN_USE_PASSWORD_FOR_GOOGLE =
  "This email already has a password account. Sign in with email and password instead of Google.";

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
    "auth/email-already-in-use": EMAIL_IN_USE_PASSWORD,
    "auth/email-already-in-use-google": EMAIL_IN_USE_GOOGLE,
    "auth/expired-action-code": "This reset link has expired. Request a new one from the sign-in page.",
    "auth/invalid-action-code": "This reset link is invalid or was already used. Request a new one from the sign-in page.",
    "auth/user-disabled": "This account is disabled. Message Hobby Arena PH for help.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/popup-closed-by-user": "Sign-in cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google window. Try again — we’ll use a full-page sign-in.",
    "auth/cancelled-popup-request":
      "Google sign-in is already in progress. Finish or close the Google window, then try again.",
    "auth/timeout": "Google sign-in timed out. Close any open Google windows and try again.",
    "auth/network-request-failed": "Network issue — check your connection and try again.",
    "auth/internal-error": "Something went wrong with sign-in. Please try again.",
    "auth/account-exists-with-different-credential": EMAIL_IN_USE_PASSWORD_FOR_GOOGLE,
    "auth/use-google-signin": EMAIL_IN_USE_GOOGLE,
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
  const ids = (firebaseUser.providerData || []).map((entry) => entry.providerId);
  // Check all linked providers — providerData[0] order is unstable after linking.
  if (ids.includes("google.com")) return "google";
  if (ids.includes("password")) return "password";
  return ids[0] || "unknown";
}

/**
 * Server-side Auth lookup (Admin). Falls back to { configured: false } when
 * the API / service account is unavailable so client Auth errors still apply.
 */
async function lookupAuthEmailStatus(email) {
  try {
    const response = await fetch("/api/auth-email-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email || "").trim().toLowerCase() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        configured: Boolean(data?.configured),
        exists: false,
        providers: [],
        passwordAccountUid: null,
        error: data?.error || `Email check failed (${response.status})`,
      };
    }
    return data;
  } catch {
    return { configured: false, exists: false, providers: [], passwordAccountUid: null, error: true };
  }
}

function isPasswordOnlyStatus(status) {
  if (!status?.exists) return false;
  const providers = status.providers || [];
  const hasGoogle = providers.includes("google.com");
  if (hasGoogle) return false;
  if (providers.includes("password")) return true;
  if (status.passwordAccountUid) return true;
  // Exists with no federated provider listed — treat as email/password.
  return providers.length === 0;
}

async function assertEmailFreeForPasswordSignup(email) {
  const auth = getFirebaseAuth();
  const existing = await signInMethodsForEmail(auth, email);
  if (existing.includes("google.com")) {
    throw authError("auth/email-already-in-use-google", EMAIL_IN_USE_GOOGLE);
  }
  if (existing.includes("password") || existing.length > 0) {
    throw authError("auth/email-already-in-use", EMAIL_IN_USE_PASSWORD);
  }

  const status = await lookupAuthEmailStatus(email);
  if (!status?.configured || !status.exists) return;
  const providers = status.providers || [];
  if (providers.includes("google.com")) {
    throw authError("auth/email-already-in-use-google", EMAIL_IN_USE_GOOGLE);
  }
  if (providers.includes("password") || providers.length > 0 || status.passwordAccountUid) {
    throw authError("auth/email-already-in-use", EMAIL_IN_USE_PASSWORD);
  }
}

/**
 * Before opening the Google popup: if this email already has a password-only
 * Auth account, fail immediately so the shopper does not walk through OAuth.
 */
export async function assertEmailAllowsGoogleSignIn(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return;

  const auth = getFirebaseAuth();
  const clientMethods = await signInMethodsForEmail(auth, normalized);
  if (clientMethods.includes("password") && !clientMethods.includes("google.com")) {
    throw authError("auth/account-exists-with-different-credential", EMAIL_IN_USE_PASSWORD_FOR_GOOGLE);
  }

  const status = await lookupAuthEmailStatus(normalized);

  // Client fetchSignInMethodsForEmail is empty under enumeration protection —
  // Admin lookup is required. If it failed, do not open Google for a typed email.
  if (status?.error && !status?.exists) {
    throw authError(
      "auth/network-request-failed",
      "We couldn’t verify that email before opening Google. Try again in a moment, or sign in with email & password.",
    );
  }

  if (status?.configured && isPasswordOnlyStatus(status)) {
    throw authError("auth/account-exists-with-different-credential", EMAIL_IN_USE_PASSWORD_FOR_GOOGLE);
  }

  // When Admin isn’t configured (local without service account), fall back to
  // whatever the client methods returned (often empty with enumeration protection).
  if (!status?.configured) {
    console.warn("[auth] auth-email-status unavailable — Google pre-check may miss password accounts.");
  }
}

/**
 * After Google returns a credential: reject when a password Auth account
 * already owns this email. Deletes the new Google Auth user when possible so
 * Firebase Console does not keep a second account that "replaced" password.
 */
async function rejectGoogleForPasswordEmail(firebaseUser) {
  try {
    await firebaseUser.delete();
  } catch {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
  }
  throw authError("auth/account-exists-with-different-credential", EMAIL_IN_USE_PASSWORD_FOR_GOOGLE);
}

async function assertGoogleDoesNotReplacePasswordAccount(firebaseUser) {
  const email = firebaseUser?.email;
  if (!email) return;

  const ownProviders = (firebaseUser.providerData || []).map((entry) => entry.providerId);
  // Linked Google+password on the same Auth user — fine; profile lock keeps the original method.
  if (ownProviders.includes("password")) return;

  const status = await lookupAuthEmailStatus(email);
  const passwordUid = status?.passwordAccountUid || null;

  // Separate password Auth user already owns this email — always block (do not
  // rely on creationTime; that race let Google sessions stick and overwrite profiles).
  if (status?.configured && passwordUid && passwordUid !== firebaseUser.uid) {
    await rejectGoogleForPasswordEmail(firebaseUser);
  }

  try {
    await assertEmailAllowsGoogleSignIn(email);
  } catch {
    await rejectGoogleForPasswordEmail(firebaseUser);
  }
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

async function signInMethodsForEmail(auth, email) {
  try {
    return await fetchSignInMethodsForEmail(auth, email);
  } catch {
    // Enumeration protection / network — callers fall back to Auth create/sign-in errors.
    return [];
  }
}

function authError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function firebaseSignInCustomer(email, password) {
  assertNotAdminCustomerEmail(email);
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const normalized = email.trim();
  const methods = await signInMethodsForEmail(auth, normalized);
  if (methods.includes("google.com") && !methods.includes("password")) {
    throw authError("auth/use-google-signin", EMAIL_IN_USE_GOOGLE);
  }
  const status = await lookupAuthEmailStatus(normalized);
  if (
    status?.configured
    && (status.providers || []).includes("google.com")
    && !(status.providers || []).includes("password")
  ) {
    throw authError("auth/use-google-signin", EMAIL_IN_USE_GOOGLE);
  }
  const credential = await signInWithEmailAndPassword(auth, normalized, password);
  return buildCustomerUser(credential.user);
}

export async function firebaseRegisterCustomer({ name, email, password }) {
  assertNotAdminCustomerEmail(email);
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");
  const normalized = email.trim();
  await assertEmailFreeForPasswordSignup(normalized);
  try {
    const credential = await createUserWithEmailAndPassword(auth, normalized, password);
    await updateProfile(credential.user, { displayName: name.trim() });
    return buildCustomerUser(credential.user);
  } catch (error) {
    if (error?.code === "auth/email-already-in-use") {
      const again = await signInMethodsForEmail(auth, normalized);
      if (again.includes("google.com") && !again.includes("password")) {
        throw authError("auth/email-already-in-use-google", EMAIL_IN_USE_GOOGLE);
      }
      const status = await lookupAuthEmailStatus(normalized);
      if (status?.configured && (status.providers || []).includes("google.com")) {
        throw authError("auth/email-already-in-use-google", EMAIL_IN_USE_GOOGLE);
      }
      throw authError("auth/email-already-in-use", EMAIL_IN_USE_PASSWORD);
    }
    throw error;
  }
}

async function finishGoogleCredential(firebaseUser) {
  await assertGoogleDoesNotReplacePasswordAccount(firebaseUser);
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

/** True while a Google popup sign-in is in flight — AuthProvider must not publish yet. */
let googlePopupSignInPending = false;

export function isGooglePopupSignInPending() {
  return googlePopupSignInPending;
}

/**
 * Capture the Window opened by Firebase signInWithPopup so we can close it.
 * The SDK often resolves before /__/auth/handler calls window.close(), leaving
 * a blank popup while the main tab would otherwise look signed-in.
 */
function trackNextAuthPopup() {
  if (typeof window === "undefined") {
    return { getPopup: () => null, restore: () => {} };
  }
  let popup = null;
  const originalOpen = window.open.bind(window);
  window.open = (...args) => {
    const opened = originalOpen(...args);
    if (opened) popup = opened;
    return opened;
  };
  return {
    getPopup: () => popup,
    restore: () => {
      window.open = originalOpen;
    },
  };
}

/** Force-close the OAuth window; do not block the UI for long. */
async function closeAuthPopup(popup) {
  if (!popup) return;
  for (let i = 0; i < 5; i += 1) {
    try {
      if (popup.closed) return;
      popup.close();
    } catch {
      // ignore
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Google sign-in via popup. Holds the app session until we close the popup
 * window (Firebase often returns the credential while /__/auth/handler is
 * still a blank open window — especially with silent prompt=none).
 */
export async function firebaseSignInWithGoogle({ email } = {}) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not configured.");

  const emailHint = String(email || "").trim().toLowerCase();
  if (emailHint) {
    await assertEmailAllowsGoogleSignIn(emailHint);
  }
  // Always force the account UI. login_hint alone triggers prompt=none, which
  // hangs on a blank /__/auth/handler for a long time on this proxy setup.
  googleProvider.setCustomParameters(
    emailHint
      ? { prompt: "select_account", login_hint: emailHint }
      : { prompt: "select_account" },
  );

  // Already signed in with Google from a prior completed attempt — no new popup.
  if (!googlePopupSignInPending) {
    const existing = auth.currentUser;
    if (existing && !existing.isAnonymous) {
      const providers = (existing.providerData || []).map((entry) => entry.providerId);
      if (providers.includes("google.com")) {
        return finishGoogleCredential(existing);
      }
    }
  }

  googlePopupSignInPending = true;
  const tracker = trackNextAuthPopup();

  // Close the blank handler as soon as Auth has a Google user — don't wait for
  // signInWithPopup's promise (it can lag while the window spins).
  const earlyClose = setInterval(() => {
    const popup = tracker.getPopup();
    const user = auth.currentUser;
    if (!popup || popup.closed || !user || user.isAnonymous) return;
    const providers = (user.providerData || []).map((entry) => entry.providerId);
    if (providers.includes("google.com")) {
      closeAuthPopup(popup);
    }
  }, 150);

  try {
    let credential;
    try {
      credential = await Promise.race([
        signInWithPopup(auth, googleProvider, browserPopupRedirectResolver),
        rejectAfterGooglePopupTimeout(90_000),
      ]);
    } finally {
      clearInterval(earlyClose);
      tracker.restore();
    }

    await closeAuthPopup(tracker.getPopup());
    return finishGoogleCredential(credential.user);
  } catch (error) {
    clearInterval(earlyClose);
    tracker.restore();
    await closeAuthPopup(tracker.getPopup());

    const code = error?.code || "";
    const conflictEmail = String(
      error?.customData?.email || error?.email || emailHint || "",
    ).trim().toLowerCase();

    if (code === "auth/account-exists-with-different-credential") {
      throw authError("auth/account-exists-with-different-credential", EMAIL_IN_USE_PASSWORD_FOR_GOOGLE);
    }

    if (code === "auth/timeout") {
      if (auth.currentUser) await signOut(auth);
      throw error;
    }

    if (code === "auth/popup-closed-by-user" && conflictEmail) {
      try {
        await assertEmailAllowsGoogleSignIn(conflictEmail);
      } catch (conflict) {
        if (auth.currentUser) await signOut(auth);
        throw conflict;
      }
      throw error;
    }

    if (code === "auth/popup-closed-by-user") {
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        const providers = (auth.currentUser.providerData || []).map((entry) => entry.providerId);
        if (providers.includes("google.com")) {
          return finishGoogleCredential(auth.currentUser);
        }
      }
      throw error;
    }

    if (code === "auth/cancelled-popup-request") {
      throw authError(
        "auth/cancelled-popup-request",
        "Google sign-in is already in progress. Finish or close the Google window, then try again.",
      );
    }

    if (code === "auth/popup-blocked") {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("hobbyarena:googleRedirect", "1");
      }
      await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
      return { redirecting: true };
    }

    if (auth.currentUser && code) {
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
    }

    throw error;
  } finally {
    clearInterval(earlyClose);
    googlePopupSignInPending = false;
  }
}

function rejectAfterGooglePopupTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(authError(
        "auth/timeout",
        "Google sign-in timed out. Close the Google window and try again.",
      ));
    }, ms);
  });
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
