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

/** Optional — not shown in customer emails by default. */
export function getSupportEmail() {
  return env("SUPPORT_EMAIL", "");
}

export function getEmailLinks() {
  const siteUrl = String(env("PUBLIC_SITE_URL", "https://hobbyarena.vercel.app")).replace(/\/$/, "");
  const displaySiteUrl = String(env("PUBLIC_DISPLAY_SITE_URL", "https://www.hobbyarena.ph")).replace(/\/$/, "");
  return {
    siteUrl,
    displaySiteUrl,
    supportEmail: getSupportEmail(),
    messengerUrl: env("MESSENGER_URL", "https://m.me/hobbyarena.ph"),
    facebookUrl: env("FACEBOOK_URL", "https://www.facebook.com/hobbyarena.ph"),
    accountUrl: `${siteUrl}/account`,
  };
}

export function getSupportContactText() {
  const { facebookUrl, messengerUrl } = getEmailLinks();
  return `Questions? Message us directly at Hobby Arena PH (${messengerUrl || facebookUrl})`;
}

export function getSupportContactHtml() {
  const { messengerUrl, facebookUrl } = getEmailLinks();
  const href = messengerUrl || facebookUrl;
  return `Questions? Message us directly at <a href="${href}" style="color:inherit;font-weight:600;text-decoration:underline">Hobby Arena PH</a>`;
}

/** True when the order/line context is a pre-order (not in-stock). */
export function isPreorderEmailContext(order) {
  const item = order?.updatedLineItem;
  if (order?.type === "Pre-order" || order?.kind === "preorder" || order?.kind === "Pre-order") return true;
  if (item?.tag === "Pre-order") return true;
  if (Array.isArray(order?.lineItems) && order.lineItems.some((row) => row.tag === "Pre-order")) return true;
  return false;
}

const BALANCE_DUE_STATUSES = new Set([
  "Allocation Fulfilled & Pay Balance",
  "Partially Fulfilled & Pay Balance",
]);

const BALANCE_DUE_EMAIL_TYPES = new Set([
  "balance_due_full",
  "balance_due_partial",
]);

function hasBalanceDueStatus(order) {
  const item = order?.updatedLineItem;
  if (item && BALANCE_DUE_STATUSES.has(String(item.status || ""))) return true;
  if (BALANCE_DUE_STATUSES.has(String(order?.status || ""))) return true;
  if (Array.isArray(order?.lineItems) && order.lineItems.some((row) => (
    row.tag === "Pre-order" && BALANCE_DUE_STATUSES.has(String(row.status || ""))
  ))) {
    return true;
  }
  return false;
}

/** True when the customer still owes a balance on a pre-order. */
export function orderHasOutstandingBalance(order) {
  if (!isPreorderEmailContext(order)) return false;

  if ((Number(order?.balanceDue) || 0) > 0) return true;
  const item = order?.updatedLineItem;
  if (item && (Number(item.balanceDue) || 0) > 0) return true;

  const payment = String(item?.payment || order?.payment || "");
  if (["Fully Paid", "Refunded", "Partially Refunded"].includes(payment)) return false;

  return payment !== "Fully Paid";
}

/**
 * Pre-order reminder block — only for pre-orders that are in a balance-due state.
 * Never for in-stock orders or non-balance-due statuses (payment verified, fulfilled, etc.).
 */
export function shouldShowPreorderReminder(order, emailType = null) {
  if (!isPreorderEmailContext(order)) return false;
  if (emailType) return BALANCE_DUE_EMAIL_TYPES.has(emailType);
  return hasBalanceDueStatus(order) && orderHasOutstandingBalance(order);
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
