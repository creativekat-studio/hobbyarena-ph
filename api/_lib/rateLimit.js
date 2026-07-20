/**
 * Lightweight in-memory rate limiter for serverless handlers.
 * Not perfect across cold starts / multi-instance, but blocks casual spam.
 */

const buckets = new Map();

function clientKey(req, suffix = "") {
  const forwarded = req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"] || "";
  const ip = String(forwarded).split(",")[0].trim()
    || req.headers?.["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
  return `${ip}|${suffix}`;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ limit?: number, windowMs?: number, key?: string }} [options]
 * @returns {boolean} true when allowed; false after sending 429
 */
export function enforceRateLimit(req, res, options = {}) {
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 10;
  const windowMs = Number(options.windowMs) > 0 ? Number(options.windowMs) : 10 * 60 * 1000;
  const key = options.key || clientKey(req, options.bucket || "default");
  const now = Date.now();

  let entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "Too many requests. Please wait a few minutes and try again.",
      retryAfter,
    });
    return false;
  }

  // Opportunistic cleanup
  if (buckets.size > 2000) {
    for (const [k, v] of buckets) {
      if (now >= v.resetAt) buckets.delete(k);
    }
  }

  return true;
}

export function rateLimitKey(req, suffix) {
  return clientKey(req, suffix);
}
