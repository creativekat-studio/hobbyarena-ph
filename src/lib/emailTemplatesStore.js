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
    "We have not received your payment for this order, so we can no longer hold the stock for you — it has been released and may be purchased by other customers. If you still want the item, please place a new order while stock lasts. If you've already paid, email hello@hobbyarena.ph with your proof of payment and we'll sort it out.",
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
