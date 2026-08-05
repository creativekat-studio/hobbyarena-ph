import {
  getDepositPercent,
  getOrderLineItems,
  migrateOrderStatus,
  migratePaymentStatus,
  refundedAmountForLineItem,
} from "../data/orderWorkflow.js";
import { roundMoney } from "./money.js";

/**
 * Sample computation (pre-order):
 *   Final price     = price × actual allocation
 *   Balance         = final price − downpayment   (negative ⇒ refund)
 *   Gross / revenue = downpayment + balance
 *                   = final price
 *                   ≠ downpayment + original full amount
 *
 * Before allocation: gross = downpayment only.
 * Full refund (alloc 0): gross = 0.
 */

const DEPOSIT_STAGE_PAYMENTS = new Set([
  "DP Paid",
  "Awaiting Balance Payment",
  "For Partial Refund",
]);

const FULL_PAID_PAYMENTS = new Set([
  "Fully Paid",
  "Partially Refunded",
]);

const ZERO_REVENUE_PAYMENTS = new Set([
  "Pending Verification",
  "Rejected",
  "Unpaid",
  "For Full Refund",
  "Refunded",
]);

const ZERO_REVENUE_STATUSES = new Set([
  "For Full Refund",
  "Refunded",
]);

const COMPLETED_STATUSES = new Set(["Fulfilled", "Ready for Pickup"]);

export function lineItemQty(item) {
  return Math.max(1, Number(item?.quantity) || 1);
}

export function lineItemAllocatedQty(item) {
  return Math.max(0, Number(item?.allocatedQty) || 0);
}

export function lineItemAmount(item) {
  const qty = lineItemQty(item);
  return Number(item?.lineTotal ?? (item?.price ?? 0) * qty) || 0;
}

export function lineItemUnitPrice(item) {
  const qty = lineItemQty(item);
  if (item?.price != null && item.price !== "") return Math.max(0, Number(item.price) || 0);
  return lineItemAmount(item) / qty;
}

/**
 * Unit cost for COGS.
 * Prefer line snapshot, then optional catalog lookup (for older orders),
 * then last-resort % of price so net is never blank.
 *
 * @param {object} item
 * @param {Record<string, number>|Map<string, number>|null} [costByProductId]
 */
export function lineItemUnitCost(item, costByProductId = null) {
  const lineCost = item?.cost != null && item.cost !== ""
    ? Number(item.cost)
    : null;
  // Prefer a real snapshotted cost (> 0). Treat 0 as "unset" so catalog can fill in.
  if (lineCost != null && !Number.isNaN(lineCost) && lineCost > 0) {
    return lineCost;
  }
  if (costByProductId && item?.id != null) {
    const fromCatalog = costByProductId instanceof Map
      ? costByProductId.get(item.id)
      : costByProductId[item.id];
    if (fromCatalog != null && fromCatalog !== "") {
      const n = Number(fromCatalog);
      if (!Number.isNaN(n) && n >= 0) return Math.max(0, n);
    }
  }
  if (lineCost != null && !Number.isNaN(lineCost)) return Math.max(0, lineCost);
  return roundMoney(lineItemUnitPrice(item) * 0.72);
}

export function lineItemDepositPaid(item, depositPercent = 30) {
  if (item?.depositPaid != null && item.depositPaid !== "") {
    return Math.max(0, Number(item.depositPaid) || 0);
  }
  // Fall back to configured DP% of the original line (ordered qty × price).
  const pct = Number(item?.depositPercent) || depositPercent;
  return roundMoney((lineItemAmount(item) * pct) / 100);
}

/** Final price = selling price × actual allocation. */
export function lineItemFinalPrice(item) {
  const qty = lineItemQty(item);
  const price = lineItemUnitPrice(item);
  const allocated = Math.min(lineItemAllocatedQty(item), qty);
  return allocated * price;
}

/**
 * Balance vs deposit on allocated units (can be negative ⇒ refund due).
 * balance = finalPrice − downpayment
 */
export function lineItemBalance(item) {
  return lineItemFinalPrice(item) - lineItemDepositPaid(item);
}

/**
 * Gross revenue = downpayment + balance (= final price when allocated).
 * Never downpayment + original full line amount.
 *
 * Sample (price 3950, qty 10, DP 11850):
 *   alloc 10 → 39500
 *   alloc 8  → 31600
 *   alloc 1  → 3950
 *   alloc 0  → 0
 */
export function lineItemGrossRevenue(item, depositPercent = 30) {
  const payment = migratePaymentStatus(item?.payment);
  const status = migrateOrderStatus(item?.status);
  const allocated = lineItemAllocatedQty(item);
  const qty = lineItemQty(item);
  const depositPaid = lineItemDepositPaid(item, depositPercent);

  if (ZERO_REVENUE_PAYMENTS.has(payment) || ZERO_REVENUE_STATUSES.has(status)) {
    return 0;
  }

  // Once allocated: gross = DP + balance = price × allocation
  if (allocated > 0) {
    return lineItemFinalPrice(item);
  }

  // Full refund / nothing kept after allocation recorded as 0
  if (
    payment === "Partially Refunded"
    || status === "Partially Fulfilled & For Refund"
    || status === "Partially Fulfilled & Pay Balance"
  ) {
    return 0;
  }

  // Deposit collected, stock not allocated yet → gross is downpayment only
  if (DEPOSIT_STAGE_PAYMENTS.has(payment)) {
    return depositPaid;
  }

  // Sealed / fully paid with no allocation field → treat ordered qty as final
  if (FULL_PAID_PAYMENTS.has(payment) || COMPLETED_STATUSES.has(status)) {
    return lineItemUnitPrice(item) * qty;
  }

  return 0;
}

/** Alias used by loyalty / customer fulfilled spend. */
export function lineItemAllocatedRevenue(item) {
  const status = migrateOrderStatus(item?.status);
  if (status !== "Fulfilled" && status !== "Ready for Pickup") {
    // Keep helper usable for any line: same gross rules
    return lineItemGrossRevenue(item);
  }
  const allocated = lineItemAllocatedQty(item);
  if (allocated > 0) return lineItemFinalPrice(item);
  // Fulfilled but allocation missing → ordered qty × price
  return lineItemUnitPrice(item) * lineItemQty(item);
}

export function lineItemCogs(item, costByProductId = null) {
  if (lineItemGrossRevenue(item) <= 0) return 0;

  const cost = lineItemUnitCost(item, costByProductId);
  const allocated = lineItemAllocatedQty(item);
  const qty = lineItemQty(item);
  const payment = migratePaymentStatus(item?.payment);
  const status = migrateOrderStatus(item?.status);

  if (allocated > 0) return Math.min(allocated, qty) * cost;

  // No allocation yet (deposit-only) → no COGS until stock is committed
  if (DEPOSIT_STAGE_PAYMENTS.has(payment) && !COMPLETED_STATUSES.has(status)) {
    return 0;
  }

  return qty * cost;
}

function isPreorderLine(item) {
  return item?.tag === "Pre-order" || item?.type === "Pre-order";
}

/**
 * Net margin for a line.
 * Real-time (`paid`): after allocation → (price − cost) × allocated;
 *   deposit-only → (price − cost) × qty × deposit%  e.g. ((3950−3600)×10)×0.3 = 1050.
 * Fulfilled: (price − cost) × fulfilled/allocated units only; deposit-only → ₱0.
 */
export function lineItemNetRevenue(item, depositPercent = 30, costByProductId = null, basis = "paid") {
  const gross = lineItemGrossRevenue(item, depositPercent);
  if (gross <= 0) return 0;

  const allocated = lineItemAllocatedQty(item);
  const payment = migratePaymentStatus(item?.payment);
  const status = migrateOrderStatus(item?.status);
  const depositOnly = isPreorderLine(item)
    && allocated <= 0
    && DEPOSIT_STAGE_PAYMENTS.has(payment)
    && !COMPLETED_STATUSES.has(status);

  if (depositOnly) {
    if (basis === "fulfilled") return 0;
    const price = lineItemUnitPrice(item);
    const cost = lineItemUnitCost(item, costByProductId);
    const qty = lineItemQty(item);
    const pct = (Number(item?.depositPercent) || depositPercent) / 100;
    return roundMoney(Math.max(0, (price - cost) * qty * pct));
  }

  return roundMoney(Math.max(0, gross - lineItemCogs(item, costByProductId)));
}

export function isFulfilledLineItem(item) {
  const status = migrateOrderStatus(item?.status);
  return status === "Fulfilled" || status === "Ready for Pickup";
}

export function orderLineItemsForAnalytics(order) {
  if (order?.lineItems?.length) return order.lineItems;
  return [{
    name: order?.items || "Unknown",
    quantity: order?.qty || 1,
    price: order?.lineItems?.[0]?.price ?? order?.fullSubtotal ?? order?.total,
    lineTotal: order?.fullSubtotal ?? order?.total,
    line: "Other",
    status: order?.status,
    payment: order?.payment,
    refundAmount: order?.refundAmount,
    allocatedQty: order?.allocatedQty ?? 0,
    depositPaid: order?.depositPaid ?? order?.total,
  }];
}

export function lineItemsForBasis(order, basis = "paid") {
  const items = getOrderLineItems(order);
  const list = items.length ? items : orderLineItemsForAnalytics(order);
  if (basis !== "fulfilled") return list;
  return list.filter(isFulfilledLineItem);
}

function legacyOrderGross(order) {
  const payment = migratePaymentStatus(order?.payment);
  const status = migrateOrderStatus(order?.status);
  const allocated = Math.max(0, Number(order?.allocatedQty) || 0);
  const qty = Math.max(1, Number(order?.qty) || 1);
  const price = Number(order?.lineItems?.[0]?.price) || 0;
  const depositPaid = Math.max(0, Number(order?.depositPaid ?? order?.total) || 0);

  if (ZERO_REVENUE_PAYMENTS.has(payment) || ZERO_REVENUE_STATUSES.has(status)) return 0;

  if (allocated > 0 && price > 0) return Math.min(allocated, qty) * price;
  if (DEPOSIT_STAGE_PAYMENTS.has(payment)) return depositPaid;
  if (FULL_PAID_PAYMENTS.has(payment) || COMPLETED_STATUSES.has(status)) {
    return order?.fullSubtotal ?? (price > 0 ? price * qty : (order?.total ?? 0));
  }
  return 0;
}

export function orderRevenue(order, basis = "paid") {
  const depositPercent = getDepositPercent(order);
  const items = lineItemsForBasis(order, basis);
  if (items.length) {
    return items.reduce((sum, item) => sum + lineItemGrossRevenue(item, depositPercent), 0);
  }
  if (basis === "fulfilled") {
    return isFulfilledLineItem(order) ? legacyOrderGross(order) : 0;
  }
  return legacyOrderGross(order);
}

export function orderCogs(order, basis = "paid", costByProductId = null) {
  return lineItemsForBasis(order, basis).reduce(
    (sum, item) => sum + lineItemCogs(item, costByProductId),
    0,
  );
}

/** Explicit refund amounts (for reporting). Gross already nets via DP + balance. */
export function orderRefunds(order, basis = "paid") {
  const depositPercent = getDepositPercent(order);
  const items = lineItemsForBasis(order, basis);
  if (items.length) {
    return items.reduce((sum, item) => sum + (refundedAmountForLineItem(item, depositPercent) || 0), 0);
  }
  if (basis === "fulfilled") return 0;
  return Number(order?.refundAmount) || 0;
}

/**
 * Net by basis — see lineItemNetRevenue.
 * Do not subtract refunds again — gross is already DP + balance (final price).
 */
export function orderNetRevenue(order, basis = "paid", costByProductId = null) {
  const depositPercent = getDepositPercent(order);
  const items = lineItemsForBasis(order, basis);
  if (items.length) {
    return items.reduce(
      (sum, item) => sum + lineItemNetRevenue(item, depositPercent, costByProductId, basis),
      0,
    );
  }
  // Legacy single-line orders without lineItems[]
  const gross = orderRevenue(order, basis);
  if (gross <= 0) return 0;
  const allocated = Math.max(0, Number(order?.allocatedQty) || 0);
  const payment = migratePaymentStatus(order?.payment);
  if (
    (order?.type === "Pre-order" || isPreorderOrderLike(order))
    && allocated <= 0
    && DEPOSIT_STAGE_PAYMENTS.has(payment)
  ) {
    if (basis === "fulfilled") return 0;
    const price = Number(order?.lineItems?.[0]?.price) || 0;
    const cost = lineItemUnitCost(
      { id: order?.lineItems?.[0]?.id, price, cost: order?.lineItems?.[0]?.cost },
      costByProductId,
    );
    const qty = Math.max(1, Number(order?.qty) || 1);
    return Math.max(0, (price - cost) * qty * (depositPercent / 100));
  }
  return Math.max(0, gross - orderCogs(order, basis, costByProductId));
}

function isPreorderOrderLike(order) {
  return order?.type === "Pre-order"
    || order?.type === "Mixed"
    || getOrderLineItems(order).some(isPreorderLine);
}

/** Build productId/sku → unit cost map from catalog/inventory products. */
export function buildCostByProductId(products = []) {
  const map = new Map();
  for (const product of products) {
    if (product?.cost == null || product.cost === "") continue;
    const cost = Math.max(0, Number(product.cost) || 0);
    if (product.id) map.set(product.id, cost);
    // Orders/cart may key by either inventory id or display SKU.
    if (product.sku) map.set(product.sku, cost);
  }
  return map;
}

/**
 * Customer order-history / LTV total.
 * Same as gross: downpayment + balance (= allocated × price), never DP + original full amount.
 */
export function orderCustomerTotal(order) {
  return Math.max(0, orderRevenue(order, "paid"));
}

export function orderOrderedQty(order) {
  const items = orderLineItemsForAnalytics(order);
  if (!items.length) return Math.max(1, Number(order?.qty) || 1);
  return items.reduce((sum, item) => sum + lineItemQty(item), 0);
}

export function orderAllocatedQtyTotal(order) {
  const items = orderLineItemsForAnalytics(order);
  if (!items.length) return Math.max(0, Number(order?.allocatedQty) || 0);
  return items.reduce((sum, item) => sum + lineItemAllocatedQty(item), 0);
}

/** "7 of 10" once allocated; otherwise ordered qty alone. */
export function orderQtyLabel(order) {
  const ordered = orderOrderedQty(order);
  const allocated = orderAllocatedQtyTotal(order);
  if (allocated > 0) return `${Math.min(allocated, ordered)} of ${ordered}`;
  return String(ordered);
}

/** Compact items line for lists — uses "7 of 10" after allocation. */
export function orderItemsSummaryLabel(order) {
  const items = orderLineItemsForAnalytics(order);
  if (!items.length) return order?.items || "—";
  return items.map((item) => {
    const qty = lineItemQty(item);
    const allocated = lineItemAllocatedQty(item);
    if (allocated > 0) return `${item.name} · ${Math.min(allocated, qty)} of ${qty}`;
    return qty > 1 ? `${item.name} ×${qty}` : item.name;
  }).join(", ");
}

/**
 * Amount for order list glances (Recent orders, etc.).
 * After allocation → allocated × price; before → due-now / deposit (order.total).
 */
export function orderListDisplayTotal(order) {
  const items = orderLineItemsForAnalytics(order);
  const hasAllocation = items.some((item) => lineItemAllocatedQty(item) > 0)
    || Math.max(0, Number(order?.allocatedQty) || 0) > 0;
  if (hasAllocation) {
    if (items.length) {
      return items.reduce((sum, item) => (
        sum + (lineItemAllocatedQty(item) > 0 ? lineItemFinalPrice(item) : 0)
      ), 0);
    }
    const qty = Math.max(1, Number(order?.qty) || 1);
    const allocated = Math.min(Math.max(0, Number(order?.allocatedQty) || 0), qty);
    const price = Number(order?.lineItems?.[0]?.price) || 0;
    if (price > 0) return allocated * price;
  }
  return Math.max(0, Number(order?.total) || 0);
}

export function orderContributesToBasis(order, basis = "paid") {
  if (basis !== "fulfilled") {
    return orderRevenue(order, "paid") > 0 || getOrderLineItems(order).length > 0;
  }
  return lineItemsForBasis(order, "fulfilled").length > 0;
}
