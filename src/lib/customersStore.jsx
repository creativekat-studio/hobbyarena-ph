import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getDataSource, useFirebaseData } from "./firebase/config.js";
import { getFirebaseAuth } from "./firebase/app.js";
import { isAdminAccount } from "./firebase/auth.js";
import { shouldExposeAdminSession } from "../auth/authSurface.js";
import {
  seedCustomersIfEmpty,
  subscribeAllCustomers,
  subscribeCustomerDoc,
  upsertCustomerDocument,
} from "./firebase/repositories/customers.js";

const STORAGE_KEY = "hobbyarena:customers";

const CustomersContext = createContext(null);

let profileCache = {};
const cacheListeners = new Set();

let syncingRemote = false;

function setRemoteSync(value) {
  syncingRemote = value;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function notifyCacheListeners() {
  cacheListeners.forEach((listener) => listener());
}

function readLocalProfiles() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalProfiles(profiles) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function setCacheFromProfiles(profiles) {
  profileCache = {};
  profiles.forEach((profile) => {
    const key = normalizeEmail(profile.email);
    if (key) profileCache[key] = profile;
  });
  notifyCacheListeners();
}

function setCacheFromMap(profilesByEmail) {
  profileCache = { ...profilesByEmail };
  notifyCacheListeners();
}

function localProfilesToRows(profilesByEmail) {
  return Object.entries(profilesByEmail).map(([email, profile]) => ({
    id: profile.uid || email,
    uid: profile.uid || email,
    email: profile.email || email,
    name: profile.name || "",
    phone: profile.phone || "",
    address: profile.address && typeof profile.address === "object"
      ? profile.address
      : typeof profile.address === "string" && profile.address
        ? { street: profile.address, city: "", province: "", postal: "" }
        : EMPTY_ADDRESS,
    marketingOptIn: Boolean(profile.marketingOptIn),
    authProvider: profile.authProvider || "unknown",
    photoURL: profile.photoURL || "",
    joined: profile.joined || new Date().toISOString().slice(0, 10),
    updatedAt: profile.updatedAt || null,
  }));
}

const EMPTY_ADDRESS = {
  street: "",
  city: "",
  province: "",
  postal: "",
};

function normalizeAddressInput(input, existing) {
  const existingAddr =
    existing?.address && typeof existing.address === "object"
      ? { ...EMPTY_ADDRESS, ...existing.address }
      : typeof existing?.address === "string" && existing.address.trim()
        ? { ...EMPTY_ADDRESS, street: existing.address.trim() }
        : { ...EMPTY_ADDRESS };

  if (input?.address == null) return existingAddr;
  if (typeof input.address === "string") {
    const trimmed = input.address.trim();
    return trimmed ? { ...existingAddr, street: trimmed } : existingAddr;
  }
  if (typeof input.address === "object") {
    return {
      street: input.address.street?.trim() ?? existingAddr.street ?? "",
      city: input.address.city?.trim() ?? existingAddr.city ?? "",
      province: input.address.province?.trim() ?? existingAddr.province ?? "",
      postal: input.address.postal?.trim() ?? existingAddr.postal ?? "",
    };
  }
  return existingAddr;
}

export function getCustomerCheckoutDefaults(email, user = null) {
  const profile = getCustomerProfile(email);
  const address = normalizeAddressInput({}, profile);
  return {
    name: profile?.name || user?.displayName || "",
    email: profile?.email || user?.email || email || "",
    phone: profile?.phone || user?.phone || "",
    street: address.street || "",
    city: address.city || "",
    province: address.province || "",
    postal: address.postal || "",
  };
}
function mergeProfile(existing, input) {
  const email = input.email?.trim() || existing?.email || "";
  const merged = {
    uid: input.uid || existing?.uid || email,
    email,
    name: input.name?.trim() || existing?.name || email.split("@")[0] || "Member",
    phone: input.phone?.trim() ?? existing?.phone ?? "",
    address: normalizeAddressInput(input, existing),
    marketingOptIn: input.marketingOptIn ?? existing?.marketingOptIn ?? false,
    authProvider: input.authProvider || existing?.authProvider || "unknown",
    photoURL: input.photoURL ?? existing?.photoURL ?? "",
    joined: existing?.joined || input.joined || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
  const consent = input.consent ?? existing?.consent;
  if (consent != null) {
    merged.consent = consent;
  }
  return merged;
}

export function getCustomerProfile(email) {
  return profileCache[normalizeEmail(email)] ?? null;
}

export async function upsertCustomerProfile(input) {
  const key = normalizeEmail(input.email);
  if (!key) return null;

  const existing = profileCache[key] ?? readLocalProfiles()[key] ?? null;
  const next = mergeProfile(existing, input);

  profileCache[key] = next;
  notifyCacheListeners();

  const localProfiles = readLocalProfiles();
  localProfiles[key] = next;
  writeLocalProfiles(localProfiles);

  if (getDataSource() === "firebase" && next.uid) {
    await upsertCustomerDocument(next);
  }

  return next;
}

export async function updateCustomerProfile(email, patch) {
  const existing = getCustomerProfile(email);
  if (!existing) {
    return upsertCustomerProfile({
      email,
      uid: patch.uid,
      name: patch.name || email.split("@")[0],
      ...patch,
    });
  }
  return upsertCustomerProfile({ ...existing, email, ...patch });
}

export function listCustomerProfiles() {
  return Object.values(profileCache);
}

export function recordCustomerFromAuth(user) {
  if (!user?.email || user.isAdmin) return null;

  const provider = user.authProvider
    || (user.providerId === "google.com" ? "google" : user.authProvider)
    || "password";

  return upsertCustomerProfile({
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    phone: user.phone || "",
    photoURL: user.photoURL || "",
    authProvider: provider === "google.com" ? "google" : provider,
  }).catch((error) => {
    console.error("[customers] Failed to record profile from auth:", error);
    return getCustomerProfile(user.email);
  });
}

export function CustomersProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const [customers, setCustomers] = useState(() =>
    firebaseEnabled ? [] : localProfilesToRows(readLocalProfiles()),
  );
  const seeded = useRef(false);

  useEffect(() => {
    setCacheFromMap(readLocalProfiles());
  }, []);

  useEffect(() => {
    if (!firebaseEnabled) {
      const local = readLocalProfiles();
      setCacheFromMap(local);
      setCustomers(localProfilesToRows(local));
      return undefined;
    }

    const auth = getFirebaseAuth();
    if (!auth) return undefined;

    let unsubFirestore = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubFirestore?.();

      if (!user) {
        setCacheFromProfiles([]);
        setCustomers([]);
        return;
      }

      try {
        const token = await user.getIdTokenResult();
        const admin = shouldExposeAdminSession({
          isAdmin: isAdminAccount(user.email, token.claims),
        });

        if (admin) {
          unsubFirestore = subscribeAllCustomers(
            async (rows) => {
              setRemoteSync(true);
              if (!rows.length && !seeded.current) {
                seeded.current = true;
                const localRows = localProfilesToRows(readLocalProfiles());
                if (localRows.length) {
                  try {
                    await seedCustomersIfEmpty(localRows);
                  } catch (error) {
                    console.error("[customers] Failed to seed Firestore:", error);
                  }
                }
              }
              setCacheFromProfiles(rows);
              setCustomers(rows);
              queueMicrotask(() => {
                setRemoteSync(false);
              });
            },
            (error) => console.error("[customers] Firestore sync failed:", error),
          );
          return;
        }

        unsubFirestore = subscribeCustomerDoc(
          user.uid,
          (profile) => {
            setRemoteSync(true);
            const rows = profile ? [profile] : [];
            setCacheFromProfiles(rows);
            setCustomers(rows);
            queueMicrotask(() => {
              setRemoteSync(false);
            });
          },
          (error) => console.error("[customers] Profile sync failed:", error),
        );
      } catch (error) {
        console.error("[customers] Auth token failed:", error);
      }
    });

    return () => {
      unsubAuth();
      unsubFirestore?.();
    };
  }, [firebaseEnabled]);

  const value = useMemo(
    () => ({
      customers,
      getCustomerProfile,
      listCustomerProfiles: () => customers,
    }),
    [customers],
  );

  return <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>;
}

export function useCustomers() {
  const context = useContext(CustomersContext);
  if (!context) {
    throw new Error("useCustomers must be used within CustomersProvider");
  }
  return context;
}
