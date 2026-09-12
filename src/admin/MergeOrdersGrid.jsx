import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import {
  PAYMENT_COLOR,
  STATUS_COLOR,
  getOrderLineItems,
  getOrderStatusOptionsForPayment,
  getPaymentOptionsForKind,
  optionsIncludingCurrent,
  orderStatusLabel,
  resolveOrderKindForItem,
  resolveOrderStatusForPayment,
} from "../data/orderWorkflow.js";
import {
  allocationRecordFromWorkbook,
  applyMergeSimulationToOrder,
  applyMergedLineStatus,
  buildLiveMergeWorkbook,
  buildMergeWorkbook,
  createMergedSetId,
  describeMergeSelection,
  evaluateMergeSelection,
  groupMergedOrderSets,
  buildMergeSourceRows,
} from "../lib/orderMergeSimulation.js";
import { isArchivedOrder } from "../lib/ordersStore.jsx";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";

const cellSx = {
  border: "1px solid",
  px: 1.25,
  py: 1,
  fontSize: "0.8rem",
  verticalAlign: "middle",
};

function moneyColor(value) {
  if (value > 0) return "success.main";
  if (value < 0) return "error.main";
  return "text.primary";
}

const STATUS_NOT_MOVED_MESSAGE = "1 or more order status has not moved. Please update first.";

function mergeStatusesNeedUpdate(orderDetails, sourceRows) {
  const original = new Map((sourceRows || []).map((row) => [row.key, row.status || ""]));
  return (orderDetails || []).some((row) => (row.status || "") === (original.get(row.key) || ""));
}

function CompactField({ value, onChange, sx, ...props }) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      sx={{
        minWidth: 0,
        maxWidth: 110,
        "& input[type=number]": { MozAppearance: "textfield" },
        "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": {
          WebkitAppearance: "none",
          margin: 0,
        },
        "& .MuiInputBase-input": {
          fontFamily: MONO_FONT,
          fontSize: "0.78rem",
          py: 0.55,
          px: 0.85,
        },
        ...sx,
      }}
      {...props}
    />
  );
}

const chipSelectSx = {
  minWidth: 0,
  width: "100%",
  "& .MuiSelect-select": { py: 0.4, pr: "28px !important" },
};

function LinePaymentSelect({ item, value, onChange }) {
  const kind = resolveOrderKindForItem(item);
  const options = optionsIncludingCurrent(getPaymentOptionsForKind(kind), value);
  return (
    <Select
      size="small"
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      renderValue={(payment) => (
        <Chip
          label={payment}
          color={PAYMENT_COLOR[payment] || "default"}
          variant="outlined"
          sx={{ ...ADMIN_STATUS_CHIP_SX, height: 26, fontSize: "0.68rem" }}
        />
      )}
      sx={chipSelectSx}
    >
      {options.map((payment) => (
        <MenuItem key={payment} value={payment}>{payment}</MenuItem>
      ))}
    </Select>
  );
}

function LineStatusSelect({ item, payment, value, onChange }) {
  const kind = resolveOrderKindForItem(item);
  const options = optionsIncludingCurrent(
    getOrderStatusOptionsForPayment(payment || item?.payment, kind),
    value,
  );
  return (
    <Select
      size="small"
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      renderValue={(status) => (
        <Chip
          label={orderStatusLabel(status)}
          color={STATUS_COLOR[status] || "default"}
          variant="outlined"
          sx={{ ...ADMIN_STATUS_CHIP_SX, height: 26, fontSize: "0.68rem" }}
        />
      )}
      sx={chipSelectSx}
    >
      {options.map((status) => (
        <MenuItem key={status} value={status}>
          {orderStatusLabel(status)}
        </MenuItem>
      ))}
    </Select>
  );
}

function ReportTable({ columns, rows, footerRows = [], minWidth = 520, tableLayout = "fixed" }) {
  const theme = useTheme();
  return (
    <Box sx={{ overflowX: "auto", border: "1px solid", borderColor: "divider" }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          minWidth,
          borderCollapse: "collapse",
          tableLayout,
        }}
      >
        <Box component="thead">
          <Box component="tr">
            {columns.map((column) => (
              <Box
                component="th"
                key={column.key}
                sx={{
                  ...cellSx,
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.text.primary, 0.03),
                  textAlign: column.align || "left",
                  width: column.width,
                  fontFamily: MONO_FONT,
                  fontSize: "0.68rem",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "text.secondary",
                }}
              >
                {column.label}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {rows.map((row) => (
            <Box component="tr" key={row.key}>
              {columns.map((column) => (
                <Box
                  component="td"
                  key={`${row.key}-${column.key}`}
                  sx={{
                    ...cellSx,
                    borderColor: "divider",
                    textAlign: column.align || "left",
                    fontWeight: column.key === "product" ? 600 : 500,
                  }}
                >
                  {row.cells[column.key]}
                </Box>
              ))}
            </Box>
          ))}
          {footerRows.map((row) => {
            const footerBg = alpha(theme.palette.primary.main, row.emphasis ? 0.08 : 0.03);
            if (row.cells) {
              return (
                <Box component="tr" key={row.key}>
                  {columns.map((column) => (
                    <Box
                      component="td"
                      key={`${row.key}-${column.key}`}
                      sx={{
                        ...cellSx,
                        borderColor: "divider",
                        textAlign: column.align || "right",
                        fontFamily: MONO_FONT,
                        fontWeight: 800,
                        bgcolor: footerBg,
                      }}
                    >
                      {row.cells[column.key]}
                    </Box>
                  ))}
                </Box>
              );
            }
            const valueKey = row.valueKey || columns[columns.length - 1].key;
            const valueIndex = Math.max(0, columns.findIndex((column) => column.key === valueKey));
            return (
              <Box component="tr" key={row.key}>
                <Box
                  component="td"
                  colSpan={Math.max(1, valueIndex)}
                  sx={{
                    ...cellSx,
                    borderColor: "divider",
                    textAlign: "right",
                    fontWeight: 800,
                    bgcolor: footerBg,
                  }}
                >
                  {row.label}
                </Box>
                <Box
                  component="td"
                  sx={{
                    ...cellSx,
                    borderColor: "divider",
                    textAlign: "right",
                    fontFamily: MONO_FONT,
                    fontWeight: 800,
                    color: row.color || "text.primary",
                    bgcolor: footerBg,
                  }}
                >
                  {row.value}
                </Box>
                {columns.slice(valueIndex + 1).map((column) => (
                  <Box
                    component="td"
                    key={`${row.key}-${column.key}`}
                    sx={{ ...cellSx, borderColor: "divider", bgcolor: footerBg }}
                  />
                ))}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography sx={{ fontWeight: 800, fontSize: "0.88rem" }}>
      {children}
    </Typography>
  );
}

const ORDER_DETAIL_COLUMNS = [
  { key: "product", label: "Product" },
  { key: "qty", label: "Qty", align: "center" },
  { key: "unit", label: "Unit Price", align: "right" },
  { key: "dp", label: "Downpayment", align: "right" },
  { key: "balance", label: "Balance", align: "right" },
  { key: "payment", label: "Payment" },
  { key: "status", label: "Order status" },
];

function groupOrderDetails(orderDetails) {
  const groups = [];
  const indexByOrder = new Map();
  for (const row of orderDetails || []) {
    const existing = indexByOrder.get(row.orderId);
    if (existing == null) {
      indexByOrder.set(row.orderId, groups.length);
      groups.push({ orderId: row.orderId, lines: [row] });
    } else {
      groups[existing].lines.push(row);
    }
  }
  return groups;
}

function OrderDetailsTable({
  workbook,
  byOrder,
  onPaymentChange,
  onStatusChange,
}) {
  const theme = useTheme();
  const groups = useMemo(() => groupOrderDetails(workbook.orderDetails), [workbook.orderDetails]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const canEditPair = Boolean(onPaymentChange || onStatusChange);
  const totalBalance = (workbook.orderDetails || []).reduce(
    (sum, row) => sum + (Number(row.balanceAmount) || 0),
    0,
  );

  function toggleOrder(orderId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  const headerBg = theme.palette.background.paper;
  const footerBg = theme.palette.mode === "dark"
    ? alpha(theme.palette.primary.main, 0.16)
    : alpha(theme.palette.primary.main, 0.08);

  return (
    <Box sx={{ overflow: "auto", maxHeight: 360, border: "1px solid", borderColor: "divider" }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          minWidth: 860,
          borderCollapse: "collapse",
          tableLayout: "auto",
        }}
      >
        <Box component="thead">
          <Box component="tr">
            {ORDER_DETAIL_COLUMNS.map((column) => (
              <Box
                component="th"
                key={column.key}
                sx={{
                  ...cellSx,
                  borderColor: "divider",
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  bgcolor: headerBg,
                  textAlign: column.align || "left",
                  fontFamily: MONO_FONT,
                  fontSize: "0.68rem",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "text.secondary",
                }}
              >
                {column.label}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {groups.map((group) => {
            const open = !collapsed.has(group.orderId);
            const qty = group.lines.reduce((sum, line) => sum + (line.qty || 0), 0);
            return (
              <Fragment key={group.orderId}>
                <Box
                  component="tr"
                  onClick={() => toggleOrder(group.orderId)}
                  sx={{
                    cursor: "pointer",
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                  }}
                >
                  <Box component="td" colSpan={ORDER_DETAIL_COLUMNS.length} sx={{ ...cellSx, borderColor: "divider", py: 0.85 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconButton
                        size="small"
                        aria-label={open ? `Collapse ${group.orderId}` : `Expand ${group.orderId}`}
                        sx={{
                          p: 0.25,
                          transform: open ? "rotate(90deg)" : "none",
                          transition: "transform 0.2s ease",
                          color: "text.secondary",
                        }}
                      >
                        ▸
                      </IconButton>
                      <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.82rem" }}>
                        {group.orderId}
                      </Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                        {group.lines.length} item{group.lines.length === 1 ? "" : "s"} · {qty} qty
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
                {open
                  ? group.lines.map((row) => {
                      const order = byOrder.get(row.orderId);
                      const item = getOrderLineItems(order || {}).find((line) => line.id === row.lineItemId);
                      const statusItem = item
                        ? { ...item, status: row.status, payment: row.payment }
                        : { status: row.status, payment: row.payment, tag: row.tag };
                      const cells = {
                        product: (
                          <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", pl: 3.5 }}>
                            {row.name}
                          </Typography>
                        ),
                        qty: (
                          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem", textAlign: "center" }}>
                            {row.qty}
                          </Typography>
                        ),
                        unit: (
                          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem", textAlign: "right", whiteSpace: "nowrap" }}>
                            {PESO.format(row.unitPrice || 0)}
                          </Typography>
                        ),
                        dp: (
                          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem", textAlign: "right", whiteSpace: "nowrap" }}>
                            {PESO.format(row.dpAmount)}
                          </Typography>
                        ),
                        balance: (
                          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem", textAlign: "right", whiteSpace: "nowrap" }}>
                            {PESO.format(row.balanceAmount || 0)}
                          </Typography>
                        ),
                        payment: canEditPair ? (
                          <LinePaymentSelect
                            item={statusItem}
                            value={row.payment}
                            onChange={(payment) => onPaymentChange?.(row, payment)}
                          />
                        ) : (
                          <Chip
                            label={row.payment}
                            color={PAYMENT_COLOR[row.payment] || "default"}
                            variant="outlined"
                            sx={{ ...ADMIN_STATUS_CHIP_SX, height: 26, fontSize: "0.68rem" }}
                          />
                        ),
                        status: canEditPair ? (
                          <LineStatusSelect
                            item={statusItem}
                            payment={row.payment}
                            value={row.status}
                            onChange={(status) => onStatusChange?.(row, status)}
                          />
                        ) : (
                          <Chip
                            label={row.conclusionLabel}
                            color={STATUS_COLOR[row.status] || "default"}
                            variant="outlined"
                            sx={{ ...ADMIN_STATUS_CHIP_SX, height: 26, fontSize: "0.68rem" }}
                          />
                        ),
                      };
                      return (
                        <Box component="tr" key={row.key}>
                          {ORDER_DETAIL_COLUMNS.map((column) => (
                            <Box
                              component="td"
                              key={`${row.key}-${column.key}`}
                              sx={{
                                ...cellSx,
                                borderColor: "divider",
                                textAlign: column.align || "left",
                              }}
                            >
                              {cells[column.key]}
                            </Box>
                          ))}
                        </Box>
                      );
                    })
                  : null}
              </Fragment>
            );
          })}
          <Box component="tr">
            {ORDER_DETAIL_COLUMNS.map((column) => {
              const value = {
                unit: "Total",
                dp: PESO.format(workbook.totals?.totalDp || 0),
                balance: PESO.format(totalBalance),
              }[column.key];
              return (
                <Box
                  component="td"
                  key={`total-${column.key}`}
                  sx={{
                    ...cellSx,
                    borderColor: "divider",
                    position: "sticky",
                    bottom: 0,
                    zIndex: 2,
                    textAlign: column.align || "right",
                    fontFamily: MONO_FONT,
                    fontWeight: 800,
                    bgcolor: footerBg,
                  }}
                >
                  {value}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function MergeWorkbookView({
  workbook,
  orders,
  editable = false,
  percentByProduct = {},
  newQtyByProduct = {},
  onPercentChange,
  onNewQtyChange,
  onPaymentChange,
  onStatusChange,
  statusWarning = false,
}) {
  const theme = useTheme();
  const byOrder = useMemo(
    () => new Map((orders || []).map((order) => [order.id, order])),
    [orders],
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <SectionTitle>Order Details:</SectionTitle>
        <Box sx={{ mt: 1 }}>
          <OrderDetailsTable
            workbook={workbook}
            byOrder={byOrder}
            onPaymentChange={onPaymentChange}
            onStatusChange={onStatusChange}
          />
        </Box>
      </Box>

      <Box>
        <SectionTitle>Consolidated Items:</SectionTitle>
        <Box sx={{ mt: 1 }}>
          <ReportTable
            minWidth={760}
            columns={[
              { key: "product", label: "Product" },
              { key: "qty", label: "Total Qty", align: "center", width: "10%" },
              { key: "dp", label: "Total Downpayment", align: "right", width: "16%" },
              { key: "percent", label: "Alloc %", align: "center", width: "14%" },
              { key: "newQty", label: "New Qty", align: "center", width: "12%" },
              { key: "newAmount", label: "New Total Amount", align: "right", width: "16%" },
            ]}
            rows={(workbook.consolidated || []).map((row) => ({
              key: row.productKey,
              cells: {
                product: row.name,
                qty: (
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem", textAlign: "center" }}>
                    {row.totalQty}
                  </Typography>
                ),
                dp: (
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem", textAlign: "right" }}>
                    {PESO.format(row.totalDp)}
                  </Typography>
                ),
                percent: editable ? (
                  <CompactField
                    type="text"
                    inputMode="decimal"
                    value={percentByProduct[row.productKey] ?? ""}
                    onChange={(value) => onPercentChange?.(row.productKey, value)}
                    inputProps={{ "aria-label": `Allocation percent for ${row.name}` }}
                    placeholder="0"
                    InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    sx={{ maxWidth: 96, mx: "auto" }}
                  />
                ) : (
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem", textAlign: "center" }}>
                    {Number(row.allocationPercent || 0).toFixed(2)}%
                  </Typography>
                ),
                newQty: editable ? (
                  <CompactField
                    type="text"
                    inputMode="numeric"
                    value={newQtyByProduct[row.productKey] ?? String(row.newQty || 0)}
                    onChange={(value) => {
                      if (value !== "" && !/^\d+$/.test(value)) return;
                      onNewQtyChange?.(row.productKey, value === "" ? "" : String(Number(value)));
                    }}
                    inputProps={{ "aria-label": `New quantity for ${row.name}` }}
                    sx={{
                      maxWidth: 56,
                      mx: "auto",
                      "& .MuiOutlinedInput-root": {
                        bgcolor: alpha(theme.palette.warning.main, 0.16),
                      },
                    }}
                  />
                ) : (
                  <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.8rem", textAlign: "center" }}>
                    {row.newQty}
                  </Typography>
                ),
                newAmount: (
                  <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.8rem", textAlign: "right" }}>
                    {PESO.format(row.newAmount)}
                  </Typography>
                ),
              },
            }))}
            footerRows={[
              {
                key: "new-total",
                label: "New Total:",
                value: PESO.format(workbook.totals?.newTotal || 0),
              },
              {
                key: "total-dp",
                label: "Total Downpayment:",
                value: PESO.format(workbook.totals?.totalDp || 0),
              },
              {
                key: "net",
                label: `${workbook.totals?.netLabel || "Settled"}:`,
                value: PESO.format(Math.abs(workbook.totals?.net || 0)),
                color: moneyColor(workbook.totals?.net || 0),
                emphasis: true,
              },
            ]}
          />
          {editable && onStatusChange && statusWarning ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {STATUS_NOT_MOVED_MESSAGE}
            </Alert>
          ) : null}
        </Box>
      </Box>
    </Stack>
  );
}

async function sendMergedOrderEmails(orders, sendConsolidatedAllocationEmail) {
  if (!sendConsolidatedAllocationEmail) return;
  await sendConsolidatedAllocationEmail(orders);
}

function customerContactFromOrders(orders) {
  const list = orders || [];
  return {
    customer: list.find((order) => order?.customer)?.customer || "Customer",
    email: list.find((order) => order?.email)?.email || "",
    phone: list.find((order) => order?.phone)?.phone || "",
  };
}

function countMergedEmailsSent(orders) {
  const keys = new Set();
  for (const order of orders || []) {
    const since = order.mergedAt || "";
    for (const entry of order.trail || []) {
      if (entry.emailStatus !== "sent") continue;
      if (since && entry.at && entry.at < since) continue;
      keys.add(`${entry.at || ""}|${entry.emailType || ""}|${entry.emailTo || ""}`);
    }
  }
  return keys.size;
}

function totalItemQty(rows) {
  return (rows || []).reduce((sum, row) => sum + (Number(row.qty) || 0), 0);
}

function ConsolidateHeader({ customer, email, itemCount, qty, sentCount, titleAs = "div" }) {
  const sent = sentCount > 0;
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="flex-start"
      justifyContent="space-between"
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography component={titleAs} sx={{ fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.3 }}>
          Consolidated Order for {customer}
        </Typography>
        {email ? (
          <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", fontFamily: MONO_FONT, mt: 0.6 }}>
            {email}
          </Typography>
        ) : null}
        <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", fontWeight: 500, mt: 0.25 }}>
          {itemCount} item{itemCount === 1 ? "" : "s"} · {qty} qty
        </Typography>
      </Box>
      <Chip
        label={sent
          ? `Email sent (${sentCount} ${sentCount === 1 ? "time" : "times"})`
          : "Pending email"}
        color={sent ? "success" : "warning"}
        sx={{
          ...ADMIN_STATUS_CHIP_SX,
          fontWeight: 800,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      />
    </Stack>
  );
}

export function MergeSimulateDialog({
  open,
  orders,
  updateOrder,
  sendConsolidatedAllocationEmail,
  surfaceBorderColor,
  onClose,
  onApplied,
}) {
  const mergeGate = useMemo(() => evaluateMergeSelection(orders), [orders]);
  const sourceRows = useMemo(() => buildMergeSourceRows(orders), [orders]);
  const summary = useMemo(
    () => describeMergeSelection(orders, sourceRows),
    [orders, sourceRows],
  );
  const { customer, email } = customerContactFromOrders(orders);

  const [percentByProduct, setPercentByProduct] = useState({});
  const [newQtyByProduct, setNewQtyByProduct] = useState({});
  const [statusByRow, setStatusByRow] = useState({});
  const [paymentByRow, setPaymentByRow] = useState({});
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const selectionKey = sourceRows.map((row) => row.key).join("|");
  const applyLabel = `Apply to order${summary.orderCount === 1 ? "" : "s"} (${summary.orderCount})`;

  useEffect(() => {
    if (!open) return;
    setPercentByProduct({});
    setNewQtyByProduct({});
    setStatusByRow({});
    setPaymentByRow({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectionKey]);

  const workbook = useMemo(
    () => buildMergeWorkbook(orders, { percentByProduct, newQtyByProduct, statusByRow, paymentByRow }),
    [orders, percentByProduct, newQtyByProduct, statusByRow, paymentByRow],
  );
  const statusesNeedUpdate = useMemo(
    () => mergeStatusesNeedUpdate(workbook.orderDetails, sourceRows),
    [workbook.orderDetails, sourceRows],
  );

  function setProductPercent(productKey, value) {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setPercentByProduct((prev) => ({ ...prev, [productKey]: value }));
    setNewQtyByProduct((prev) => {
      const next = { ...prev };
      delete next[productKey];
      return next;
    });
  }

  function writeSimulation() {
    const mergedSetId = createMergedSetId();
    const mergedAllocation = allocationRecordFromWorkbook(workbook);
    const mergedAt = new Date().toISOString();
    const patched = [];
    for (const order of orders) {
      const patch = applyMergeSimulationToOrder(order, workbook.orderDetails, {
        mergedSetId,
        mergedAllocation,
      }) || { mergedSetId, mergedAt, mergedAllocation };
      updateOrder(order.id, patch);
      patched.push({ ...order, ...patch });
    }
    return patched;
  }

  function applySimulation() {
    if (statusesNeedUpdate) {
      setConfirmApply(false);
      return;
    }
    writeSimulation();
    setConfirmApply(false);
    onApplied?.();
  }

  async function applyAndSend() {
    if (statusesNeedUpdate) {
      setConfirmSend(false);
      return;
    }
    setSendError("");
    setSending(true);
    try {
      const patched = writeSimulation();
      await sendMergedOrderEmails(patched, sendConsolidatedAllocationEmail);
      setConfirmSend(false);
      onApplied?.();
    } catch (error) {
      setSendError(error?.message || "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: "calc(100vh - 48px)",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.25 }}>
          <ConsolidateHeader
            customer={customer}
            email={email}
            itemCount={summary.lineCount}
            qty={totalItemQty(sourceRows)}
            sentCount={0}
          />
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            px: 3,
            py: 2.5,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            flex: 1,
          }}
        >
          {sendError ? <Alert severity="error" sx={{ mb: 2 }}>{sendError}</Alert> : null}
          {mergeGate.mixedCustomers || !sourceRows.length ? (
            <Alert severity={mergeGate.mixedCustomers ? "warning" : "info"}>
              {mergeGate.blockReason || "Selected orders have no line items to merge."}
            </Alert>
          ) : (
            <MergeWorkbookView
              workbook={workbook}
              orders={orders}
              editable
              percentByProduct={percentByProduct}
              newQtyByProduct={newQtyByProduct}
              onPercentChange={setProductPercent}
              onNewQtyChange={(productKey, value) => {
                setNewQtyByProduct((prev) => ({ ...prev, [productKey]: value }));
              }}
              onPaymentChange={(row, payment) => {
                const kind = row.tag === "Pre-order" ? "Pre-order" : "In-stock";
                setPaymentByRow((prev) => ({ ...prev, [row.key]: payment }));
                setStatusByRow((prev) => ({
                  ...prev,
                  [row.key]: resolveOrderStatusForPayment(payment, row.status, kind),
                }));
              }}
              onStatusChange={(row, status) => {
                setStatusByRow((prev) => ({ ...prev, [row.key]: status }));
              }}
              statusWarning={statusesNeedUpdate}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" sx={{ mr: "auto" }}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            disabled={!mergeGate.canMerge || sending || !sendConsolidatedAllocationEmail || statusesNeedUpdate}
            onClick={() => setConfirmSend(true)}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
          >
            {sending ? "Sending…" : "Send email"}
          </Button>
          <Button
            variant="contained"
            disabled={!mergeGate.canMerge || sending || statusesNeedUpdate}
            onClick={() => setConfirmApply(true)}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
          >
            {applyLabel}
          </Button>
        </DialogActions>
      </Dialog>

      <TypeConfirmDialog
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        onConfirm={applySimulation}
        title="Apply merged allocation"
        description={`Write the allocation and the Order Details status onto each of the ${summary.orderCount} source order${summary.orderCount === 1 ? "" : "s"}. Each order keeps its own number. Emails are not sent.`}
        confirmLabel={applyLabel}
        confirmWord="apply"
        surfaceBorderColor={surfaceBorderColor}
      />
      <TypeConfirmDialog
        open={confirmSend}
        onClose={() => !sending && setConfirmSend(false)}
        onConfirm={applyAndSend}
        title="Apply and send email"
        description={`Write the allocation onto ${summary.orderCount} order${summary.orderCount === 1 ? "" : "s"} and send one consolidated email to ${customer}.`}
        confirmLabel="Send email"
        confirmWord="send"
        surfaceBorderColor={surfaceBorderColor}
      />
    </>
  );
}

export function MergedOrdersPanel({
  orders,
  updateOrder,
  sendConsolidatedAllocationEmail,
  surfaceBorderColor,
  onBack,
}) {
  const [sendingId, setSendingId] = useState("");
  const [sendError, setSendError] = useState("");
  const sets = useMemo(
    () => groupMergedOrderSets((orders || []).filter((order) => !isArchivedOrder(order))),
    [orders],
  );

  function handlePairChange(orderId, lineItemId, status, payment) {
    const order = (orders || []).find((row) => row.id === orderId);
    if (!order || !updateOrder) return;
    const patch = applyMergedLineStatus(order, lineItemId, status, payment);
    if (patch) updateOrder(order.id, patch);
  }

  async function handleSendSet(set) {
    setSendError("");
    setSendingId(set.id);
    try {
      await sendMergedOrderEmails(set.orders, sendConsolidatedAllocationEmail);
    } catch (error) {
      setSendError(error?.message || "Could not send email.");
    } finally {
      setSendingId("");
    }
  }

  if (!sets.length) {
    return (
      <Stack spacing={1.5} alignItems="center" sx={{ py: 6, px: 3, color: "text.secondary" }}>
        <Typography sx={{ fontWeight: 800, color: "text.primary" }}>No consolidated orders yet.</Typography>
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
        >
          Go back to Individual orders
        </Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: { xs: 1.5, md: 2 }, py: 2 }}>
      <Stack spacing={2}>
        {sets.map((set) => {
          const workbook = buildLiveMergeWorkbook(set.orders);
          return (
            <Box
              key={set.id}
              sx={{
                border: "1px solid",
                borderColor: surfaceBorderColor,
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
                sx={{ px: { xs: 1.25, md: 2 }, py: 1.25, borderBottom: "1px solid", borderColor: surfaceBorderColor }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <ConsolidateHeader
                    customer={set.customer}
                    email={customerContactFromOrders(set.orders).email}
                    itemCount={workbook.orderDetails?.length || 0}
                    qty={totalItemQty(workbook.orderDetails)}
                    sentCount={countMergedEmailsSent(set.orders)}
                  />
                </Box>
                <Button
                  variant="outlined"
                  disabled={sendingId === set.id || !sendConsolidatedAllocationEmail}
                  onClick={() => handleSendSet(set)}
                  sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
                >
                  {sendingId === set.id ? "Sending…" : "Send email"}
                </Button>
              </Stack>
              {sendError && sendingId === "" ? (
                <Alert severity="error" sx={{ mx: 2, mt: 1.5 }}>{sendError}</Alert>
              ) : null}
              <Box sx={{ px: { xs: 1.25, md: 2 }, py: 2 }}>
                <MergeWorkbookView
                  workbook={workbook}
                  orders={set.orders}
                  onPaymentChange={(row, payment) => {
                    const kind = row.tag === "Pre-order" ? "Pre-order" : "In-stock";
                    const status = resolveOrderStatusForPayment(payment, row.status, kind);
                    handlePairChange(row.orderId, row.lineItemId, status, payment);
                  }}
                  onStatusChange={(row, status) => {
                    handlePairChange(row.orderId, row.lineItemId, status, row.payment);
                  }}
                />
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
