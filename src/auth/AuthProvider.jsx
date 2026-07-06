import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCustomerProfile, recordCustomerFromAuth, updateCustomerProfile, upsertCustomerProfile } from "../lib/customersStore.jsx";
import { isFirebaseConfigured } from "../lib/firebase/config.js";
import {
  buildCustomerUser,
  firebaseRegisterCustomer,
  firebaseSignInAdmin,
  firebaseSignInCustomer,
  firebaseSignInWithGoogle,
  isAdminAccount,
  firebaseSignOut,
  mapAuthError,
  subscribeToAuthChanges,
  useFirebaseAuth,
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
  upsertCustomerProfile({
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    phone: saved?.phone || user.phone || "",
    marketingOptIn: saved?.marketingOptIn,
    photoURL: user.photoURL || saved?.photoURL || "",
    authProvider: user.authProvider || saved?.authProvider || "unknown",
  });
  const updated = getCustomerProfile(user.email);
  return {
    ...user,
    displayName: updated?.name || saved?.name || user.displayName,
    phone: updated?.phone || saved?.phone || user.phone || "",
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
      const unsubscribe = subscribeToAuthChanges(
        (nextCustomer) => {
          publishCustomerSession(nextCustomer);
        },
        setAdmin,
        () => setLoading(false),
      );
      return unsubscribe;
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
        setAuthSurface("customer");
        if (isAdminAccount(email.trim())) {
          throw new Error("This email is reserved for admin. Sign in at /admin/login instead.");
        }
        const user = await firebaseSignInCustomer(email, password);
        return publishCustomerSession(user);
      } catch (error) {
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

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseEnabled) {
      throw new Error("Google sign-in requires Firebase Auth. Add your Firebase config to .env.local.");
    }
    try {
      setAuthSurface("customer");
      const user = await firebaseSignInWithGoogle();
      return publishCustomerSession(user);
    } catch (error) {
      throw new Error(mapAuthError(error));
    }
  }, [firebaseEnabled, publishCustomerSession]);

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
        setAuthSurface("customer");
        if (isAdminAccount(email.trim())) {
          throw new Error("This email is reserved for admin. Sign in at /admin/login instead.");
        }
        const user = await firebaseRegisterCustomer({ name, email, password });
        upsertCustomerProfile({
          uid: user.uid,
          email: user.email,
          name: name.trim(),
          marketingOptIn: Boolean(marketingOptIn),
          authProvider: "password",
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
    upsertCustomerProfile({
      email: nextUser.email,
      name: nextUser.displayName,
      marketingOptIn: Boolean(marketingOptIn),
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
        return nextAdmin;
      } catch (error) {
        if (error?.message === "This account does not have admin access.") {
          throw error;
        }
        throw new Error(mapAuthError(error));
      }
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
    const saved = updateCustomerProfile(customer.email, patch);
    const nextUser = {
      ...customer,
      displayName: saved.name || customer.displayName,
      phone: saved.phone || "",
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
