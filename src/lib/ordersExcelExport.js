import * as XLSX from "xlsx";
import {
  ALLOCATION_FULFILLED_PAY_BALANCE,
  getDepositPercent,
  getOrderLineItems,
  migrateOrderStatus,
  migratePaymentStatus,
  refundedAmountForLineItem,
  resolveOrderKindForItem,
} from "../data/orderWorkflow.js";
import { lineOpenCredit } from "./orderCredit.js";
import {
  lineItemAmount,
  lineItemDepositPaid,
  lineItemEffectiveUnitPrice,
  lineItemFinalPrice,
  lineItemGrossRevenue,
  lineItemNetRevenue,
  lineItemUnitCost,
} from "./orderRevenue.js";
import { formatOrderTimestamp } from "./orderTimestamps.js";
import { MONEY_UI_DECIMALS, roundMoney } from "./money.js";

const DEFAULT_FILENAME = "hobbyarena-orders.xlsx";
const ALLOCATION_STATUSES = new Set([
  ALLOCATION_FULFILLED_PAY_BALANCE,
  "Partially Fulfilled & Pay Balance",
  "Partially Fulfilled & For Refund",
  "For Full Refund",
  "Fulfilled",
  "Ready for Pickup",
]);
const HEADER_FILLS = {
  blue: "DDEBF7",
  orange: "FCE4D6",
  green: "E2F0D9",
  purple: "E8E0F0",
};

function numberOrBlank(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : "";
}

function moneyOrBlank(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? roundMoney(numeric, MONEY_UI_DECIMALS) : "";
}

/** DP Net = (unit cost × quantity) × DP%. */
function dpNetAmount(order, item, context) {
  const qty = lineQuantity(item);
  const cost = lineItemUnitCost(item, context.costByProductId);
  const pct = (Number(item?.depositPercent) || getDepositPercent(order)) / 100;
  return moneyOrBlank(cost * qty * pct);
}

function formatOrderNumber(orderId) {
  const raw = String(orderId ?? "").trim();
  return /^\d{12}$/.test(raw) ? `HA-${raw}` : raw;
}

function digitsOnly(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || (value ?? "");
}

function lineQuantity(item) {
  return Math.max(1, Number(item.quantity ?? item.qty ?? 1) || 1);
}

/** Payable line total (honors per-item discount % / stored lineTotal). */
function lineTotal(item) {
  return lineItemAmount(item);
}

function orderLineSubtotal(lineItems) {
  return lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
}

function proratedOrderAmount(orderAmount, item, lineItems) {
  const amount = Number(orderAmount);
  if (!Number.isFinite(amount)) return "";
  const subtotal = orderLineSubtotal(lineItems);
  if (subtotal <= 0) return "";
  return (amount * lineTotal(item)) / subtotal;
}

function rawLineItem(order, index) {
  return Array.isArray(order.lineItems) ? order.lineItems[index] : null;
}

function lineDepositPaidExport(order, item, context) {
  const rawItem = rawLineItem(order, context.index);
  const depositPercent = getDepositPercent(order);
  if (rawItem?.depositPaid != null || rawItem?.linePaid != null) {
    return moneyOrBlank(item.depositPaid ?? item.linePaid);
  }
  if (item.depositPaid != null) return moneyOrBlank(item.depositPaid);
  const computed = lineItemDepositPaid(item, depositPercent);
  if (computed > 0) return moneyOrBlank(computed);
  // Legacy/order-level amounts are split by line total so multi-item exports
  // still emit one row per item without duplicating the full order payment.
  return moneyOrBlank(proratedOrderAmount(order.depositPaid ?? order.total, item, context.lineItems));
}

/** Original balance before allocation (ordered full − deposit). */
function initialBalanceAmount(order, item, context) {
  const depositPaid = Number(lineDepositPaidExport(order, item, context)) || 0;
  if (resolveOrderKindForItem(item) !== "Pre-order") return 0;
  return moneyOrBlank(Math.max(0, lineTotal(item) - depositPaid));
}

function hasFinalAllocation(item) {
  if (resolveOrderKindForItem(item) !== "Pre-order") return false;
  const status = migrateOrderStatus(item.status);
  const allocated = Number(item.allocatedQty) || 0;
  return allocated > 0 || ALLOCATION_STATUSES.has(status);
}

function finalAllocation(item) {
  return hasFinalAllocation(item) ? numberOrBlank(item.allocatedQty ?? 0) : "";
}

/** Allocated × unit price once stock is allocated; else blank for pre-order. */
function finalAmount(item) {
  if (resolveOrderKindForItem(item) === "Pre-order") {
    if (!hasFinalAllocation(item) || !(Number(item.allocatedQty) > 0)) return "";
    return moneyOrBlank(lineItemFinalPrice(item));
  }
  // In-stock: payable (discounted) line total once paid / completed.
  const payment = migratePaymentStatus(item.payment);
  const status = migrateOrderStatus(item.status);
  if (
    payment === "Fully Paid"
    || payment === "Partially Refunded"
    || status === "Fulfilled"
    || status === "Ready for Pickup"
  ) {
    return moneyOrBlank(lineItemAmount(item));
  }
  return "";
}

/**
 * Balance after allocation = final amount − deposit, then minus open order credit.
 * Historical formula (not the live outstanding field after Fully Paid).
 */
function finalBalanceAmount(order, item, context) {
  if (!hasFinalAllocation(item) || !(Number(item.allocatedQty) > 0)) return "";
  const final = lineItemFinalPrice(item);
  const deposit = Number(lineDepositPaidExport(order, item, context)) || 0;
  const credit = lineOpenCredit(item);
  return moneyOrBlank(Math.max(0, final - deposit - credit));
}

function orderCreditAmount(item) {
  const credit = lineOpenCredit(item);
  return credit > 0 ? moneyOrBlank(credit) : "";
}

function refundedAmount(order, item, context) {
  const depositPercent = getDepositPercent(order);
  const rawItem = rawLineItem(order, context.index);
  if (rawItem?.refundAmount != null) return moneyOrBlank(item.refundAmount);
  if (order.refundAmount != null && !(rawItem && "refundAmount" in (rawItem || {}))) {
    return moneyOrBlank(proratedOrderAmount(order.refundAmount, item, context.lineItems));
  }
  return moneyOrBlank(refundedAmountForLineItem(
    { ...item, refundAmount: undefined },
    depositPercent,
  ));
}

function unitCost(item, context) {
  return moneyOrBlank(lineItemUnitCost(item, context.costByProductId));
}

function grossRevenue(order, item, context) {
  return moneyOrBlank(lineItemGrossRevenue(item, getDepositPercent(order)));
}

function netIncome(order, item, context) {
  return moneyOrBlank(lineItemNetRevenue(item, getDepositPercent(order), context.costByProductId));
}

function paymentStatus(item) {
  return migratePaymentStatus(item.payment) || "";
}

function orderStatus(item) {
  return migrateOrderStatus(item.status) || "";
}

export const ORDER_EXCEL_COLUMNS = [
  { header: "Order #", value: (order) => formatOrderNumber(order.id), width: 16 },
  { header: "Name", value: (order) => order.customer ?? "", width: 24 },
  { header: "CP number", value: (order) => digitsOnly(order.phone), width: 16 },
  { header: "Item", value: (_order, item) => item.name ?? "", width: 32 },
  { header: "Date", value: (order) => formatOrderTimestamp(order), width: 20 },
  { header: "Quantity", value: (_order, item) => numberOrBlank(item.quantity ?? 1), group: "blue", width: 10 },
  { header: "Unit Price", value: (_order, item) => moneyOrBlank(lineItemEffectiveUnitPrice(item)), group: "blue", width: 12, money: true },
  { header: "Unit Cost", value: (_order, item, context) => unitCost(item, context), group: "blue", width: 12, money: true },
  { header: "DP Amount", value: lineDepositPaidExport, group: "blue", width: 14, money: true },
  { header: "DP Net", value: (order, item, context) => dpNetAmount(order, item, context), group: "blue", width: 12, money: true },
  { header: "Balance Amount", value: initialBalanceAmount, group: "blue", width: 16, money: true },
  { header: "Final Allocation", value: (_order, item) => finalAllocation(item), group: "orange", width: 16 },
  { header: "Final Amount", value: (_order, item) => finalAmount(item), group: "orange", width: 14, money: true },
  { header: "Order Credit", value: (_order, item) => orderCreditAmount(item), group: "orange", width: 14, money: true },
  { header: "Final Balance", value: finalBalanceAmount, group: "orange", width: 14, money: true },
  { header: "Refunded Amount", value: refundedAmount, group: "orange", width: 16, money: true },
  { header: "Gross", value: grossRevenue, group: "purple", width: 12, money: true },
  { header: "Net Income", value: netIncome, group: "purple", width: 12, money: true },
  { header: "Payment Status", value: (_order, item) => paymentStatus(item), group: "green", width: 24 },
  { header: "Order Status", value: (_order, item) => orderStatus(item), group: "green", width: 28 },
];

export function buildOrdersExcelRows(orders, columns = ORDER_EXCEL_COLUMNS, costByProductId = null) {
  return orders.flatMap((order) => {
    const lineItems = getOrderLineItems(order);
    return lineItems.map((item, index) => {
      const context = { index, lineItems, costByProductId };
      return Object.fromEntries(
        columns.map((column) => [column.header, column.value(order, item, context)]),
      );
    });
  });
}

function applyWorksheetFormatting(worksheet, columns) {
  worksheet["!cols"] = columns.map((column) => ({ wch: column.width ?? 14 }));
  columns.forEach((column, index) => {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: index })];
    if (!cell) return;
    const fillColor = HEADER_FILLS[column.group];
    cell.s = {
      font: { bold: true },
      alignment: { horizontal: "center" },
      ...(fillColor
        ? { fill: { patternType: "solid", fgColor: { rgb: fillColor } } }
        : {}),
    };
  });
}

function applyTextColumnFormatting(worksheet, columns, header) {
  const columnIndex = columns.findIndex((column) => column.header === header);
  if (columnIndex < 0 || !worksheet["!ref"]) return;

  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    const cell = worksheet[cellAddress];
    if (!cell) continue;

    cell.t = "s";
    cell.v = String(cell.v ?? "");
    cell.z = "@";
  }
}

function applyMoneyColumnFormatting(worksheet, columns) {
  if (!worksheet["!ref"]) return;
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  const moneyFormat = `0.${"0".repeat(MONEY_UI_DECIMALS)}`;
  columns.forEach((column, columnIndex) => {
    if (!column.money) return;
    for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex += 1) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = worksheet[cellAddress];
      if (!cell || cell.v === "" || cell.v == null) continue;
      const numeric = Number(cell.v);
      if (!Number.isFinite(numeric)) continue;
      cell.t = "n";
      cell.v = roundMoney(numeric, MONEY_UI_DECIMALS);
      cell.z = moneyFormat;
    }
  });
}

export function exportOrdersToExcel(
  orders,
  {
    filename = DEFAULT_FILENAME,
    columns = ORDER_EXCEL_COLUMNS,
    costByProductId = null,
  } = {},
) {
  if (!orders?.length) return false;

  const exportRows = buildOrdersExcelRows(orders, columns, costByProductId);
  const worksheet = XLSX.utils.json_to_sheet(exportRows, {
    header: columns.map((column) => column.header),
  });
  applyWorksheetFormatting(worksheet, columns);
  applyTextColumnFormatting(worksheet, columns, "Order #");
  applyMoneyColumnFormatting(worksheet, columns);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  XLSX.writeFile(workbook, filename);
  return true;
}
