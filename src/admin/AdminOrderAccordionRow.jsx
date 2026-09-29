import { useMemo } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { ArchiveIcon, InfoIcon, RestoreIcon } from "../components/icons.jsx";
import { ADMIN_ACTION_BUTTON_SX, ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import { AdminGridHeaderLabel } from "./adminTableHeader.jsx";
import {
  PAYMENT_COLOR,
  STATUS_COLOR,
  allocationLabelForItem,
  getOrderLineItems,
  isPreorderOrder,
  lineItemTrailLabel,
  migratePaymentStatus,
  migrateOrderStatus,
  orderKindLabels,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { isArchivedOrder, isUnseenOrder } from "../lib/ordersStore.jsx";
import { lineItemAmount } from "../lib/orderRevenue.js";
import { buildLiveMergeWorkbook } from "../lib/orderMergeSimulation.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";

export const ORDER_SUMMARY_GRID = "36px 28px minmax(148px, 1fr) minmax(140px, 1fr) minmax(140px, 0.8fr) minmax(110px, 0.75fr) minmax(120px, 0.85fr) 112px 200px";
export const ORDER_SUMMARY_GRID_NO_SELECT = "28px minmax(148px, 1fr) minmax(140px, 1fr) minmax(140px, 0.8fr) minmax(110px, 0.75fr) minmax(120px, 0.85fr) 112px 200px";
export const LINEITEM_GRID = "minmax(180px, 1.4fr) minmax(72px, 0.6fr) minmax(110px, 0.75fr) minmax(110px, 0.85fr) minmax(110px, 0.85fr)";
export const ORDER_TABLE_MIN_WIDTH = 1080;
const LINEITEM_TABLE_MIN_WIDTH = 720;

export function orderSummaryGridSx(overrides = {}) {
  const { showSelect = true, ...sx } = overrides;
  return {
    display: "grid",
    gridTemplateColumns: showSelect ? ORDER_SUMMARY_GRID : ORDER_SUMMARY_GRID_NO_SELECT,
    columnGap: { xs: 1, md: 1.5 },
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
    px: { xs: 1.25, md: 2 },
    ...sx,
  };
}

export function lineItemGridSx(overrides = {}) {
  return {
    display: "grid",
    gridTemplateColumns: LINEITEM_GRID,
    columnGap: { xs: 1, md: 1.5 },
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
    px: { xs: 1.25, md: 1.5 },
    ...overrides,
  };
}

function moneyColor(value) {
  if (value > 0) return "success.main";
  if (value < 0) return "error.main";
  return "text.primary";
}

function emailsSentCount(order) {
  const since = order?.mergedAt || "";
  const keys = new Set();
  for (const entry of order?.trail || []) {
    if (entry.emailStatus !== "sent") continue;
    if (since && entry.at && entry.at < since) continue;
    keys.add(`${entry.at || ""}|${entry.emailType || ""}|${entry.emailTo || ""}`);
  }
  return keys.size;
}

export function EmailSentMark({ sentCount }) {
  const count = Number(sentCount) || 0;
  const sent = count > 0;
  const timesLabel = `Sent ${count} ${count === 1 ? "time" : "times"}`;
  return (
    <Stack direction="row" spacing={0.35} alignItems="center" onClick={(event) => event.stopPropagation()}>
      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>
        {sent ? "Yes" : "No"}
      </Typography>
      {sent ? (
        <Tooltip arrow placement="top" title={timesLabel}>
          <Box
            component="span"
            sx={{ display: "inline-flex", color: "text.secondary", cursor: "help", lineHeight: 0, "&:hover": { color: "text.primary" } }}
            aria-label={timesLabel}
          >
            <InfoIcon sx={{ fontSize: 14 }} />
          </Box>
        </Tooltip>
      ) : null}
    </Stack>
  );
}

function GridHeaderCell({ children, sx }) {
  return <AdminGridHeaderLabel sx={sx}>{children}</AdminGridHeaderLabel>;
}

export default function AdminOrderAccordionRow({
  order,
  surfaceBorderColor,
  onOpen,
  open,
  onToggle,
  onArchive,
  onRestore,
  selected = false,
  onToggleSelect,
  showSelect = true,
}) {
  const theme = useTheme();
  const lineItems = getOrderLineItems(order);
  const preorder = isPreorderOrder(order);
  const archived = isArchivedOrder(order);
  const hasUnseenActivity = !archived && isUnseenOrder(order);
  const kinds = orderKindLabels(order);
  const sentCount = emailsSentCount(order);
  const workbook = useMemo(() => buildLiveMergeWorkbook([order]), [order]);
  const summaryRows = workbook.consolidated || [];
  const knownRows = summaryRows.filter((row) => row.allocationMode !== "pending");
  const allocationPending = summaryRows.length > 0 && knownRows.length === 0;
  const knownNew = knownRows.reduce((sum, row) => sum + (Number(row.newAmount) || 0), 0);
  const knownDp = knownRows.reduce((sum, row) => sum + (Number(row.totalDp) || 0), 0);
  const orderedTotal = lineItems.reduce((sum, item) => sum + lineItemAmount(item), 0);
  const orderedBalance = lineItems.reduce((sum, item) => sum + Math.max(0, Number(item.balanceDue) || 0), 0);
  const verificationPending = lineItems.length > 0 && lineItems.every((item) => {
    const payment = migratePaymentStatus(item.payment);
    const status = migrateOrderStatus(item.status);
    return payment === "Pending Verification" || status === "Pending Verification";
  });
  const useOrderedFigures = allocationPending || verificationPending;
  const net = useOrderedFigures
    ? orderedBalance
    : (knownRows.length < summaryRows.length ? knownNew - knownDp : (Number(workbook.totals?.net) || 0));
  const totalAmount = useOrderedFigures
    ? orderedTotal
    : (knownRows.length < summaryRows.length ? knownNew : (Number(workbook.totals?.newTotal) || 0));
  const balanceUnset = verificationPending && orderedBalance <= 0;
  const netSign = net < 0 ? "−" : net > 0 ? "+" : "";
  const netKind = net < 0 ? "Refund" : net > 0 ? "Due" : "No balance";

  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: surfaceBorderColor, opacity: archived ? 0.72 : 1 }}>
      <Box
        onClick={() => onToggle(order.id)}
        sx={{
          ...orderSummaryGridSx({ showSelect }),
          py: 1.25,
          cursor: "pointer",
          userSelect: "none",
          bgcolor: selected
            ? alpha(theme.palette.primary.main, 0.08)
            : open
              ? alpha(theme.palette.primary.main, 0.04)
              : "transparent",
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, selected ? 0.1 : 0.06) },
        }}
      >
        {showSelect ? (
          <Checkbox
            size="small"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onToggleSelect?.(order.id)}
            inputProps={{ "aria-label": `Select ${order.id}` }}
            sx={{ p: 0.5, justifySelf: "center" }}
          />
        ) : null}
        <IconButton
          size="small"
          aria-label={open ? "Collapse order" : "Expand order"}
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
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{order.id}</Typography>
                {archived ? (
                  <Chip
                    label="Archived"
                    color="default"
                    variant="outlined"
                    sx={{ ...ADMIN_STATUS_CHIP_SX, height: 22, fontSize: "0.62rem", "& .MuiChip-label": { px: 0.75 } }}
                  />
                ) : null}
              </Stack>
              <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", whiteSpace: "nowrap", fontFamily: MONO_FONT }}>
                {formatOrderTimestamp(order)}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.customer}
          </Typography>
          {order.email ? (
            <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", whiteSpace: "nowrap", fontFamily: MONO_FONT }}>
              {order.email}
            </Typography>
          ) : null}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: "nowrap" }}>
            {kinds.map((kind) => (
              <Chip
                key={kind}
                label={kind}
                variant="outlined"
                color={kind === "Pre-order" ? "secondary" : "default"}
                sx={{ ...ADMIN_STATUS_CHIP_SX, flexShrink: 0 }}
              />
            ))}
          </Stack>
          <Typography
            component="sub"
            sx={{
              display: "block",
              mt: 0.35,
              color: "text.secondary",
              fontSize: "0.68rem",
              fontFamily: MONO_FONT,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {lineItems.length} item{lineItems.length === 1 ? "" : "s"}
          </Typography>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: "primary.main", whiteSpace: "nowrap" }}>
            {PESO.format(totalAmount)}
          </Typography>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {balanceUnset ? (
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "text.secondary", whiteSpace: "nowrap" }}>
              —
            </Typography>
          ) : (
            <>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: moneyColor(net), whiteSpace: "nowrap" }}>
                {`${netSign}${netSign ? " " : ""}${PESO.format(Math.abs(net))}`}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT, whiteSpace: "nowrap" }}>
                {netKind}
              </Typography>
            </>
          )}
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
            onClick={onOpen}
            sx={ADMIN_ACTION_BUTTON_SX}
          >
            View
          </Button>
          {archived ? (
            onRestore ? (
              <Tooltip title="Restore">
                <IconButton size="small" aria-label={`Restore ${order.id}`} onClick={onRestore} color="primary">
                  <RestoreIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            ) : null
          ) : onArchive ? (
            <Tooltip title="Archive">
              <IconButton size="small" aria-label={`Archive ${order.id}`} onClick={onArchive} sx={{ color: "text.secondary" }}>
                <ArchiveIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : null}
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
            <Box sx={{ minWidth: LINEITEM_TABLE_MIN_WIDTH }}>
              <Box
                sx={{
                  ...lineItemGridSx(),
                  py: 0.85,
                  bgcolor: alpha(theme.palette.text.primary, 0.015),
                  borderBottom: "1px solid",
                  borderColor: alpha(surfaceBorderColor, 0.3),
                }}
              >
                <GridHeaderCell>Item</GridHeaderCell>
                <GridHeaderCell>Allocation</GridHeaderCell>
                <GridHeaderCell>Balance</GridHeaderCell>
                <GridHeaderCell>Payment</GridHeaderCell>
                <GridHeaderCell>Status</GridHeaderCell>
              </Box>

              {lineItems.map((item, index) => {
                const itemPayment = migratePaymentStatus(item.payment);
                const itemStatus = migrateOrderStatus(item.status);
                const lineTotal = lineItemAmount(item);
                return (
                  <Box
                    key={item.id}
                    sx={{
                      ...lineItemGridSx(),
                      py: 1,
                      borderTop: index === 0 ? "none" : "1px dashed",
                      borderColor: alpha(surfaceBorderColor, 0.3),
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", lineHeight: 1.35 }}>
                        {lineItemTrailLabel(item)}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: MONO_FONT }}>
                        {PESO.format(lineTotal)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem" }}>
                      {preorder ? allocationLabelForItem(item) : "—"}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.82rem" }}>
                      {(item.balanceDue ?? 0) > 0 ? PESO.format(item.balanceDue) : "—"}
                    </Typography>
                    <Box>
                      <Chip
                        label={itemPayment}
                        color={PAYMENT_COLOR[itemPayment] || "default"}
                        variant="outlined"
                        sx={ADMIN_STATUS_CHIP_SX}
                      />
                    </Box>
                    <Box>
                      <Chip
                        label={orderStatusLabel(itemStatus)}
                        color={STATUS_COLOR[itemStatus] || "default"}
                        variant="outlined"
                        sx={ADMIN_STATUS_CHIP_SX}
                      />
                    </Box>
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
