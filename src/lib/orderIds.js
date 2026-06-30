/** Order IDs: HA-yyyymmdd#### (e.g. HA-202606150001). */

export const ORDER_ID_HELP = "HA-yyyymmdd#### — date stamp plus daily sequence";

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
