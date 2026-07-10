import { loadLocalEnv } from "./loadLocalEnv.js";
import { isEmailSimulate } from "./emailSimulator.js";
import { formatPeso, getEmailLinks, getSupportEmail, getSupportContactText, isValidEmail } from "./emailUtils.js";

export { formatPeso, getEmailLinks, getSupportEmail, getSupportContactText, isValidEmail };

export function getEmailConfig() {
  loadLocalEnv();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Hobby Arena <onboarding@resend.dev>";
  // Internal admin alerts only — set ADMIN_NOTIFICATION_EMAIL in env (not customer-facing).
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "";

  if (!apiKey && !isEmailSimulate()) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return { apiKey, from, adminEmail };
}
