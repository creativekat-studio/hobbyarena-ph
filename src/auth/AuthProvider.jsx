import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Auth layer for Hobby Arena.
 *
 * MOCK: customer and admin sessions are stored separately so browsing the
 * storefront (or signing in as a customer) does not sign you out of admin.
 *
 * Shaped for Firebase later — admin role from custom claims, not client trust.
 */

const STORAGE_KEY = "hobbyarena:auth";

const DEMO_ADMIN = {
  email: "admin@hobbyarena.ph",
  password: "admin1234",
  displayName: "Arena Admin",
};

export const ROLES = { CUSTOMER: "customer", ADMIN: "admin" };

const AuthContext = createContext(null);

function readSessions() {
  if (typeof window === "undefined") {
    return { customer: null, admin: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { customer: null, admin: null };

    const parsed = JSON.parse(raw);

    // New format: { customer, admin }
    if (parsed && typeof parsed === "object" && ("customer" in parsed || "admin" in parsed)) {
      return {
        customer: parsed.customer ?? null,
        admin: parsed.admin ?? null,
      };
    }

    // Legacy single-session blob — migrate in memory on read.
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

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncFromStorage = useCallback(() => {
    const sessions = readSessions();
    setCustomer(sessions.customer);
    setAdmin(sessions.admin);
  }, []);

  useEffect(() => {
    syncFromStorage();
    setLoading(false);

    function handleStorage(event) {
      if (event.key === STORAGE_KEY) syncFromStorage();
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") syncFromStorage();
    }

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncFromStorage]);

  const persist = useCallback((nextCustomer, nextAdmin) => {
    setCustomer(nextCustomer);
    setAdmin(nextAdmin);
    writeSessions(nextCustomer, nextAdmin);
  }, []);

  const signInCustomer = useCallback(
    async (email, password) => {
      if (!email?.trim() || !password) {
        throw new Error("Email and password are required.");
      }
      const nextUser = {
        uid: makeUid(email),
        email: email.trim(),
        displayName: email.split("@")[0],
        role: ROLES.CUSTOMER,
      };
      const { admin: currentAdmin } = readSessions();
      persist(nextUser, currentAdmin);
      return nextUser;
    },
    [persist],
  );

  const registerCustomer = useCallback(
    async ({ name, email, password, acceptedTerms, marketingOptIn = false }) => {
      if (!name?.trim() || !email?.trim() || !password) {
        throw new Error("Name, email, and password are required.");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }
      if (!acceptedTerms) {
        throw new Error("You must accept the Terms of Service and Privacy Policy.");
      }
      const nextUser = {
        uid: makeUid(email),
        email: email.trim(),
        displayName: name.trim(),
        role: ROLES.CUSTOMER,
        consent: {
          acceptedTerms: true,
          marketingOptIn: Boolean(marketingOptIn),
          acceptedAt: new Date().toISOString(),
        },
      };
      const { admin: currentAdmin } = readSessions();
      persist(nextUser, currentAdmin);
      return nextUser;
    },
    [persist],
  );

  const signInAdmin = useCallback(
    async (email, password) => {
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
      persist(currentCustomer, nextAdmin);
      return nextAdmin;
    },
    [persist],
  );

  const signOutCustomer = useCallback(async () => {
    const { admin: currentAdmin } = readSessions();
    persist(null, currentAdmin);
  }, [persist]);

  const signOutAdmin = useCallback(async () => {
    const { customer: currentCustomer } = readSessions();
    persist(currentCustomer, null);
  }, [persist]);

  /** @deprecated use signOutCustomer or signOutAdmin */
  const signOut = signOutCustomer;

  const value = useMemo(
    () => ({
      user: customer,
      customer,
      admin,
      loading,
      isAuthenticated: Boolean(customer),
      isAdmin: Boolean(admin),
      isCustomer: Boolean(customer),
      signInCustomer,
      registerCustomer,
      signInAdmin,
      signOutCustomer,
      signOutAdmin,
      signOut,
    }),
    [
      customer,
      admin,
      loading,
      signInCustomer,
      registerCustomer,
      signInAdmin,
      signOutCustomer,
      signOutAdmin,
      signOut,
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
