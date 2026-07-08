import { COLLECTIONS } from "../../src/data/firestoreSchema.js";

export { COLLECTIONS };

export const DEFAULT_RETENTION_MONTHS = 12;

export function readRetentionMonths() {
  const raw = Number(process.env.ORDER_PROOF_RETENTION_MONTHS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_RETENTION_MONTHS;
}

export function orderDateFromId(orderId) {
  const match = String(orderId || "").match(/^HA-(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function resolveOrderDate(order) {
  if (!order) return null;

  const createdAt = order.createdAt;
  if (createdAt?.toDate) return createdAt.toDate();
  if (typeof createdAt?.seconds === "number") {
    return new Date(createdAt.seconds * 1000);
  }

  const fromId = orderDateFromId(order.id);
  if (fromId) return fromId;

  if (order.date) {
    const parsed = new Date(order.date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

export function isOrderPastRetention(order, retentionMonths, now = new Date()) {
  const orderDate = resolveOrderDate(order);
  if (!orderDate) return false;

  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);
  return orderDate < cutoff;
}

export function orderHasStoredProofFiles(order) {
  return Boolean(
    order?.hasProof
    || (order?.trail ?? []).some((entry) => entry?.attachment?.storageUrl),
  );
}

export function stripPurgedProofsFromOrder(order) {
  const trail = Array.isArray(order.trail)
    ? order.trail.map((entry) => {
        const attachment = entry?.attachment;
        if (!attachment?.storageUrl) return entry;
        const { storageUrl, url, ...rest } = attachment;
        return {
          ...entry,
          attachment: {
            ...rest,
            stored: true,
            purged: true,
          },
        };
      })
    : order.trail;

  return {
    trail,
    hasProof: Boolean(order.hasProof),
  };
}
