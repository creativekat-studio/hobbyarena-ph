/** Payment proof blobs — stored per order, kept out of the orders list JSON. */

import {
  isDepositProofTrailEntry,
  trailEntryShowsAttachment,
} from "../data/orderWorkflow.js";

const PROOF_KEY_PREFIX = "hobbyarena:order-proof:";
const BALANCE_PROOF_KEY_PREFIX = "hobbyarena:balance-proof:";
const REFUND_PROOF_KEY_PREFIX = "hobbyarena:refund-proof:";
const LEGACY_SESSION_KEY = "hobbyarena:order-proofs";

function proofKey(orderId) {
  return `${PROOF_KEY_PREFIX}${orderId}`;
}

function balanceProofKey(orderId, lineItemId, proofId) {
  const base = `${BALANCE_PROOF_KEY_PREFIX}${orderId}:${lineItemId}`;
  return proofId ? `${base}:${proofId}` : base;
}

function refundProofKey(orderId, lineItemId) {
  return `${REFUND_PROOF_KEY_PREFIX}${orderId}:${lineItemId}`;
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

function readLegacySessionMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function migrateLegacyProofMap() {
  if (typeof window === "undefined") return;
  const legacy = readLegacySessionMap();
  for (const [orderId, url] of Object.entries(legacy)) {
    if (typeof url === "string" && url.startsWith("data:")) {
      try {
        window.localStorage.setItem(proofKey(orderId), url);
      } catch {
        // keep in session map if localStorage is full
        continue;
      }
    }
  }
  try {
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }
}

if (typeof window !== "undefined") {
  migrateLegacyProofMap();
}

export function storeOrderProof(orderId, dataUrl) {
  if (!orderId || !isDataUrl(dataUrl)) return false;
  const id = String(orderId);

  try {
    window.localStorage.setItem(proofKey(id), dataUrl);
    return true;
  } catch {
    // fall back to session map entry for this order only
    try {
      const map = readLegacySessionMap();
      map[id] = dataUrl;
      window.sessionStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify(map));
      return true;
    } catch {
      return false;
    }
  }
}

export function getOrderProof(orderId) {
  if (!orderId) return null;
  const id = String(orderId);

  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(proofKey(id));
      if (isDataUrl(stored)) return stored;
    } catch {
      // ignore
    }

    const legacy = readLegacySessionMap()[id];
    if (isDataUrl(legacy)) return legacy;
  }

  return null;
}

export function storeBalanceProof(orderId, lineItemId, dataUrl, proofId) {
  if (!orderId || !lineItemId || !isDataUrl(dataUrl)) return false;
  try {
    window.localStorage.setItem(balanceProofKey(orderId, lineItemId, proofId), dataUrl);
    return true;
  } catch {
    return false;
  }
}

/** Scan for any stored balance proof for this line item (legacy / missing proofId). */
function scanBalanceProof(orderId, lineItemId) {
  const prefix = `${BALANCE_PROOF_KEY_PREFIX}${orderId}:${lineItemId}`;
  let match = null;
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(prefix)) {
      const value = window.localStorage.getItem(key);
      if (isDataUrl(value)) match = value;
    }
  }
  return match;
}

export function getBalanceProof(orderId, lineItemId, proofId) {
  if (!orderId || !lineItemId || typeof window === "undefined") return null;
  try {
    if (proofId) {
      const stored = window.localStorage.getItem(balanceProofKey(orderId, lineItemId, proofId));
      if (isDataUrl(stored)) return stored;
    }
    // Legacy base key (proofs saved before multi-proof support).
    const legacy = window.localStorage.getItem(balanceProofKey(orderId, lineItemId));
    if (isDataUrl(legacy)) return legacy;
    // Last resort: any balance proof stored for this line item.
    return scanBalanceProof(orderId, lineItemId);
  } catch {
    return null;
  }
}

export function hasBalanceProof(orderId, lineItemId) {
  return Boolean(getBalanceProof(orderId, lineItemId));
}

export function storeRefundProof(orderId, lineItemId, dataUrl) {
  if (!orderId || !lineItemId || !isDataUrl(dataUrl)) return false;
  try {
    window.localStorage.setItem(refundProofKey(orderId, lineItemId), dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function getRefundProof(orderId, lineItemId) {
  if (!orderId || !lineItemId || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(refundProofKey(orderId, lineItemId));
    return isDataUrl(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Resolve a trail attachment URL (deposit, per-item balance, or refund proof). */
export function resolveProofAttachmentUrl(order, entry) {
  const attachment = entry?.attachment;
  if (!attachment) return null;

  if (attachment.kind === "balance" && entry.lineItemId) {
    const balanceProof = getBalanceProof(order?.id, entry.lineItemId, attachment.proofId);
    if (balanceProof) return balanceProof;
    // Never fall back to the deposit proof — a missing balance proof shows nothing.
    return isDataUrl(attachment.url) ? attachment.url : null;
  }

  if (attachment.kind === "refund" && entry.lineItemId) {
    const refundProof = getRefundProof(order?.id, entry.lineItemId);
    if (refundProof) return refundProof;
    return isDataUrl(attachment.url) ? attachment.url : null;
  }

  if (isDataUrl(attachment.url)) return attachment.url;
  return resolveOrderProofUrl(order);
}

/** Backfill attachment metadata on deposit proof trail rows (e.g. after Firestore sync). */
export function ensureTrailEntryAttachment(entry, order) {
  if (!entry) return entry;
  if (entry.attachment) return entry;
  if (!isDepositProofTrailEntry(entry) || !orderHasStoredProof(order)) {
    return entry;
  }

  return {
    ...entry,
    attachment: {
      label: "Proof of payment",
      type: "image",
      stored: true,
      kind: "deposit",
    },
  };
}

export function prepareTrailForDisplay(trail, order) {
  return (trail ?? []).map((entry) => {
    const withAttachment = ensureTrailEntryAttachment(entry, order);
    if (!withAttachment.attachment || !trailEntryShowsAttachment(withAttachment)) {
      return withAttachment;
    }

    const url = resolveProofAttachmentUrl(order, withAttachment);
    const hydrated = hydrateProofAttachment(withAttachment.attachment, url);
    return hydrated ? { ...withAttachment, attachment: hydrated } : withAttachment;
  });
}

export function orderHasStoredProof(order) {
  if (!order) return false;
  if (order.hasProof) return true;
  if (isDataUrl(order.proofOfPayment)) return true;
  return Boolean(getOrderProof(order.id));
}

export function resolveOrderProofUrl(order) {
  if (!order) return null;
  const sessionProof = getOrderProof(order.id);
  if (sessionProof) return sessionProof;
  if (isDataUrl(order.proofOfPayment)) return order.proofOfPayment;
  return null;
}

export function hydrateProofAttachment(attachment, proofUrl) {
  if (!proofUrl) {
    return attachment?.url ? attachment : null;
  }

  if (attachment?.url && isDataUrl(attachment.url)) {
    return attachment;
  }

  // Preserve kind / lineItemId / proofId so the attachment can still be
  // re-resolved after a Firestore round-trip strips the inline data URL.
  return {
    ...attachment,
    url: proofUrl,
    label: attachment?.label || "Proof of payment",
    type: attachment?.type || (proofUrl.startsWith("data:application/pdf") ? "pdf" : "image"),
  };
}

/** Remove inline base64 from an order before writing to localStorage. */
export function stripOrderProofPayload(order) {
  if (!order || typeof order !== "object") return order;

  const hasProof = orderHasStoredProof(order);
  const trail = Array.isArray(order.trail)
    ? order.trail.map((entry) => {
        if (!entry?.attachment) return entry;
        if (entry.attachment.url && isDataUrl(entry.attachment.url)) {
          return {
            ...entry,
            attachment: {
              ...entry.attachment,
              url: null,
              stored: true,
            },
          };
        }
        return entry;
      })
    : order.trail;

  return {
    ...order,
    hasProof,
    proofOfPayment: isDataUrl(order.proofOfPayment) ? null : order.proofOfPayment,
    trail,
  };
}

/** Move legacy inline proofs into per-order storage and slim the in-memory order. */
export function migrateInlineOrderProof(order) {
  if (!order?.id) return order;

  const inlineProof = isDataUrl(order.proofOfPayment) ? order.proofOfPayment : null;
  const trailProof = order.trail?.find((entry) => isDataUrl(entry?.attachment?.url))?.attachment?.url ?? null;
  const proofUrl = inlineProof || trailProof;

  if (proofUrl) {
    storeOrderProof(order.id, proofUrl);
  }

  if (proofUrl || order.hasProof || getOrderProof(order.id)) {
    return stripOrderProofPayload({ ...order, hasProof: true });
  }

  return order;
}
