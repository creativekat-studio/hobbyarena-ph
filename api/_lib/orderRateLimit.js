import { loadLocalEnv } from "./loadLocalEnv.js";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ORDERS = 5;
const COLLECTION = "_rateLimits";

function clientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"] || "";
  return String(forwarded).split(",")[0].trim()
    || req.headers?.["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
}

function docId(prefix, value) {
  const safe = String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, "_")
    .slice(0, 120);
  return `${prefix}_${safe || "unknown"}`;
}

function keysFor(req, email) {
  return [
    docId("order_ip", clientIp(req)),
    docId("order_email", email),
  ];
}

async function recentStamps(db, id) {
  const snap = await db.collection(COLLECTION).doc(id).get();
  const cutoff = Date.now() - WINDOW_MS;
  return Array.isArray(snap.data()?.timestamps)
    ? snap.data().timestamps.map((t) => Number(t)).filter((t) => t > cutoff)
    : [];
}

/**
 * Soft spam check before create. Does not write.
 * @returns {Promise<{ ok: true } | { ok: false, status: number, error: string }>}
 */
export async function checkOrderRateLimit(db, req, email) {
  loadLocalEnv();
  if (!db) return { ok: true, skipped: true };

  for (const id of keysFor(req, email)) {
    const stamps = await recentStamps(db, id);
    if (stamps.length >= MAX_ORDERS) {
      return {
        ok: false,
        status: 429,
        error: "Too many orders just now — try again in a few minutes.",
      };
    }
  }
  return { ok: true };
}

/** Record a successful create against IP + email windows. */
export async function recordOrderRateLimit(db, req, email) {
  if (!db) return;
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  await Promise.all(keysFor(req, email).map(async (id) => {
    const stamps = (await recentStamps(db, id)).filter((t) => t > cutoff);
    stamps.push(now);
    await db.collection(COLLECTION).doc(id).set({
      timestamps: stamps.slice(-MAX_ORDERS),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }));
}
