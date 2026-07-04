import { loadLocalEnv } from "./loadLocalEnv.js";

export function getEmailConfig() {
  loadLocalEnv();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Hobby Arena <onboarding@resend.dev>";
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "hello@hobbyarena.ph";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return { apiKey, from, adminEmail };
}

export function formatPeso(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
