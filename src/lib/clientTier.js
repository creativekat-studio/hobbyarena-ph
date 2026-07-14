import { ALLOCATION_FULFILLED_PAY_BALANCE, migrateOrderStatus, getOrderLineItems } from "../data/orderWorkflow.js";

/** Line statuses that contribute (fully or via allocated qty) to loyalty spend. */
const FULL_CREDIT_STATUSES = new Set(["Fulfilled", "Ready for Pickup"]);
const ALLOCATED_CREDIT_STATUSES = new Set([
  ALLOCATION_FULFILLED_PAY_BALANCE,
  "Partially Fulfilled & Pay Balance",
  "Partially Fulfilled & For Refund",
]);

export function fulfilledLineItemSpend(item) {
  const status = migrateOrderStatus(item.status);
  const qty = Math.max(1, Number(item.quantity) || 1);
  const lineTotal = Number(item.lineTotal ?? (item.price ?? 0) * qty) || 0;
  const allocated = Math.max(0, Number(item.allocatedQty) || 0);

  if (FULL_CREDIT_STATUSES.has(status)) {
    // Fully closed lines count in full; partial preorder fulfillments pro-rate.
    if (allocated > 0 && allocated < qty) {
      return (lineTotal * allocated) / qty;
    }
    return lineTotal;
  }

  if (ALLOCATED_CREDIT_STATUSES.has(status) && allocated > 0) {
    return (lineTotal * Math.min(allocated, qty)) / qty;
  }

  return 0;
}

export function computeFulfilledSpendForEmail(orders, email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return 0;
  return orders
    .filter((o) => String(o.email || "").trim().toLowerCase() === key)
    .reduce((sum, order) => {
      return sum + getOrderLineItems(order).reduce(
        (lineSum, item) => lineSum + fulfilledLineItemSpend(item),
        0,
      );
    }, 0);
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
