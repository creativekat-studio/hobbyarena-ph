import * as XLSX from "xlsx";
import {
  ALLOCATION_FULFILLED_PAY_BALANCE,
  balanceAfterAllocation,
  getDepositPercent,
  getOrderLineItems,
  migrateOrderStatus,
  migratePaymentStatus,
  refundedAmountForLineItem,
  resolveOrderKindForItem,
} from "../data/orderWorkflow.js";

const DEFAULT_FILENAME = "hobbyarena-orders.xlsx";
const ALLOCATION_STATUSES = new Set([
  ALLOCATION_FULFILLED_PAY_BALANCE,
  "Partially Fulfilled & Pay Balance",
  "Partially Fulfilled & For Refund",
  "For Full Refund",
]);
const HEADER_FILLS = {
  blue: "DDEBF7",
  orange: "FCE4D6",
  green: "E2F0D9",
};

function numberOrBlank(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : "";
}

function formatOrderNumber(orderId) {
  const raw = String(orderId ?? "").trim();
  return /^\d{12}$/.test(raw) ? `HA-${raw}` : raw;
}

function digitsOnly(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || (value ?? "");
}

function formatDate(value) {
  if (!value) return "";
  const raw = String(value);
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return raw;
  return [
    String(parsed.getDate()).padStart(2, "0"),
    String(parsed.getMonth() + 1).padStart(2, "0"),
    parsed.getFullYear(),
  ].join("/");
}

function lineQuantity(item) {
  return Math.max(1, Number(item.quantity ?? item.qty ?? 1) || 1);
}

function lineTotal(item) {
  const qty = lineQuantity(item);
  return Number(item.lineTotal ?? (Number(item.price) || 0) * qty) || 0;
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

function lineDepositPaid(order, item, context) {
  const rawItem = rawLineItem(order, context.index);
  if (rawItem?.depositPaid != null || rawItem?.linePaid != null) {
    return numberOrBlank(item.depositPaid ?? item.linePaid);
  }
  if (item.depositPaid != null) return numberOrBlank(item.depositPaid);
  // Legacy/order-level amounts are split by line total so multi-item exports
  // still emit one row per item without duplicating the full order payment.
  return numberOrBlank(proratedOrderAmount(order.depositPaid ?? order.total, item, context.lineItems));
}

function initialBalanceAmount(order, item, context) {
  const depositPaid = Number(lineDepositPaid(order, item, context)) || 0;
  if (resolveOrderKindForItem(item) !== "Pre-order") return 0;
  return Math.max(0, lineTotal(item) - depositPaid);
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

function finalBalanceAmount(order, item) {
  if (!hasFinalAllocation(item)) return "";
  const allocated = Number(item.allocatedQty) || 0;
  return numberOrBlank(balanceAfterAllocation(item, allocated, getDepositPercent(order)));
}

function refundedAmount(order, item, context) {
  const rawItem = rawLineItem(order, context.index);
  if (rawItem?.refundAmount != null) return numberOrBlank(item.refundAmount);
  if (order.refundAmount != null) {
    return numberOrBlank(proratedOrderAmount(order.refundAmount, item, context.lineItems));
  }
  return numberOrBlank(refundedAmountForLineItem(item, getDepositPercent(order)));
}

function paymentStatus(item) {
  // Export labels intentionally mirror the workflow statuses used by admin:
  // DP Paid, Awaiting Balance Payment, For Partial Refund, Fully Paid, etc.
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
  { header: "Date", value: (order) => formatDate(order.date), width: 12 },
  { header: "Quantity", value: (_order, item) => numberOrBlank(item.quantity ?? 1), group: "blue", width: 10 },
  { header: "Amount", value: (_order, item) => numberOrBlank(item.price), group: "blue", width: 12 },
  { header: "DP Amount", value: lineDepositPaid, group: "blue", width: 14 },
  { header: "Balance Amount", value: initialBalanceAmount, group: "blue", width: 16 },
  { header: "Final Allocation", value: (_order, item) => finalAllocation(item), group: "orange", width: 16 },
  { header: "Final Balance", value: finalBalanceAmount, group: "orange", width: 14 },
  { header: "Refunded Amount", value: refundedAmount, group: "orange", width: 16 },
  { header: "Payment Status", value: (_order, item) => paymentStatus(item), group: "green", width: 24 },
  { header: "Order Status", value: (_order, item) => orderStatus(item), group: "green", width: 28 },
];

export function buildOrdersExcelRows(orders, columns = ORDER_EXCEL_COLUMNS) {
  return orders.flatMap((order) => {
    const lineItems = getOrderLineItems(order);
    return lineItems.map((item, index) => {
      const context = { index, lineItems };
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

export function exportOrdersToExcel(orders, { filename = DEFAULT_FILENAME, columns = ORDER_EXCEL_COLUMNS } = {}) {
  if (!orders?.length) return false;

  const exportRows = buildOrdersExcelRows(orders, columns);
  const worksheet = XLSX.utils.json_to_sheet(exportRows, {
    header: columns.map((column) => column.header),
  });
  applyWorksheetFormatting(worksheet, columns);
  applyTextColumnFormatting(worksheet, columns, "Order #");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  XLSX.writeFile(workbook, filename);
  return true;
}
