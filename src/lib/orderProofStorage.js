/** Payment proof blobs — stored per order, kept out of the orders list JSON. */

const PROOF_KEY_PREFIX = "hobbyarena:order-proof:";
const LEGACY_SESSION_KEY = "hobbyarena:order-proofs";

function proofKey(orderId) {
  return `${PROOF_KEY_PREFIX}${orderId}`;
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

  return {
    url: proofUrl,
    label: attachment?.label || "Proof of payment",
    type: proofUrl.startsWith("data:application/pdf") ? "pdf" : "image",
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
