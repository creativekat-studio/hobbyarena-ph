import crypto from "node:crypto";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { loadLocalEnv } from "./loadLocalEnv.js";

let initialized = false;
let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function readServiceAccount() {
  loadLocalEnv();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isFirebaseAdminConfigured() {
  return Boolean(readServiceAccount());
}

/** Initialize the default Admin app once. Returns true when ready. */
export function ensureFirebaseAdminApp() {
  if (initialized && admin.getApps().length) return true;

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) return false;

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
    || process.env.VITE_FIREBASE_STORAGE_BUCKET
    || `${serviceAccount.project_id}.firebasestorage.app`;

  // firebase-admin v12+ modular surface: getApps() / cert() (not admin.apps / credential.cert)
  // Avoid importing firebase-admin/auth — Vercel CJS bundling throws ERR_REQUIRE_ESM.
  if (!admin.getApps().length) {
    admin.initializeApp({
      credential: admin.cert(serviceAccount),
      storageBucket,
    });
  }

  initialized = true;
  return true;
}

/** @deprecated Prefer getAdminAuth / getAdminFirestore / getAdminStorageBucket */
export function getFirebaseAdmin() {
  return ensureFirebaseAdminApp() ? { ready: true } : null;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/**
 * Mint a Google OAuth access token from the service account JSON.
 * Used for Identity Toolkit Admin REST (password-reset oob links) because
 * `firebase-admin/auth` cannot be loaded in this Vercel runtime.
 */
async function getServiceAccountAccessToken(serviceAccount) {
  const now = Date.now();
  if (cachedAccessToken && now < cachedAccessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const iat = Math.floor(now / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp: iat + 3600,
    scope: [
      "https://www.googleapis.com/auth/identitytoolkit",
      "https://www.googleapis.com/auth/firebase",
    ].join(" "),
  };

  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claim)}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to mint Google access token");
  }

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = now + (Number(data.expires_in) || 3600) * 1000;
  return cachedAccessToken;
}

/**
 * Point Firebase action links at the branded in-app reset form while keeping
 * the oobCode (and related params) so confirmPasswordReset still works.
 */
export function toInAppPasswordResetLink(oobLink, siteUrl) {
  const base = String(siteUrl || "https://www.hobbyarena.ph").replace(/\/$/, "");
  try {
    const src = new URL(oobLink);
    const dest = new URL(`${base}/account/reset-password`);
    for (const key of ["oobCode", "mode", "apiKey", "lang"]) {
      const value = src.searchParams.get(key);
      if (value) dest.searchParams.set(key, value);
    }
    if (!dest.searchParams.get("mode")) {
      dest.searchParams.set("mode", "resetPassword");
    }
    if (!dest.searchParams.get("oobCode")) return oobLink;
    return dest.toString();
  } catch {
    return oobLink;
  }
}

/**
 * Generate a Firebase password-reset link via Identity Toolkit Admin REST.
 * Same result as Admin Auth generatePasswordResetLink, without importing
 * firebase-admin/auth (broken under Vercel ERR_REQUIRE_ESM).
 *
 * @returns {Promise<string>}
 */
export async function generatePasswordResetLink(email, continueUrl = "") {
  const serviceAccount = readServiceAccount();
  if (!serviceAccount?.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  }

  const accessToken = await getServiceAccountAccessToken(serviceAccount);
  const body = {
    requestType: "PASSWORD_RESET",
    email: String(email || "").trim().toLowerCase(),
    returnOobLink: true,
  };
  if (continueUrl) body.continueUrl = String(continueUrl);

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${serviceAccount.project_id}/accounts:sendOobCode`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.oobLink) {
    const message = data.error?.message || data.error || "PASSWORD_RESET_LINK_FAILED";
    const error = new Error(typeof message === "string" ? message : "PASSWORD_RESET_LINK_FAILED");
    error.code = typeof message === "string" ? message : "PASSWORD_RESET_LINK_FAILED";
    error.errorInfo = { code: error.code, message: error.message };
    throw error;
  }

  const siteUrl = String(
    process.env.PUBLIC_DISPLAY_SITE_URL
    || process.env.PUBLIC_SITE_URL
    || process.env.VITE_PUBLIC_SITE_URL
    || "",
  ).trim() || "https://www.hobbyarena.ph";

  return toInAppPasswordResetLink(data.oobLink, siteUrl);
}

/**
 * Look up Auth providers for an email via Identity Toolkit Admin REST
 * (avoids firebase-admin/auth ESM issues on Vercel).
 *
 * @param {string} email
 * @returns {Promise<{ exists: boolean, uid: string|null, providers: string[] }>}
 */
export async function lookupAuthEmail(email) {
  const serviceAccount = readServiceAccount();
  if (!serviceAccount?.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  }

  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return { exists: false, uid: null, providers: [] };
  }

  const accessToken = await getServiceAccountAccessToken(serviceAccount);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${serviceAccount.project_id}/accounts:lookup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: [normalized] }),
    },
  );

  const data = await response.json().catch(() => ({}));
  // USER_NOT_FOUND is a normal miss
  if (!response.ok) {
    const message = String(data.error?.message || data.error || "");
    if (/USER_NOT_FOUND/i.test(message)) {
      return { exists: false, uid: null, providers: [], passwordAccountUid: null };
    }
    const error = new Error(message || "AUTH_EMAIL_LOOKUP_FAILED");
    error.code = message || "AUTH_EMAIL_LOOKUP_FAILED";
    throw error;
  }

  const users = Array.isArray(data.users) ? data.users : [];
  if (!users.length) return { exists: false, uid: null, providers: [], passwordAccountUid: null };

  const providers = new Set();
  let passwordAccountUid = null;
  let primaryUid = users[0]?.localId || null;

  for (const user of users) {
    for (const entry of user.providerUserInfo || []) {
      const id = String(entry?.providerId || "").trim();
      if (id) providers.add(id);
    }
    if (user.passwordHash) {
      providers.add("password");
      if (!passwordAccountUid) passwordAccountUid = user.localId || null;
    }
  }

  return {
    exists: true,
    uid: primaryUid,
    providers: [...providers],
    passwordAccountUid,
  };
}

export function getAdminFirestore() {
  if (!ensureFirebaseAdminApp()) return null;
  return getFirestore();
}

export function getAdminStorageBucket() {
  if (!ensureFirebaseAdminApp()) return null;
  return getStorage().bucket();
}
