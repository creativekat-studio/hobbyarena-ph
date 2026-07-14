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
import {
  DEFAULT_PASSWORD_RESET_BODY,
  PASSWORD_RESET_EMAIL_TYPE,
  PASSWORD_RESET_PLACEHOLDERS,
} from "./email/passwordResetEmail.js";

export { PASSWORD_RESET_EMAIL_TYPE, PASSWORD_RESET_PLACEHOLDERS };

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

/** Tokens for email footer blocks. */
export const PREORDER_REMINDER_PLACEHOLDERS = [
  { token: "{{depositPercent}}", description: "Deposit % (e.g. 30)" },
  { token: "{{balancePercent}}", description: "Balance % (e.g. 70)" },
  { token: "{{customer}}", description: "Customer name" },
  { token: "{{item}}", description: "Item name (with qty)" },
  { token: "{{order}}", description: "Order number" },
  { token: "{{balance}}", description: "Balance due amount" },
  { token: "{{refund}}", description: "Refund amount" },
  { token: "{{allocated}}", description: "Allocated qty" },
  { token: "{{qty}}", description: "Ordered qty" },
];

export const DEFAULT_FOOTER_ID = "ft-preorder-reminder";

const DEFAULT_FOOTER_LINES = [
  "{{depositPercent}}% down payment is non-refundable (unless it is due to country allocation cuts)",
  "The remaining {{balancePercent}}% balance must be fully settled before the Product Release Day to ensure smooth processing and timely turnover of your order.",
  "Orders that remain unpaid or unclaimed seven (7) days after the Product Release Day will be considered abandoned, and the corresponding down payment will strictly be forfeited.",
];

/** Built-in default footer used for unpaid pre-order emails. */
export const DEFAULT_EMAIL_FOOTER = {
  id: DEFAULT_FOOTER_ID,
  name: "Pre-Order Reminder",
  title: "Pre-Order Reminder",
  lines: [...DEFAULT_FOOTER_LINES],
};

/** @deprecated Use DEFAULT_EMAIL_FOOTER — kept for older imports. */
export const DEFAULT_PREORDER_REMINDER = {
  title: DEFAULT_EMAIL_FOOTER.title,
  lines: [...DEFAULT_EMAIL_FOOTER.lines],
};

/** Email types that get the default Pre-Order Reminder footer assigned out of the box. */
export const PREORDER_REMINDER_EMAIL_TYPES = [
  "deposit_received",
  "balance_due_full",
  "balance_due_partial",
];

export const ORDER_ACK_FOOTER_KEY = "order_acknowledgement";

function defaultAssignmentByType() {
  const map = { [ORDER_ACK_FOOTER_KEY]: DEFAULT_FOOTER_ID };
  for (const type of PREORDER_REMINDER_EMAIL_TYPES) {
    map[type] = DEFAULT_FOOTER_ID;
  }
  return map;
}

/** Default multi-footer library + per-template assignments. */
export const DEFAULT_EMAIL_FOOTER_LIBRARY = {
  footers: [{ ...DEFAULT_EMAIL_FOOTER, lines: [...DEFAULT_EMAIL_FOOTER.lines] }],
  assignmentByType: defaultAssignmentByType(),
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
  password_reset: DEFAULT_PASSWORD_RESET_BODY,
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

function newFooterId() {
  return `ft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeFooterItem(raw, fallbackIndex = 0) {
  const base = DEFAULT_EMAIL_FOOTER;
  const lines = Array.isArray(raw?.lines)
    ? raw.lines.map((line) => String(line ?? "").trim()).filter(Boolean).slice(0, 10)
    : [...base.lines];
  const name = String(raw?.name ?? raw?.title ?? `Footer ${fallbackIndex + 1}`).trim() || `Footer ${fallbackIndex + 1}`;
  const title = String(raw?.title ?? name).trim() || name;
  return {
    id: String(raw?.id || "").trim() || newFooterId(),
    name,
    title,
    lines: lines.length ? lines : [...base.lines],
  };
}

function migrateLegacyReminder(raw) {
  const footer = normalizeFooterItem({
    id: DEFAULT_FOOTER_ID,
    name: String(raw?.title || DEFAULT_EMAIL_FOOTER.name).trim() || DEFAULT_EMAIL_FOOTER.name,
    title: String(raw?.title || DEFAULT_EMAIL_FOOTER.title).trim() || DEFAULT_EMAIL_FOOTER.title,
    lines: Array.isArray(raw?.lines) ? raw.lines : DEFAULT_EMAIL_FOOTER.lines,
  });

  const assignmentByType = defaultAssignmentByType();
  if (raw?.enabledByType && typeof raw.enabledByType === "object") {
    for (const type of PREORDER_REMINDER_EMAIL_TYPES) {
      assignmentByType[type] = raw.enabledByType[type] === false ? "" : footer.id;
    }
  } else if (raw?.enabled === false) {
    for (const type of PREORDER_REMINDER_EMAIL_TYPES) {
      assignmentByType[type] = "";
    }
    assignmentByType[ORDER_ACK_FOOTER_KEY] = "";
  } else {
    for (const type of PREORDER_REMINDER_EMAIL_TYPES) {
      assignmentByType[type] = footer.id;
    }
    assignmentByType[ORDER_ACK_FOOTER_KEY] = footer.id;
  }

  return { footers: [footer], assignmentByType };
}

function normalizeFooterLibrary(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      footers: DEFAULT_EMAIL_FOOTER_LIBRARY.footers.map((footer) => ({
        ...footer,
        lines: [...footer.lines],
      })),
      assignmentByType: { ...DEFAULT_EMAIL_FOOTER_LIBRARY.assignmentByType },
    };
  }

  // Legacy single-footer shape (title/lines/enabledByType).
  if (!Array.isArray(raw.footers) && (raw.title || raw.lines || raw.enabledByType || typeof raw.enabled === "boolean")) {
    return migrateLegacyReminder(raw);
  }

  const footers = (Array.isArray(raw.footers) ? raw.footers : [])
    .map((item, index) => normalizeFooterItem(item, index))
    .filter((item) => item.name);

  const list = footers.length
    ? footers
    : DEFAULT_EMAIL_FOOTER_LIBRARY.footers.map((footer) => ({
      ...footer,
      lines: [...footer.lines],
    }));

  const validIds = new Set(list.map((footer) => footer.id));
  const assignmentByType = { ...defaultAssignmentByType() };

  // Start blank for types not in the default map, then apply saved assignments.
  for (const type of Object.keys(ORDER_STATUS_EMAIL_LABELS)) {
    if (!(type in assignmentByType)) assignmentByType[type] = "";
  }

  if (raw.assignmentByType && typeof raw.assignmentByType === "object") {
    for (const [key, value] of Object.entries(raw.assignmentByType)) {
      const id = String(value ?? "").trim();
      assignmentByType[key] = id && validIds.has(id) ? id : "";
    }
  }

  // Ensure default keys still point at a valid footer when untouched.
  for (const key of Object.keys(assignmentByType)) {
    const id = assignmentByType[key];
    if (id && !validIds.has(id)) assignmentByType[key] = "";
  }

  return { footers: list, assignmentByType };
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

function libraryEqualsDefault(config) {
  const normalized = normalizeFooterLibrary(config);
  const defaults = DEFAULT_EMAIL_FOOTER_LIBRARY;
  if (normalized.footers.length !== defaults.footers.length) return false;
  const sameFooters = normalized.footers.every((footer, index) => {
    const base = defaults.footers[index];
    return footer.id === base.id
      && footer.name.trim() === base.name.trim()
      && footer.title.trim() === base.title.trim()
      && footer.lines.join("\n") === base.lines.join("\n");
  });
  if (!sameFooters) return false;
  const defaultAssignments = defaults.assignmentByType;
  const keys = new Set([
    ...Object.keys(defaultAssignments),
    ...Object.keys(normalized.assignmentByType),
  ]);
  for (const key of keys) {
    const expected = defaultAssignments[key] || "";
    const actual = normalized.assignmentByType[key] || "";
    if (expected !== actual) return false;
  }
  return true;
}

/** Saved footer library (or defaults). */
export function getPreorderReminderConfig() {
  return normalizeFooterLibrary(readReminderStore());
}

export function setPreorderReminderConfig(config) {
  const normalized = normalizeFooterLibrary(config);
  if (libraryEqualsDefault(normalized)) {
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

export function setEmailFooterAssignment(emailType, footerId) {
  const current = getPreorderReminderConfig();
  const id = String(footerId ?? "").trim();
  const valid = !id || current.footers.some((footer) => footer.id === id);
  return setPreorderReminderConfig({
    ...current,
    assignmentByType: {
      ...current.assignmentByType,
      [emailType]: valid ? id : "",
    },
  });
}

export function addEmailFooter(partial = {}) {
  const current = getPreorderReminderConfig();
  const footer = normalizeFooterItem({
    id: newFooterId(),
    name: partial.name || `Footer ${current.footers.length + 1}`,
    title: partial.title || partial.name || "Email footer",
    lines: partial.lines || ["Add your footer message here."],
  }, current.footers.length);
  return setPreorderReminderConfig({
    ...current,
    footers: [...current.footers, footer],
  });
}

export function updateEmailFooter(footerId, partial) {
  const current = getPreorderReminderConfig();
  const footers = current.footers.map((footer) => (
    footer.id === footerId
      ? normalizeFooterItem({ ...footer, ...partial, id: footer.id })
      : footer
  ));
  return setPreorderReminderConfig({ ...current, footers });
}

export function removeEmailFooter(footerId) {
  const current = getPreorderReminderConfig();
  if (current.footers.length <= 1) return current;
  const footers = current.footers.filter((footer) => footer.id !== footerId);
  const assignmentByType = { ...current.assignmentByType };
  for (const [key, value] of Object.entries(assignmentByType)) {
    if (value === footerId) assignmentByType[key] = "";
  }
  return setPreorderReminderConfig({ footers, assignmentByType });
}

/** Resolve the footer assigned to an email type (or null if blank / missing). */
export function resolveAssignedFooter(reminderConfig, emailType) {
  const config = normalizeFooterLibrary(reminderConfig);
  const key = emailType || ORDER_ACK_FOOTER_KEY;
  const footerId = String(config.assignmentByType?.[key] || "").trim();
  if (!footerId) return null;
  return config.footers.find((footer) => footer.id === footerId) || null;
}

export function isPreorderReminderCustomized() {
  return !libraryEqualsDefault(getPreorderReminderConfig());
}

/** @deprecated Prefer resolveAssignedFooter — always true for any email type now. */
export function emailTypeSupportsPreorderReminder() {
  return true;
}

/** @deprecated Use setEmailFooterAssignment. */
export function setPreorderReminderEnabledForType(emailType, enabled) {
  const current = getPreorderReminderConfig();
  const fallbackId = current.footers[0]?.id || DEFAULT_FOOTER_ID;
  return setEmailFooterAssignment(emailType, enabled ? fallbackId : "");
}
