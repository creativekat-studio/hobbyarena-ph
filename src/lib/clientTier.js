import { getOrderLineItems, migrateOrderStatus } from "../data/orderWorkflow.js";
import { lineItemGrossRevenue, orderCustomerTotal } from "./orderRevenue.js";

/** Line helper — gross for Fulfilled lines only. */
export function fulfilledLineItemSpend(item) {
  if (migrateOrderStatus(item?.status) !== "Fulfilled") return 0;
  return lineItemGrossRevenue(item);
}

/**
 * Fulfilled KPI for a customer.
 * Prefer line-level Fulfilled finals (so mixed orders still count fulfilled lines).
 * Fallback: whole order when status is Fulfilled and there are no line items.
 */
export function computeFulfilledSpendForEmail(orders, email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return 0;
  return orders
    .filter((o) => String(o.email || "").trim().toLowerCase() === key)
    .reduce((sum, order) => {
      const items = getOrderLineItems(order);
      if (items.length) {
        return sum + items.reduce((lineSum, item) => lineSum + fulfilledLineItemSpend(item), 0);
      }
      if (migrateOrderStatus(order.status) === "Fulfilled") {
        return sum + Math.max(0, orderCustomerTotal(order));
      }
      return sum;
    }, 0);
}

/**
 * Total spent KPI — recognized revenue across the customer's orders
 * (allocated × price after allocation; deposit only before allocation).
 */
export function computeTotalSpentForEmail(orders, email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return 0;
  return orders
    .filter((o) => String(o.email || "").trim().toLowerCase() === key)
    .reduce((sum, order) => sum + Math.max(0, orderCustomerTotal(order)), 0);
}

export function resolveClientTier(spend, tiers) {
  const active = (tiers || [])
    .filter((t) => t.active !== false)
    .sort((a, b) => (b.minSpend ?? 0) - (a.minSpend ?? 0));

  return active.find((t) =>
    spend >= (t.minSpend ?? 0)
    && (t.maxSpend == null || spend <= t.maxSpend),
  ) ?? null;
}

/** Progress toward the next loyalty tier based on fulfilled spend. */
export function getNextTierProgress(spend, tiers) {
  const amount = Math.max(0, Number(spend) || 0);
  const ascending = (tiers || [])
    .filter((t) => t.active !== false)
    .sort((a, b) => (a.minSpend ?? 0) - (b.minSpend ?? 0));

  if (!ascending.length) {
    return { nextTier: null, remaining: 0, progress: 1, atTop: true, floor: 0, ceiling: 0, amount };
  }

  const nextTier = ascending.find((t) => amount < (t.minSpend ?? 0)) ?? null;
  if (!nextTier) {
    return { nextTier: null, remaining: 0, progress: 1, atTop: true, floor: amount, ceiling: amount, amount };
  }

  const floor = [...ascending]
    .reverse()
    .find((t) => amount >= (t.minSpend ?? 0))?.minSpend ?? 0;
  const ceiling = nextTier.minSpend ?? 0;
  const span = Math.max(1, ceiling - floor);
  const progress = Math.min(1, Math.max(0, (amount - floor) / span));
  const remaining = Math.max(0, ceiling - amount);

  return { nextTier, remaining, progress, atTop: false, floor, ceiling, amount };
}
