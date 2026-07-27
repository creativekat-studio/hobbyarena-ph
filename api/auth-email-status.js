import { isValidEmail } from "./_lib/emailConfig.js";
import {
  isFirebaseAdminConfigured,
  lookupAuthEmail,
} from "./_lib/firebaseAdmin.js";
import { loadLocalEnv } from "./_lib/loadLocalEnv.js";
import { enforceRateLimit, rateLimitKey } from "./_lib/rateLimit.js";

/**
 * Public (rate-limited) check: does this email already have an Auth account,
 * and which providers? Used to block Create account vs Google cross-signup.
 */
export default async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!enforceRateLimit(req, res, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
    key: rateLimitKey(req, "auth-email-status"),
  })) {
    return undefined;
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (!isFirebaseAdminConfigured()) {
    // Client falls back to Firebase Auth create/sign-in errors.
    return res.status(200).json({ configured: false, exists: false, providers: [] });
  }

  try {
    const result = await lookupAuthEmail(email);
    return res.status(200).json({
      configured: true,
      exists: result.exists,
      providers: result.providers,
      // Needed client-side to detect a separate password Auth user vs linked providers.
      passwordAccountUid: result.passwordAccountUid || null,
    });
  } catch (error) {
    console.error("[auth-email-status]", error?.code || error?.message || error);
    // Do not pretend "not configured" — client must not open Google when the check failed.
    return res.status(503).json({
      configured: true,
      exists: false,
      providers: [],
      passwordAccountUid: null,
      error: "Could not verify that email right now.",
    });
  }
}
