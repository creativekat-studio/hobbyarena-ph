/** Order IDs: HA-yyyymmdd#### (e.g. HA-202606150001). Sequence resets each calendar month. */

export const ORDER_ID_HELP = "HA-yyyymmdd#### — day stamp plus monthly sequence";

/** Parse HA-yyyymmdd#### (or legacy HA-yyyymm####) into stamp + sequence. */
export function parseOrderId(id) {
  const match = String(id ?? "").match(/^HA-(\d{6,8})(\d{4})$/);
  if (!match) return null;
  const stamp = match[1];
  return {
    stamp,
    seq: Number(match[2]),
    monthKey: stamp.slice(0, 6),
  };
}

/** Next ID for `now`: today's date stamp, sequence = max in that month + 1. */
export function makeOrderId(orders, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const monthKey = `${y}${m}`;
  const stamp = `${monthKey}${d}`;

  let maxSeq = 0;
  for (const order of orders ?? []) {
    const parsed = parseOrderId(order?.id ?? order);
    if (!parsed || parsed.monthKey !== monthKey) continue;
    if (parsed.seq > maxSeq) maxSeq = parsed.seq;
  }

  return `HA-${stamp}${String(maxSeq + 1).padStart(4, "0")}`;
}

/** Bump sequence on collision; keeps the same date stamp. */
export function incrementOrderId(id) {
  const parsed = parseOrderId(id);
  if (!parsed) return String(id);
  return `HA-${parsed.stamp}${String(parsed.seq + 1).padStart(4, "0")}`;
}

/** Maps legacy HA-##### seed IDs to the date-based format. */
export const LEGACY_ORDER_ID_MAP = {
  "HA-10428": "HA-202606150001",
  "HA-10427": "HA-202606150002",
  "HA-10426": "HA-202606140001",
  "HA-10425": "HA-202606140002",
  "HA-10424": "HA-202606130001",
  "HA-10423": "HA-202606120001",
  "HA-10422": "HA-202606110001",
  "HA-10421": "HA-202606100001",
  "HA-10420": "HA-202606090001",
  "HA-10419": "HA-202606080001",
  "HA-10391": "HA-202605280001",
  "HA-10355": "HA-202605040001",
  "HA-10299": "HA-202604120001",
};

export function migrateLegacyOrderId(order) {
  const nextId = LEGACY_ORDER_ID_MAP[order.id];
  if (!nextId) return order;
  return {
    ...order,
    id: nextId,
    trail: order.trail?.map((entry) => ({
      ...entry,
      id: entry.id?.includes(order.id) ? entry.id.replace(order.id, nextId) : entry.id,
    })),
  };
}

/** Highest order number first (HA-yyyymmdd####). */
export function compareOrdersByOrderNo(a, b) {
  const idA = String(a?.id ?? a ?? "");
  const idB = String(b?.id ?? b ?? "");
  return idB.localeCompare(idA, undefined, { numeric: true });
}

/**
 * Newest order.date first. Same calendar day falls back to order number.
 * Prefer the stored date over the ID stamp — they can diverge.
 */
export function compareOrdersByDate(a, b) {
  const dateA = String(a?.date ?? a?.createdAt ?? "").slice(0, 10);
  const dateB = String(b?.date ?? b?.createdAt ?? "").slice(0, 10);
  if (dateA !== dateB) {
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB.localeCompare(dateA);
  }
  return compareOrdersByOrderNo(a, b);
}

export function sortOrdersByDate(orders) {
  return [...orders].sort(compareOrdersByDate);
}

/** List sort: by date (newest first), then order number. */
export function sortOrdersByOrderNo(orders) {
  return sortOrdersByDate(orders);
}
