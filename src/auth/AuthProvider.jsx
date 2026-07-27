import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCustomerProfile, recordCustomerFromAuth, resolveStableAuthProvider, updateCustomerProfile, upsertCustomerProfile } from "../lib/customersStore.jsx";
import { isFirebaseConfigured } from "../lib/firebase/config.js";
import { requestPasswordReset } from "../lib/emailService.js";
import { getEmailBodyOverride } from "../lib/emailTemplatesStore.js";
import {
  buildCustomerUser,
  completeGoogleRedirectResult,
  firebaseRegisterCustomer,
  firebaseSignInAdmin,
  firebaseSignInCustomer,
  firebaseSignInWithGoogle,
  isAdminAccount,
  firebaseSignOut,
  mapAuthError,
  mapPasswordResetError,
  subscribeToAuthChanges,
  useFirebaseAuth,
  isGooglePopupSignInPending,
} from "../lib/firebase/auth.js";
import { getFirebaseAuth } from "../lib/firebase/app.js";

/**
 * Auth layer for Hobby Arena.
 * Uses Firebase Auth when configured; falls back to local mock sessions.
 */

const STORAGE_KEY = "hobbyarena:auth";

const DEMO_ADMIN = {
  email: "admin@hobbyarena.ph",
  password: "admin1234",
  displayName: "Arena Admin",
};

import { ROLES } from "./roles.js";
import { clearAuthSurface, setAuthSurface, shouldExposeCustomerSession } from "./authSurface.js";

export { ROLES } from "./roles.js";

const AuthContext = createContext(null);

function readSessions() {
  if (typeof window === "undefined") {
    return { customer: null, admin: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { customer: null, admin: null };

    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === "object" && ("customer" in parsed || "admin" in parsed)) {
      return {
        customer: parsed.customer ?? null,
        admin: parsed.admin ?? null,
      };
    }

    if (parsed?.role === ROLES.ADMIN) {
      return { customer: null, admin: parsed };
    }
    if (parsed?.role === ROLES.CUSTOMER) {
      return { customer: parsed, admin: null };
    }

    return { customer: null, admin: null };
  } catch {
    return { customer: null, admin: null };
  }
}

function writeSessions(customer, admin) {
  if (typeof window === "undefined") return;
  if (!customer && !admin) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ customer, admin }));
}

function makeUid(email) {
  return `mock_${btoa(unescape(encodeURIComponent(email))).replace(/[^a-z0-9]/gi, "").slice(0, 16)}`;
}

function syncCustomerProfile(user) {
  if (!user?.email) return user;
  const saved = getCustomerProfile(user.email);
  const payload = {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    phone: saved?.phone || user.phone || "",
    photoURL: user.photoURL || saved?.photoURL || "",
    authProvider: resolveStableAuthProvider(
      saved?.authProvider,
      user.authProvider || saved?.authProvider || "unknown",
    ),
  };
  // Never blank marketingOptIn on auth sync — keep whatever Firebase already has.
  if (Object.prototype.hasOwnProperty.call(user, "marketingOptIn")) {
    payload.marketingOptIn = Boolean(user.marketingOptIn);
  } else if (saved && Object.prototype.hasOwnProperty.call(saved, "marketingOptIn")) {
    payload.marketingOptIn = Boolean(saved.marketingOptIn);
  }
  upsertCustomerProfile(payload);
  const updated = getCustomerProfile(user.email);
  return {
    ...user,
    displayName: updated?.name || saved?.name || user.displayName,
    phone: updated?.phone || saved?.phone || user.phone || "",
    marketingOptIn: Boolean(updated?.marketingOptIn ?? saved?.marketingOptIn ?? user.marketingOptIn),
    ...((updated?.consent || saved?.consent) ? { consent: updated?.consent || saved?.consent } : {}),
  };
}

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const firebaseEnabled = useFirebaseAuth();

  const persistMock = useCallback((nextCustomer, nextAdmin) => {
    setCustomer(nextCustomer);
    setAdmin(nextAdmin);
    writeSessions(nextCustomer, nextAdmin);
  }, []);

  const publishCustomerSession = useCallback((profile) => {
    if (!profile) {
      setCustomer(null);
      return null;
    }
    if (!profile.isAdmin) {
      recordCustomerFromAuth(profile);
    }
    const visible = shouldExposeCustomerSession(profile)
      ? syncCustomerProfile(profile)
      : null;
    setCustomer(visible);
    return visible;
  }, []);

  const reconcileCustomerSession = useCallback(async () => {
    if (!firebaseEnabled) return null;
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) {
      setCustomer(null);
      return null;
    }
    try {
      const user = await buildCustomerUser(auth.currentUser);
      return publishCustomerSession(user);
    } catch {
      setCustomer(null);
      return null;
    }
  }, [firebaseEnabled, publishCustomerSession]);

  useEffect(() => {
    if (firebaseEnabled) {
      let cancelled = false;

      // Finish Google redirect before/while auth subscription settles (mobile).
      completeGoogleRedirectResult()
        .then((user) => {
          if (cancelled || !user) return;
          setAuthSurface("customer");
          publishCustomerSession(user);
          try {
            window.sessionStorage.removeItem("hobbyarena:googleRedirect");
            window.sessionStorage.removeItem("hobbyarena:authError");
          } catch {
            // ignore
          }
        })
        .catch((error) => {
          if (cancelled) return;
          try {
            window.sessionStorage.setItem(
              "hobbyarena:authError",
              mapAuthError(error),
            );
            window.sessionStorage.removeItem("hobbyarena:googleRedirect");
          } catch {
            // ignore
          }
        });

      const unsubscribe = subscribeToAuthChanges(
        (nextCustomer) => {
          // Google popup can establish Auth before the window closes — wait for
          // signInWithGoogle to finish so the account page does not flip early.
          if (isGooglePopupSignInPending()) return;
          publishCustomerSession(nextCustomer);
        },
        setAdmin,
        () => setLoading(false),
      );
      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    const sessions = readSessions();
    setCustomer(sessions.customer);
    setAdmin(sessions.admin);
    setLoading(false);

    function handleStorage(event) {
      if (event.key === STORAGE_KEY) {
        const next = readSessions();
        setCustomer(next.customer);
        setAdmin(next.admin);
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [firebaseEnabled, publishCustomerSession]);

  const signInCustomer = useCallback(async (email, password) => {
    if (!email?.trim() || !password) {
      throw new Error("Email and password are required.");
    }

    if (firebaseEnabled) {
      try {
        if (isAdminAccount(email.trim())) {
          throw new Error("This email is reserved for admin. Sign in at /admin/login instead.");
        }
        setAuthSurface("customer");
        const user = await firebaseSignInCustomer(email, password);
        return publishCustomerSession(user);
      } catch (error) {
        const message = String(error?.message || "");
        if (message.includes("reserved for admin")) throw error;
        throw new Error(mapAuthError(error));
      }
    }

    const trimmed = email.trim();
    const saved = getCustomerProfile(trimmed);
    const nextUser = {
      uid: makeUid(trimmed),
      email: trimmed,
      displayName: saved?.name || trimmed.split("@")[0],
      phone: saved?.phone || "",
      role: ROLES.CUSTOMER,
      ...(saved?.consent ? { consent: saved.consent } : {}),
    };
    const { admin: currentAdmin } = readSessions();
    persistMock(nextUser, currentAdmin);
    return nextUser;
  }, [firebaseEnabled, persistMock, publishCustomerSession]);

  const signInWithGoogle = useCallback(async (options = {}) => {
    if (!firebaseEnabled) {
      throw new Error("Google sign-in requires Firebase Auth. Add your Firebase config to .env.local.");
    }
    try {
      const emailHint = String(options.email || "").trim();
      if (emailHint) {
        const existing = getCustomerProfile(emailHint);
        if (existing?.authProvider === "password") {
          throw new Error(
            "This email already has a password account. Sign in with email and password instead of Google.",
          );
        }
      }
      setAuthSurface("customer");
      const user = await firebaseSignInWithGoogle({ email: emailHint });
      // Mobile redirect leaves the page; session completes on return via getRedirectResult.
      if (user?.redirecting) return null;
      return publishCustomerSession(user);
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("already has a password account")) throw error;
      throw new Error(mapAuthError(error));
    }
  }, [firebaseEnabled, publishCustomerSession]);

  const sendPasswordReset = useCallback(async (email) => {
    if (!email?.trim()) {
      throw new Error("Enter the email for your account.");
    }
    if (firebaseEnabled) {
      try {
        if (isAdminAccount(email.trim())) {
          throw new Error("This email is reserved for admin. Sign in at /admin/login instead.");
        }
        const continueUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/account`
            : undefined;
        const bodyOverride = getEmailBodyOverride("password_reset") || undefined;
        await requestPasswordReset({
          email: email.trim(),
          continueUrl,
          bodyOverride,
        });
        return;
      } catch (error) {
        throw new Error(mapPasswordResetError(error));
      }
    }
    throw new Error(
      "Sign-in isn’t configured yet. Add your Firebase web config to .env.local.",
    );
  }, [firebaseEnabled]);

  const registerCustomer = useCallback(async ({ name, email, password, acceptedTerms, marketingOptIn = false }) => {
    if (!name?.trim() || !email?.trim() || !password) {
      throw new Error("Name, email, and password are required.");
    }
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    if (!acceptedTerms) {
      throw new Error("You must accept the Terms of Service and Privacy Policy.");
    }

    if (firebaseEnabled) {
      try {
        if (isAdminAccount(email.trim())) {
          throw new Error("This email is reserved for admin. Sign in at /admin/login instead.");
        }
        const existingProfile = getCustomerProfile(email.trim());
        if (existingProfile?.authProvider === "google") {
          throw new Error(
            "This email is already registered with Google. Use Continue with Google instead of creating a password account.",
          );
        }
        if (existingProfile?.authProvider === "password") {
          throw new Error(
            "An account with this email already exists. Sign in with your password, or use Continue with Google if you registered that way.",
          );
        }
        setAuthSurface("customer");
        const user = await firebaseRegisterCustomer({ name, email, password });
        await upsertCustomerProfile({
          uid: user.uid,
          email: user.email,
          name: name.trim(),
          marketingOptIn: Boolean(marketingOptIn),
          authProvider: resolveStableAuthProvider(existingProfile?.authProvider, "password"),
        });
        return publishCustomerSession({
          ...user,
          consent: {
            acceptedTerms: true,
            marketingOptIn: Boolean(marketingOptIn),
            acceptedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        const message = String(error?.message || "");
        if (message.includes("reserved for admin")) throw error;
        if (message.includes("already registered with Google")) throw error;
        if (message.includes("already exists")) throw error;
        throw new Error(mapAuthError(error));
      }
    }

    const nextUser = {
      uid: makeUid(email),
      email: email.trim(),
      displayName: name.trim(),
      phone: "",
      role: ROLES.CUSTOMER,
      consent: {
        acceptedTerms: true,
        marketingOptIn: Boolean(marketingOptIn),
        acceptedAt: new Date().toISOString(),
      },
    };
    const existing = getCustomerProfile(nextUser.email);
    if (existing?.authProvider === "google") {
      throw new Error(
        "This email is already registered with Google. Use Continue with Google instead of creating a password account.",
      );
    }
    if (existing?.authProvider === "password" || (existing && existing.authProvider !== "guest")) {
      throw new Error(
        "An account with this email already exists. Sign in with your password, or use Continue with Google if you registered that way.",
      );
    }
    upsertCustomerProfile({
      email: nextUser.email,
      name: nextUser.displayName,
      marketingOptIn: Boolean(marketingOptIn),
      authProvider: "password",
    });
    const { admin: currentAdmin } = readSessions();
    persistMock(nextUser, currentAdmin);
    return nextUser;
  }, [firebaseEnabled, persistMock, publishCustomerSession]);

  const signInAdmin = useCallback(async (email, password) => {
    if (!email?.trim() || !password) {
      throw new Error("Email and password are required.");
    }

    if (firebaseEnabled) {
      try {
        setAuthSurface("admin");
        const nextAdmin = await firebaseSignInAdmin(email, password);
        setAdmin(nextAdmin);
        setCustomer(null);
        // Keep surface sticky so onAuthStateChanged cannot wipe admin on /admin/login.
        setAuthSurface("admin");
        return nextAdmin;
      } catch (error) {
        if (error?.message === "This account does not have admin access.") {
          throw error;
        }
        throw new Error(mapAuthError(error));
      }
    }

    // Demo admin is local mock-only — never in production builds or when Firebase is on.
    if (import.meta.env.PROD) {
      throw new Error("Admin sign-in requires Firebase. Configure VITE_FIREBASE_* env vars.");
    }

    if (
      email?.trim().toLowerCase() !== DEMO_ADMIN.email ||
      password !== DEMO_ADMIN.password
    ) {
      throw new Error("Invalid admin credentials.");
    }
    const nextAdmin = {
      uid: makeUid(DEMO_ADMIN.email),
      email: DEMO_ADMIN.email,
      displayName: DEMO_ADMIN.displayName,
      role: ROLES.ADMIN,
    };
    const { customer: currentCustomer } = readSessions();
    persistMock(currentCustomer, nextAdmin);
    return nextAdmin;
  }, [firebaseEnabled, persistMock]);

  const signOutCustomer = useCallback(async () => {
    if (firebaseEnabled) {
      clearAuthSurface();
      await firebaseSignOut();
      return;
    }
    const { admin: currentAdmin } = readSessions();
    persistMock(null, currentAdmin);
  }, [firebaseEnabled, persistMock]);

  const signOutAdmin = useCallback(async () => {
    if (firebaseEnabled) {
      clearAuthSurface();
      await firebaseSignOut();
      return;
    }
    const { customer: currentCustomer } = readSessions();
    persistMock(currentCustomer, null);
  }, [firebaseEnabled, persistMock]);

  const signOut = signOutCustomer;

  const updateCustomerProfileDetails = useCallback(async (patch) => {
    if (!customer?.email) throw new Error("Not signed in.");
    const saved = await updateCustomerProfile(customer.email, { ...patch, uid: customer.uid });
    const nextUser = {
      ...customer,
      displayName: saved.name || customer.displayName,
      phone: saved.phone || "",
      marketingOptIn: Boolean(saved.marketingOptIn),
    };
    if (firebaseEnabled) {
      setCustomer(nextUser);
      return saved;
    }
    const { admin: currentAdmin } = readSessions();
    persistMock(nextUser, currentAdmin);
    return saved;
  }, [customer, firebaseEnabled, persistMock]);

  const value = useMemo(
    () => ({
      user: customer,
      customer,
      admin,
      loading,
      authMode: firebaseEnabled ? "firebase" : "mock",
      isAuthenticated: Boolean(customer),
      isAdmin: Boolean(admin),
      isCustomer: Boolean(customer),
      signInCustomer,
      signInWithGoogle,
      sendPasswordReset,
      registerCustomer,
      signInAdmin,
      signOutCustomer,
      signOutAdmin,
      signOut,
      updateCustomerProfileDetails,
      reconcileCustomerSession,
    }),
    [
      customer,
      admin,
      loading,
      firebaseEnabled,
      signInCustomer,
      signInWithGoogle,
      sendPasswordReset,
      registerCustomer,
      signInAdmin,
      signOutCustomer,
      signOutAdmin,
      updateCustomerProfileDetails,
      reconcileCustomerSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export const ADMIN_HINT = DEMO_ADMIN;
