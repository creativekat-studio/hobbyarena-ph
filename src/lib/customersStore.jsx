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
import { isValidEmail } from "./email/emailUtils.js";
import {
  mergePayoutMethodLists,
  normalizePayoutMethods,
  resolvePrimaryPayoutMethodId,
  restorePayoutQrUrls,
} from "./customerPayoutMethods.js";

const STORAGE_KEY = "hobbyarena:customers";

const CustomersContext = createContext(null);

let profileCache = {};
const cacheListeners = new Set();
const profileWrites = new Map();
/** Methods saved in this session, so a stale snapshot cannot drop them. */
const payoutMemory = new Map();

let syncingRemote = false;

function setRemoteSync(value) {
  syncingRemote = value;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** Normalize Auth provider labels used on customer profiles. */
export function normalizeAuthProvider(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "google.com") return "google";
  if (raw === "password" || raw === "google" || raw === "guest" || raw === "newsletter") return raw;
  return raw || "";
}

/**
 * Once a member signs up with Google or password, never flip to the other method
 * on later auth sync / checkout upserts (profile is keyed by email).
 */
export function resolveStableAuthProvider(existingProvider, incomingProvider) {
  const member = new Set(["google", "password"]);
  const existing = normalizeAuthProvider(existingProvider);
  const incoming = normalizeAuthProvider(incomingProvider);
  if (member.has(existing) && member.has(incoming) && existing !== incoming) {
    return existing;
  }
  if (member.has(existing) && !incoming) return existing;
  if (member.has(incoming)) return incoming;
  if (existing) return existing;
  return incoming || "unknown";
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

/** Browser storage is a small cache. QR files stay in Firestore, not in this copy. */
function slimProfileForLocal(profile) {
  if (!profile || typeof profile !== "object") return profile;
  const next = { ...profile };
  if (typeof next.photoURL === "string" && next.photoURL.startsWith("data:")) {
    next.photoURL = "";
  }
  if (Array.isArray(next.payoutMethods)) {
    next.payoutMethods = next.payoutMethods.map((method) => {
      const qrUrl = String(method?.qrUrl || "");
      if (!qrUrl.startsWith("data:")) return method;
      return { ...method, qrUrl: "" };
    });
  }
  return next;
}

function writeLocalProfiles(profiles) {
  if (typeof window === "undefined") return;
  const slim = {};
  for (const [key, profile] of Object.entries(profiles || {})) {
    slim[key] = slimProfileForLocal(profile);
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch (error) {
    console.warn("[customers] Could not cache profiles in this browser:", error);
    if (getDataSource() === "firebase") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // The database copy is the one that matters.
      }
    }
  }
}

function profileTime(profile) {
  const value = profile?.updatedAt || profile?.joined || "";
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (value && typeof value.toDate === "function") {
    const time = value.toDate().getTime();
    return Number.isFinite(time) ? time : 0;
  }
  const parsed = Date.parse(typeof value === "string" ? value : "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/** One profile per email. Payout methods saved on any duplicate doc stay visible. */
function mergeProfilesByEmail(profiles) {
  const byEmail = new Map();
  for (const profile of profiles || []) {
    const key = normalizeEmail(profile?.email);
    if (!key) continue;
    const prev = byEmail.get(key);
    if (!prev) {
      byEmail.set(key, profile);
      continue;
    }
    const newer = profileTime(profile) >= profileTime(prev) ? profile : prev;
    const older = newer === profile ? prev : profile;
    byEmail.set(key, {
      ...older,
      ...newer,
      payoutMethods: mergePayoutMethodLists(newer.payoutMethods, older.payoutMethods),
      primaryPayoutMethodId: newer.primaryPayoutMethodId || older.primaryPayoutMethodId || "",
    });
  }
  return [...byEmail.values()];
}

function rememberPayouts(email, profile) {
  const key = normalizeEmail(email);
  if (!key) return;
  payoutMemory.set(key, {
    at: Date.now(),
    methods: normalizePayoutMethods(profile?.payoutMethods),
    primaryId: profile?.primaryPayoutMethodId || "",
  });
}

function overlayRememberedPayouts(profile) {
  const key = normalizeEmail(profile?.email);
  const remembered = key ? payoutMemory.get(key) : null;
  if (!remembered) return profile;
  if (profileTime(profile) >= remembered.at) {
    payoutMemory.delete(key);
    return profile;
  }
  return {
    ...profile,
    payoutMethods: remembered.methods,
    primaryPayoutMethodId: remembered.primaryId,
  };
}

function setCacheFromProfiles(profiles) {
  profileCache = {};
  mergeProfilesByEmail(profiles).forEach((profile) => {
    const key = normalizeEmail(profile.email);
    if (!key) return;
    const next = overlayRememberedPayouts(profile);
    profileCache[key] = {
      ...next,
      marketingOptIn: Boolean(next.marketingOptIn),
    };
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
    payoutMethods: normalizePayoutMethods(profile.payoutMethods),
    primaryPayoutMethodId: profile.primaryPayoutMethodId || "",
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

function isBlank(value) {
  return !String(value ?? "").trim();
}

function addressFieldEmpty(profile, key) {
  const addr = profile?.address;
  if (!addr || typeof addr !== "object") return true;
  return isBlank(addr[key]);
}

/** Only writes fields that are currently empty on the saved profile. */
export async function patchCustomerProfileIfEmpty(email, patch) {
  const key = normalizeEmail(email);
  if (!key) return null;

  const existing = getCustomerProfile(email);
  const fill = { email: key, uid: patch.uid || existing?.uid };

  if (isBlank(existing?.name) && !isBlank(patch.name)) fill.name = String(patch.name).trim();
  if (isBlank(existing?.phone) && !isBlank(patch.phone)) fill.phone = String(patch.phone).trim();

  const addressPatch = {};
  const incoming = patch.address && typeof patch.address === "object" ? patch.address : {};
  if (addressFieldEmpty(existing, "street") && !isBlank(incoming.street)) {
    addressPatch.street = String(incoming.street).trim();
  }
  if (addressFieldEmpty(existing, "city") && !isBlank(incoming.city)) {
    addressPatch.city = String(incoming.city).trim();
  }
  if (addressFieldEmpty(existing, "province") && !isBlank(incoming.province)) {
    addressPatch.province = String(incoming.province).trim();
  }
  if (addressFieldEmpty(existing, "postal") && !isBlank(incoming.postal)) {
    addressPatch.postal = String(incoming.postal).trim();
  }

  if (Object.keys(addressPatch).length) {
    fill.address = {
      ...(existing?.address && typeof existing.address === "object" ? existing.address : {}),
      ...addressPatch,
    };
  }

  // Only email + uid means nothing to fill
  const fillKeys = Object.keys(fill).filter((k) => k !== "email" && k !== "uid");
  if (!fillKeys.length) return existing;

  const base = existing ? { ...existing } : {};
  delete base.payoutMethods;
  delete base.primaryPayoutMethodId;
  return upsertCustomerProfile({ ...base, ...fill, email: key });
}
function mergeProfile(existing, input) {
  const email = input.email?.trim() || existing?.email || "";
  const merged = {
    uid: input.uid || existing?.uid || email,
    email,
    name: input.name?.trim() || existing?.name || email.split("@")[0] || "Member",
    phone: (input.phone && String(input.phone).trim()) || existing?.phone || "",
    address: normalizeAddressInput(input, existing),
    // Only change marketing when the caller explicitly passes it — otherwise keep Firestore value.
    marketingOptIn: Object.prototype.hasOwnProperty.call(input, "marketingOptIn")
      ? Boolean(input.marketingOptIn)
      : Boolean(existing?.marketingOptIn),
    authProvider: resolveStableAuthProvider(existing?.authProvider, input.authProvider),
    photoURL: input.photoURL ?? existing?.photoURL ?? "",
    joined: existing?.joined || input.joined || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
  const explicitPayouts = Array.isArray(input.payoutMethods);
  const payoutSource = explicitPayouts
    ? restorePayoutQrUrls(input.payoutMethods, existing?.payoutMethods)
    : existing?.payoutMethods;
  const payoutMethods = normalizePayoutMethods(payoutSource);
  if (payoutMethods.length) {
    merged.payoutMethods = payoutMethods;
    merged.primaryPayoutMethodId = resolvePrimaryPayoutMethodId(
      payoutMethods,
      input.primaryPayoutMethodId !== undefined
        ? input.primaryPayoutMethodId
        : existing?.primaryPayoutMethodId,
    );
  } else if (explicitPayouts) {
    merged.payoutMethods = [];
    merged.primaryPayoutMethodId = "";
  } else if (existing?.primaryPayoutMethodId) {
    merged.primaryPayoutMethodId = existing.primaryPayoutMethodId;
  }
  const consent = input.consent ?? existing?.consent;
  if (consent != null) {
    merged.consent = consent;
  }
  return merged;
}

export function getCustomerProfile(email) {
  return profileCache[normalizeEmail(email)] ?? null;
}

export function upsertCustomerProfile(input) {
  const key = normalizeEmail(input.email);
  if (!key) return Promise.resolve(null);
  const previous = profileWrites.get(key) || Promise.resolve();
  const run = previous
    .catch(() => {})
    .then(() => writeCustomerProfile(input));
  profileWrites.set(key, run);
  return run;
}

async function writeCustomerProfile(input) {
  const key = normalizeEmail(input.email);
  if (!key) return null;

  const existing = profileCache[key] ?? null;
  const explicitPayouts = Array.isArray(input.payoutMethods);
  const existingProvider = normalizeAuthProvider(existing?.authProvider);
  const incomingProvider = normalizeAuthProvider(input.authProvider);
  const existingUid = String(existing?.uid || "").trim();
  const incomingUid = String(input.uid || "").trim();

  // Never let a different Auth uid (Google vs password) overwrite the member method.
  if (
    existingUid
    && incomingUid
    && existingUid !== incomingUid
    && (
      (existingProvider === "password" && incomingProvider === "google")
      || (existingProvider === "google" && incomingProvider === "password")
    )
  ) {
    console.warn(
      "[customers] Refusing authProvider overwrite for",
      key,
      existingProvider,
      "→",
      incomingProvider,
    );
    return existing;
  }

  let next = mergeProfile(existing, input);
  if (explicitPayouts) {
    rememberPayouts(key, next);
  } else {
    const remembered = payoutMemory.get(key);
    if (!normalizePayoutMethods(next.payoutMethods).length && remembered?.methods?.length) {
      next = {
        ...next,
        payoutMethods: remembered.methods,
        primaryPayoutMethodId: remembered.primaryId || next.primaryPayoutMethodId || "",
      };
    }
  }

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

export async function saveCustomerPayoutMethods(email, { methods, primaryPayoutMethodId, name, uid } = {}) {
  const key = normalizeEmail(email);
  if (!key) throw new Error("A customer email is required to save payout details.");
  const existing = getCustomerProfile(key);
  const remembered = payoutMemory.get(key);
  const payoutMethods = normalizePayoutMethods(restorePayoutQrUrls(methods, [
    ...(existing?.payoutMethods || []),
    ...(remembered?.methods || []),
  ]));
  return updateCustomerProfile(key, {
    payoutMethods,
    primaryPayoutMethodId: resolvePrimaryPayoutMethodId(payoutMethods, primaryPayoutMethodId),
    ...(name ? { name: String(name).trim() } : {}),
    ...(uid ? { uid } : {}),
  });
}

export async function updateCustomerProfile(email, patch) {
  const existing = getCustomerProfile(email);
  const patchHasPayouts = Object.prototype.hasOwnProperty.call(patch || {}, "payoutMethods");
  if (!existing) {
    return upsertCustomerProfile({
      email,
      uid: patch.uid,
      name: patch.name || email.split("@")[0],
      ...patch,
    });
  }
  const base = { ...existing, email };
  if (!patchHasPayouts) {
    delete base.payoutMethods;
    delete base.primaryPayoutMethodId;
  }
  return upsertCustomerProfile({ ...base, ...patch });
}

function looksLikeEmail(value) {
  return isValidEmail(value);
}

export function findCustomerProfileByEmail(email) {
  const key = normalizeEmail(email);
  if (!key) return null;
  return getCustomerProfile(key)
    || Object.values(profileCache).find((row) => normalizeEmail(row?.email) === key)
    || null;
}

/** True when another customer profile already owns this email. */
export function isCustomerEmailTaken(email, { exceptUid = "", exceptEmail = "" } = {}) {
  const key = normalizeEmail(email);
  if (!key) return false;
  if (key === normalizeEmail(exceptEmail)) return false;

  const hit = findCustomerProfileByEmail(key);
  if (!hit) return false;

  const hitUid = String(hit.uid || "").trim();
  const skipUid = String(exceptUid || "").trim();
  if (skipUid && hitUid && hitUid === skipUid) return false;
  return true;
}

/**
 * Admin: change the stored customer email (profile key + Firestore field).
 * Does not change Firebase Auth login email for Google/password accounts.
 * Caller should also re-point linked orders to the new address.
 */
export async function changeCustomerEmail(fromEmail, toEmail) {
  const fromKey = normalizeEmail(fromEmail);
  const toKey = normalizeEmail(toEmail);
  if (!fromKey) throw new Error("Current email is missing.");
  if (!looksLikeEmail(toKey)) throw new Error("Enter a valid email address.");
  if (fromKey === toKey) return getCustomerProfile(fromKey);

  const existing = findCustomerProfileByEmail(fromKey);
  if (!existing) throw new Error("Customer not found.");

  if (isCustomerEmailTaken(toKey, { exceptUid: existing.uid, exceptEmail: fromKey })) {
    throw new Error("Another customer already uses that email.");
  }

  const next = {
    ...existing,
    email: toKey,
    updatedAt: new Date().toISOString(),
  };

  delete profileCache[fromKey];
  profileCache[toKey] = next;
  notifyCacheListeners();

  const localProfiles = readLocalProfiles();
  delete localProfiles[fromKey];
  localProfiles[toKey] = next;
  writeLocalProfiles(localProfiles);

  if (getDataSource() === "firebase" && next.uid) {
    await upsertCustomerDocument(next);
  }

  return next;
}

export function listCustomerProfiles() {
  return Object.values(profileCache);
}

export function recordCustomerFromAuth(user) {
  if (!user?.email || user.isAdmin) return null;

  const existing = getCustomerProfile(user.email);
  const incoming = normalizeAuthProvider(
    user.authProvider
    || (user.providerId === "google.com" ? "google" : user.authProvider)
    || "password",
  );

  return upsertCustomerProfile({
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    ...(user.phone ? { phone: user.phone } : {}),
    photoURL: user.photoURL || "",
    authProvider: resolveStableAuthProvider(existing?.authProvider, incoming),
  }).catch((error) => {
    console.error("[customers] Failed to record profile from auth:", error);
    return getCustomerProfile(user.email);
  });
}

/**
 * Upsert a customer profile from checkout (guest or signed-in).
 * Guests are stored with authProvider "guest" and an email-keyed uid so Admin → Customers lists them.
 */
export async function recordCustomerFromCheckout({
  email,
  name,
  phone,
  address,
  guest = false,
  userId = null,
  authProvider = null,
}) {
  const key = normalizeEmail(email);
  if (!key) return null;

  const existing = getCustomerProfile(email);
  const existingProvider = existing?.authProvider || "unknown";
  const isExistingMember = existingProvider === "google" || existingProvider === "password";

  let provider;
  if (guest) {
    // Don't downgrade a real account if they later checkout without signing in.
    provider = isExistingMember ? existingProvider : "guest";
  } else {
    const incoming = authProvider || (isExistingMember ? existingProvider : "password");
    provider = resolveStableAuthProvider(existingProvider, incoming);
  }

  const uid = guest
    ? (isExistingMember && existing?.uid ? existing.uid : (existing?.uid || key))
    : (userId || existing?.uid || key);

  try {
    return await upsertCustomerProfile({
      uid,
      email: key,
      name,
      phone,
      address,
      authProvider: provider,
    });
  } catch (error) {
    console.error("[customers] Failed to record profile from checkout:", error);
    return getCustomerProfile(email);
  }
}

export function CustomersProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const [customers, setCustomers] = useState(() =>
    firebaseEnabled ? [] : localProfilesToRows(readLocalProfiles()),
  );
  const [cacheRevision, setCacheRevision] = useState(0);
  const seeded = useRef(false);

  useEffect(() => {
    const bump = () => setCacheRevision((value) => value + 1);
    cacheListeners.add(bump);
    return () => cacheListeners.delete(bump);
  }, []);

  useEffect(() => {
    // Firebase is the source of truth. The local copy strips QR data URLs, and
    // loading it over the live cache made a saved payout method disappear.
    if (firebaseEnabled) return undefined;
    const local = readLocalProfiles();
    writeLocalProfiles(local);
    setCacheFromMap(local);
    return undefined;
  }, [firebaseEnabled]);

  useEffect(() => {
    if (!firebaseEnabled) {
      const refreshLocal = () => {
        setCustomers(localProfilesToRows(profileCache));
      };
      refreshLocal();
      cacheListeners.add(refreshLocal);
      return () => cacheListeners.delete(refreshLocal);
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
      cacheRevision,
      getCustomerProfile,
      listCustomerProfiles: () => customers,
      saveCustomerPayoutMethods,
    }),
    [cacheRevision, customers],
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
