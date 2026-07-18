/**
 * Order-scoped overpayment credit (pure helpers — no store/workflow imports).
 *
 * Revenue stays on recorded amounts. Credit parks cash on the same order and
 * either reduces balance due or folds into the refund suggestion.
 */

export function lineOpenCredit(item) {
  return Math.max(0, Number(item?.creditAmount) || 0);
}

export function orderOpenCredit(order) {
  const items = Array.isArray(order?.lineItems) ? order.lineItems : [];
  if (items.length) {
    return items.reduce((sum, item) => sum + lineOpenCredit(item), 0);
  }
  return lineOpenCredit(order);
}

export function netBalanceDueAfterCredit(grossBalanceDue, creditAmount) {
  return Math.max(0, (Number(grossBalanceDue) || 0) - (Number(creditAmount) || 0));
}

export function statusClearsCredit(status, payment) {
  const s = String(status || "");
  const p = String(payment || "");
  return (
    s === "For Full Refund"
    || s === "Partially Fulfilled & For Refund"
    || s === "Refunded"
    || p === "For Full Refund"
    || p === "For Partial Refund"
    || p === "Refunded"
    || p === "Partially Refunded"
  );
}

export function shouldCaptureAmountReceived(nextPayment) {
  const payment = String(nextPayment || "");
  return payment === "DP Paid" || payment === "Fully Paid";
}

/**
 * @param {object} opts
 * @param {number} opts.depositDue - recorded deposit (not overpay)
 * @param {number} [opts.balanceDueNet] - what customer still owes (already net of credit)
 * @param {number} [opts.lineTotal] - in-stock full amount
 * @param {"Pre-order"|"In-stock"} [opts.kind]
 */
export function expectedAmountReceived(nextPayment, {
  depositDue = 0,
  balanceDueNet = 0,
  lineTotal = 0,
  kind = "Pre-order",
} = {}) {
  const payment = String(nextPayment || "");
  if (payment === "DP Paid") return Math.max(0, Number(depositDue) || 0);
  if (payment === "Fully Paid") {
    if (kind === "Pre-order") return Math.max(0, Number(balanceDueNet) || 0);
    return Math.max(0, Number(lineTotal) || 0);
  }
  return 0;
}

/**
 * Patch when admin records cash received on DP Paid / Fully Paid.
 * Exact Fully Paid consumes prior credit; only leftover overpay remains open.
 */
export function creditPatchForReceived(item, nextPayment, amountReceived, {
  depositDue = 0,
  balanceDueNet = 0,
  lineTotal = 0,
  kind = "Pre-order",
} = {}) {
  const payment = String(nextPayment || "");
  const received = Math.max(0, Number(amountReceived) || 0);
  const due = expectedAmountReceived(payment, { depositDue, balanceDueNet, lineTotal, kind });
  const overpay = Math.max(0, received - due);
  const prevCredit = lineOpenCredit(item);

  if (payment === "DP Paid") {
    return {
      depositReceived: received,
      creditAmount: prevCredit + overpay,
    };
  }

  if (payment === "Fully Paid") {
    return {
      balanceReceived: received,
      creditAmount: overpay,
    };
  }

  return {};
}
