/** Pre-order + in-stock order lifecycle for admin. */

export const PAYMENT_STATUSES = [
  "Pending Verification",
  "DP Paid",
  "Fully Paid",
  "Rejected",
  "Unpaid",
  "Refunded",
];

export const ORDER_STATUSES = [
  "Pending Verification",
  "Awaiting Stock",
  "Fulfilled",
  "Partially Fulfilled & Refunded",
  "Refunded",
  "Ready for Pickup",
];

export const PREORDER_PAYMENT_STATUSES = PAYMENT_STATUSES;
export const INSTOCK_PAYMENT_STATUSES = PAYMENT_STATUSES;
export const PREORDER_ORDER_STATUSES = ORDER_STATUSES;
export const INSTOCK_ORDER_STATUSES = ORDER_STATUSES;

export const PAYMENT_COLOR = {
  "Pending Verification": "warning",
  "DP Paid": "info",
  "Fully Paid": "success",
  Rejected: "error",
  Unpaid: "warning",
  Refunded: "default",
  Mixed: "secondary",
  Deposit: "info",
};

export const STATUS_COLOR = {
  "Pending Verification": "warning",
  "Awaiting Stock": "default",
  Fulfilled: "secondary",
  "Partially Fulfilled & Refunded": "info",
  Refunded: "default",
  "Ready for Pickup": "secondary",
  Mixed: "secondary",
};

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
};

export function migratePaymentStatus(payment) {
  return LEGACY_PAYMENT_MAP[payment] ?? payment;
}

export function migrateOrderStatus(status) {
  return LEGACY_STATUS_MAP[status] ?? status;
}

export function isPreorderOrder(order) {
  return resolveOrderKind(order) === "Pre-order";
}

export function getPaymentOptions(order) {
  return getPaymentOptionsForKind(resolveOrderKind(order));
}

export function getStatusOptions(order) {
  return getStatusOptionsForKind(resolveOrderKind(order));
}

export function getPaymentOptionsForKind(kind) {
  return kind === "Pre-order" ? PREORDER_PAYMENT_STATUSES : INSTOCK_PAYMENT_STATUSES;
}

export function getStatusOptionsForKind(kind) {
  return kind === "Pre-order" ? PREORDER_ORDER_STATUSES : INSTOCK_ORDER_STATUSES;
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

  if (["DP Paid", "Unpaid"].includes(payment)) return "Pre-order";
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

export function balanceAfterAllocation(order, allocatedQty) {
  if (!isPreorderOrder(order)) return 0;

  const qty = Math.max(1, order.qty ?? 1);
  const full = order.fullSubtotal ?? order.total ?? 0;
  const pct = getDepositPercent(order);
  const clamped = Math.max(0, Math.min(qty, allocatedQty));
  const allocatedFull = (full * clamped) / qty;
  const depositPaid = order.total ?? Math.round((full * pct) / 100);

  if (clamped >= qty) {
    return Math.max(0, full - depositPaid);
  }
  if (clamped > 0) {
    const depositOnAllocated = Math.round((allocatedFull * pct) / 100);
    return Math.max(0, allocatedFull - depositOnAllocated);
  }
  return order.balanceDue ?? Math.max(0, full - depositPaid);
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
    status = migrateOrderStatus(order.status) === "Partially Fulfilled & Refunded"
      ? "Partially Fulfilled & Refunded"
      : "Awaiting Stock";
  } else {
    status = "Fulfilled";
    if (payment === "DP Paid") {
      payment = "Unpaid";
    }
  }

  return {
    payment,
    status,
    allocatedQty: clamped,
    balanceDue: balanceAfterAllocation(order, clamped),
  };
}

export function getOrderStage(order) {
  const payment = migratePaymentStatus(order.payment);
  const status = migrateOrderStatus(order.status);

  if (status === "Refunded") return "Refunded";

  if (payment === "Pending Verification") return "Review payment";
  if (isPreorderOrder(order)) {
    if (payment === "DP Paid" && status === "Awaiting Stock") return "Awaiting allocation";
    if (payment === "Unpaid") return "Collect balance";
    if (status === "Ready for Pickup" && payment === "Fully Paid") return "Ready for pickup";
    if (status === "Fulfilled" && payment === "Unpaid") return "Collect balance";
    if (status === "Partially Fulfilled & Refunded") return "Partial refund";
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
    match: (o) => migratePaymentStatus(o.payment) === "Unpaid",
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
  if (status !== "Partially Fulfilled & Refunded") return "—";
  if (allocated === 0) return `0 / ${qty}`;
  if (allocated >= qty) return `Full (${qty})`;
  return `${allocated} / ${qty}`;
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

  if (status === "Refunded" || payment === "Refunded" || status === "Partially Fulfilled & Refunded") {
    return last;
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

  if (status === "Refunded" || payment === "Refunded" || status === "Partially Fulfilled & Refunded") {
    return last;
  }

  if (status === "Fulfilled" && payment === "Fully Paid") return last;

  if (status === "Ready for Pickup" && payment === "Fully Paid") return 5;

  if (payment === "Fully Paid") {
    if (status === "Fulfilled") return 4;
    return 5;
  }

  if (payment === "Unpaid") {
    if (status === "Fulfilled") return 3;
    return 2;
  }

  if (payment === "DP Paid") return 2;

  return 1;
}

export const PAYMENT_OPTIONS = [...PAYMENT_STATUSES];
export const STATUS_OPTIONS = [...ORDER_STATUSES];

export function resolveOrderKindForItem(item) {
  return item?.tag === "Pre-order" ? "Pre-order" : "In-stock";
}

export function normalizeLineItem(item, orderDefaults = {}) {
  const payment = migratePaymentStatus(item.payment ?? orderDefaults.payment ?? "Pending Verification");
  const status = migrateOrderStatus(item.status ?? orderDefaults.status ?? "Pending Verification");
  const quantity = item.quantity ?? 1;
  const price = item.price ?? 0;
  const lineTotal = item.lineTotal ?? price * quantity;

  return {
    allocatedQty: 0,
    balanceDue: 0,
    depositPaid: lineTotal,
    ...item,
    quantity,
    price,
    lineTotal,
    payment,
    status,
    allocatedQty: item.allocatedQty ?? 0,
    balanceDue: item.balanceDue ?? 0,
    depositPaid: item.depositPaid ?? item.linePaid ?? lineTotal,
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

export function getOrderLineItems(order) {
  if (order.lineItems?.length) {
    return order.lineItems.map((item) => normalizeLineItem(item, order));
  }
  return synthesizeLineItemsFromOrder(order);
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
  };
}

export function buildTrailAttachment(url, label = "Attachment") {
  if (!url) return undefined;
  return {
    url,
    label,
    type: url.startsWith("data:application/pdf") ? "pdf" : "image",
  };
}

export function allocationLabelForItem(item) {
  const qty = item.quantity ?? 1;
  const allocated = item.allocatedQty ?? 0;
  const status = migrateOrderStatus(item.status);
  if (resolveOrderKindForItem(item) !== "Pre-order") return "—";
  if (status === "Fulfilled") return `Full (${qty})`;
  if (status !== "Partially Fulfilled & Refunded") return "—";
  if (allocated === 0) return `0 / ${qty}`;
  if (allocated >= qty) return `Full (${qty})`;
  return `${allocated} / ${qty}`;
}

export function refundedAmountForLineItem(item, depositPercent = 30) {
  const qty = Math.max(1, item.quantity ?? 1);
  const fullLine = item.lineTotal ?? (item.price ?? 0) * qty;
  const isPreorder = resolveOrderKindForItem(item) === "Pre-order";
  const payment = migratePaymentStatus(item.payment);
  const status = migrateOrderStatus(item.status);
  const paidAmount = isPreorder
    ? (item.depositPaid ?? Math.round(fullLine * depositPercent / 100))
    : fullLine;

  if (status === "Refunded" || payment === "Refunded") {
    return paidAmount;
  }

  if (status === "Partially Fulfilled & Refunded") {
    const allocated = item.allocatedQty ?? 0;
    const unallocated = Math.max(0, qty - allocated);
    if (unallocated <= 0) return 0;
    if (isPreorder) {
      return Math.round((paidAmount / qty) * unallocated);
    }
    return Math.round((fullLine / qty) * unallocated);
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

  if (normalized === "Partially Fulfilled & Refunded") {
    if (allocated <= 0) {
      return {
        ok: false,
        message: "Enter allocated qty (minimum 1) for units being fulfilled.",
      };
    }
    if (allocated >= qty) {
      return {
        ok: false,
        message: `Full allocation (${qty}) should use Fulfilled status instead.`,
      };
    }
    return { ok: true };
  }

  if (normalized === "Fulfilled") {
    return { ok: true };
  }

  return { ok: true };
}

export function applyPaymentStatusToLineItem(item, payment, status, draftAllocatedQty = undefined) {
  const normalized = migrateOrderStatus(status);
  const qty = Math.max(1, item.quantity ?? 1);
  let allocatedQty = item.allocatedQty ?? 0;
  const isPreorder = resolveOrderKindForItem(item) === "Pre-order";

  if (isPreorder) {
    if (normalized === "Fulfilled") {
      allocatedQty = qty;
    } else if (normalized === "Partially Fulfilled & Refunded") {
      if (draftAllocatedQty != null) {
        allocatedQty = Math.max(0, Math.min(qty, draftAllocatedQty));
      }
    } else if (normalized === "Refunded") {
      allocatedQty = 0;
    }
  }

  let balanceDue = item.balanceDue;
  if (isPreorder && allocatedQty !== (item.allocatedQty ?? 0)) {
    balanceDue = balanceAfterAllocation(
      {
        type: "Pre-order",
        qty,
        total: item.depositPaid ?? item.lineTotal ?? item.price * qty,
        fullSubtotal: item.lineTotal ?? item.price * qty,
        balanceDue: item.balanceDue ?? 0,
        depositPercent: 30,
        payment,
        status: normalized,
      },
      allocatedQty,
    );
  }

  return { ...item, payment, status: normalized, allocatedQty, balanceDue };
}

export function inferLineItemAfterAllocation(item, allocatedQty) {
  const qty = Math.max(1, item.quantity ?? 1);
  const clamped = Math.max(0, Math.min(qty, allocatedQty));
  const currentStatus = migrateOrderStatus(item.status);
  const stubOrder = {
    type: resolveOrderKindForItem(item),
    qty,
    total: item.depositPaid ?? item.lineTotal ?? item.price * qty,
    fullSubtotal: item.lineTotal ?? item.price * qty,
    balanceDue: item.balanceDue ?? 0,
    depositPercent: 30,
    payment: item.payment,
    status: currentStatus,
  };
  const inferred = inferStatusesAfterAllocation(stubOrder, clamped);

  let status = inferred.status;
  let payment = inferred.payment;
  if (currentStatus === "Partially Fulfilled & Refunded" && clamped > 0 && clamped < qty) {
    status = "Partially Fulfilled & Refunded";
  }

  return {
    ...item,
    allocatedQty: clamped,
    payment,
    status,
    balanceDue: inferred.balanceDue,
  };
}

export function lineItemTrailLabel(item) {
  const qty = item.quantity ?? 1;
  return qty > 1 ? `${item.name} ×${qty}` : item.name;
}
