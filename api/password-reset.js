import { dispatchEmail } from "./_lib/dispatchEmail.js";
import { getEmailLinks, isValidEmail } from "./_lib/emailConfig.js";
import { getFirebaseAdmin, isFirebaseAdminConfigured } from "./_lib/firebaseAdmin.js";
import { loadLocalEnv } from "./_lib/loadLocalEnv.js";
import {
  DEFAULT_PASSWORD_RESET_BODY,
  buildPasswordResetEmail,
} from "./_lib/passwordResetEmail.js";

function readBodyOverride(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text || text === DEFAULT_PASSWORD_RESET_BODY.trim()) return "";
  return text.slice(0, 4000);
}

function defaultContinueUrl() {
  const site = getEmailLinks().siteUrl || "https://hobbyarena.vercel.app";
  return `${String(site).replace(/\/$/, "")}/account`;
}

/** Allow continue URLs on our sites + local Vite for QA. */
function resolveContinueUrl(raw) {
  const fallback = defaultContinueUrl();
  const value = String(raw || "").trim();
  if (!value) return fallback;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed =
      host === "localhost"
      || host === "127.0.0.1"
      || host.endsWith(".vercel.app")
      || host === "hobbyarena.ph"
      || host === "www.hobbyarena.ph"
      || host.endsWith(".hobbyarena.ph");
    if (!allowed) return fallback;
    if (!url.pathname || url.pathname === "/") {
      url.pathname = "/account";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

/**
 * Sends a branded password-reset email using Firebase Admin's reset link
 * + the Hobby Arena email template (Resend / simulate outbox).
 *
 * Always returns a generic success for non-preview requests so we don't
 * reveal whether an email has an account.
 */
export default async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const preview = Boolean(req.body?.preview);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const bodyOverride = readBodyOverride(req.body?.bodyOverride);
    const continueUrl = resolveContinueUrl(req.body?.continueUrl);

    if (preview) {
      const content = buildPasswordResetEmail({
        email: isValidEmail(email) ? email : "trainer@example.com",
        resetLink: `${continueUrl}${continueUrl.includes("?") ? "&" : "?"}mode=reset`,
        bodyOverride,
      });
      return res.status(200).json({
        ok: true,
        preview: true,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    const genericOk = {
      ok: true,
      message: "If an email/password account exists for that address, we sent a reset link.",
    };

    if (!isFirebaseAdminConfigured()) {
      return res.status(503).json({
        error:
          "Password reset isn’t set up yet. Add FIREBASE_SERVICE_ACCOUNT_JSON "
          + "(Firebase Console → Project settings → Service accounts → Generate new private key), "
          + "then restart the API.",
      });
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({
        error:
          "Password reset isn’t set up yet. Add FIREBASE_SERVICE_ACCOUNT_JSON "
          + "(Firebase Console → Project settings → Service accounts), then restart the API.",
      });
    }

    let resetLink = "";
    try {
      resetLink = await admin.auth().generatePasswordResetLink(email, {
        url: continueUrl,
      });
    } catch (error) {
      // user-not-found / invalid — still return generic success
      console.warn("[password-reset] generatePasswordResetLink:", error?.code || error?.message || error);
      return res.status(200).json(genericOk);
    }

    const content = buildPasswordResetEmail({
      email,
      resetLink,
      bodyOverride,
    });

    const result = await dispatchEmail({
      to: email,
      subject: content.subject,
      html: content.html,
      text: content.text,
      meta: { kind: "password_reset", email },
    });

    if (!result.ok) {
      return res.status(502).json({
        error:
          result.error
          || "We couldn’t send the reset email right now. Please try again in a few minutes, or message Hobby Arena PH.",
      });
    }

    return res.status(200).json({
      ...genericOk,
      simulated: Boolean(result.simulated),
      skipped: Boolean(result.skipped),
      skipReason: result.skipReason || undefined,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("password-reset:", error);
    return res.status(500).json({
      error:
        "Something went wrong sending the reset email. Please try again, or message Hobby Arena PH for help.",
    });
  }
}
