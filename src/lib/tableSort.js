/** Toggle sort key/direction for clickable table headers. */
export function toggleSortState(prev, key, { defaultDir = "asc" } = {}) {
  if (prev?.key === key) {
    return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: defaultDir };
}

export function compareSortValues(a, b, dir = "asc") {
  const mul = dir === "desc" ? -1 : 1;
  if (a == null && b == null) return 0;
  if (a == null || a === "") return 1;
  if (b == null || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return 0;
    if (Number.isNaN(a)) return 1;
    if (Number.isNaN(b)) return -1;
    return (a - b) * mul;
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    return (Number(a) - Number(b)) * mul;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }) * mul;
}

/** Sort rows by an accessor map. Falls back to `tieBreaker` when values match. */
export function sortRowsBy(rows, sort, accessors, tieBreaker) {
  if (!sort?.key || !accessors?.[sort.key]) return rows;
  const get = accessors[sort.key];
  return [...rows].sort((a, b) => {
    const result = compareSortValues(get(a), get(b), sort.dir);
    if (result !== 0) return result;
    return tieBreaker ? tieBreaker(a, b) : 0;
  });
}
