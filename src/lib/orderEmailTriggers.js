import {
  migrateOrderStatus,
  migratePaymentStatus,
  ALLOCATION_FULFILLED_PAY_BALANCE,
} from "../data/orderWorkflow.js";

function isPreorderContext(ctx) {
  return ctx?.kind === "Pre-order" || ctx?.tag === "Pre-order";
}

function normalizeTransition(prev, next) {
  return {
    prevPayment: migratePaymentStatus(prev?.payment),
    prevStatus: migrateOrderStatus(prev?.status),
    nextPayment: migratePaymentStatus(next?.payment),
    nextStatus: migrateOrderStatus(next?.status),
    isPreorder: isPreorderContext(next) || isPreorderContext(prev),
    allocatedQty: next?.allocatedQty ?? 0,
    qty: Math.max(1, next?.qty ?? 1),
  };
}

function statusChanged(prev, next) {
  return migrateOrderStatus(prev?.status) !== migrateOrderStatus(next?.status);
}

function paymentChanged(prev, next) {
  return migratePaymentStatus(prev?.payment) !== migratePaymentStatus(next?.payment);
}

function transitionChanged(prev, next) {
  return statusChanged(prev, next) || paymentChanged(prev, next);
}

/** Maps a line-item payment/status change to a customer email type. */
export function resolveOrderStatusEmailType(prev, next) {
  if (!transitionChanged(prev, next)) return null;

  const {
    prevPayment,
    prevStatus,
    nextPayment,
    nextStatus,
    isPreorder,
  } = normalizeTransition(prev, next);

  // Payment marked unpaid (stock hold released) — applies to any order kind.
  if (nextPayment === "Unpaid" && prevPayment !== "Unpaid" && paymentChanged(prev, next)) {
    return "payment_not_received";
  }

  if (!isPreorder) {
    if (
      nextPayment === "Fully Paid"
      && nextStatus === "Awaiting Stock"
      && !(prevPayment === "Fully Paid" && prevStatus === "Awaiting Stock")
    ) {
      return "deposit_received";
    }
    if (nextStatus === "Ready for Pickup" && statusChanged(prev, next)) {
      return "ready_for_pickup";
    }
    if (nextStatus === "Fulfilled" && statusChanged(prev, next)) {
      return "order_fulfilled";
    }
    return null;
  }

  // Pre-order: deposit verified → awaiting stock (payment + status can change independently)
  if (
    nextPayment === "DP Paid"
    && nextStatus === "Awaiting Stock"
    && !(prevPayment === "DP Paid" && prevStatus === "Awaiting Stock")
  ) {
    return "deposit_received";
  }

  // Case 1: 100% allocation → pay remaining balance (status-driven)
  if (
    nextStatus === ALLOCATION_FULFILLED_PAY_BALANCE
    && statusChanged(prev, next)
  ) {
    return "balance_due_full";
  }

  // Case 2: partial allocation → pay balance
  if (
    nextStatus === "Partially Fulfilled & Pay Balance"
    && statusChanged(prev, next)
  ) {
    return "balance_due_partial";
  }

  // Case 3: partial allocation → refund pending
  if (nextStatus === "Partially Fulfilled & For Refund" && statusChanged(prev, next)) {
    return "partial_refund_pending";
  }

  // Case 4: no allocation → full refund pending
  if (nextStatus === "For Full Refund" && statusChanged(prev, next)) {
    return "full_refund_pending";
  }

  // Case 3: partial refund sent → ready for pickup
  if (
    nextStatus === "Ready for Pickup"
    && nextPayment === "Partially Refunded"
    && paymentChanged(prev, next)
  ) {
    return "partial_refund_sent";
  }

  // Cases 1 & 2: ready for pickup (status-driven)
  if (nextStatus === "Ready for Pickup" && statusChanged(prev, next)) {
    return "ready_for_pickup";
  }

  // Picked up / fulfilled
  if (nextStatus === "Fulfilled" && statusChanged(prev, next)) {
    return "order_fulfilled";
  }

  // Case 4: full refund completed
  if (
    nextPayment === "Refunded"
    && nextStatus === "Refunded"
    && (paymentChanged(prev, next) || statusChanged(prev, next))
  ) {
    return "full_refund_sent";
  }

  return null;
}

export function buildLineItemEmailContext(item) {
  if (!item) return null;
  return {
    payment: item.payment,
    status: item.status,
    kind: item.tag === "Pre-order" ? "Pre-order" : "In-stock",
    tag: item.tag,
    allocatedQty: item.allocatedQty ?? 0,
    qty: item.quantity ?? 1,
  };
}

export const ORDER_STATUS_EMAIL_LABELS = {
  deposit_received: "Deposit received",
  balance_due_full: "Balance due (full allocation)",
  balance_due_partial: "Balance due (partial allocation)",
  partial_refund_pending: "Partial refund pending",
  full_refund_pending: "Full refund pending",
  partial_refund_sent: "Partial refund sent",
  ready_for_pickup: "Ready for pickup",
  order_fulfilled: "Order fulfilled",
  full_refund_sent: "Full refund sent",
  payment_not_received: "Payment not received (stock released)",
};
