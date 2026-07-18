/** Pre-order + in-stock order lifecycle for admin. */

import {
  creditPatchForReceived,
  expectedAmountReceived,
  lineOpenCredit,
  netBalanceDueAfterCredit,
  shouldCaptureAmountReceived,
  statusClearsCredit,
} from "../lib/orderCredit.js";

/** Case 1: 100% stock allocated — customer must pay remaining balance. */
export const ALLOCATION_FULFILLED_PAY_BALANCE = "Allocation Fulfilled & Pay Balance";

export const PAYMENT_STATUSES = [
  "Pending Verification",
  "DP Paid",
  "Awaiting Balance Payment",
  "Fully Paid",
  "Rejected",
  "Unpaid",
  "For Partial Refund",
  "For Full Refund",
  "Partially Refunded",
  "Refunded",
];

export const ORDER_STATUSES = [
  "Pending Verification",
  "Awaiting Stock",
  ALLOCATION_FULFILLED_PAY_BALANCE,
  "Fulfilled",
  "Partially Fulfilled & Pay Balance",
  "Partially Fulfilled & For Refund",
  "For Full Refund",
  "Refunded",
  "Ready for Pickup",
  "Unpaid",
];

/** Order statuses available in the dropdown for each payment status. */
export const ORDER_STATUSES_BY_PAYMENT = {
  "Pending Verification": ["Pending Verification"],
  "DP Paid": ["Awaiting Stock"],
  "Awaiting Balance Payment": [
    ALLOCATION_FULFILLED_PAY_BALANCE,
    "Partially Fulfilled & Pay Balance",
  ],
  "Fully Paid": [
    "Ready for Pickup",
    "Fulfilled",
    // Scenario 2: partial allocation settled — keep status + allocated qty (not full order qty).
    "Partially Fulfilled & Pay Balance",
  ],
  Rejected: ["Refunded", "For Full Refund"],
  Unpaid: ["Unpaid"],
  "For Partial Refund": ["Partially Fulfilled & For Refund"],
  "Partially Refunded": ["Ready for Pickup", "Fulfilled", "Partially Fulfilled & Pay Balance"],
  "For Full Refund": ["For Full Refund"],
  Refunded: ["Refunded"],
};

export const PREORDER_PAYMENT_STATUSES = PAYMENT_STATUSES;
export const INSTOCK_PAYMENT_STATUSES = [
  "Pending Verification",
  "Unpaid",
  "Fully Paid",
  "For Full Refund",
  "Refunded",
];
export const PREORDER_ORDER_STATUSES = ORDER_STATUSES;
export const INSTOCK_ORDER_STATUSES = [
  "Pending Verification",
  "Unpaid",
  "Ready for Pickup",
  "Fulfilled",
  "For Full Refund",
  "Refunded",
];

/** In-stock only — subset of payment → order status mappings. */
export const INSTOCK_ORDER_STATUSES_BY_PAYMENT = {
  "Pending Verification": ["Pending Verification"],
  Unpaid: ["Unpaid"],
  "Fully Paid": ["Ready for Pickup", "Fulfilled"],
  "For Full Refund": ["For Full Refund"],
  Refunded: ["Refunded"],
};

export const PAYMENT_COLOR = {
  "Pending Verification": "warning",
  "DP Paid": "info",
  "Awaiting Balance Payment": "warning",
  "Fully Paid": "success",
  Rejected: "error",
  Unpaid: "warning",
  "For Partial Refund": "warning",
  "For Full Refund": "error",
  "Partially Refunded": "info",
  Refunded: "default",
  Mixed: "secondary",
  Deposit: "info",
};

export const STATUS_COLOR = {
  "Pending Verification": "warning",
  "Awaiting Stock": "default",
  [ALLOCATION_FULFILLED_PAY_BALANCE]: "warning",
  Fulfilled: "secondary",
  "Partially Fulfilled & Pay Balance": "warning",
  "Partially Fulfilled & For Refund": "info",
  "For Full Refund": "error",
  Refunded: "default",
  "Ready for Pickup": "secondary",
  Unpaid: "error",
  Mixed: "secondary",
};

/** Friendly display labels for order statuses (internal values stay unchanged). */
const ORDER_STATUS_LABELS = {
  "For Full Refund": "No Allocation, For Full Refund",
};

/** Display label for an order status; falls back to the (migrated) status value. */
export function orderStatusLabel(status) {
  const normalized = migrateOrderStatus(status);
  if (!normalized) return "—";
  return ORDER_STATUS_LABELS[normalized] ?? normalized;
}

const LEGACY_PAYMENT_MAP = {
  Deposit: "DP Paid",
  Unpaid: "Unpaid",
  "30% Paid": "DP Paid",
  "Awaiting 70%": "Unpaid",
  "Awaiting full payment": "Unpaid",
  Paid: "Fully Paid",
};

const LEGACY_STATUS_MAP = {
  Reserved: "Pending Verification",
  "Awaiting stock": "Awaiting Stock",
  "Ready for pickup": "Ready for Pickup",
  "Awaiting Pickup": "Ready for Pickup",
  "Partially Fulfilled": "Awaiting Stock",
  Completed: "Fulfilled",
  Cancelled: "Refunded",
  Processing: "Awaiting Stock",
  Shipped: "Fulfilled",
  Delivered: "Fulfilled",
  Packing: "Awaiting Stock",
  "Partially Fulfilled & Refunded": "Partially Fulfilled & For Refund",
};

export function migratePaymentStatus(payment) {
  return LEGACY_PAYMENT_MAP[payment] ?? payment;
}

export function migrateOrderStatus(status) {
  return LEGACY_STATUS_MAP[status] ?? status ?? "";
}

export function isAllocationFulfilledPayBalance(status) {
  return migrateOrderStatus(status) === ALLOCATION_FULFILLED_PAY_BALANCE;
}

export function isBalanceDuePreorderStatus(status) {
  const normalized = migrateOrderStatus(status);
  return normalized === ALLOCATION_FULFILLED_PAY_BALANCE
    || normalized === "Partially Fulfilled & Pay Balance";
}

/** Legacy rows: preorder Fulfilled + Unpaid meant balance due (now a dedicated status). */
export function migratePreorderBalanceStatus(item) {
  if (!item || resolveOrderKindForItem(item) !== "Pre-order") return item;
  const payment = migratePaymentStatus(item.payment);
  const status = migrateOrderStatus(item.status);
  if (status === "Fulfilled" && payment === "Unpaid") {
    return { ...item, status: ALLOCATION_FULFILLED_PAY_BALANCE };
  }
  return item;
}

export function isPreorderOrder(order) {
  return resolveOrderKind(order) === "Pre-order";
}

export function getPaymentOptions(order) {
  return getPaymentOptionsForKind(resolveOrderKind(order));
}

export function getStatusOptions(order) {
  const kind = resolveOrderKind(order);
  const payment = migratePaymentStatus(order?.payment);
  return getOrderStatusOptionsForPayment(payment, kind);
}

export function getPaymentOptionsForKind(kind) {
  return kind === "Pre-order" ? PREORDER_PAYMENT_STATUSES : INSTOCK_PAYMENT_STATUSES;
}

export function getStatusOptionsForKind(kind) {
  return kind === "Pre-order" ? PREORDER_ORDER_STATUSES : INSTOCK_ORDER_STATUSES;
}

/** Visible order statuses for a selected payment status (admin dropdown). */
export function getOrderStatusOptionsForPayment(payment, kind = "In-stock") {
  const normalized = migratePaymentStatus(payment);
  const map = kind === "Pre-order" ? ORDER_STATUSES_BY_PAYMENT : INSTOCK_ORDER_STATUSES_BY_PAYMENT;
  const allowed = map[normalized];
  if (!allowed?.length) return getStatusOptionsForKind(kind);
  return allowed;
}

/** Pick a valid order status for the given payment (coerces mismatched pairs). */
export function resolveOrderStatusForPayment(payment, status, kind = "In-stock") {
  const allowed = getOrderStatusOptionsForPayment(payment, kind);
  const normalized = migrateOrderStatus(status);
  if (allowed.includes(normalized)) return normalized;
  return allowed[0] ?? normalized;
}

export function resolveOrderKind(order) {
  const inferred = inferOrderKind(order);
  if (inferred === "Pre-order") return "Pre-order";
  if (order?.type === "Pre-order" || order?.type === "In-stock") return order.type;
  return inferred;
}

export function inferOrderKind(order) {
  const payment = migratePaymentStatus(order?.payment);
  const status = migrateOrderStatus(order?.status);

  if (["DP Paid", "Awaiting Balance Payment", "Unpaid"].includes(payment)) return "Pre-order";
  if (status === "Awaiting Stock") return "Pre-order";
  if (order?.lineItems?.some((item) => item.tag === "Pre-order")) return "Pre-order";
  if (order?.lineItems?.some((item) => item.tag !== "Pre-order")) return "In-stock";
  if ((order?.balanceDue ?? 0) > 0 && (order?.fullSubtotal ?? 0) > (order?.total ?? 0)) return "Pre-order";
  return "In-stock";
}

export function optionsIncludingCurrent(options, current) {
  if (current && !options.includes(current)) return [...options, current];
  return options;
}

export function getDepositPercent(order) {
  const stored = Number(order?.depositPercent);
  if (Number.isFinite(stored) && stored > 0) return stored;
  return 30;
}

function lineQuantity(itemOrOrder) {
  return Math.max(1, itemOrOrder?.qty ?? itemOrOrder?.quantity ?? 1);
}

function lineFullTotal(itemOrOrder) {
  const qty = lineQuantity(itemOrOrder);
  if (itemOrOrder?.fullSubtotal != null) return itemOrOrder.fullSubtotal;
  if (itemOrOrder?.lineTotal != null) return itemOrOrder.lineTotal;
  return (itemOrOrder?.price ?? 0) * qty;
}

function lineDepositPaid(itemOrOrder, depositPercent = 30) {
  const pct = itemOrOrder?.depositPercent ?? depositPercent;
  const full = lineFullTotal(itemOrOrder);
  if (itemOrOrder?.depositPaid != null) return itemOrOrder.depositPaid;
  // Pre-order checkout stores the deposit in order.total.
  if (itemOrOrder?.total != null && (isPreorderOrder(itemOrOrder) || resolveOrderKindForItem(itemOrOrder) === "Pre-order")) {
    return itemOrOrder.total;
  }
  return Math.round((full * pct) / 100);
}

function allocatedFullTotal(itemOrOrder, allocatedQty) {
  const qty = lineQuantity(itemOrOrder);
  const full = lineFullTotal(itemOrOrder);
  const clamped = Math.max(0, Math.min(qty, allocatedQty));
  return (full * clamped) / qty;
}

/** Remaining balance on allocated units: allocated full price − deposit paid. */
export function balanceAfterAllocation(orderOrItem, allocatedQty, depositPercent = 30) {
  if (!isPreorderOrder(orderOrItem) && resolveOrderKindForItem(orderOrItem) !== "Pre-order") {
    return 0;
  }

  const allocatedFull = allocatedFullTotal(orderOrItem, allocatedQty);
  const depositPaid = lineDepositPaid(orderOrItem, depositPercent);
  return Math.max(0, allocatedFull - depositPaid);
}

/** Refund on unkept / under-allocated units: deposit paid − allocated full price. */
export function refundAfterAllocation(orderOrItem, allocatedQty, depositPercent = 30) {
  const allocatedFull = allocatedFullTotal(orderOrItem, allocatedQty);
  const depositPaid = lineDepositPaid(orderOrItem, depositPercent);
  return Math.max(0, depositPaid - allocatedFull);
}

/** Base allocation refund + unused order-scoped overpayment credit. */
export function refundAfterAllocationWithCredit(orderOrItem, allocatedQty, depositPercent = 30) {
  const base = refundAfterAllocation(orderOrItem, allocatedQty, depositPercent);
  const credit = Math.max(0, Number(orderOrItem?.creditAmount) || 0);
  return base + credit;
}

export function inferStatusesAfterAllocation(order, allocatedQty) {
  const qty = Math.max(1, order.qty ?? 1);
  const clamped = Math.max(0, Math.min(qty, allocatedQty));
  let payment = migratePaymentStatus(order.payment);
  let status = migrateOrderStatus(order.status);

  if (!isPreorderOrder(order)) {
    return { payment, status, allocatedQty: clamped, balanceDue: 0 };
  }

  if (clamped === 0) {
    return { payment, status, allocatedQty: clamped, balanceDue: balanceAfterAllocation(order, clamped) };
  }

  if (clamped < qty) {
    status = "Awaiting Stock";
  } else {
    status = ALLOCATION_FULFILLED_PAY_BALANCE;
  }

  const grossBalance = balanceAfterAllocation(order, clamped);
  return {
    payment,
    status,
    allocatedQty: clamped,
    balanceDue: netBalanceDueAfterCredit(grossBalance, order?.creditAmount),
  };
}

export function getOrderStage(order) {
  const payment = migratePaymentStatus(order.payment);
  const status = migrateOrderStatus(order.status);

  if (status === "Refunded" || status === "For Full Refund") return "Refunded";

  if (payment === "Pending Verification") return "Review payment";
  if (isPreorderOrder(order)) {
    if (payment === "DP Paid" && status === "Awaiting Stock") return "Awaiting allocation";
    if (isAllocationFulfilledPayBalance(status) || status === "Partially Fulfilled & Pay Balance") return "Collect balance";
    if (status === "Partially Fulfilled & For Refund") return "Process refund";
    if (status === "For Full Refund") return "Process refund";
    if (payment === "Partially Refunded") return "Partial refund sent";
    if (status === "Ready for Pickup" && payment === "Fully Paid") return "Ready for pickup";
    if (status === "Ready for Pickup" && payment === "Partially Refunded") return "Ready for pickup";
  } else {
    if (payment === "Fully Paid" && status === "Awaiting Stock") return "Fulfill order";
    if (status === "Ready for Pickup") return "Ready for pickup";
    if (status === "Fulfilled") return "Fulfilled";
  }

  return status;
}

export const ORDER_QUEUES = [
  { id: "all", label: "All" },
  {
    id: "review",
    label: "Needs review",
    match: (o) => migratePaymentStatus(o.payment) === "Pending Verification",
  },
  {
    id: "awaiting-stock",
    label: "Awaiting stock",
    match: (o) => isPreorderOrder(o) && migrateOrderStatus(o.status) === "Awaiting Stock",
  },
  {
    id: "balance-due",
    label: "Balance due",
    match: (o) => isPreorderOrder(o) && (
      isBalanceDuePreorderStatus(migrateOrderStatus(o.status))
      || getOrderLineItems(o).some((item) => isBalanceDuePreorderStatus(item.status))
    ),
  },
  {
    id: "refund",
    label: "Refund pending",
    match: (o) => isPreorderOrder(o) && (
      migrateOrderStatus(o.status) === "Partially Fulfilled & For Refund"
      || migrateOrderStatus(o.status) === "For Full Refund"
    ),
  },
  {
    id: "pickup",
    label: "Ready for pickup",
    match: (o) => migrateOrderStatus(o.status) === "Ready for Pickup",
  },
  { id: "preorder", label: "Pre-orders", match: (o) => o.type === "Pre-order" },
  { id: "instock", label: "In-stock", match: (o) => o.type === "In-stock" },
];

export function allocationLabel(order) {
  const status = migrateOrderStatus(order.status);
  const qty = order.qty ?? 1;
  const allocated = order.allocatedQty ?? 0;
  if (!isPreorderOrder(order)) return "—";
  if (!statusNeedsAllocation(status) && status !== "Fulfilled") return "—";
  if (allocated === 0) return status === "For Full Refund" ? `0 / ${qty}` : "—";
  if (allocated >= qty) return `Full (${qty})`;
  return `${allocated} / ${qty}`;
}

export function statusNeedsAllocation(status) {
  const normalized = migrateOrderStatus(status);
  return [
    "Partially Fulfilled & Pay Balance",
    "Partially Fulfilled & For Refund",
    "For Full Refund",
  ].includes(normalized);
}

export function statusNeedsRefundAmount(status) {
  const normalized = migrateOrderStatus(status);
  return [
    "Partially Fulfilled & For Refund",
    "For Full Refund",
  ].includes(normalized);
}

export const INSTOCK_FLOW_STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "paid", label: "Payment verified" },
  { key: "processing", label: "Processing" },
  { key: "release", label: "Ready for pickup" },
  { key: "done", label: "Fulfilled" },
];

export function activeInstockStep(order) {
  const payment = migratePaymentStatus(order.payment);
  const status = migrateOrderStatus(order.status);
  const last = INSTOCK_FLOW_STEPS.length;

  if (
    status === "Refunded"
    || payment === "Refunded"
    || status === "For Full Refund"
    || payment === "For Full Refund"
  ) {
    return 2;
  }
  if (status === "Fulfilled") return last;
  if (status === "Ready for Pickup") return 4;
  if (status === "Awaiting Stock" && payment === "Fully Paid") return 3;
  if (payment === "Fully Paid") return 2;
  return 1;
}

export const PREORDER_FLOW_STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "deposit", label: "Payment verified" },
  { key: "allocated", label: "Stock allocated" },
  { key: "balance", label: "Balance collected" },
  { key: "pickup", label: "Ready for pickup" },
  { key: "done", label: "Fulfilled" },
];

export function activePreorderStep(order) {
  const payment = migratePaymentStatus(order.payment);
  const status = migrateOrderStatus(order.status);
  const last = PREORDER_FLOW_STEPS.length;
  const allocated = Math.max(0, Number(order.allocatedQty) || 0);

  // Full refund / no stock kept — stop after payment verified (not Fulfilled).
  if (
    status === "Refunded"
    || payment === "Refunded"
    || status === "For Full Refund"
    || payment === "For Full Refund"
  ) {
    return allocated > 0 ? 4 : 2;
  }

  if (status === "Fulfilled") return last;

  if (status === "Ready for Pickup") return 5;

  if (isBalanceDuePreorderStatus(status)) return 3;

  if (status === "Awaiting Stock" || payment === "DP Paid" || payment === "Awaiting Balance Payment") return 2;

  return 1;
}

export function getFlowStepsForItem(item) {
  return resolveOrderKindForItem(item) === "Pre-order" ? PREORDER_FLOW_STEPS : INSTOCK_FLOW_STEPS;
}

export function getActiveStepForItem(item) {
  return resolveOrderKindForItem(item) === "Pre-order"
    ? activePreorderStep(item)
    : activeInstockStep(item);
}

/** Customer-facing milestone progress for a single line item. */
export function getMilestoneProgress(item) {
  const steps = getFlowStepsForItem(item);
  const active = getActiveStepForItem(item);
  const done = active >= steps.length;
  return {
    steps,
    activeStep: Math.min(active, Math.max(steps.length - 1, 0)),
    nextLabel: done ? null : (steps[active]?.label ?? null),
    done,
  };
}

export function filterTrailForLineItem(trail, lineItemId) {
  return [...(trail ?? [])]
    .filter((entry) => !entry.lineItemId || entry.lineItemId === lineItemId)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export const PAYMENT_OPTIONS = [...PAYMENT_STATUSES];
export const STATUS_OPTIONS = [...ORDER_STATUSES];

export function resolveOrderKindForItem(item) {
  return item?.tag === "Pre-order" ? "Pre-order" : "In-stock";
}

export function normalizeLineItem(item, orderDefaults = {}) {
  const migrated = migratePreorderBalanceStatus(item);
  const payment = migratePaymentStatus(migrated.payment ?? orderDefaults.payment ?? "Pending Verification");
  let status = migrateOrderStatus(migrated.status ?? orderDefaults.status ?? "");
  if (!status && payment === "Pending Verification") {
    status = "Pending Verification";
  }
  const quantity = migrated.quantity ?? 1;
  const price = migrated.price ?? 0;
  const cost = migrated.cost != null && migrated.cost !== ""
    ? Math.max(0, Number(migrated.cost) || 0)
    : undefined;
  const lineTotal = migrated.lineTotal ?? price * quantity;

  return {
    allocatedQty: 0,
    balanceDue: 0,
    depositPaid: lineTotal,
    creditAmount: 0,
    ...migrated,
    quantity,
    price,
    ...(cost != null ? { cost } : {}),
    lineTotal,
    payment,
    status,
    allocatedQty: migrated.allocatedQty ?? 0,
    balanceDue: migrated.balanceDue ?? 0,
    depositPaid: migrated.depositPaid ?? migrated.linePaid ?? lineTotal,
    creditAmount: Math.max(0, Number(migrated.creditAmount) || 0),
    ...(migrated.depositReceived != null
      ? { depositReceived: Math.max(0, Number(migrated.depositReceived) || 0) }
      : {}),
    ...(migrated.balanceReceived != null
      ? { balanceReceived: Math.max(0, Number(migrated.balanceReceived) || 0) }
      : {}),
  };
}

export function synthesizeLineItemsFromOrder(order) {
  const payment = migratePaymentStatus(order.payment);
  const status = migrateOrderStatus(order.status);
  const quantity = order.qty ?? 1;
  const lineTotal = order.fullSubtotal ?? order.total ?? 0;

  return [normalizeLineItem({
    id: `${order.id}-line-0`,
    name: order.items || "Order items",
    quantity,
    price: quantity ? lineTotal / quantity : lineTotal,
    lineTotal,
    tag: resolveOrderKind(order) === "Pre-order" ? "Pre-order" : "In-stock",
    line: null,
    payment,
    status,
    allocatedQty: order.allocatedQty ?? 0,
    balanceDue: order.balanceDue ?? 0,
    depositPaid: order.total ?? lineTotal,
  }, { payment, status })];
}

/**
 * If Fulfilled/Ready shows full ordered qty but an earlier trail email recorded a
 * partial allocation (and there was never an explicit full Allocation → N event),
 * restore that partial — recovers the Ready→Fulfilled wipe bug.
 */
function recoverWipedPartialAllocation(item, trail) {
  const status = migrateOrderStatus(item?.status);
  if (status !== "Fulfilled" && status !== "Ready for Pickup") return item;

  const qty = Math.max(1, Number(item.quantity) || 1);
  const allocated = Math.max(0, Number(item.allocatedQty) || 0);
  if (allocated > 0 && allocated < qty) return item;

  let latestPartial = null;
  let sawExplicitFullAllocation = false;

  for (const entry of trail || []) {
    const allocTitle = String(entry?.title || "").match(/Allocation →\s*(\d+)\s*\/\s*(\d+)/i);
    if (allocTitle && Number(allocTitle[1]) >= Number(allocTitle[2])) {
      sawExplicitFullAllocation = true;
    }
    for (const row of entry?.emailLineItems || []) {
      if (item.id && row.lineItemId && row.lineItemId !== item.id) continue;
      const rowAlloc = Math.max(0, Number(row.allocatedQty) || 0);
      const rowQty = Math.max(1, Number(row.quantity) || qty);
      if (rowAlloc > 0 && rowAlloc < rowQty) {
        if (!latestPartial || new Date(entry.at) > new Date(latestPartial.at)) {
          latestPartial = { allocated: rowAlloc, at: entry.at };
        }
      }
    }
  }

  if (!latestPartial || sawExplicitFullAllocation) return item;
  if (allocated === 0 || allocated >= qty) {
    return { ...item, allocatedQty: latestPartial.allocated };
  }
  return item;
}

export function getOrderLineItems(order) {
  const items = order.lineItems?.length
    ? order.lineItems.map((item) => normalizeLineItem(item, order))
    : synthesizeLineItemsFromOrder(order);
  return items.map((item) => recoverWipedPartialAllocation(item, order?.trail));
}

/** Line items that are finished / cancelled — safe to delete the linked product. */
const CLOSED_LINE_STATUSES = new Set(["Fulfilled", "Refunded", "Unpaid"]);

/** True while a line item still needs fulfillment work (not fulfilled, refunded, or unpaid). */
export function isLineItemInProgress(item) {
  return !CLOSED_LINE_STATUSES.has(migrateOrderStatus(item?.status));
}

/**
 * Order numbers that still reference `productId` on an in-progress line item.
 * Cart/admin orders store the product id as the line item `id`.
 */
export function openOrderIdsForProduct(orders, productId) {
  if (!productId || !Array.isArray(orders)) return [];
  const hits = [];
  for (const order of orders) {
    const hasOpen = getOrderLineItems(order).some(
      (item) => item.id === productId && isLineItemInProgress(item),
    );
    if (hasOpen) hits.push(order.id);
  }
  return hits;
}

/** Map of productId → open order ids for quick inventory delete checks. */
export function openOrdersByProductId(orders) {
  const map = new Map();
  if (!Array.isArray(orders)) return map;
  for (const order of orders) {
    if (order?.archivedAt) continue;
    for (const item of getOrderLineItems(order)) {
      if (!isLineItemInProgress(item) || !item.id) continue;
      const list = map.get(item.id);
      if (list) {
        if (!list.includes(order.id)) list.push(order.id);
      } else {
        map.set(item.id, [order.id]);
      }
    }
  }
  return map;
}

/**
 * Orders that include a product (line item id === productId), newest first.
 * Used by the product edit “Order history” tab.
 */
export function orderHistoryForProduct(orders, productId) {
  if (!productId || !Array.isArray(orders)) return [];
  const rows = [];
  for (const order of orders) {
    const item = getOrderLineItems(order).find((line) => line.id === productId);
    if (!item) continue;
    const status = migrateOrderStatus(item.status);
    rows.push({
      orderId: order.id,
      customer: order.customer || "—",
      email: order.email || "",
      status,
      statusLabel: orderStatusLabel(status),
      quantity: item.quantity ?? 1,
      date: order.date || order.createdAt || order.placedAt || "",
      fulfilled: status === "Fulfilled",
    });
  }
  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function syncOrderRollup(lineItems) {
  if (!lineItems.length) return {};
  const payments = lineItems.map((item) => item.payment);
  const statuses = lineItems.map((item) => item.status);
  const uniquePayments = [...new Set(payments)];
  const uniqueStatuses = [...new Set(statuses)];

  return {
    payment: uniquePayments.length === 1 ? uniquePayments[0] : "Mixed",
    status: uniqueStatuses.length === 1 ? uniqueStatuses[0] : "Mixed",
    qty: lineItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    allocatedQty: lineItems.reduce((sum, item) => sum + (item.allocatedQty ?? 0), 0),
    balanceDue: lineItems.reduce((sum, item) => sum + (item.balanceDue ?? 0), 0),
    creditAmount: lineItems.reduce((sum, item) => sum + (item.creditAmount ?? 0), 0),
  };
}

export function buildTrailAttachment(url, label = "Attachment", kind = null) {
  if (!url) return undefined;
  return {
    url,
    label,
    type: url.startsWith("data:application/pdf") ? "pdf" : "image",
    ...(kind ? { kind } : {}),
    stored: true,
  };
}

/** Latest admin attachment on the order trail (for emails + customer UI). */
export function findLatestAdminTrailAttachment(order, lineItemId = null) {
  const entries = [...(order.trail ?? [])]
    .filter((entry) => {
      if (entry.attachment?.kind !== "admin") return false;
      if (lineItemId && entry.lineItemId && entry.lineItemId !== lineItemId) return false;
      const url = entry.attachment.storageUrl || entry.attachment.url;
      return Boolean(url && (String(url).startsWith("http") || String(url).startsWith("data:")));
    })
    .sort((a, b) => new Date(b.at) - new Date(a.at));
  const hit = entries[0];
  if (!hit?.attachment) return null;
  return {
    label: hit.attachment.label || "Attachment",
    url: hit.attachment.storageUrl || hit.attachment.url,
    type: hit.attachment.type || "image",
    at: hit.at,
    title: hit.title,
  };
}

/** Admin trail attachments for a line item (newest first). */
export function adminTrailAttachmentsForLineItem(order, lineItemId) {
  return [...(order.trail ?? [])]
    .filter((entry) => entry.lineItemId === lineItemId && entry.attachment?.kind === "admin")
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function buildStoredTrailAttachment({ label, type = "image", kind, lineItemId, proofId }) {
  return {
    label,
    type,
    kind,
    lineItemId,
    ...(proofId ? { proofId } : {}),
    stored: true,
  };
}

export function trailEntryShowsAttachment(entry) {
  if (!entry?.attachment) return false;
  const att = entry.attachment;
  if (att.storageUrl || isHttpUrl(att.url) || isDataUrl(att.url)) return true;
  if (att.stored) return true;
  if (att.kind === "balance" || att.kind === "refund" || att.kind === "admin") return true;
  if (att.kind === "file" && !isDepositProofTrailEntry(entry)) return true;
  return isDepositProofTrailEntry(entry);
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

/** Initial checkout trail rows that should expose deposit proof when available. */
export function isDepositProofTrailEntry(entry) {
  if (!entry) return false;
  if (migratePaymentStatus(entry.payment) !== "Pending Verification") return false;
  const title = entry.title || "";
  const note = entry.note || "";
  return title === "Order purchased"
    || title === "Order created by admin"
    || /uploaded proof of payment/i.test(note);
}

/** Pre-order line item awaiting balance payment — customer can upload proof. */
export function itemNeedsBalanceProof(item) {
  if (resolveOrderKindForItem(item) !== "Pre-order") return false;
  if (!isBalanceDuePreorderStatus(item.status)) return false;
  if ((item.balanceDue ?? 0) <= 0) return false;
  const payment = migratePaymentStatus(item.payment);
  return payment !== "Fully Paid";
}

// Payment/status values where nothing is owed anymore — used to suppress a
// stale `balanceDue` number that was never zeroed after the order settled.
const BALANCE_SETTLED_PAYMENTS = new Set(["Fully Paid", "Refunded", "Partially Refunded"]);
const BALANCE_SETTLED_STATUSES = new Set(["Fulfilled", "Ready for Pickup", "Refunded"]);

/**
 * Display-only: the balance a customer still genuinely owes on a line item.
 * Returns 0 once the item is fully paid, refunded, or fulfilled, even if the
 * stored `balanceDue` field still holds a non-zero legacy value.
 */
export function itemOutstandingBalance(item) {
  const due = item?.balanceDue ?? 0;
  if (due <= 0) return 0;
  if (BALANCE_SETTLED_PAYMENTS.has(migratePaymentStatus(item?.payment))) return 0;
  if (BALANCE_SETTLED_STATUSES.has(migrateOrderStatus(item?.status))) return 0;
  return due;
}

/** Display-only: total outstanding balance across an order's line items. */
export function orderOutstandingBalance(order) {
  const items = order?.lineItems;
  if (Array.isArray(items) && items.length) {
    return items.reduce((sum, item) => sum + itemOutstandingBalance(item), 0);
  }
  return itemOutstandingBalance(order);
}

/** True when the order has a balance the customer can act on / pay right now. */
export function orderNeedsBalancePayment(order) {
  const items = order?.lineItems;
  if (Array.isArray(items) && items.length) {
    return items.some((item) => itemNeedsBalanceProof(item));
  }
  return itemNeedsBalanceProof(order);
}

/** Line item with a pending refund — customer can provide QR / bank details. */
export function itemNeedsRefundDetails(item) {
  const status = migrateOrderStatus(item.status);
  const payment = migratePaymentStatus(item.payment);
  return payment === "For Partial Refund"
    || payment === "For Full Refund"
    || status === "For Full Refund"
    || status === "Partially Fulfilled & For Refund";
}

export function allocationLabelForItem(item) {
  const qty = item.quantity ?? 1;
  const allocated = item.allocatedQty ?? 0;
  const status = migrateOrderStatus(item.status);
  if (resolveOrderKindForItem(item) !== "Pre-order") return "—";
  if (status === "Fulfilled" && allocated >= qty) return `Full (${qty})`;
  if (isAllocationFulfilledPayBalance(status) && allocated >= qty) return `Full (${qty})`;
  if (!statusNeedsAllocation(status)) return "—";
  if (allocated === 0) return status === "For Full Refund" ? `0 / ${qty}` : "—";
  if (allocated >= qty) return `Full (${qty})`;
  return `${allocated} / ${qty}`;
}

export function refundedAmountForLineItem(item, depositPercent = 30) {
  const qty = Math.max(1, item.quantity ?? 1);
  const fullLine = item.lineTotal ?? (item.price ?? 0) * qty;
  const isPreorder = resolveOrderKindForItem(item) === "Pre-order";
  const payment = migratePaymentStatus(item.payment);
  const status = migrateOrderStatus(item.status);
  const credit = lineOpenCredit(item);

  if (item.refundAmount != null && item.refundAmount >= 0) {
    return item.refundAmount;
  }

  if (!isPreorder) {
    const base = status === "Refunded" || payment === "Refunded" ? fullLine : 0;
    return base > 0 ? base + credit : credit;
  }

  const allocated = item.allocatedQty ?? 0;

  if (status === "Refunded" || payment === "Refunded" || status === "For Full Refund") {
    return lineDepositPaid(item, depositPercent) + credit;
  }

  if (
    status === "Partially Fulfilled & For Refund"
    || payment === "For Partial Refund"
    || payment === "Partially Refunded"
  ) {
    return refundAfterAllocationWithCredit(item, allocated, depositPercent);
  }

  return 0;
}

export function refundedAmountForOrder(order) {
  const depositPercent = getDepositPercent(order);
  return getOrderLineItems(order).reduce(
    (sum, item) => sum + refundedAmountForLineItem(item, depositPercent),
    0,
  );
}

export function validateAllocationForStatus(lineItem, status) {
  if (resolveOrderKindForItem(lineItem) !== "Pre-order") {
    return { ok: true };
  }

  const qty = Math.max(1, lineItem.quantity ?? 1);
  const allocated = lineItem.allocatedQty ?? 0;
  const normalized = migrateOrderStatus(status);

  if (normalized === "For Full Refund") {
    if (allocated !== 0) {
      return { ok: false, message: "Full refund requires 0 allocated units." };
    }
    return { ok: true };
  }

  if (
    normalized === "Partially Fulfilled & Pay Balance"
    || normalized === "Partially Fulfilled & For Refund"
  ) {
    if (allocated <= 0) {
      return {
        ok: false,
        message: "Enter allocated qty (minimum 1) for units being fulfilled.",
      };
    }
    if (allocated >= qty) {
      return {
        ok: false,
        message: `Full allocation (${qty}) should use ${ALLOCATION_FULFILLED_PAY_BALANCE} instead.`,
      };
    }
    return { ok: true };
  }

  if (normalized === ALLOCATION_FULFILLED_PAY_BALANCE) {
    return { ok: true };
  }

  if (normalized === "Fulfilled") {
    return { ok: true };
  }

  return { ok: true };
}

export function applyPaymentStatusToLineItem(
  item,
  payment,
  status,
  draftAllocatedQty = undefined,
  draftRefundAmount = undefined,
  draftAmountReceived = undefined,
) {
  const normalized = migrateOrderStatus(status);
  const paymentNorm = migratePaymentStatus(payment);
  const qty = Math.max(1, item.quantity ?? 1);
  let allocatedQty = item.allocatedQty ?? 0;
  const isPreorder = resolveOrderKindForItem(item) === "Pre-order";
  const depositPercent = item.depositPercent ?? 30;
  const kind = isPreorder ? "Pre-order" : "In-stock";

  if (isPreorder) {
    if (normalized === ALLOCATION_FULFILLED_PAY_BALANCE) {
      // Full allocation case — only bump to ordered qty when none recorded yet.
      allocatedQty = draftAllocatedQty != null
        ? Math.max(0, Math.min(qty, draftAllocatedQty))
        : ((item.allocatedQty ?? 0) > 0 ? item.allocatedQty : qty);
    } else if (normalized === "Fulfilled" || normalized === "Ready for Pickup") {
      // Never invent a full allocation on fulfill — that wiped partials (7 of 10 → 10 of 10).
      if (draftAllocatedQty != null) {
        allocatedQty = Math.max(0, Math.min(qty, draftAllocatedQty));
      } else {
        allocatedQty = Math.max(0, Number(item.allocatedQty) || 0);
      }
    } else if (statusNeedsAllocation(normalized)) {
      if (draftAllocatedQty != null) {
        allocatedQty = Math.max(0, Math.min(qty, draftAllocatedQty));
      }
      if (normalized === "For Full Refund") {
        allocatedQty = 0;
      }
    } else if (normalized === "Refunded") {
      allocatedQty = 0;
    }
  }

  let creditAmount = lineOpenCredit(item);
  let depositReceived = item.depositReceived;
  let balanceReceived = item.balanceReceived;

  // Record cash received on DP Paid / Fully Paid (defaults to exact due → consumes credit).
  if (shouldCaptureAmountReceived(paymentNorm)) {
    const receiveOpts = {
      depositDue: lineDepositPaid(item, depositPercent),
      balanceDueNet: Math.max(0, Number(item.balanceDue) || 0),
      lineTotal: item.lineTotal ?? (item.price ?? 0) * qty,
      kind,
    };
    const received = draftAmountReceived != null && Number(draftAmountReceived) >= 0
      ? Number(draftAmountReceived)
      : expectedAmountReceived(paymentNorm, receiveOpts);
    const patch = creditPatchForReceived(item, paymentNorm, received, receiveOpts);
    if (patch.creditAmount != null) creditAmount = patch.creditAmount;
    if (patch.depositReceived != null) depositReceived = patch.depositReceived;
    if (patch.balanceReceived != null) balanceReceived = patch.balanceReceived;
  }

  let balanceDue = item.balanceDue;
  if (isPreorder) {
    const stub = {
      type: "Pre-order",
      qty,
      fullSubtotal: item.lineTotal ?? item.price * qty,
      depositPaid: item.depositPaid,
      depositPercent,
      payment,
      status: normalized,
      creditAmount,
    };
    // Settled — never keep a stale "balance before release" after pay / fulfill.
    if (
      paymentNorm === "Fully Paid"
      || paymentNorm === "Refunded"
      || paymentNorm === "Partially Refunded"
      || normalized === "Fulfilled"
      || normalized === "Ready for Pickup"
      || normalized === "Refunded"
      || normalized === "Partially Fulfilled & For Refund"
      || normalized === "For Full Refund"
    ) {
      balanceDue = 0;
    } else if (
      normalized === ALLOCATION_FULFILLED_PAY_BALANCE
      || normalized === "Partially Fulfilled & Pay Balance"
    ) {
      const gross = balanceAfterAllocation(stub, allocatedQty, depositPercent);
      balanceDue = netBalanceDueAfterCredit(gross, creditAmount);
    }
  }

  let refundAmount = item.refundAmount;
  const itemForRefund = {
    ...item,
    allocatedQty,
    payment,
    status: normalized,
    creditAmount,
    refundAmount: undefined,
  };
  if (draftRefundAmount != null && draftRefundAmount >= 0) {
    refundAmount = draftRefundAmount;
  } else if (statusNeedsRefundAmount(normalized)) {
    refundAmount = refundedAmountForLineItem(itemForRefund, depositPercent);
  } else if (normalized === "Refunded" || paymentNorm === "Refunded") {
    refundAmount = refundedAmountForLineItem(
      { ...itemForRefund, allocatedQty: 0 },
      depositPercent,
    );
  }

  // Refund path folds unused credit into the refund amount.
  if (statusClearsCredit(normalized, paymentNorm)) {
    creditAmount = 0;
  }

  return {
    ...item,
    payment,
    status: normalized,
    allocatedQty,
    balanceDue,
    refundAmount,
    creditAmount,
    ...(depositReceived != null ? { depositReceived } : {}),
    ...(balanceReceived != null ? { balanceReceived } : {}),
  };
}

export function inferLineItemAfterAllocation(item, allocatedQty) {
  const qty = Math.max(1, item.quantity ?? 1);
  const clamped = Math.max(0, Math.min(qty, allocatedQty));
  const currentStatus = migrateOrderStatus(item.status);
  const stubOrder = {
    type: resolveOrderKindForItem(item),
    qty,
    fullSubtotal: item.lineTotal ?? item.price * qty,
    depositPaid: item.depositPaid,
    depositPercent: 30,
    payment: item.payment,
    status: currentStatus,
    creditAmount: item.creditAmount ?? 0,
  };
  const inferred = inferStatusesAfterAllocation(stubOrder, clamped);

  return {
    ...item,
    allocatedQty: clamped,
    payment: inferred.payment,
    status: inferred.status,
    balanceDue: inferred.balanceDue,
  };
}

export function lineItemTrailLabel(item) {
  const qty = item.quantity ?? 1;
  return qty > 1 ? `${item.name} ×${qty}` : item.name;
}
