import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Auth layer for Hobby Arena.
 *
 * This is a MOCK implementation that stores a session in localStorage so the
 * customer and admin areas can be built and demoed without a backend.
 *
 * It is intentionally shaped like Firebase Auth so it can be swapped later:
 *   - `user` mirrors a Firebase user ({ uid, email, displayName }) plus a `role`.
 *   - Role should come from a **Firebase custom claim** (e.g. role: "admin"),
 *     set by a trusted backend / Cloud Function — never from the client.
 *   - `signInCustomer` / `registerCustomer` -> signInWithEmailAndPassword /
 *     createUserWithEmailAndPassword.
 *   - `signInAdmin` -> same sign-in, then verify the `admin` custom claim.
 *   - `signOut` -> firebase signOut().
 *
 * SECURITY NOTE: client-side route guards (see ProtectedRoute) are UX only.
 * Real authorization MUST be enforced server-side via Firebase Auth custom
 * claims + Firestore/Storage Security Rules. Never trust the client role alone.
 */

const STORAGE_KEY = "hobbyarena:auth";

// Demo admin credential — replace with Firebase Auth + an `admin` custom claim.
const DEMO_ADMIN = {
  email: "admin@hobbyarena.ph",
  password: "admin1234",
  displayName: "Arena Admin",
};

export const ROLES = { CUSTOMER: "customer", ADMIN: "admin" };

const AuthContext = createContext(null);

function readSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function makeUid(email) {
  return `mock_${btoa(unescape(encodeURIComponent(email))).replace(/[^a-z0-9]/gi, "").slice(0, 16)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mimics firebase onAuthStateChanged bootstrapping.
  useEffect(() => {
    setUser(readSession());
    setLoading(false);
  }, []);

  const persist = useCallback((nextUser) => {
    setUser(nextUser);
    if (typeof window !== "undefined") {
      if (nextUser) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const signInCustomer = useCallback(
    async (email, password) => {
      if (!email?.trim() || !password) {
        throw new Error("Email and password are required.");
      }
      // MOCK: accept any credential as a customer.
      const nextUser = {
        uid: makeUid(email),
        email: email.trim(),
        displayName: email.split("@")[0],
        role: ROLES.CUSTOMER,
      };
      persist(nextUser);
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
        // Consent record — store with a timestamp for compliance. With Firebase,
        // persist this to the user's Firestore profile document.
        consent: {
          acceptedTerms: true,
          marketingOptIn: Boolean(marketingOptIn),
          acceptedAt: new Date().toISOString(),
        },
      };
      persist(nextUser);
      return nextUser;
    },
    [persist],
  );

  const signInAdmin = useCallback(
    async (email, password) => {
      // MOCK: validate against a known admin credential. With Firebase this
      // becomes: sign in, then getIdTokenResult() and require claims.admin.
      if (
        email?.trim().toLowerCase() !== DEMO_ADMIN.email ||
        password !== DEMO_ADMIN.password
      ) {
        throw new Error("Invalid admin credentials.");
      }
      const nextUser = {
        uid: makeUid(DEMO_ADMIN.email),
        email: DEMO_ADMIN.email,
        displayName: DEMO_ADMIN.displayName,
        role: ROLES.ADMIN,
      };
      persist(nextUser);
      return nextUser;
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === ROLES.ADMIN,
      isCustomer: user?.role === ROLES.CUSTOMER,
      signInCustomer,
      registerCustomer,
      signInAdmin,
      signOut,
    }),
    [user, loading, signInCustomer, registerCustomer, signInAdmin, signOut],
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
