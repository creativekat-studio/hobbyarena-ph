/** Session-scoped payment proof blobs — kept out of hobbyarena:orders localStorage. */

const PROOFS_KEY = "hobbyarena:order-proofs";

function readMap() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(PROOFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(PROOFS_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function storeOrderProof(orderId, dataUrl) {
  if (!orderId || !dataUrl || typeof dataUrl !== "string") return false;
  const map = readMap();
  map[String(orderId)] = dataUrl;
  return writeMap(map);
}

export function getOrderProof(orderId) {
  if (!orderId) return null;
  const url = readMap()[String(orderId)];
  return typeof url === "string" ? url : null;
}

export function orderHasStoredProof(order) {
  if (!order) return false;
  if (order.hasProof) return true;
  if (typeof order.proofOfPayment === "string" && order.proofOfPayment.startsWith("data:")) return true;
  return Boolean(getOrderProof(order.id));
}

export function resolveOrderProofUrl(order) {
  if (!order) return null;
  const sessionProof = getOrderProof(order.id);
  if (sessionProof) return sessionProof;
  if (typeof order.proofOfPayment === "string" && order.proofOfPayment.startsWith("data:")) {
    return order.proofOfPayment;
  }
  return null;
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

/** Remove inline base64 from an order before writing to localStorage. */
export function stripOrderProofPayload(order) {
  if (!order || typeof order !== "object") return order;

  const hasProof = orderHasStoredProof(order);
  const trail = Array.isArray(order.trail)
    ? order.trail.map((entry) => {
        if (!entry?.attachment?.url || !isDataUrl(entry.attachment.url)) return entry;
        return {
          ...entry,
          attachment: {
            ...entry.attachment,
            url: null,
            stored: true,
          },
        };
      })
    : order.trail;

  return {
    ...order,
    hasProof,
    proofOfPayment: isDataUrl(order.proofOfPayment) ? null : order.proofOfPayment,
    trail,
  };
}

/** Move legacy inline proofs into session storage and slim the in-memory order. */
export function migrateInlineOrderProof(order) {
  if (!order?.id) return order;

  let next = order;
  const inlineProof = isDataUrl(order.proofOfPayment) ? order.proofOfPayment : null;
  const trailProof = order.trail?.find((entry) => isDataUrl(entry?.attachment?.url))?.attachment?.url ?? null;
  const proofUrl = inlineProof || trailProof;

  if (proofUrl) {
    storeOrderProof(order.id, proofUrl);
    next = stripOrderProofPayload({ ...order, hasProof: true });
  } else if (order.hasProof || getOrderProof(order.id)) {
    next = stripOrderProofPayload({ ...order, hasProof: true });
  }

  return next;
}
