/** Remove undefined values — Firestore rejects undefined in documents. */
export function sanitizeForFirestore(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeForFirestore(entry))
      .filter((entry) => entry !== undefined);
  }

  const cleaned = {};
  Object.entries(value).forEach(([key, entry]) => {
    if (entry === undefined) return;
    const next = sanitizeForFirestore(entry);
    if (next !== undefined) cleaned[key] = next;
  });
  return cleaned;
}
