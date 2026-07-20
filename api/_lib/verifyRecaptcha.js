import { loadLocalEnv } from "./loadLocalEnv.js";
import { isApiProduction } from "./requireAdmin.js";

/**
 * Verify a reCAPTCHA v2 token with Google.
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function verifyRecaptchaToken(token) {
  loadLocalEnv();
  const secret = String(process.env.RECAPTCHA_SECRET_KEY || "").trim();

  if (!secret) {
    // Local/preview without keys: allow through. Production must configure the secret.
    if (isApiProduction()) {
      return { ok: false, error: "Checkout security is not configured. Please try again later." };
    }
    return { ok: true, skipped: true };
  }

  const value = String(token || "").trim();
  if (!value) {
    return { ok: false, error: "Please complete the “I’m not a robot” check." };
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: value }),
    });
    const data = await response.json().catch(() => ({}));
    if (!data?.success) {
      return { ok: false, error: "reCAPTCHA failed. Please try the checkbox again." };
    }
    return { ok: true };
  } catch (error) {
    console.error("verifyRecaptcha:", error);
    return { ok: false, error: "Could not verify reCAPTCHA. Please try again." };
  }
}

export function isRecaptchaConfigured() {
  loadLocalEnv();
  return Boolean(String(process.env.RECAPTCHA_SECRET_KEY || "").trim());
}
