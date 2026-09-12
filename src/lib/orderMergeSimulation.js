/**
 * Grid-level merge + allocation simulation.
 * Does not change order-detail / setPaymentAndStatus mechanics.
 *
 * Sample columns:
 *   qty × unit, DP, original balance, allocation %, raw, final units,
 *   new amount, FINAL PRICE (new − DP), conclusion (order status).
 *
 * Default New Qty is floor(product qty × allocation %). Two 10-qty lines at 8%
 * are 20 × 8% = 1.6 → 1, not 0.8→1 + 0.8→1. That 1 unit is then filled onto
 * the first order-number row for the SKU.
 * FINAL PRICE > 0 → balance due; < 0 → refund.
 */

import {
  ALLOCATION_FULFILLED_PAY_BALANCE,
  applyPaymentStatusToLineItem,
  getDepositPercent,
  getOrderLineItems,
  INSTOCK_ORDER_STATUSES,
  INSTOCK_ORDER_STATUSES_BY_PAYMENT,
  lineItemTrailLabel,
  migratePaymentStatus,
  optionsIncludingCurrent,
  ORDER_STATUSES_BY_PAYMENT,
  orderStatusLabel,
  PREORDER_ORDER_STATUSES,
  resolveOrderKindForItem,
  resolveOrderStatusForPayment,
  syncOrderRollup,
} from "../data/orderWorkflow.js";
import { compareOrdersByOrderNo } from "./orderIds.js";
import { lineItemAmount, lineItemDepositPaid, lineItemEffectiveUnitPrice } from "./orderRevenue.js";
import { roundMoney } from "./money.js";

export function productKeyForItem(item) {
  const id = String(item?.id || "").trim();
  if (id) return id;
  return String(item?.name || "item").trim().toLowerCase();
}

export function customerKeyForOrder(order) {
  const email = String(order?.email || "").trim().toLowerCase();
  if (email) return email;
  return String(order?.customer || "").trim().toLowerCase();
}

/** Any line status is eligible. The only merge block is mixed customers. */
export function evaluateMergeSelection(orders) {
  const list = (orders || []).filter(Boolean);
  const keys = [...new Set(list.map(customerKeyForOrder).filter(Boolean))];
  const mixedCustomers = keys.length > 1;
  const lineCount = buildMergeSourceRows(list).length;
  let blockReason = "";
  if (mixedCustomers) {
    blockReason = "Orders from different customers cannot be merged.";
  } else if (list.length < 2) {
    blockReason = "Select at least two orders from the same customer.";
  } else if (lineCount === 0) {
    blockReason = "Selected orders have no line items.";
  }
  return {
    mixedCustomers,
    sameCustomer: keys.length === 1,
    orderCount: list.length,
    customerCount: keys.length,
    lineCount,
    canMerge: !blockReason,
    blockReason,
  };
}

export function suggestedFinalAllocation(quantity, allocationPercent) {
  const qty = Math.max(0, Number(quantity) || 0);
  const pct = Math.max(0, Number(allocationPercent) || 0);
  const raw = qty * (pct / 100);
  return Math.max(0, Math.min(qty, Math.floor(raw + 1e-9)));
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
        tag: item.tag || "",
        productKey,
        qty,
        unitPrice,
        dpAmount,
        balanceAmount: roundMoney(Math.max(0, lineTotal - dpAmount)),
        existingAlloc,
        defaultPercent: 0,
        payment: item.payment || "",
        status: item.status || "",
      });
    }
  }
  return rows;
}

export function resolvePaymentForStatus(kind, status, currentPayment) {
  const map = kind === "Pre-order" ? ORDER_STATUSES_BY_PAYMENT : INSTOCK_ORDER_STATUSES_BY_PAYMENT;
  const current = migratePaymentStatus(currentPayment);
  if (map[current]?.includes(status)) return current;
  for (const [payment, statuses] of Object.entries(map)) {
    if (statuses.includes(status)) return payment;
  }
  return current;
}

export function statusOptionsForMergedLine(item) {
  const kind = resolveOrderKindForItem(item);
  const all = kind === "Pre-order" ? PREORDER_ORDER_STATUSES : INSTOCK_ORDER_STATUSES;
  return optionsIncludingCurrent(all, item?.status);
}

function distributeNewQty(lines, newQty) {
  let remaining = Math.max(0, Math.round(Number(newQty) || 0));
  return lines.map((line) => {
    const take = Math.min(line.qty, remaining);
    remaining -= take;
    return take;
  });
}

export function buildMergeWorkbook(orders, {
  percentByProduct = {},
  newQtyByProduct = {},
  finalByRow = {},
  statusByRow = {},
  paymentByRow = {},
} = {}) {
  const lines = buildMergeSourceRows(orders).sort((a, b) =>
    compareOrdersByOrderNo({ id: a.orderId }, { id: b.orderId }),
  );
  const products = collectMergeProducts(lines);

  const breakdown = products.map((product) => {
    const allocationPercent = Number.isFinite(Number(percentByProduct[product.productKey]))
      ? Math.max(0, Number(percentByProduct[product.productKey]))
      : product.defaultPercent;
    const suggested = suggestedFinalAllocation(product.qty, allocationPercent);
    const override = newQtyByProduct[product.productKey];
    const newQty = override != null && override !== ""
      ? Math.max(0, Math.min(product.qty, Math.round(Number(override) || 0)))
      : suggested;
    return {
      productKey: product.productKey,
      name: product.name,
      allocationPercent,
      totalQty: product.qty,
      newQty,
      qtyOverride: override != null && override !== "",
    };
  });

  const allocatedByKey = Object.fromEntries(
    breakdown.map((row) => [row.productKey, row.newQty]),
  );
  const allocatedByLine = {};
  for (const product of breakdown) {
    const productLines = lines.filter((line) => line.productKey === product.productKey);
    const distributed = distributeNewQty(productLines, product.newQty);
    productLines.forEach((line, index) => {
      allocatedByLine[line.key] = distributed[index];
    });
  }

  const orderDetails = lines.map((line) => {
    const product = breakdown.find((row) => row.productKey === line.productKey);
    const override = finalByRow[line.key];
    const finalAllocation = override != null && override !== ""
      ? Math.max(0, Math.min(line.qty, Math.round(Number(override) || 0)))
      : allocatedByLine[line.key] || 0;
    const newAmount = roundMoney(finalAllocation * line.unitPrice);
    const finalPrice = roundMoney(newAmount - line.dpAmount);
    const kind = line.tag === "Pre-order" ? "Pre-order" : "In-stock";
    const paymentOverride = paymentByRow[line.key];
    const statusOverride = statusByRow[line.key];
    const currentPayment = line.payment || "";
    const currentStatus = line.status || "";
    const payment = paymentOverride || (
      statusOverride
        ? resolvePaymentForStatus(kind, statusOverride, currentPayment)
        : currentPayment
    );
    const status = resolveOrderStatusForPayment(
      payment,
      statusOverride || currentStatus,
      kind,
    );
    return {
      ...line,
      allocationPercent: product?.allocationPercent || 0,
      rawAllocation: rawAllocation(line.qty, product?.allocationPercent || 0),
      finalAllocation,
      newAmount,
      finalPrice,
      payment,
      status,
      conclusionLabel: orderStatusLabel(status),
    };
  });

  const consolidated = breakdown.map((product) => {
    const productLines = orderDetails.filter((line) => line.productKey === product.productKey);
    const totalDp = roundMoney(productLines.reduce((sum, line) => sum + line.dpAmount, 0));
    const newAmount = roundMoney(productLines.reduce((sum, line) => sum + line.newAmount, 0));
    const newQty = productLines.reduce((sum, line) => sum + (line.finalAllocation || 0), 0);
    return {
      ...product,
      newQty,
      totalDp,
      newAmount,
      net: roundMoney(newAmount - totalDp),
    };
  });

  const totals = netSummary(
    roundMoney(consolidated.reduce((sum, row) => sum + row.totalDp, 0)),
    roundMoney(consolidated.reduce((sum, row) => sum + row.newAmount, 0)),
  );

  return {
    lines,
    breakdown,
    orderDetails,
    consolidated,
    allocatedByKey,
    totals,
  };
}

function netSummary(totalDp, newTotal) {
  const net = roundMoney(newTotal - totalDp);
  return {
    totalDp,
    newTotal,
    net,
    netLabel: net < 0 ? "Refund" : net > 0 ? "Balance due" : "Settled",
  };
}

export function allocationRecordFromWorkbook(workbook) {
  return Object.fromEntries(
    (workbook?.breakdown || []).map((row) => [
      row.productKey,
      {
        percent: row.allocationPercent,
        newQty: row.newQty,
      },
    ]),
  );
}

export function allocationMetaFromOrders(orders) {
  const meta = { percentByProduct: {}, newQtyByProduct: {} };
  for (const order of orders || []) {
    const stored = order.mergedAllocation && typeof order.mergedAllocation === "object"
      ? order.mergedAllocation
      : {};
    for (const [productKey, value] of Object.entries(stored)) {
      if (value?.percent != null && meta.percentByProduct[productKey] == null) {
        meta.percentByProduct[productKey] = Number(value.percent) || 0;
      }
      if (value?.newQty != null && meta.newQtyByProduct[productKey] == null) {
        meta.newQtyByProduct[productKey] = Number(value.newQty) || 0;
      }
    }
  }
  return meta;
}

export function buildLiveMergeWorkbook(orders) {
  const liveRows = [];
  for (const order of orders || []) {
    for (const item of getOrderLineItems(order)) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = lineItemEffectiveUnitPrice(item);
      const dpAmount = lineItemDepositPaid(item, getDepositPercent(order));
      const allocated = Math.max(0, Number(item.allocatedQty) || 0);
      const newAmount = roundMoney(allocated * unitPrice);
      liveRows.push({
        key: `${order.id}::${item.id}`,
        orderId: order.id,
        customer: order.customer || "—",
        lineItemId: item.id,
        name: item.name || "Item",
        productKey: productKeyForItem(item),
        qty,
        unitPrice,
        dpAmount,
        finalAllocation: allocated,
        newAmount,
        finalPrice: roundMoney(newAmount - dpAmount),
        payment: item.payment,
        status: item.status,
        conclusionLabel: orderStatusLabel(item.status),
        kind: resolveOrderKindForItem(item),
      });
    }
  }

  const meta = allocationMetaFromOrders(orders);
  const workbook = buildMergeWorkbook(orders, meta);
  const byKey = new Map(liveRows.map((row) => [row.key, row]));
  const liveConsolidated = workbook.consolidated.map((product) => {
    const productLines = liveRows.filter((line) => line.productKey === product.productKey);
    const newQty = productLines.reduce((sum, line) => sum + line.finalAllocation, 0);
    const newAmount = roundMoney(productLines.reduce((sum, line) => sum + line.newAmount, 0));
    const totalDp = roundMoney(productLines.reduce((sum, line) => sum + line.dpAmount, 0));
    return {
      ...product,
      newQty,
      newAmount,
      totalDp,
      net: roundMoney(newAmount - totalDp),
    };
  });

  return {
    ...workbook,
    orderDetails: workbook.orderDetails.map((row) => {
      const live = byKey.get(row.key);
      if (!live) return row;
      return {
        ...row,
        finalAllocation: live.finalAllocation,
        newAmount: live.newAmount,
        finalPrice: live.finalPrice,
        payment: live.payment,
        status: live.status,
        conclusionLabel: live.conclusionLabel,
        kind: live.kind,
      };
    }),
    consolidated: liveConsolidated,
    totals: netSummary(
      roundMoney(liveConsolidated.reduce((sum, row) => sum + row.totalDp, 0)),
      roundMoney(liveConsolidated.reduce((sum, row) => sum + row.newAmount, 0)),
    ),
  };
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

export function createMergedSetId() {
  return `merge-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function groupMergedOrderSets(orders) {
  const groups = new Map();
  for (const order of orders || []) {
    const setId = String(order?.mergedSetId || "").trim();
    if (!setId) continue;
    const current = groups.get(setId) || {
      id: setId,
      mergedAt: order.mergedAt || "",
      customer: order.customer || "—",
      orders: [],
    };
    current.orders.push(order);
    if (!current.customer && order.customer) current.customer = order.customer;
    if (order.mergedAt && (!current.mergedAt || order.mergedAt > current.mergedAt)) {
      current.mergedAt = order.mergedAt;
    }
    groups.set(setId, current);
  }
  return [...groups.values()].sort((a, b) => String(b.mergedAt).localeCompare(String(a.mergedAt)));
}

export function buildLiveMergeRows(orders) {
  const sourceRows = buildMergeSourceRows(orders);
  const byOrder = new Map((orders || []).map((order) => [order.id, order]));
  return sourceRows
    .slice()
    .sort((a, b) => compareOrdersByOrderNo({ id: a.orderId }, { id: b.orderId }))
    .map((row) => {
    const item = getOrderLineItems(byOrder.get(row.orderId) || {}).find((line) => line.id === row.lineItemId);
    const finalAllocation = Math.max(0, Number(item?.allocatedQty) || 0);
    const newAmount = roundMoney(finalAllocation * row.unitPrice);
    const finalPrice = roundMoney(newAmount - row.dpAmount);
    const status = item?.status || "";
    const payment = item?.payment || "";
    return {
      ...row,
      allocationPercent: row.qty ? Math.round((finalAllocation / row.qty) * 1000) / 10 : 0,
      rawAllocation: finalAllocation,
      suggestedFinal: finalAllocation,
      finalAllocation,
      newAmount,
      finalPrice,
      payment,
      status,
      conclusionLabel: orderStatusLabel(status),
    };
  });
}

export function applyMergeSimulationToOrder(order, simulatedRows, { mergedSetId, mergedAllocation } = {}) {
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
    ...(mergedSetId ? { mergedSetId, mergedAt: at } : {}),
    ...(mergedAllocation ? { mergedAllocation } : {}),
  };
}

export function applyMergedLineStatus(order, lineItemId, status, paymentOverride) {
  const current = getOrderLineItems(order).find((item) => item.id === lineItemId);
  if (!current) return null;

  const kind = resolveOrderKindForItem(current);
  const payment = paymentOverride || resolvePaymentForStatus(kind, status, current.payment);
  const nextStatus = resolveOrderStatusForPayment(payment, status || current.status, kind);
  const lineItems = getOrderLineItems(order).map((item) => {
    if (item.id !== lineItemId) return item;
    return applyPaymentStatusToLineItem(item, payment, nextStatus, item.allocatedQty);
  });

  const at = new Date().toISOString();
  return {
    lineItems,
    ...syncOrderRollup(lineItems),
    trail: [
      ...(order.trail || []),
      {
        id: `trail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at,
        title: `Merged status → ${orderStatusLabel(nextStatus)}`,
        status: nextStatus,
        payment,
        lineItemId,
        lineItemName: lineItemTrailLabel(current),
        note: "Status updated from the merged orders view. Email not sent.",
      },
    ],
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
