import {
  getOrderLineItems,
  migrateOrderStatus,
  orderNeedsBalancePayment,
  orderOutstandingBalance,
} from "../data/orderWorkflow.js";
import { displayConsolidatedOrderId, withConsolidatedDisplayIds } from "./orderIds.js";
import { groupMergedOrderSets } from "./orderMergeSimulation.js";
import { orderCustomerDisplayTotal } from "./orderRevenue.js";
import { formatOrderTimestamp } from "./orderTimestamps.js";

function latestStamp(orders) {
  let latest = "";
  for (const order of orders || []) {
    const stamp = String(order?.mergedAt || order?.createdAt || order?.date || "");
    if (stamp && stamp > latest) latest = stamp;
  }
  return latest;
}

function rolledStatus(orders) {
  const statuses = [];
  for (const order of orders || []) {
    const items = getOrderLineItems(order);
    if (items.length) {
      for (const item of items) {
        const status = migrateOrderStatus(item.status);
        if (status) statuses.push(status);
      }
    } else {
      const status = migrateOrderStatus(order.status);
      if (status) statuses.push(status);
    }
  }
  const unique = [...new Set(statuses)];
  if (unique.length === 1) return unique[0];
  return migrateOrderStatus(orders?.[0]?.status) || unique[0] || "";
}

export function customerConsolidatedCard(set) {
  const orders = [...(set?.orders || [])];
  const lineItems = orders.flatMap((order) => getOrderLineItems(order));
  const id = displayConsolidatedOrderId(set);
  return {
    id,
    setId: set?.displayId || set?.id || id,
    orders,
    lineItems,
    status: rolledStatus(orders),
    mergedAt: set?.mergedAt || latestStamp(orders),
    total: orders.reduce((sum, order) => sum + (orderCustomerDisplayTotal(order) || 0), 0),
    outstanding: orders.reduce((sum, order) => sum + (orderOutstandingBalance(order) || 0), 0),
    needsPay: orders.some((order) => orderNeedsBalancePayment(order)),
  };
}

export function findCustomerConsolidatedSet(orders, setId) {
  const needle = String(setId || "").trim();
  if (!needle) return null;
  const sets = withConsolidatedDisplayIds(groupMergedOrderSets(orders || []));
  return sets.find((set) => set.id === needle || set.displayId === needle) || null;
}

function matchesQuery(order, query) {
  if (!query) return true;
  return order.id.toLowerCase().includes(query)
    || (order.items || "").toLowerCase().includes(query)
    || (order.lineItems || []).some((item) => (item.name || "").toLowerCase().includes(query));
}

export function buildCustomerOrderListRows(orders, query = "") {
  const list = orders || [];
  const q = String(query || "").trim().toLowerCase();
  const sets = withConsolidatedDisplayIds(groupMergedOrderSets(list));
  const groupedIds = new Set(sets.flatMap((set) => (set.orders || []).map((order) => order.id)));
  const rows = [];

  for (const set of sets) {
    const card = customerConsolidatedCard(set);
    const hit = !q
      || card.id.toLowerCase().includes(q)
      || card.setId.toLowerCase().includes(q)
      || (set.orders || []).some((order) => matchesQuery(order, q));
    if (!hit) continue;
    rows.push({
      kind: "consolidated",
      id: card.id,
      sortAt: card.mergedAt || latestStamp(set.orders),
      card,
    });
  }

  for (const order of list) {
    if (groupedIds.has(order.id)) continue;
    if (!matchesQuery(order, q)) continue;
    rows.push({
      kind: "order",
      id: order.id,
      sortAt: order.createdAt || order.date || "",
      order,
    });
  }

  return rows.sort((a, b) => String(b.sortAt || "").localeCompare(String(a.sortAt || "")));
}

export function consolidatedOrderMeta(card) {
  const orderCount = card.orders?.length || 0;
  const productCount = card.lineItems?.length || orderCount || 1;
  return `${orderCount} ${orderCount === 1 ? "order" : "orders"} · ${productCount} ${productCount === 1 ? "product" : "products"} · ${formatOrderTimestamp({ createdAt: card.mergedAt })}`;
}
