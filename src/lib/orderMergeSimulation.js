/**
 * Grid-level merge + allocation simulation.
 * Does not change order-detail / setPaymentAndStatus mechanics.
 *
 * Sample columns:
 *   qty × unit, DP, original balance, allocation %, raw, final units,
 *   new amount, FINAL PRICE (new − DP), conclusion (order status).
 *
 * Default final units: less than 1 raw unit → 0; otherwise round.
 * FINAL PRICE > 0 → balance due; < 0 → refund.
 */

import {
  ALLOCATION_FULFILLED_PAY_BALANCE,
  applyPaymentStatusToLineItem,
  getDepositPercent,
  getOrderLineItems,
  lineItemTrailLabel,
  migrateOrderStatus,
  migratePaymentStatus,
  orderStatusLabel,
  resolveOrderKindForItem,
  syncOrderRollup,
} from "../data/orderWorkflow.js";
import { lineItemAmount, lineItemDepositPaid, lineItemEffectiveUnitPrice } from "./orderRevenue.js";
import { roundMoney } from "./money.js";

const CLOSED_STATUSES = new Set(["Fulfilled", "Ready for Pickup", "Refunded", "Unpaid"]);
const CLOSED_PAYMENTS = new Set(["Pending Verification", "Unpaid", "Rejected", "Refunded"]);

export function productKeyForItem(item) {
  const id = String(item?.id || "").trim();
  if (id) return id;
  return String(item?.name || "item").trim().toLowerCase();
}

export function isMergeAllocatableLine(item) {
  if (resolveOrderKindForItem(item) !== "Pre-order") return false;
  const status = migrateOrderStatus(item.status);
  const payment = migratePaymentStatus(item.payment);
  if (CLOSED_STATUSES.has(status)) return false;
  if (CLOSED_PAYMENTS.has(payment)) return false;
  return true;
}

export function suggestedFinalAllocation(quantity, allocationPercent) {
  const qty = Math.max(0, Number(quantity) || 0);
  const pct = Math.max(0, Number(allocationPercent) || 0);
  const raw = qty * (pct / 100);
  if (raw < 1) return 0;
  return Math.max(0, Math.min(qty, Math.round(raw)));
}

export function rawAllocation(quantity, allocationPercent) {
  const qty = Math.max(0, Number(quantity) || 0);
  const pct = Math.max(0, Number(allocationPercent) || 0);
  return Math.round(qty * (pct / 100) * 10) / 10;
}

export function conclusionForAllocation({ quantity, allocatedQty, finalPrice }) {
  const qty = Math.max(0, Number(quantity) || 0);
  const allocated = Math.max(0, Math.min(qty, Number(allocatedQty) || 0));
  const price = Number(finalPrice) || 0;

  if (allocated <= 0) {
    return { payment: "For Full Refund", status: "For Full Refund" };
  }

  if (price < 0) {
    return {
      payment: "For Partial Refund",
      status: "Partially Fulfilled & For Refund",
    };
  }

  if (price === 0) {
    return { payment: "Fully Paid", status: "Ready for Pickup" };
  }

  if (allocated >= qty) {
    return {
      payment: "Awaiting Balance Payment",
      status: ALLOCATION_FULFILLED_PAY_BALANCE,
    };
  }

  return {
    payment: "Awaiting Balance Payment",
    status: "Partially Fulfilled & Pay Balance",
  };
}

export function totalsConclusion(finalPriceSum) {
  if (finalPriceSum > 0) return ALLOCATION_FULFILLED_PAY_BALANCE;
  if (finalPriceSum < 0) return "For Full Refund";
  return "Ready for Pickup";
}

export function buildMergeSourceRows(orders) {
  const rows = [];
  for (const order of orders || []) {
    for (const item of getOrderLineItems(order)) {
      if (!isMergeAllocatableLine(item)) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = lineItemEffectiveUnitPrice(item);
      const dpAmount = lineItemDepositPaid(item, getDepositPercent(order));
      const lineTotal = lineItemAmount(item);
      const existingAlloc = Math.max(0, Number(item.allocatedQty) || 0);
      const productKey = productKeyForItem(item);
      rows.push({
        key: `${order.id}::${item.id}`,
        orderId: order.id,
        customer: order.customer || "—",
        email: order.email || "",
        lineItemId: item.id,
        name: item.name || "Item",
        productKey,
        qty,
        unitPrice,
        dpAmount,
        balanceAmount: roundMoney(Math.max(0, lineTotal - dpAmount)),
        existingAlloc,
        defaultPercent: existingAlloc > 0
          ? Math.round((existingAlloc / qty) * 1000) / 10
          : 0,
      });
    }
  }
  return rows;
}

export function collectMergeProducts(sourceRows) {
  const map = new Map();
  for (const row of sourceRows) {
    const current = map.get(row.productKey) || {
      productKey: row.productKey,
      name: row.name,
      qty: 0,
      orders: new Set(),
      customers: new Set(),
      defaultPercent: 0,
    };
    current.qty += row.qty;
    current.orders.add(row.orderId);
    current.customers.add(row.email || row.customer);
    if (!current.defaultPercent && row.defaultPercent) {
      current.defaultPercent = row.defaultPercent;
    }
    map.set(row.productKey, current);
  }
  return [...map.values()].map((product) => ({
    productKey: product.productKey,
    name: product.name,
    qty: product.qty,
    orderCount: product.orders.size,
    customerCount: product.customers.size,
    defaultPercent: product.defaultPercent,
  }));
}

export function simulateMergeRows(sourceRows, { percentByProduct = {}, finalByRow = {} } = {}) {
  return sourceRows.map((row) => {
    const allocationPercent = Number.isFinite(Number(percentByProduct[row.productKey]))
      ? Math.max(0, Number(percentByProduct[row.productKey]))
      : row.defaultPercent;
    const raw = rawAllocation(row.qty, allocationPercent);
    const suggested = suggestedFinalAllocation(row.qty, allocationPercent);
    const override = finalByRow[row.key];
    const finalAllocation = override != null && override !== ""
      ? Math.max(0, Math.min(row.qty, Math.round(Number(override) || 0)))
      : suggested;
    const newAmount = roundMoney(finalAllocation * row.unitPrice);
    const finalPrice = roundMoney(newAmount - row.dpAmount);
    const conclusion = conclusionForAllocation({
      quantity: row.qty,
      allocatedQty: finalAllocation,
      finalPrice,
    });

    return {
      ...row,
      allocationPercent,
      rawAllocation: raw,
      suggestedFinal: suggested,
      finalAllocation,
      newAmount,
      finalPrice,
      payment: conclusion.payment,
      status: conclusion.status,
      conclusionLabel: orderStatusLabel(conclusion.status),
    };
  });
}

export function simulateMergeTotals(simulatedRows) {
  const newAmount = roundMoney(simulatedRows.reduce((sum, row) => sum + (row.newAmount || 0), 0));
  const finalPrice = roundMoney(simulatedRows.reduce((sum, row) => sum + (row.finalPrice || 0), 0));
  const dpAmount = roundMoney(simulatedRows.reduce((sum, row) => sum + (row.dpAmount || 0), 0));
  const status = totalsConclusion(finalPrice);
  return {
    newAmount,
    finalPrice,
    dpAmount,
    status,
    conclusionLabel: orderStatusLabel(status),
  };
}

export function applyMergeSimulationToOrder(order, simulatedRows) {
  const forOrder = (simulatedRows || []).filter((row) => row.orderId === order.id);
  if (!forOrder.length) return null;

  const byLine = new Map(forOrder.map((row) => [row.lineItemId, row]));
  const lineItems = getOrderLineItems(order).map((item) => {
    const sim = byLine.get(item.id);
    if (!sim) return item;
    return applyPaymentStatusToLineItem(
      item,
      sim.payment,
      sim.status,
      sim.finalAllocation,
    );
  });

  const at = new Date().toISOString();
  const trail = [
    ...(order.trail || []),
    ...forOrder.map((row, index) => ({
      id: `trail-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      at,
      title: `Grid allocation → ${row.finalAllocation}/${row.qty}`,
      status: row.status,
      payment: row.payment,
      lineItemId: row.lineItemId,
      lineItemName: lineItemTrailLabel({ ...row, quantity: row.qty, name: row.name }),
      note: `Merged allocation on the orders grid (${row.allocationPercent}% → ${row.finalAllocation} of ${row.qty}). Email not sent.`,
    })),
  ];

  return {
    lineItems,
    ...syncOrderRollup(lineItems),
    trail,
  };
}

export function describeMergeSelection(orders, sourceRows) {
  const customers = new Set(
    (orders || []).map((order) => String(order.email || order.customer || "").trim().toLowerCase())
      .filter(Boolean),
  );
  return {
    orderCount: orders?.length || 0,
    customerCount: customers.size,
    lineCount: sourceRows.length,
    productCount: collectMergeProducts(sourceRows).length,
  };
}
