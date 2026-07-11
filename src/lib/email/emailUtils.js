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
 * Resolve the footer assigned to an email type from the reminder/footer library payload.
 * Returns `{ title, lines }` or null when blank / missing.
 */
export function resolveReminderFooter(reminder, emailType = null) {
  if (!reminder || typeof reminder !== "object") return null;

  if (Array.isArray(reminder.footers)) {
    const key = emailType || "order_acknowledgement";
    const footerId = String(reminder.assignmentByType?.[key] || "").trim();
    if (!footerId) return null;
    const footer = reminder.footers.find((row) => row?.id === footerId);
    if (!footer) return null;
    const lines = Array.isArray(footer.lines)
      ? footer.lines.map((line) => String(line ?? "").trim()).filter(Boolean)
      : [];
    return {
      title: String(footer.title || footer.name || "Footer").trim() || "Footer",
      lines,
    };
  }

  // Legacy single-footer payload
  if (emailType && reminder.enabledByType && reminder.enabledByType[emailType] === false) {
    return null;
  }
  if (reminder.enabled === false) return null;
  if (emailType && Array.isArray(reminder.footers) === false && reminder.title) {
    // Old shape only applied to classic reminder types unless explicitly assigned.
    const classic = new Set(["deposit_received", "balance_due_full", "balance_due_partial"]);
    if (emailType && !classic.has(emailType) && !reminder.enabledByType) return null;
  }
  if (!reminder.title && !reminder.lines) return null;
  return {
    title: String(reminder.title || "Pre-Order Reminder").trim() || "Pre-Order Reminder",
    lines: Array.isArray(reminder.lines)
      ? reminder.lines.map((line) => String(line ?? "").trim()).filter(Boolean)
      : [],
  };
}

/**
 * Whether a custom footer block should render for this order/email.
 * Status emails: show when a footer is assigned to that template.
 * Order acknowledgement (no emailType): only for unpaid pre-orders with an assigned footer.
 */
export function shouldShowPreorderReminder(order, emailType = null, reminder = null) {
  const footer = resolveReminderFooter(reminder, emailType);
  if (!footer) return false;
  if (emailType) return true;
  return isPreorderEmailContext(order) && orderHasOutstandingBalance(order);
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
