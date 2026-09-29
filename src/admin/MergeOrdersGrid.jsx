import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { ADMIN_ACTION_BUTTON_SX, ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import {
  PAYMENT_COLOR,
  STATUS_COLOR,
  allocationLabelForItem,
  getOrderLineItems,
  getOrderStatusOptionsForPayment,
  getPaymentOptionsForKind,
  isPreorderOrder,
  lineItemTrailLabel,
  migrateOrderStatus,
  migratePaymentStatus,
  optionsIncludingCurrent,
  orderKindLabels,
  orderMatchesKind,
  orderStatusLabel,
  resolveOrderKindForItem,
  resolveOrderStatusForPayment,
  isSetLevelMergedAttachment,
} from "../data/orderWorkflow.js";
import {
  groupMergedOrderSets,
  buildLiveMergeWorkbook,
  buildMergeSourceRows,
  buildMergeWorkbook,
  defaultMergeSelectionKeys,
  isCompletedMergeLine,
  productKeyForItem,
} from "../lib/orderMergeSimulation.js";
import { isArchivedOrder, isUnseenOrder } from "../lib/ordersStore.jsx";
import { compareOrdersByOrderNo, displayConsolidatedOrderId, withConsolidatedDisplayIds } from "../lib/orderIds.js";
import { lineItemAmount } from "../lib/orderRevenue.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";
import { InfoIcon, SearchIcon, TrashIcon } from "../components/icons.jsx";
import { InfiniteScrollSentinel } from "../components/InfiniteScrollSentinel.jsx";
import { compressProofFile } from "../lib/imageCompression.js";
import { UPLOAD_PROOF_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
import { useInfiniteScroll } from "../lib/useInfiniteScroll.js";
import {
  AdminGridHeaderLabel,
  ADMIN_LIST_SCROLL_SX,
  adminStickyHeaderRowSx,
} from "./adminTableHeader.jsx";
import {
  EmailSentMark,
  lineItemGridSx,
  orderSummaryGridSx,
} from "./AdminOrderAccordionRow.jsx";

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

export function mergeStatusesNeedUpdate(orderDetails, sourceRows) {
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

function LineChipSelect({ value, options, onChange, colorMap, labelFor = (entry) => entry }) {
  return (
    <Select
      size="small"
      fullWidth
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      renderValue={(selected) => (
        <Chip
          size="small"
          label={labelFor(selected)}
          color={colorMap[selected] || "default"}
          variant="outlined"
          sx={ADMIN_STATUS_CHIP_SX}
        />
      )}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {labelFor(option)}
        </MenuItem>
      ))}
    </Select>
  );
}

function LinePaymentSelect({ item, value, onChange }) {
  const kind = resolveOrderKindForItem(item);
  const options = optionsIncludingCurrent(getPaymentOptionsForKind(kind), value);
  return (
    <LineChipSelect
      value={value}
      options={options}
      onChange={onChange}
      colorMap={PAYMENT_COLOR}
    />
  );
}

function LineStatusSelect({ item, payment, value, onChange }) {
  const kind = resolveOrderKindForItem(item);
  const options = optionsIncludingCurrent(
    getOrderStatusOptionsForPayment(payment || item?.payment, kind),
    value,
  );
  return (
    <LineChipSelect
      value={value}
      options={options}
      onChange={onChange}
      colorMap={STATUS_COLOR}
      labelFor={orderStatusLabel}
    />
  );
}

function ReportTable({ columns, rows, footerRows = [], minWidth = 520, tableLayout = "fixed", fill = false }) {
  const theme = useTheme();
  const tableSx = {
    width: "100%",
    minWidth,
    borderCollapse: "collapse",
    tableLayout,
  };
  const renderColGroup = () => (
    <Box component="colgroup">
      {columns.map((column) => (
        <Box component="col" key={column.key} sx={{ width: column.width }} />
      ))}
    </Box>
  );

  return (
    <Box sx={{
      overflow: "auto",
      border: "1px solid",
      borderColor: "divider",
      height: fill ? "100%" : undefined,
      minHeight: 0,
    }}>
      <Box sx={{
        minHeight: fill || footerRows.length ? "100%" : undefined,
        display: "flex",
        flexDirection: "column",
      }}>
        <Box component="table" sx={tableSx}>
          {renderColGroup()}
          <Box component="thead">
            <Box component="tr">
              {columns.map((column) => (
                <Box
                  component="th"
                  key={column.key}
                  sx={{
                    ...cellSx,
                    borderColor: "divider",
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                    bgcolor: theme.palette.background.paper,
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
          </Box>
        </Box>
        {footerRows.length ? (
          <Box
            component="table"
            sx={{
              ...tableSx,
              mt: "auto",
              position: "sticky",
              bottom: 0,
              zIndex: 3,
              bgcolor: theme.palette.background.paper,
            }}
          >
            {renderColGroup()}
            <Box component="tfoot">
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
        ) : null}
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

function toggleSetKeys(current, keys, on) {
  const next = new Set(current);
  for (const key of keys) {
    if (on) next.add(key);
    else next.delete(key);
  }
  return next;
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

function detailsRowMatches(row, order, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return [
    row.name,
    row.orderId,
    row.payment,
    row.status,
    row.conclusionLabel,
    order?.id,
    order?.customer,
    order?.email,
  ].some((part) => String(part || "").toLowerCase().includes(q));
}

function OrderDetailsTable({
  workbook,
  byOrder,
  onPaymentChange,
  onStatusChange,
  selectedKeys,
  onSelectedKeysChange,
  maxHeight = 360,
  searchQuery = "",
  lineDrafts = {},
}) {
  const theme = useTheme();
  const groups = useMemo(() => groupOrderDetails(workbook.orderDetails), [workbook.orderDetails]);
  const visibleGroups = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => {
        const order = byOrder.get(group.orderId);
        const orderHit = [group.orderId, order?.id, order?.customer, order?.email]
          .some((part) => String(part || "").toLowerCase().includes(q));
        const lines = orderHit
          ? group.lines
          : group.lines.filter((row) => detailsRowMatches(row, order, q));
        return lines.length ? { ...group, lines } : null;
      })
      .filter(Boolean);
  }, [groups, searchQuery, byOrder]);
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
  const groupBg = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.1);
  const groupHoverBg = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.2 : 0.16);
  const footerBg = theme.palette.mode === "dark"
    ? alpha(theme.palette.common.white, 0.04)
    : alpha(theme.palette.common.black, 0.03);
  const visibleKeys = visibleGroups.flatMap((group) => group.lines.map((row) => row.key));
  const selectedVisibleCount = visibleKeys.filter((key) => selectedKeys?.has(key)).length;
  const allSelected = visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;
  const canSelect = Boolean(onSelectedKeysChange && selectedKeys);
  const checkboxColSx = {
    ...cellSx,
    borderColor: "divider",
    width: 44,
    minWidth: 44,
    maxWidth: 44,
    px: 0,
    py: 0.75,
    textAlign: "center",
    verticalAlign: "middle",
  };
  const checkboxSx = {
    p: 0,
    m: 0,
    display: "inline-flex",
    verticalAlign: "middle",
  };

  const tableMinWidth = canSelect ? 1088 : 1040;
  const tableSx = {
    width: "100%",
    minWidth: tableMinWidth,
    borderCollapse: "collapse",
    tableLayout: "fixed",
  };
  const renderColGroup = () => (
    <Box component="colgroup">
      {canSelect ? <Box component="col" sx={{ width: 44 }} /> : null}
      <Box component="col" sx={{ width: "22%" }} />
      <Box component="col" sx={{ width: "6%" }} />
      <Box component="col" sx={{ width: "11%" }} />
      <Box component="col" sx={{ width: "12%" }} />
      <Box component="col" sx={{ width: "12%" }} />
      <Box component="col" sx={{ width: "18.5%" }} />
      <Box component="col" sx={{ width: "18.5%" }} />
    </Box>
  );
  const footerCellSx = {
    ...cellSx,
    borderColor: "divider",
    bgcolor: footerBg,
  };

  return (
    <Box sx={{
      border: "1px solid",
      borderColor: "divider",
      height: maxHeight === "100%" ? "100%" : undefined,
      maxHeight: maxHeight === "100%" ? undefined : (maxHeight || undefined),
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <Box sx={{
        overflow: "auto",
        flex: 1,
        minHeight: 0,
      }}>
      <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        component="table"
        sx={tableSx}
      >
        {renderColGroup()}
        <Box component="thead">
          <Box component="tr">
            {canSelect ? (
              <Box
                component="th"
                sx={{
                  ...checkboxColSx,
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                  bgcolor: headerBg,
                }}
              >
                <Checkbox
                  size="small"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(event) => onSelectedKeysChange(toggleSetKeys(selectedKeys, visibleKeys, event.target.checked))}
                  inputProps={{ "aria-label": "Select all items for consolidation" }}
                  sx={checkboxSx}
                />
              </Box>
            ) : null}
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
          {visibleGroups.length === 0 ? (
            <Box component="tr">
              <Box
                component="td"
                colSpan={canSelect ? ORDER_DETAIL_COLUMNS.length + 1 : ORDER_DETAIL_COLUMNS.length}
                sx={{ ...cellSx, borderColor: "divider", py: 2.5, color: "text.secondary", textAlign: "center" }}
              >
                No items match “{String(searchQuery || "").trim()}”.
              </Box>
            </Box>
          ) : null}
          {visibleGroups.map((group) => {
            const open = !collapsed.has(group.orderId);
            const qty = group.lines.reduce((sum, line) => sum + (line.qty || 0), 0);
            const groupKeys = group.lines.map((line) => line.key);
            const groupSelected = groupKeys.filter((key) => selectedKeys?.has(key)).length;
            const groupAll = groupKeys.length > 0 && groupSelected === groupKeys.length;
            const groupSome = groupSelected > 0 && !groupAll;
            return (
              <Fragment key={group.orderId}>
                <Box
                  component="tr"
                  onClick={() => toggleOrder(group.orderId)}
                  sx={{
                    cursor: "pointer",
                    bgcolor: groupBg,
                    boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`,
                    "&:hover": { bgcolor: groupHoverBg },
                  }}
                >
                  {canSelect ? (
                    <Box
                      component="td"
                      sx={checkboxColSx}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Checkbox
                        size="small"
                        checked={groupAll}
                        indeterminate={groupSome}
                        onChange={(event) => onSelectedKeysChange(toggleSetKeys(selectedKeys, groupKeys, event.target.checked))}
                        inputProps={{ "aria-label": `Select all items on ${group.orderId}` }}
                        sx={checkboxSx}
                      />
                    </Box>
                  ) : null}
                  <Box component="td" colSpan={ORDER_DETAIL_COLUMNS.length} sx={{ ...cellSx, borderColor: "divider", py: 1.15 }}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <IconButton
                        size="small"
                        aria-label={open ? `Collapse ${group.orderId}` : `Expand ${group.orderId}`}
                        sx={{
                          width: 28,
                          height: 28,
                          p: 0.25,
                          borderRadius: 1,
                          transform: open ? "rotate(90deg)" : "none",
                          transition: "transform 0.2s ease",
                          color: "primary.main",
                        }}
                      >
                        ▸
                      </IconButton>
                      <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.92rem", letterSpacing: 0.3 }}>
                        {group.orderId}
                      </Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                        {group.lines.length} item{group.lines.length === 1 ? "" : "s"} · {qty} qty
                        {canSelect ? ` · ${groupSelected} selected` : ""}
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
                {open
                  ? group.lines.map((row) => {
                      const order = byOrder.get(row.orderId);
                      const item = getOrderLineItems(order || {}).find((line) => line.id === row.lineItemId);
                      const draft = lineDrafts?.[row.key];
                      const payment = draft?.payment ?? row.payment;
                      const status = draft?.status ?? row.status;
                      const statusItem = {
                        ...(item || {}),
                        status,
                        payment,
                        tag: row.tag || item?.tag,
                      };
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
                            value={payment}
                            onChange={(nextPayment) => onPaymentChange?.(row, nextPayment)}
                          />
                        ) : (
                          <Chip
                            label={payment}
                            color={PAYMENT_COLOR[row.payment] || "default"}
                            variant="outlined"
                            sx={{ ...ADMIN_STATUS_CHIP_SX, height: 26, fontSize: "0.68rem" }}
                          />
                        ),
                        status: canEditPair ? (
                          <LineStatusSelect
                            item={statusItem}
                            payment={payment}
                            value={status}
                            onChange={(nextStatus) => onStatusChange?.(row, nextStatus)}
                          />
                        ) : (
                          <Chip
                            label={orderStatusLabel(status)}
                            color={STATUS_COLOR[status] || "default"}
                            variant="outlined"
                            sx={{ ...ADMIN_STATUS_CHIP_SX, height: 26, fontSize: "0.68rem" }}
                          />
                        ),
                      };
                      const included = selectedKeys?.has(row.key);
                      return (
                        <Box
                          component="tr"
                          key={row.key}
                          sx={canSelect && !included ? { opacity: 0.55 } : undefined}
                        >
                          {canSelect ? (
                            <Box component="td" sx={checkboxColSx}>
                              <Checkbox
                                size="small"
                                checked={included}
                                onChange={(event) => onSelectedKeysChange(toggleSetKeys(selectedKeys, [row.key], event.target.checked))}
                                inputProps={{ "aria-label": `Include ${row.name} in consolidated items` }}
                                sx={checkboxSx}
                              />
                            </Box>
                          ) : null}
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
        </Box>
      </Box>
      <Box
        component="table"
        sx={{
          ...tableSx,
          mt: "auto",
          position: "sticky",
          bottom: 0,
          zIndex: 3,
          bgcolor: headerBg,
        }}
      >
        {renderColGroup()}
        <Box component="tfoot">
          <Box component="tr">
            <Box
              component="td"
              colSpan={canSelect ? 4 : 3}
              sx={{
                ...footerCellSx,
                textAlign: "right",
                fontFamily: MONO_FONT,
                fontWeight: 600,
                fontSize: "0.72rem",
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              Total
            </Box>
            <Box
              component="td"
              sx={{
                ...footerCellSx,
                textAlign: "right",
                fontFamily: MONO_FONT,
                fontWeight: 600,
                fontSize: "0.78rem",
                color: "text.secondary",
                whiteSpace: "nowrap",
              }}
            >
              {PESO.format(workbook.totals?.totalDp || 0)}
            </Box>
            <Box
              component="td"
              sx={{
                ...footerCellSx,
                textAlign: "right",
                fontFamily: MONO_FONT,
                fontWeight: 600,
                fontSize: "0.78rem",
                color: "text.secondary",
                whiteSpace: "nowrap",
              }}
            >
              {PESO.format(totalBalance)}
            </Box>
            <Box
              component="td"
              colSpan={2}
              sx={footerCellSx}
            />
          </Box>
        </Box>
      </Box>
      </Box>
      </Box>
    </Box>
  );
}

function AttachmentIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
    </svg>
  );
}

export function emailExtrasFromOrders(orders) {
  const list = orders || [];
  const newest = [...list].sort((a, b) => (
    String(b.mergedEmailSavedAt || "").localeCompare(String(a.mergedEmailSavedAt || ""))
  ))[0] || list[0] || {};
  const noteSource = list.find((order) => String(order?.mergedEmailNote || "").trim()) || newest;
  const attachmentSource = list.find((order) => isSetLevelMergedAttachment(order?.mergedEmailAttachment)) || null;
  return {
    note: String(noteSource?.mergedEmailNote || "").trim(),
    attachment: attachmentSource?.mergedEmailAttachment || null,
  };
}

function attachmentLabel(attachment) {
  return attachment?.name || attachment?.label || "Attachment";
}

function attachmentSrc(attachment) {
  return attachment?.dataUrl || attachment?.url || "";
}

function isPdfAttachment(attachment) {
  if (!attachment) return false;
  if (attachment.type === "pdf") return true;
  const name = attachment.name || attachment.label || "";
  const src = attachmentSrc(attachment);
  return /\.pdf$/i.test(name) || src.includes("application/pdf");
}

export function MergeWorkbookView({
  workbook,
  gridWorkbook,
  orders,
  selectedKeys,
  onSelectedKeysChange,
  editable = false,
  percentByProduct = {},
  newQtyByProduct = {},
  onPercentChange,
  onNewQtyChange,
  onPaymentChange,
  onStatusChange,
  statusWarning = false,
  note = "",
  attachment = null,
  onNoteChange,
  onAttachmentChange,
  attachmentError = "",
  showNote = true,
  detailsMaxHeight = 360,
  layout = "stack",
  lineDrafts = {},
}) {
  const theme = useTheme();
  const byOrder = useMemo(
    () => new Map((orders || []).map((order) => [order.id, order])),
    [orders],
  );
  const grid = gridWorkbook || workbook;
  const totalItems = (workbook.orderDetails || []).length;
  const selectedItems = selectedKeys instanceof Set
    ? (workbook.orderDetails || []).filter((row) => selectedKeys.has(row.key)).length
    : totalItems;
  const selectedHint = `${selectedItems} of ${totalItems} item${totalItems === 1 ? "" : "s"} selected`;
  const split = layout === "split";
  const [detailsQuery, setDetailsQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const orderDetailsBlock = (
      <Box sx={split ? { gridArea: "details", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } : undefined}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1, flexShrink: 0, minWidth: 0 }}>
          <Box sx={{ flexShrink: 0 }}>
            <SectionTitle>Order Details:</SectionTitle>
          </Box>
          <TextField
            size="small"
            value={detailsQuery}
            onChange={(event) => setDetailsQuery(event.target.value)}
            placeholder="Search order or product…"
            inputProps={{ "aria-label": "Search order details" }}
            sx={{
              flex: 1,
              minWidth: 200,
              "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.78rem" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
          {onSelectedKeysChange ? (
            <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
              {selectedHint}
            </Typography>
          ) : null}
        </Stack>
        <Box sx={split ? { flex: 1, minHeight: 0, overflow: "hidden" } : undefined}>
          <OrderDetailsTable
            workbook={workbook}
            byOrder={byOrder}
            onPaymentChange={onPaymentChange}
            onStatusChange={onStatusChange}
            selectedKeys={selectedKeys}
            onSelectedKeysChange={onSelectedKeysChange}
            maxHeight={split ? "100%" : detailsMaxHeight}
            searchQuery={detailsQuery}
            lineDrafts={lineDrafts}
          />
        </Box>
      </Box>
  );

  const noteBlock = showNote ? (
      <Box sx={split ? { gridArea: "note", minWidth: 0, minHeight: { xs: 168, md: 0 }, display: "flex", flexDirection: "column" } : undefined}>
        <Stack
          direction={{ xs: "column", md: split ? "column" : "row" }}
          spacing={2}
          alignItems="stretch"
          sx={split ? { flex: 1, minHeight: 0 } : { mt: 1 }}
        >
          <Box sx={{ flex: 3, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <SectionTitle>Note:</SectionTitle>
            <TextField
              fullWidth
              multiline
              minRows={split ? 2 : 3}
              value={note}
              onChange={(event) => onNoteChange?.(event.target.value)}
              placeholder="Optional note included in the customer email…"
              inputProps={{ "aria-label": "Email note" }}
              sx={{ mt: 1, flex: split ? 1 : undefined, minHeight: 0, "& .MuiInputBase-root": split ? { height: "100%", alignItems: "flex-start" } : undefined }}
            />
          </Box>
          <Box sx={{ flex: 2, width: { xs: "100%", md: split ? "100%" : undefined }, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <SectionTitle>Attachment:</SectionTitle>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minHeight: 64 }}>
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<AttachmentIcon sx={{ fontSize: 16 }} />}
                  sx={{ fontFamily: MONO_FONT, letterSpacing: 0.3, textTransform: "uppercase", flexShrink: 0 }}
                >
                  {attachment ? "Replace file" : "Attach file"}
                  <input
                    type="file"
                    hidden
                    accept="image/*,application/pdf"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file || !onAttachmentChange) return;
                      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
                        onAttachmentChange(null, "Attachment must be an image or PDF.");
                        return;
                      }
                      const sizeError = validateUploadFileSize(file);
                      if (sizeError) {
                        onAttachmentChange(null, sizeError);
                        return;
                      }
                      try {
                        const dataUrl = await compressProofFile(file);
                        onAttachmentChange({
                          name: file.name,
                          dataUrl,
                          type: file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? "pdf" : "image",
                        }, "");
                      } catch (error) {
                        onAttachmentChange(null, error.message || "Could not read attachment.");
                      }
                    }}
                  />
                </Button>
                {attachment ? (
                  <>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      aria-label={`View ${attachmentLabel(attachment)} fullscreen`}
                      sx={{
                        width: 64,
                        height: 64,
                        p: 0,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        overflow: "hidden",
                        cursor: "zoom-in",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "action.hover",
                        flexShrink: 0,
                      }}
                    >
                      {isPdfAttachment(attachment) || !attachmentSrc(attachment) ? (
                        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", fontWeight: 800 }}>
                          PDF
                        </Typography>
                      ) : (
                        <Box
                          component="img"
                          src={attachmentSrc(attachment)}
                          alt={attachmentLabel(attachment)}
                          sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: MONO_FONT, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {attachmentLabel(attachment)}
                    </Typography>
                    <IconButton size="small" color="error" aria-label="Remove attachment" onClick={() => onAttachmentChange?.(null, "")} sx={{ flexShrink: 0 }}>
                      <TrashIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    {attachmentError || UPLOAD_PROOF_DISCLAIMER}
                  </Typography>
                )}
              </Stack>
              {attachment && attachmentError ? (
                <Alert severity="error">{attachmentError}</Alert>
              ) : null}
            </Stack>
          </Box>
        </Stack>
      </Box>
  ) : null;

  const consolidatedBlock = (
      <Box sx={split ? { gridArea: "items", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" } : undefined}>
        <Box sx={{ flexShrink: 0 }}>
          <SectionTitle>Summary:</SectionTitle>
        </Box>
        <Box sx={{ mt: 1, ...(split ? { flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" } : {}) }}>
          <Box sx={split ? { flex: 1, minHeight: 0, overflow: "hidden" } : undefined}>
          <ReportTable
            fill={split}
            minWidth={760}
            columns={[
              { key: "product", label: "Product" },
              { key: "qty", label: "Total Qty", align: "center", width: "10%" },
              { key: "dp", label: "Total Downpayment", align: "right", width: "16%" },
              { key: "percent", label: "Alloc %", align: "center", width: "14%" },
              { key: "newQty", label: "New Qty", align: "center", width: "12%" },
              { key: "newAmount", label: "New Total Amount", align: "right", width: "16%" },
            ]}
            rows={(grid.consolidated || []).map((row) => {
              const mode = row.allocationMode || (row.allocationOpen === false ? "locked" : "instock");
              const showPending = mode === "pending";
              const showInputs = editable && (mode === "entry" || mode === "instock");
              const pendingValue = (align) => (
                <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem", fontWeight: 700, textAlign: align, color: "text.secondary" }}>
                  —
                </Typography>
              );
              return {
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
                percent: showPending ? pendingValue("center") : showInputs ? (
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
                newQty: showPending ? pendingValue("center") : showInputs ? (
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
                newAmount: showPending ? pendingValue("right") : (
                  <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.8rem", textAlign: "right" }}>
                    {PESO.format(row.newAmount)}
                  </Typography>
                ),
              },
            };
            })}
            footerRows={(() => {
              const rows = grid.consolidated || [];
              const knownRows = rows.filter((row) => row.allocationMode !== "pending");
              const allPending = rows.length > 0 && knownRows.length === 0;
              const mixed = knownRows.length > 0 && knownRows.length < rows.length;
              const knownNew = knownRows.reduce((sum, row) => sum + (Number(row.newAmount) || 0), 0);
              const knownDp = knownRows.reduce((sum, row) => sum + (Number(row.totalDp) || 0), 0);
              const knownNet = knownNew - knownDp;
              const net = mixed ? knownNet : (grid.totals?.net || 0);
              const netLabel = mixed
                ? (knownNet < 0 ? "Refund" : knownNet > 0 ? "Balance due" : "No balance")
                : (grid.totals?.netLabel || "No balance");
              return [
              {
                key: "new-total",
                label: "New Total:",
                value: allPending ? "—" : PESO.format(mixed ? knownNew : (grid.totals?.newTotal || 0)),
              },
              {
                key: "total-dp",
                label: "Total Downpayment:",
                value: PESO.format(grid.totals?.totalDp || 0),
              },
              {
                key: "net",
                label: allPending ? "Settlement:" : `${netLabel}:`,
                value: allPending ? "—" : PESO.format(Math.abs(net)),
                color: allPending ? "text.secondary" : moneyColor(net),
                emphasis: true,
              },
            ];
            })()}
          />
          </Box>
          {selectedItems === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              Select at least one item in Order Details to include it here.
            </Alert>
          ) : null}
          {editable && onStatusChange && statusWarning ? (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {STATUS_NOT_MOVED_MESSAGE}
            </Alert>
          ) : null}
        </Box>
      </Box>
  );

  return (
    <Stack spacing={2.5} sx={split ? { height: "100%", minHeight: 0, overflow: "hidden" } : undefined}>
      {split ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: showNote ? "minmax(0, 3fr) minmax(0, 2fr)" : "minmax(0, 1fr)",
            },
            gridTemplateRows: {
              xs: "auto auto auto",
              md: "minmax(0, 3fr) minmax(0, 2fr)",
            },
            gridTemplateAreas: {
              xs: `"details" "items" "note"`,
              md: showNote ? `"details details" "items note"` : `"details" "items"`,
            },
            overflow: "hidden",
            gap: 2,
            flex: 1,
            minHeight: 0,
          }}
        >
          {orderDetailsBlock}
          {consolidatedBlock}
          {noteBlock}
        </Box>
      ) : (
        <>
          {orderDetailsBlock}
          {consolidatedBlock}
          {noteBlock}
        </>
      )}
      <Dialog
        open={previewOpen && Boolean(attachmentSrc(attachment))}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Typography component="span" sx={{ fontWeight: 800, fontSize: "1rem" }}>
            {attachmentLabel(attachment)}
          </Typography>
          <IconButton onClick={() => setPreviewOpen(false)} aria-label="Close attachment preview">
            <Typography component="span" sx={{ fontSize: "1.35rem", lineHeight: 1 }}>×</Typography>
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", p: { xs: 1.5, md: 2.5 } }}>
          {isPdfAttachment(attachment) ? (
            <Box
              component="iframe"
              src={attachmentSrc(attachment)}
              title={attachmentLabel(attachment)}
              sx={{ width: "100%", height: "60vh", border: 0 }}
            />
          ) : (
            <Box
              component="img"
              src={attachmentSrc(attachment)}
              alt={attachmentLabel(attachment)}
              sx={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}

export async function sendMergedOrderEmails(orders, sendConsolidatedAllocationEmail, extras) {
  if (!sendConsolidatedAllocationEmail) return;
  await sendConsolidatedAllocationEmail(orders, extras);
}

export function customerContactFromOrders(orders) {
  const list = orders || [];
  return {
    customer: list.find((order) => order?.customer)?.customer || "Customer",
    email: list.find((order) => order?.email)?.email || "",
    phone: list.find((order) => order?.phone)?.phone || "",
  };
}

export function countMergedEmailsSent(orders) {
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

export function totalItemQty(rows) {
  return (rows || []).reduce((sum, row) => sum + (Number(row.qty) || 0), 0);
}

const CONSOLIDATED_SUMMARY_GRID = "28px minmax(148px, 1fr) minmax(140px, 1fr) minmax(140px, 0.8fr) minmax(110px, 0.75fr) minmax(120px, 0.85fr) 112px 200px";
const CONSOLIDATED_TABLE_MIN_WIDTH = 1080;
const CONSOLIDATED_LINE_GRID = "minmax(180px, 1.4fr) minmax(72px, 0.6fr) minmax(110px, 0.75fr) minmax(110px, 0.85fr) minmax(110px, 0.85fr) auto";
const CONSOLIDATED_LINE_MIN_WIDTH = 760;

function consolidatedLineGridSx(overrides = {}) {
  return lineItemGridSx({
    gridTemplateColumns: CONSOLIDATED_LINE_GRID,
    ...overrides,
  });
}

function uniqueLabels(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function OrdersInfoTip({ orderIds, label = "Included orders" }) {
  const ids = uniqueLabels(orderIds);
  if (!ids.length) return null;
  return (
    <Tooltip
      arrow
      placement="top"
      title={(
        <Box sx={{ py: 0.25 }}>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, mb: 0.4 }}>
            {label}
          </Typography>
          <Stack spacing={0.2}>
            {ids.map((id) => (
              <Typography key={id} sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem" }}>
                {id}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}
    >
      <Box
        component="span"
        onClick={(event) => event.stopPropagation()}
        sx={{
          display: "inline-flex",
          color: "text.secondary",
          cursor: "help",
          lineHeight: 0,
          flexShrink: 0,
          "&:hover": { color: "text.primary" },
        }}
        aria-label={`${label}: ${ids.join(", ")}`}
      >
        <InfoIcon sx={{ fontSize: 14 }} />
      </Box>
    </Tooltip>
  );
}

function summarizeMergedSet(orders) {
  const memberOrders = [...(orders || [])].sort(compareOrdersByOrderNo);
  const kinds = new Set();
  const byProduct = new Map();
  let qty = 0;
  for (const order of memberOrders) {
    orderKindLabels(order).forEach((kind) => kinds.add(kind));
    for (const item of getOrderLineItems(order)) {
      const productKey = productKeyForItem(item);
      const itemQty = Number(item.quantity ?? item.qty) || 0;
      qty += itemQty;
      const current = byProduct.get(productKey) || {
        productKey,
        name: item.name || "Item",
        quantity: 0,
        allocatedQty: 0,
        amount: 0,
        balanceDue: 0,
        sources: [],
      };
      current.quantity += itemQty;
      current.allocatedQty += Math.max(0, Number(item.allocatedQty) || 0);
      current.amount += lineItemAmount(item);
      current.balanceDue += Number(item.balanceDue) || 0;
      current.sources.push({ order, item });
      byProduct.set(productKey, current);
    }
  }
  const productRows = [...byProduct.values()].map((row) => {
    const primary = row.sources[0];
    const payments = uniqueLabels(row.sources.map(({ item }) => migratePaymentStatus(item.payment)));
    const statuses = uniqueLabels(row.sources.map(({ item }) => migrateOrderStatus(item.status)));
    return {
      ...row,
      key: row.productKey,
      item: {
        ...primary.item,
        name: row.name,
        quantity: row.quantity,
        allocatedQty: row.allocatedQty,
        payment: payments[0] || primary.item.payment,
        status: statuses[0] || primary.item.status,
      },
      order: primary.order,
      payments,
      statuses,
    };
  });
  const names = productRows.map((row) => lineItemTrailLabel(row.item));
  const workbook = buildLiveMergeWorkbook(orders);
  const allocatedQty = productRows.reduce((sum, row) => sum + row.allocatedQty, 0);
  return {
    memberOrders,
    kinds: [...kinds],
    names,
    productRows,
    lineCount: productRows.length,
    qty,
    allocatedQty,
    newest: memberOrders[0],
    totals: workbook.totals,
  };
}

function MergedSetAccordionRow({
  set,
  surfaceBorderColor,
  open,
  onToggle,
  onOpenOrder,
  onView,
}) {
  const theme = useTheme();
  const { customer, email } = customerContactFromOrders(set.orders);
  const sentCount = countMergedEmailsSent(set.orders);
  const hasUnseenActivity = (set.orders || []).some(isUnseenOrder);
  const summary = useMemo(() => summarizeMergedSet(set.orders), [set.orders]);
  const net = Number(summary.totals?.net) || 0;
  const netSign = net < 0 ? "−" : net > 0 ? "+" : "";
  const netKind = net < 0 ? "Refund Amount" : net > 0 ? "Balance Due" : "No balance";

  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
      <Box
        onClick={() => onToggle(set.id)}
        sx={{
          ...orderSummaryGridSx({
            showSelect: false,
            gridTemplateColumns: CONSOLIDATED_SUMMARY_GRID,
          }),
          py: 1.25,
          cursor: "pointer",
          userSelect: "none",
          bgcolor: open ? alpha(theme.palette.primary.main, 0.04) : "transparent",
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
        }}
      >
        <IconButton
          size="small"
          aria-label={open ? "Collapse consolidated order" : "Expand consolidated order"}
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.2s ease",
            color: "text.secondary",
          }}
        >
          ▸
        </IconButton>

        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            {hasUnseenActivity ? (
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }} title="New activity" />
            ) : null}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                {displayConsolidatedOrderId(set)}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", whiteSpace: "nowrap", fontFamily: MONO_FONT }}>
                {formatOrderTimestamp({ createdAt: set.mergedAt || summary.newest?.createdAt })}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {customer}
          </Typography>
          {email ? (
            <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", whiteSpace: "nowrap", fontFamily: MONO_FONT }}>
              {email}
            </Typography>
          ) : null}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: "nowrap" }}>
            {summary.kinds.map((kind) => (
              <Chip
                key={kind}
                label={kind}
                variant="outlined"
                color={kind === "Pre-order" ? "secondary" : "default"}
                sx={{ ...ADMIN_STATUS_CHIP_SX, flexShrink: 0 }}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.35 }}>
            <Typography
              component="sub"
              sx={{
                color: "text.secondary",
                fontSize: "0.68rem",
                fontFamily: MONO_FONT,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {summary.memberOrders.length} order{summary.memberOrders.length === 1 ? "" : "s"}
            </Typography>
            <OrdersInfoTip
              orderIds={summary.memberOrders.map((order) => order.id)}
              label="Orders in this set"
            />
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: "primary.main", whiteSpace: "nowrap" }}>
            {PESO.format(summary.totals?.newTotal || 0)}
          </Typography>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: moneyColor(net), whiteSpace: "nowrap" }}>
            {`${netSign}${netSign ? " " : ""}${PESO.format(Math.abs(net))}`}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT, whiteSpace: "nowrap" }}>
            {netKind}
          </Typography>
        </Box>

        <EmailSentMark sentCount={sentCount} />

        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ justifySelf: "end", width: "fit-content", maxWidth: "100%" }}
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={onView}
            sx={ADMIN_ACTION_BUTTON_SX}
          >
            View
          </Button>
        </Stack>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: { xs: 1.25, md: 2 }, pt: 0.5, pb: 1.5 }}>
          <Box
            sx={{
              border: "1px solid",
              borderColor: alpha(surfaceBorderColor, 0.35),
              borderRadius: 1,
              overflow: "hidden",
              overflowX: "auto",
            }}
          >
            <Box sx={{ minWidth: CONSOLIDATED_LINE_MIN_WIDTH }}>
              <Box
                sx={{
                  ...consolidatedLineGridSx(),
                  py: 0.85,
                  bgcolor: alpha(theme.palette.text.primary, 0.015),
                  borderBottom: "1px solid",
                  borderColor: alpha(surfaceBorderColor, 0.3),
                }}
              >
                <AdminGridHeaderLabel>Item</AdminGridHeaderLabel>
                <AdminGridHeaderLabel>Allocation</AdminGridHeaderLabel>
                <AdminGridHeaderLabel>Balance</AdminGridHeaderLabel>
                <AdminGridHeaderLabel>Payment</AdminGridHeaderLabel>
                <AdminGridHeaderLabel>Status</AdminGridHeaderLabel>
                <Box />
              </Box>

              {summary.productRows.map((row, index) => {
                const { item, order } = row;
                const itemPayment = row.payments.length === 1 ? row.payments[0] : "Mixed";
                const itemStatus = row.statuses.length === 1 ? row.statuses[0] : "Mixed";
                const preorder = row.sources.some(({ order: source }) => isPreorderOrder(source));
                const orderIds = uniqueLabels(row.sources.map(({ order: source }) => source.id));
                return (
                  <Box
                    key={row.key}
                    sx={{
                      ...consolidatedLineGridSx(),
                      py: 1,
                      borderTop: index === 0 ? "none" : "1px dashed",
                      borderColor: alpha(surfaceBorderColor, 0.3),
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.35 }}>
                        {lineItemTrailLabel(item)}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: MONO_FONT }}>
                          {PESO.format(row.amount)}
                          {orderIds.length > 1 ? ` · ${orderIds.length} orders` : ""}
                        </Typography>
                        {orderIds.length > 1 ? (
                          <OrdersInfoTip orderIds={orderIds} label="Orders with this item" />
                        ) : null}
                      </Stack>
                    </Box>
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem" }}>
                      {preorder ? allocationLabelForItem(item) : "—"}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
                      {row.balanceDue > 0 ? PESO.format(row.balanceDue) : "—"}
                    </Typography>
                    <Box>
                      <Chip
                        label={itemPayment === "Mixed" ? "Mixed" : itemPayment}
                        color={PAYMENT_COLOR[itemPayment] || "default"}
                        variant="outlined"
                        sx={ADMIN_STATUS_CHIP_SX}
                      />
                    </Box>
                    <Box>
                      <Chip
                        label={itemStatus === "Mixed" ? "Mixed" : orderStatusLabel(itemStatus)}
                        color={STATUS_COLOR[itemStatus] || "default"}
                        variant="outlined"
                        sx={ADMIN_STATUS_CHIP_SX}
                      />
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => onOpenOrder?.(order.id)}
                        sx={ADMIN_ACTION_BUTTON_SX}
                      >
                        View
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export function orderIdsPendingRemoval(orderDetails, selectedKeys) {
  const byOrder = new Map();
  for (const row of orderDetails || []) {
    const orderId = String(row?.orderId || "").trim();
    if (!orderId) continue;
    if (!byOrder.has(orderId)) byOrder.set(orderId, []);
    byOrder.get(orderId).push(row.key);
  }
  const removed = [];
  for (const [orderId, keys] of byOrder) {
    if (keys.length && keys.every((key) => !selectedKeys?.has(key))) {
      removed.push(orderId);
    }
  }
  return removed;
}

export function findConsolidatedSet(orders, setId) {
  const needle = String(setId || "").trim();
  if (!needle) return null;
  const sets = withConsolidatedDisplayIds(
    groupMergedOrderSets((orders || []).filter((order) => !isArchivedOrder(order))),
  );
  return sets.find((set) => set.id === needle || set.displayId === needle) || null;
}

export function ConsolidatedOrderView({
  set,
  onSend,
  sending,
  sendEnabled,
  showNote = true,
  showSend = true,
  detailsMaxHeight = 360,
  onPayloadChange,
  editable = false,
  layout = "stack",
  onPaymentChange,
  onStatusChange,
  note: noteProp,
  attachment: attachmentProp,
  attachmentError: attachmentErrorProp,
  onNoteChange,
  onAttachmentChange,
  lineDrafts = {},
  selectionResetKey = 0,
  allocationEditing = false,
}) {
  const detailWorkbook = useMemo(() => (set ? buildLiveMergeWorkbook(set.orders) : null), [set]);
  const detailKeys = useMemo(
    () => (detailWorkbook?.orderDetails || []).map((row) => row.key),
    [detailWorkbook],
  );
  const detailKeySig = detailKeys.join("|");
  const [selectedState, setSelectedState] = useState({ sig: "", keys: new Set() });
  const selectedKeys = selectedState.sig === detailKeySig
    ? selectedState.keys
    : new Set(defaultMergeSelectionKeys(detailWorkbook?.orderDetails));
  const setSelectedKeys = (next) => {
    setSelectedState({
      sig: detailKeySig,
      keys: next instanceof Set ? next : new Set(next || []),
    });
  };
  const [percentByProduct, setPercentByProduct] = useState({});
  const [newQtyByProduct, setNewQtyByProduct] = useState({});
  const noteControlled = typeof onNoteChange === "function";
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");

  useEffect(() => {
    if (!set) return;
    const extras = emailExtrasFromOrders(set.orders);
    if (!noteControlled) {
      setNote(extras.note);
      setAttachment(extras.attachment);
      setAttachmentError("");
    }
    setSelectedState({ sig: detailKeySig, keys: new Set(defaultMergeSelectionKeys(detailWorkbook?.orderDetails)) });
    setPercentByProduct({});
    setNewQtyByProduct({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set?.id, detailKeySig, selectionResetKey]);

  const workbook = useMemo(
    () => (set ? buildLiveMergeWorkbook(set.orders, { includeKeys: selectedKeys }) : null),
    [set, selectedKeys],
  );
  const draftSig = Object.entries(lineDrafts || {})
    .map(([key, draft]) => `${key}:${draft?.payment || ""}:${draft?.status || ""}`)
    .sort()
    .join("|");
  const allocationGrid = useMemo(() => {
    if (!allocationEditing || !set) return null;
    const statusByRow = {};
    const paymentByRow = {};
    for (const [key, draft] of Object.entries(lineDrafts || {})) {
      if (draft?.status) statusByRow[key] = draft.status;
      if (draft?.payment) paymentByRow[key] = draft.payment;
    }
    return buildMergeWorkbook(set.orders, {
      percentByProduct,
      newQtyByProduct,
      statusByRow,
      paymentByRow,
      includeKeys: selectedKeys,
    });
  }, [allocationEditing, set, percentByProduct, newQtyByProduct, draftSig, selectedKeys, lineDrafts]);

  const selectedSig = [...selectedKeys].sort().join("|");
  useEffect(() => {
    onPayloadChange?.({
      workbook: allocationGrid || workbook,
      selectedCount: selectedKeys.size,
      removedOrderIds: orderIdsPendingRemoval(detailWorkbook?.orderDetails, selectedKeys),
    });
  }, [workbook, allocationGrid, selectedSig, selectedKeys, detailWorkbook, onPayloadChange]);

  if (!set || !detailWorkbook || !workbook) return null;

  return (
    <Stack spacing={2.5} sx={layout === "split" ? { height: "100%", minHeight: 0 } : undefined}>
      <MergeWorkbookView
        workbook={detailWorkbook}
        gridWorkbook={allocationGrid || workbook}
        orders={set.orders}
        selectedKeys={selectedKeys}
        onSelectedKeysChange={setSelectedKeys}
        editable={allocationEditing || editable}
        percentByProduct={percentByProduct}
        newQtyByProduct={newQtyByProduct}
        onPercentChange={(productKey, value) => {
          if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
          setPercentByProduct((prev) => ({ ...prev, [productKey]: value }));
          setNewQtyByProduct((prev) => {
            const next = { ...prev };
            delete next[productKey];
            return next;
          });
        }}
        onNewQtyChange={(productKey, value) => setNewQtyByProduct((prev) => ({ ...prev, [productKey]: value }))}
        onPaymentChange={onPaymentChange}
        onStatusChange={onStatusChange}
        note={noteControlled ? (noteProp ?? "") : note}
        attachment={noteControlled ? attachmentProp : attachment}
        attachmentError={noteControlled ? (attachmentErrorProp || "") : attachmentError}
        onNoteChange={noteControlled ? onNoteChange : setNote}
        onAttachmentChange={noteControlled
          ? onAttachmentChange
          : (next, error) => {
            setAttachment(next);
            setAttachmentError(error || "");
          }}
        showNote={showNote}
        detailsMaxHeight={detailsMaxHeight}
        layout={layout}
        lineDrafts={lineDrafts}
      />
      {showSend ? (
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            color="primary"
            disabled={!sendEnabled || sending || selectedKeys.size === 0}
            onClick={() => onSend?.({ note, attachment, workbook })}
            sx={ADMIN_ACTION_BUTTON_SX}
          >
            {sending ? "Sending…" : "Send email"}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

export function MergedOrdersPanel({
  orders,
  ordersReady = true,
  updateOrder,
  surfaceBorderColor,
  stickyHeaderBg,
  onBack,
  onOpenOrder,
  onViewSet,
  queueFilter = "all",
  kindFilter = "all",
  query = "",
  activeQueue = null,
}) {
  const theme = useTheme();
  const headerBg = stickyHeaderBg || theme.palette.background.paper;
  const [expandedSetId, setExpandedSetId] = useState(null);
  const viewingArchived = queueFilter === "archived";
  const groupedSets = useMemo(
    () => withConsolidatedDisplayIds(
      groupMergedOrderSets((orders || []).filter((order) => (
        viewingArchived ? isArchivedOrder(order) : !isArchivedOrder(order)
      ))),
    ),
    [orders, viewingArchived],
  );
  const sets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groupedSets.filter((set) => {
      const members = set.orders || [];
      if (kindFilter !== "all" && !members.some((order) => orderMatchesKind(order, kindFilter))) return false;
      if (needle) {
        const haystack = [
          displayConsolidatedOrderId(set),
          set.id,
          ...members.flatMap((order) => [order.id, order.customer, order.email, order.items]),
        ].join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (queueFilter === "all" || viewingArchived) return true;
      return members.some((order) => activeQueue?.match?.(order));
    });
  }, [groupedSets, kindFilter, query, queueFilter, viewingArchived, activeQueue]);
  const {
    visibleItems,
    rootRef: scrollRootRef,
    sentinelRef,
    hasMore,
    visibleCount,
    totalCount,
  } = useInfiniteScroll(sets, { pageSize: 40 });

  useEffect(() => {
    if (!updateOrder) return;
    for (const set of groupedSets) {
      if (!set.displayId || set.displayId === set.id) continue;
      for (const order of set.orders) {
        if (order.mergedSetId === set.displayId) continue;
        updateOrder(order.id, { mergedSetId: set.displayId });
      }
    }
  }, [groupedSets, updateOrder]);

  function toggleSetAccordion(id) {
    setExpandedSetId((current) => (current === id ? null : id));
  }

  if (!ordersReady) {
    return (
      <Stack spacing={1.5} alignItems="center" sx={{ py: 6, color: "text.secondary" }}>
        <CircularProgress size={26} />
        <Typography variant="body2">Loading consolidated orders…</Typography>
      </Stack>
    );
  }

  if (!sets.length) {
    const filteredOut = groupedSets.length > 0;
    return (
      <Stack spacing={1.5} alignItems="center" sx={{ py: 6, px: 3, color: "text.secondary" }}>
        <Typography sx={{ fontWeight: 800, color: "text.primary" }}>
          {filteredOut ? "No consolidated orders match your filters." : "No consolidated orders yet."}
        </Typography>
        {filteredOut ? null : (
          <Button
            variant="outlined"
            onClick={onBack}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
          >
            Go back to Individual orders
          </Button>
        )}
      </Stack>
    );
  }

  return (
    <Box ref={scrollRootRef} sx={ADMIN_LIST_SCROLL_SX}>
      <Box sx={{ minWidth: CONSOLIDATED_TABLE_MIN_WIDTH }}>
        <Box
          sx={{
            ...orderSummaryGridSx({
              showSelect: false,
              gridTemplateColumns: CONSOLIDATED_SUMMARY_GRID,
            }),
            py: 1.25,
            ...adminStickyHeaderRowSx(headerBg, surfaceBorderColor),
          }}
        >
          <Box />
          <AdminGridHeaderLabel>Consolidated</AdminGridHeaderLabel>
          <AdminGridHeaderLabel>Customer</AdminGridHeaderLabel>
          <AdminGridHeaderLabel>Orders</AdminGridHeaderLabel>
          <AdminGridHeaderLabel>New Total</AdminGridHeaderLabel>
          <AdminGridHeaderLabel>Settlement</AdminGridHeaderLabel>
          <AdminGridHeaderLabel>Email sent</AdminGridHeaderLabel>
          <Box />
        </Box>
        {visibleItems.map((set) => (
          <MergedSetAccordionRow
            key={set.id}
            set={set}
            surfaceBorderColor={surfaceBorderColor}
            open={expandedSetId === set.id}
            onToggle={toggleSetAccordion}
            onOpenOrder={onOpenOrder}
            onView={() => onViewSet?.(set)}
          />
        ))}
        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          hasMore={hasMore}
          visibleCount={visibleCount}
          totalCount={totalCount}
        />
      </Box>
    </Box>
  );
}
