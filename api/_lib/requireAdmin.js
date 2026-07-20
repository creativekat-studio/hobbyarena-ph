import { loadLocalEnv } from "./loadLocalEnv.js";

function isProductionHost() {
  if (process.env.VERCEL_ENV === "production") return true;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) return true;
  return false;
}

function adminEmails() {
  loadLocalEnv();
  const raw = process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function firebaseWebApiKey() {
  loadLocalEnv();
  return (
    process.env.FIREBASE_API_KEY
    || process.env.VITE_FIREBASE_API_KEY
    || ""
  ).trim();
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isAdminFromToken(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (payload.admin === true) return true;
  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) return false;
  return adminEmails().includes(email);
}

/**
 * Verify a Firebase ID token via Identity Toolkit (no firebase-admin/auth import).
 * @returns {Promise<object|null>} decoded claims when valid
 */
async function verifyFirebaseIdToken(idToken) {
  const apiKey = firebaseWebApiKey();
  if (!apiKey) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.users?.[0]) return null;

  const payload = decodeJwtPayload(idToken);
  if (!payload) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < nowSec) return null;

  return {
    uid: data.users[0].localId || payload.user_id || payload.sub || "",
    email: String(data.users[0].email || payload.email || "").trim().toLowerCase(),
    claims: payload,
  };
}

function readBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(\S+)$/i.exec(String(header));
  return match?.[1] || "";
}

/**
 * Require a signed-in admin for protected API routes.
 * - Production / Firebase configured: valid Bearer ID token + admin email or admin claim
 * - Local mock (no Firebase API key, non-production): allow through for DX
 *
 * Responds with 401/403/503 and returns null when denied.
 * @returns {Promise<{ uid: string, email: string, bypass?: boolean }|null>}
 */
export async function requireAdmin(req, res) {
  loadLocalEnv();

  const apiKey = firebaseWebApiKey();
  if (!apiKey) {
    if (isProductionHost()) {
      res.status(503).json({ error: "Admin auth is not configured." });
      return null;
    }
    return { uid: "local-dev", email: "dev@local", bypass: true };
  }

  const idToken = readBearerToken(req);
  if (!idToken) {
    res.status(401).json({ error: "Sign in as admin to continue." });
    return null;
  }

  let identity;
  try {
    identity = await verifyFirebaseIdToken(idToken);
  } catch (error) {
    console.error("requireAdmin verify:", error);
    res.status(401).json({ error: "Could not verify admin session." });
    return null;
  }

  if (!identity?.uid) {
    res.status(401).json({ error: "Sign in as admin to continue." });
    return null;
  }

  if (!isAdminFromToken(identity.claims) && !adminEmails().includes(identity.email)) {
    res.status(403).json({ error: "This account does not have admin access." });
    return null;
  }

  return { uid: identity.uid, email: identity.email };
}

export function isApiProduction() {
  return isProductionHost();
}
