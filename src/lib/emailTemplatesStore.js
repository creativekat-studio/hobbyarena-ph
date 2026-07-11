/**
 * Admin-editable email bodies for order status updates.
 *
 * MOCK: persists custom bodies to localStorage so admins can tweak wording
 * without a code change. The branded outer container, subject, item card,
 * and milestones stay fixed — only the message body is editable.
 * Swap the localStorage read/write for a Firestore document to sync across
 * devices when ready.
 */

import { ORDER_STATUS_EMAIL_LABELS } from "./orderEmailTriggers.js";

const STORAGE_KEY = "hobbyarena:email-bodies";
const REMINDER_STORAGE_KEY = "hobbyarena:email-preorder-reminder";

/** Tokens admins can drop into a body — replaced with live order values. */
export const EMAIL_PLACEHOLDERS = [
  { token: "{{customer}}", description: "Customer name" },
  { token: "{{item}}", description: "Item name (with qty)" },
  { token: "{{order}}", description: "Order number" },
  { token: "{{balance}}", description: "Balance due" },
  { token: "{{refund}}", description: "Refund amount" },
  { token: "{{allocated}}", description: "Allocated qty" },
  { token: "{{qty}}", description: "Ordered qty" },
];

/** Tokens for the Pre-Order Reminder footer block. */
export const PREORDER_REMINDER_PLACEHOLDERS = [
  { token: "{{depositPercent}}", description: "Deposit % (e.g. 30)" },
  { token: "{{balancePercent}}", description: "Balance % (e.g. 70)" },
];

/** Default Pre-Order Reminder footer — shown on unpaid pre-order emails. */
export const DEFAULT_PREORDER_REMINDER = {
  enabled: true,
  title: "Pre-Order Reminder",
  lines: [
    "{{depositPercent}}% down payment is non-refundable (unless it is due to country allocation cuts)",
    "The remaining {{balancePercent}}% balance must be fully settled before the Product Release Day to ensure smooth processing and timely turnover of your order.",
    "Orders that remain unpaid or unclaimed seven (7) days after the Product Release Day will be considered abandoned, and the corresponding down payment will strictly be forfeited.",
  ],
};

/** Default plain-text bodies — mirror the server templates in api/_lib/orderStatusEmail.js. */
export const DEFAULT_EMAIL_BODIES = {
  deposit_received:
    "We received and verified your deposit. This item is now awaiting stock allocation — we'll email you when allocation is confirmed.",
  balance_due_full:
    "Great news — this item received 100% allocation. Please pay the remaining balance of {{balance}}.",
  balance_due_partial:
    "Your allocation is {{allocated}} / {{qty}} units. Please pay the remaining balance of {{balance}} for your fulfilled units.",
  partial_refund_pending:
    "Only {{allocated}} / {{qty}} units were allocated. A refund of {{refund}} is due on the unallocated units.",
  full_refund_pending:
    "We're sorry — no allocation was available for this item. Your deposit of {{refund}} will be fully refunded.",
  partial_refund_sent:
    "We have sent your refund of {{refund}}. Your allocated units are ready for pickup — please schedule pickup with our team.",
  ready_for_pickup:
    "This item is ready for pickup. Please schedule pickup with our team during processing hours (Mon–Fri, 8:00 AM – 8:00 PM).",
  order_fulfilled:
    "This item is fulfilled. Thank you for shopping with Hobby Arena — hope to see you again soon!",
  full_refund_sent:
    "We have sent your full refund of {{refund}}. Please confirm once received.",
  payment_not_received:
    "We have not received your payment for this order, so we can no longer hold the stock for you — it has been released and may be purchased by other customers. If you still want the item, please place a new order while stock lasts. If you've already paid, upload proof via your account or Hobby Arena PH and we'll sort it out.",
};

export const EMAIL_TYPES = Object.keys(ORDER_STATUS_EMAIL_LABELS);

function readStore() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(map) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / serialization errors
  }
}

/** Custom body override for an email type, or "" if using the default. */
export function getEmailBodyOverride(emailType) {
  const stored = readStore()[emailType];
  return typeof stored === "string" ? stored : "";
}

/** All saved overrides keyed by email type. */
export function getAllEmailBodyOverrides() {
  return readStore();
}

/** The body an admin sees in the editor — saved override, else the default. */
export function getEditableEmailBody(emailType) {
  const override = getEmailBodyOverride(emailType);
  return override || DEFAULT_EMAIL_BODIES[emailType] || "";
}

export function setEmailBodyOverride(emailType, body) {
  const map = readStore();
  const trimmed = String(body ?? "").trim();
  const isDefault = trimmed === (DEFAULT_EMAIL_BODIES[emailType] || "").trim();
  if (!trimmed || isDefault) {
    delete map[emailType];
  } else {
    map[emailType] = trimmed;
  }
  writeStore(map);
  return getEditableEmailBody(emailType);
}

export function clearEmailBodyOverride(emailType) {
  const map = readStore();
  delete map[emailType];
  writeStore(map);
  return getEditableEmailBody(emailType);
}

function normalizeReminderConfig(raw) {
  const base = DEFAULT_PREORDER_REMINDER;
  if (!raw || typeof raw !== "object") {
    return {
      enabled: base.enabled,
      title: base.title,
      lines: [...base.lines],
    };
  }
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((line) => String(line ?? "").trim()).filter(Boolean).slice(0, 6)
    : [...base.lines];
  return {
    enabled: raw.enabled !== false,
    title: String(raw.title ?? base.title).trim() || base.title,
    lines: lines.length ? lines : [...base.lines],
  };
}

function readReminderStore() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeReminderStore(config) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota / serialization errors
  }
}

function reminderEqualsDefault(config) {
  const normalized = normalizeReminderConfig(config);
  const defaults = DEFAULT_PREORDER_REMINDER;
  if (normalized.enabled !== defaults.enabled) return false;
  if (normalized.title.trim() !== defaults.title.trim()) return false;
  if (normalized.lines.length !== defaults.lines.length) return false;
  return normalized.lines.every((line, i) => line.trim() === defaults.lines[i].trim());
}

/** Saved Pre-Order Reminder config (or defaults). */
export function getPreorderReminderConfig() {
  return normalizeReminderConfig(readReminderStore());
}

export function setPreorderReminderConfig(config) {
  const normalized = normalizeReminderConfig(config);
  if (reminderEqualsDefault(normalized)) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(REMINDER_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  } else {
    writeReminderStore(normalized);
  }
  return getPreorderReminderConfig();
}

export function clearPreorderReminderConfig() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(REMINDER_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  return getPreorderReminderConfig();
}

export function isPreorderReminderCustomized() {
  return !reminderEqualsDefault(getPreorderReminderConfig());
}
