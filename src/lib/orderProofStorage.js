/** Payment proof blobs — local cache + Firebase Storage URLs on the order trail. */

import {
  isDepositProofTrailEntry,
  trailEntryShowsAttachment,
} from "../data/orderWorkflow.js";
import { getDataSource } from "./firebase/config.js";
import { mapFirebaseUserError } from "./firebase/auth.js";
import { uploadOrderProofFromDataUrl } from "./firebase/repositories/uploads.js";

const PROOF_KEY_PREFIX = "hobbyarena:order-proof:";
const BALANCE_PROOF_KEY_PREFIX = "hobbyarena:balance-proof:";
const REFUND_PROOF_KEY_PREFIX = "hobbyarena:refund-proof:";
const TRAIL_PROOF_KEY_PREFIX = "hobbyarena:trail-proof:";
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

function trailProofKey(orderId, trailEntryId) {
  return `${TRAIL_PROOF_KEY_PREFIX}${orderId}:${trailEntryId}`;
}

export function storeTrailEntryProof(orderId, trailEntryId, dataUrl) {
  if (!orderId || !trailEntryId || !isDataUrl(dataUrl)) return false;
  try {
    window.localStorage.setItem(trailProofKey(orderId, trailEntryId), dataUrl);
    return true;
  } catch {
    return false;
  }
}

export function getTrailEntryProof(orderId, trailEntryId) {
  if (!orderId || !trailEntryId || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(trailProofKey(orderId, trailEntryId));
    return isDataUrl(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

export function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/** HTTPS or data:image — safe to put in an email <img> (never dump into plain text). */
export function isEmailInlineImageUrl(value) {
  if (typeof value !== "string") return false;
  const url = value.trim();
  return isHttpUrl(url) || /^data:image\//i.test(url);
}

function proofFileLabel(attachment, entry) {
  const kind = attachment?.kind || "proof";
  const line = entry?.lineItemId ? `-${entry.lineItemId}` : "";
  const proofId = attachment?.proofId ? `-${attachment.proofId}` : "";
  return `${kind}${line}${proofId}`;
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

  if (attachment.purged) return null;
  if (isHttpUrl(attachment.storageUrl)) return attachment.storageUrl;
  if (isHttpUrl(attachment.url)) return attachment.url;

  if (attachment.kind === "balance" && entry.lineItemId) {
    const balanceProof = getBalanceProof(order?.id, entry.lineItemId, attachment.proofId);
    if (balanceProof) return balanceProof;
    return isDataUrl(attachment.url) ? attachment.url : null;
  }

  if (attachment.kind === "refund" && entry.lineItemId) {
    const refundProof = getRefundProof(order?.id, entry.lineItemId);
    if (refundProof) return refundProof;
    return isDataUrl(attachment.url) ? attachment.url : null;
  }

  if (entry?.id) {
    const trailProof = getTrailEntryProof(order?.id, entry.id);
    if (trailProof) return trailProof;
  }

  if (isDataUrl(attachment.url)) return attachment.url;

  if (attachment.kind === "deposit" || isDepositProofTrailEntry(entry)) {
    return resolveOrderProofUrl(order);
  }

  if (attachment.kind === "admin" || attachment.kind === "file") return null;

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
  if (getOrderProof(order.id)) return true;
  return (order.trail ?? []).some((entry) => (
    isHttpUrl(entry?.attachment?.storageUrl)
    && (entry.attachment.kind === "deposit" || isDepositProofTrailEntry(entry))
  ));
}

export function resolveOrderProofUrl(order) {
  if (!order) return null;
  const sessionProof = getOrderProof(order.id);
  if (sessionProof) return sessionProof;
  if (isDataUrl(order.proofOfPayment)) return order.proofOfPayment;

  // Multi-item checkouts only upload the deposit file on one trail row; reuse that URL.
  for (const entry of order.trail ?? []) {
    const storageUrl = entry?.attachment?.storageUrl;
    if (!isHttpUrl(storageUrl)) continue;
    if (entry.attachment.kind === "deposit" || isDepositProofTrailEntry(entry)) {
      return storageUrl;
    }
  }

  return null;
}

export function hydrateProofAttachment(attachment, proofUrl) {
  const url = proofUrl || (isHttpUrl(attachment?.storageUrl) ? attachment.storageUrl : null);
  if (!url) {
    return attachment?.url ? attachment : null;
  }

  if (attachment?.url && (isDataUrl(attachment.url) || isHttpUrl(attachment.url))) {
    return attachment;
  }

  return {
    ...attachment,
    url,
    label: attachment?.label || "Proof of payment",
    type: attachment?.type || (url.includes(".pdf") || url.startsWith("data:application/pdf") ? "pdf" : "image"),
  };
}

/**
 * Rehydrate local proof blobs onto trail attachments, then upload to Storage
 * so status emails can embed an https image instead of an account fallback link.
 */
export async function prepareOrderProofsForEmail(order) {
  if (!order?.id || getDataSource() !== "firebase") return order;

  let trail = Array.isArray(order.trail) ? order.trail : [];
  let hydrated = false;
  trail = trail.map((entry) => {
    const att = entry?.attachment;
    if (!att || isHttpUrl(att.storageUrl) || isDataUrl(att.url)) return entry;
    const resolved = resolveProofAttachmentUrl(order, entry);
    if (!isDataUrl(resolved)) return entry;
    hydrated = true;
    return { ...entry, attachment: { ...att, url: resolved } };
  });

  const prepared = hydrated ? { ...order, trail } : order;
  const needsUpload = orderNeedsProofBackfill(prepared)
    || (prepared.trail ?? []).some((entry) => (
      entry?.attachment
      && !isHttpUrl(entry.attachment.storageUrl)
      && isDataUrl(entry.attachment.url)
    ));
  if (!needsUpload) return prepared;

  return uploadOrderProofAttachments(prepared);
}

/**
 * Upload any pending proof blobs to Firebase Storage and attach HTTPS URLs
 * to trail entries so admins can view proofs from any device.
 */
export async function uploadOrderProofAttachments(order) {
  if (!order?.id || getDataSource() !== "firebase") return order;

  const trail = Array.isArray(order.trail) ? [...order.trail] : [];
  let changed = false;
  let lastUploadError = null;

  for (let index = 0; index < trail.length; index += 1) {
    const entry = trail[index];
    const attachment = entry?.attachment;
    if (!attachment || isHttpUrl(attachment.storageUrl)) continue;

    const lineItemId = entry.lineItemId || attachment.lineItemId || null;
    let dataUrl = null;
    if (isDataUrl(attachment.url)) {
      dataUrl = attachment.url;
    } else if (attachment.kind === "balance" && lineItemId) {
      dataUrl = getBalanceProof(order.id, lineItemId, attachment.proofId);
    } else if (attachment.kind === "refund" && lineItemId) {
      dataUrl = getRefundProof(order.id, lineItemId);
    } else if (entry.id) {
      dataUrl = getTrailEntryProof(order.id, entry.id);
    } else if (isDepositProofTrailEntry(entry) || attachment.kind === "deposit") {
      dataUrl = getOrderProof(order.id) || (isDataUrl(order.proofOfPayment) ? order.proofOfPayment : null);
    }

    if (!dataUrl) continue;

    try {
      const storageUrl = await uploadOrderProofFromDataUrl(
        order.id,
        dataUrl,
        proofFileLabel(attachment, entry),
      );
      trail[index] = {
        ...entry,
        attachment: {
          ...attachment,
          storageUrl,
          url: null,
          stored: true,
          purged: false,
        },
      };
      changed = true;
    } catch (error) {
      lastUploadError = error;
      console.error("[orderProof] Upload failed for trail entry:", entry.id, error);
    }
  }

  if (!changed) {
    if (lastUploadError) {
      throw new Error(mapFirebaseUserError(lastUploadError));
    }
    return order;
  }
  return { ...order, trail, hasProof: Boolean(order.hasProof || trail.some((e) => e.attachment?.storageUrl)) };
}

/**
 * True when a checkout/deposit proof entry exists on the order and has a
 * resolvable Storage URL (i.e. it persisted so any admin can view it).
 * Returns true when there is no deposit proof entry to persist.
 */
export function checkoutProofPersisted(order) {
  const trail = Array.isArray(order?.trail) ? order.trail : [];
  const entry = trail.find(
    (e) => e?.attachment && (e.attachment.kind === "deposit" || isDepositProofTrailEntry(e)),
  );
  if (!entry) return true;
  return isHttpUrl(entry.attachment.storageUrl);
}

/** Firestore has proof metadata but no Storage URL yet. */
export function orderNeedsProofBackfill(order) {
  if (!order?.id) return false;
  const trail = order.trail ?? [];
  const missingStorageUrl = trail.some((entry) => {
    const att = entry?.attachment;
    return att && !isHttpUrl(att.storageUrl) && (att.stored || att.kind || isDepositProofTrailEntry(entry));
  });
  if (missingStorageUrl) return true;
  return Boolean(order.hasProof) && !trail.some((entry) => isHttpUrl(entry.attachment?.storageUrl));
}

/** This browser still holds the original proof blob in localStorage. */
export function orderHasLocalProofData(order) {
  if (!order?.id) return false;
  if (getOrderProof(order.id)) return true;
  if (isDataUrl(order.proofOfPayment)) return true;

  return (order.trail ?? []).some((entry) => {
    const att = entry?.attachment;
    if (isDataUrl(att?.url)) return true;
    if (entry.id && getTrailEntryProof(order.id, entry.id)) return true;
    if (att?.kind === "balance" && entry.lineItemId) {
      return Boolean(getBalanceProof(order.id, entry.lineItemId, att.proofId));
    }
    if (att?.kind === "refund" && entry.lineItemId) {
      return Boolean(getRefundProof(order.id, entry.lineItemId));
    }
    return false;
  });
}

/** Stage a proof blob locally, keyed so uploadOrderProofAttachments can push it to Storage. */
export function stageTrailProofBlob(order, entry, dataUrl) {
  if (!order?.id || !entry || !isDataUrl(dataUrl)) return;

  const attachment = entry.attachment ?? { label: "Proof of payment", type: "image", stored: true };
  if (entry.id) {
    storeTrailEntryProof(order.id, entry.id, dataUrl);
    return;
  }
  if (attachment.kind === "balance" && entry.lineItemId) {
    storeBalanceProof(order.id, entry.lineItemId, dataUrl, attachment.proofId);
    return;
  }
  if (attachment.kind === "refund" && entry.lineItemId) {
    storeRefundProof(order.id, entry.lineItemId, dataUrl);
    return;
  }
  storeOrderProof(order.id, dataUrl);
}

/** Remove inline base64 from an order before writing to localStorage. */
export function stripOrderProofPayload(order) {
  if (!order || typeof order !== "object") return order;

  const hasProof = orderHasStoredProof(order);
  const trail = Array.isArray(order.trail)
    ? order.trail.map((entry) => {
        if (!entry?.attachment) return entry;
        if (entry.attachment.url && isDataUrl(entry.attachment.url)) {
          if (entry.id) storeTrailEntryProof(order.id, entry.id, entry.attachment.url);
          return {
            ...entry,
            attachment: {
              ...entry.attachment,
              url: isHttpUrl(entry.attachment.storageUrl) ? null : entry.attachment.url,
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
