/** Resolve the best available placed-at instant for an order. */
export function resolveOrderPlacedAt(order) {
  if (!order) return null;

  const fromCreated = coerceDate(order.createdAt);
  if (fromCreated) return fromCreated;

  const trail = Array.isArray(order.trail) ? order.trail : [];
  for (const entry of trail) {
    const at = coerceDate(entry?.at);
    if (at) return at;
  }

  return coerceDate(order.date) || coerceDate(order.placedAt) || null;
}

function coerceDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value?.toDate === "function") {
    try {
      const date = value.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  if (typeof value?.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const raw = value.includes("T") || value.includes(" ")
      ? value
      : `${value}T00:00:00`;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatLocalParts(date, { withSeconds = true } = {}) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return withSeconds
    ? `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
    : `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

/**
 * Format any instant (trail entry, proof upload, etc.) as `YYYY-MM-DD HH:mm:ss`.
 * Shared across admin + storefront order details / movements.
 */
export function formatDateTime(value, { withSeconds = true, fallback = "—" } = {}) {
  const date = coerceDate(value);
  if (!date) {
    if (value == null || value === "") return fallback;
    return String(value);
  }
  return formatLocalParts(date, { withSeconds });
}

/** Local calendar date + time: `YYYY-MM-DD HH:mm:ss`. Falls back to date-only when no clock time exists. */
export function formatOrderTimestamp(order, { withSeconds = true } = {}) {
  const date = resolveOrderPlacedAt(order);
  if (!date) return order?.date || "—";

  if (!hasClockTime(order)) {
    const yyyy = date.getFullYear();
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    return `${yyyy}-${mm}-${dd}`;
  }

  return formatLocalParts(date, { withSeconds });
}

function hasClockTime(order) {
  if (coerceDate(order?.createdAt)) return true;
  const trail = Array.isArray(order?.trail) ? order.trail : [];
  return trail.some((entry) => {
    const raw = entry?.at;
    return typeof raw === "string" && raw.includes("T");
  });
}

/** Serialize Firestore Timestamp / Date / string → ISO string for app state. */
export function serializeFirestoreTime(value) {
  const date = coerceDate(value);
  return date ? date.toISOString() : (typeof value === "string" ? value : null);
}
