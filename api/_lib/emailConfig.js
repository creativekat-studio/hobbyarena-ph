import { loadLocalEnv } from "./loadLocalEnv.js";
import { isEmailSimulate } from "./emailSimulator.js";
import { formatPeso, getEmailLinks, getSupportEmail, isValidEmail } from "./emailUtils.js";

export { formatPeso, getEmailLinks, getSupportEmail, isValidEmail };

export function getEmailConfig() {
  loadLocalEnv();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Hobby Arena <onboarding@resend.dev>";
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "hello@hobbyarena.ph";

  if (!apiKey && !isEmailSimulate()) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return { apiKey, from, adminEmail };
}
