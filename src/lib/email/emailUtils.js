/** Browser- and server-safe email helpers (no Node fs imports). */

function env(name, fallback = "") {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const viteKey = `VITE_${name}`;
    const viteValue = import.meta.env[viteKey] ?? import.meta.env[name];
    if (viteValue != null && viteValue !== "") return String(viteValue);
  }
  if (typeof process !== "undefined" && process.env?.[name]) {
    return process.env[name];
  }
  return fallback;
}

export function getSupportEmail() {
  return env("SUPPORT_EMAIL", "hello@hobbyarena.ph");
}

export function getEmailLinks() {
  const siteUrl = String(env("PUBLIC_SITE_URL", "https://hobbyarena.vercel.app")).replace(/\/$/, "");
  return {
    siteUrl,
    supportEmail: getSupportEmail(),
    messengerUrl: env("MESSENGER_URL", "https://m.me/hobbyarena.ph"),
    accountUrl: `${siteUrl}/account`,
  };
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
