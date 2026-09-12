/** Order IDs: HA-yyyymm###### (e.g. HA-202607000001). Sequence resets each calendar month. */

export const ORDER_ID_HELP = "HA-yyyymm###### — month stamp plus monthly sequence";

const SEQ_WIDTH = 6;

/**
 * Parse HA-yyyymm######, or legacy HA-yyyymmdd#### / HA-yyyymm####.
 * 12-digit bodies are disambiguated: if digits 7–8 look like a calendar day
 * (01–31), treat as legacy HA-yyyymmdd####; otherwise HA-yyyymm######.
 */
export function parseOrderId(id) {
  const raw = String(id ?? "");
  const body = raw.match(/^HA-(\d{10,12})$/);
  if (!body) return null;
  const digits = body[1];

  if (digits.length === 12) {
    const day = Number(digits.slice(6, 8));
    if (day >= 1 && day <= 31) {
      return {
        stamp: digits.slice(0, 8),
        seq: Number(digits.slice(8)),
        monthKey: digits.slice(0, 6),
      };
    }
    return {
      stamp: digits.slice(0, 6),
      seq: Number(digits.slice(6)),
      monthKey: digits.slice(0, 6),
    };
  }

  if (digits.length === 10) {
    return {
      stamp: digits.slice(0, 6),
      seq: Number(digits.slice(6)),
      monthKey: digits.slice(0, 6),
    };
  }

  return null;
}

export function parseConsolidatedOrderId(id) {
  const raw = String(id ?? "");
  const body = raw.match(/^HA-C-(\d{10,12})$/);
  if (!body) return null;
  const digits = body[1];
  if (digits.length < 10) return null;
  return {
    stamp: digits.slice(0, 6),
    seq: Number(digits.slice(6)),
    monthKey: digits.slice(0, 6),
  };
}

/** Next consolidated ID: HA-C-yyyymm######, sequenced per calendar month. */
export function makeConsolidatedOrderId(orders, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const monthKey = `${y}${m}`;

  let maxSeq = 0;
  for (const order of orders ?? []) {
    const parsed = parseConsolidatedOrderId(order?.mergedSetId);
    if (!parsed || parsed.monthKey !== monthKey) continue;
    if (parsed.seq > maxSeq) maxSeq = parsed.seq;
  }

  return `HA-C-${monthKey}${String(maxSeq + 1).padStart(SEQ_WIDTH, "0")}`;
}

function monthKeyFromValue(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  const source = Number.isNaN(date.getTime()) ? fallback : date;
  return `${source.getFullYear()}${String(source.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Own series, not the source order number: HA-C-yyyymm000001, 000002, …
 * Stored HA-C- ids win; leftover merge-* ids get the next free number that month.
 */
export function assignConsolidatedDisplayIds(sets, now = new Date()) {
  const assigned = new Map();
  const maxByMonth = new Map();

  for (const set of sets || []) {
    const parsed = parseConsolidatedOrderId(set?.id);
    if (!parsed) continue;
    assigned.set(set.id, set.id);
    const current = maxByMonth.get(parsed.monthKey) || 0;
    if (parsed.seq > current) maxByMonth.set(parsed.monthKey, parsed.seq);
  }

  const legacy = (sets || [])
    .filter((set) => set?.id && !parseConsolidatedOrderId(set.id))
    .sort((a, b) => String(a.mergedAt || "").localeCompare(String(b.mergedAt || "")));

  for (const set of legacy) {
    const monthKey = monthKeyFromValue(set.mergedAt, now);
    const next = (maxByMonth.get(monthKey) || 0) + 1;
    maxByMonth.set(monthKey, next);
    assigned.set(set.id, `HA-C-${monthKey}${String(next).padStart(SEQ_WIDTH, "0")}`);
  }

  return assigned;
}

export function withConsolidatedDisplayIds(sets, now = new Date()) {
  const assigned = assignConsolidatedDisplayIds(sets, now);
  return (sets || []).map((set) => ({
    ...set,
    displayId: assigned.get(set.id) || set.id,
  }));
}

export function displayConsolidatedOrderId(setOrId) {
  if (setOrId && typeof setOrId === "object") {
    return String(setOrId.displayId || setOrId.id || "—");
  }
  if (parseConsolidatedOrderId(setOrId)) return String(setOrId);
  return String(setOrId || "—");
}

/** Next ID for `now`: current month stamp, sequence = max in that month + 1. */
export function makeOrderId(orders, now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const monthKey = `${y}${m}`;

  let maxSeq = 0;
  for (const order of orders ?? []) {
    const parsed = parseOrderId(order?.id ?? order);
    if (!parsed || parsed.monthKey !== monthKey) continue;
    if (parsed.seq > maxSeq) maxSeq = parsed.seq;
  }

  return `HA-${monthKey}${String(maxSeq + 1).padStart(SEQ_WIDTH, "0")}`;
}

/** Bump sequence on collision; keeps the same month stamp. */
export function incrementOrderId(id) {
  const parsed = parseOrderId(id);
  if (!parsed) return String(id);
  const stamp = parsed.monthKey || parsed.stamp.slice(0, 6);
  return `HA-${stamp}${String(parsed.seq + 1).padStart(SEQ_WIDTH, "0")}`;
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

/** Highest order number first. */
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
