import { dispatchEmail } from "./_lib/dispatchEmail.js";
import { getEmailLinks, isValidEmail } from "./_lib/emailConfig.js";
import {
  generatePasswordResetLink,
  isFirebaseAdminConfigured,
} from "./_lib/firebaseAdmin.js";
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

function linkErrorMeta(error) {
  return {
    code: error?.code || error?.errorInfo?.code || "",
    message: error?.message || error?.errorInfo?.message || String(error || "unknown"),
  };
}

/**
 * Build a Firebase password-reset link. Retries without continueUrl when
 * the continue URL isn't authorized (common misconfig that blocks every send).
 */
async function generateResetLink(email, continueUrl) {
  try {
    const link = await generatePasswordResetLink(email, continueUrl);
    return { link, usedContinueUrl: true };
  } catch (error) {
    const meta = linkErrorMeta(error);
    const continueUriIssue =
      /unauthorized-continue-uri|invalid-continue-uri|invalid-dynamic-link|INVALID_CONTINUE_URI/i.test(
        `${meta.code} ${meta.message}`,
      );
    if (!continueUriIssue) throw error;

    console.warn(
      "[password-reset] continue URL rejected; retrying without continueUrl:",
      meta.code || meta.message,
    );
    const link = await generatePasswordResetLink(email, "");
    return { link, usedContinueUrl: false };
  }
}

/**
 * Sends a branded password-reset email using Firebase Admin's reset link
 * + the Hobby Arena email template (Resend / simulate outbox).
 *
 * Public requests always return a generic success so we don't reveal whether
 * an email has an account. Admin `test: true` always tries to send (placeholder
 * link if no Firebase user) and returns an honest sent/warning result.
 */
export default async function handler(req, res) {
  loadLocalEnv();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const preview = Boolean(req.body?.preview);
    const isTest = Boolean(req.body?.test);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const bodyOverride = readBodyOverride(req.body?.bodyOverride);
    const continueUrl = resolveContinueUrl(req.body?.continueUrl);
    const placeholderLink = `${String(getEmailLinks().siteUrl || "https://www.hobbyarena.ph").replace(/\/$/, "")}/account/reset-password?mode=resetPassword&test=1`;

    if (preview) {
      const content = buildPasswordResetEmail({
        email: isValidEmail(email) ? email : "trainer@example.com",
        resetLink: placeholderLink,
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

    let resetLink = "";
    let usedPlaceholderLink = false;
    let linkWarning = "";

    try {
      const generated = await generateResetLink(email, continueUrl);
      resetLink = generated.link;
      if (!generated.usedContinueUrl) {
        linkWarning =
          "Firebase rejected the continue URL (add hobbyarena.vercel.app / hobbyarena.ph "
          + "under Authentication → Settings → Authorized domains). Reset link still works.";
      }
    } catch (error) {
      const meta = linkErrorMeta(error);
      console.warn("[password-reset] generatePasswordResetLink:", meta.code || meta.message);

      if (!isTest) {
        // user-not-found / invalid — still return generic success for public
        return res.status(200).json(genericOk);
      }

      // Admin template test: still send so Resend delivery can be verified.
      usedPlaceholderLink = true;
      resetLink = placeholderLink;
      linkWarning =
        /EMAIL_NOT_FOUND|USER_NOT_FOUND|auth\/email-not-found|auth\/user-not-found/i.test(
          `${meta.code} ${meta.message}`,
        )
          ? `No Firebase Auth user for ${email}. Sent the template with a placeholder link so you can check Resend.`
          : `Could not create a real reset link (${meta.code || "error"}: ${meta.message}). Sent with a placeholder link.`;
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
      meta: { kind: "password_reset", email, test: isTest || undefined },
    });

    if (!result.ok) {
      return res.status(502).json({
        error:
          result.error
          || "We couldn’t send the reset email right now. Please try again in a few minutes, or message Hobby Arena PH.",
      });
    }

    if (isTest) {
      return res.status(200).json({
        ok: true,
        sent: true,
        usedPlaceholderLink,
        warning: linkWarning || undefined,
        message: usedPlaceholderLink
          ? `Password reset template sent to ${email} (placeholder link).`
          : `Password reset email sent to ${email}.`,
        simulated: Boolean(result.simulated),
        skipped: Boolean(result.skipped),
        skipReason: result.skipReason || undefined,
        messageId: result.messageId,
      });
    }

    return res.status(200).json({
      ...genericOk,
      sent: true,
      warning: linkWarning || undefined,
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
