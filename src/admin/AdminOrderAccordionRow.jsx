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
import { ArchiveIcon, RestoreIcon } from "../components/icons.jsx";
import { ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import { AdminGridHeaderLabel } from "./adminTableHeader.jsx";
import {
  PAYMENT_COLOR,
  STATUS_COLOR,
  allocationLabelForItem,
  getOrderLineItems,
  getOrderStage,
  isPreorderOrder,
  lineItemTrailLabel,
  migratePaymentStatus,
  migrateOrderStatus,
  orderKindLabels,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { isArchivedOrder, isUnseenOrder } from "../lib/ordersStore.jsx";
import { lineItemAmount } from "../lib/orderRevenue.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";

export const ORDER_SUMMARY_GRID = "36px 28px minmax(140px, 1.1fr) minmax(120px, 1fr) minmax(140px, 1.3fr) minmax(120px, 0.9fr) auto";
export const ORDER_SUMMARY_GRID_NO_SELECT = "28px minmax(140px, 1.1fr) minmax(120px, 1fr) minmax(140px, 1.3fr) minmax(120px, 0.9fr) auto";
export const LINEITEM_GRID = "minmax(160px, 1.25fr) minmax(100px, 0.85fr) minmax(72px, 0.6fr) minmax(88px, 0.65fr) minmax(110px, 0.85fr) minmax(110px, 0.85fr)";
export const ORDER_TABLE_MIN_WIDTH = 760;
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

const DONE_STATUSES = new Set(["Fulfilled", "Refunded", "Unpaid"]);

function isLineItemDone(item) {
  return DONE_STATUSES.has(migrateOrderStatus(item.status));
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
  const multiItem = lineItems.length > 1;
  const preorder = isPreorderOrder(order);
  const status = migrateOrderStatus(order.status);
  const archived = isArchivedOrder(order);
  const hasUnseenActivity = !archived && isUnseenOrder(order);

  const doneCount = lineItems.filter(isLineItemDone).length;
  const allDone = lineItems.length > 0 && doneCount === lineItems.length;

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
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.5 }}
          >
            {orderKindLabels(order).map((kind) => (
              <Chip
                key={kind}
                label={kind}
                variant="outlined"
                color={kind === "Pre-order" ? "secondary" : "default"}
                sx={ADMIN_STATUS_CHIP_SX}
              />
            ))}
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {multiItem ? (
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>{lineItems.length} items</Typography>
          ) : (
            <Typography sx={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.items}</Typography>
          )}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {allDone ? (
            <Chip
              label={orderStatusLabel(status)}
              color={STATUS_COLOR[status] || "default"}
              variant="outlined"
              sx={ADMIN_STATUS_CHIP_SX}
            />
          ) : (
            <Tooltip
              arrow
              title={(
                <Box sx={{ py: 0.5 }}>
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, mb: 0.5 }}>
                    {doneCount} of {lineItems.length} items closed
                  </Typography>
                  <Stack spacing={0.25}>
                    {lineItems.map((item) => (
                      <Typography key={item.id} sx={{ fontSize: "0.7rem" }}>
                        {isLineItemDone(item) ? "✓" : "•"} {lineItemTrailLabel(item)} — {orderStatusLabel(item.status)}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            >
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ cursor: "help", width: "fit-content" }}>
                <Chip
                  label={`${doneCount}/${lineItems.length}`}
                  variant="outlined"
                  color={doneCount > 0 ? "warning" : "default"}
                  sx={ADMIN_STATUS_CHIP_SX}
                />
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "1px solid",
                    borderColor: "text.disabled",
                    color: "text.secondary",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    fontStyle: "italic",
                  }}
                >
                  i
                </Box>
              </Stack>
            </Tooltip>
          )}
        </Box>

        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" onClick={(event) => event.stopPropagation()}>
          <Button
            size="small"
            variant="outlined"
            onClick={onOpen}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4 }}
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
                <GridHeaderCell>Stage</GridHeaderCell>
                <GridHeaderCell>Allocation</GridHeaderCell>
                <GridHeaderCell sx={{ textAlign: "right" }}>Balance</GridHeaderCell>
                <GridHeaderCell>Payment</GridHeaderCell>
                <GridHeaderCell>Status</GridHeaderCell>
              </Box>

              {lineItems.map((item, index) => {
                const itemPayment = migratePaymentStatus(item.payment);
                const itemStatus = migrateOrderStatus(item.status);
                const itemStage = getOrderStage({ ...order, payment: item.payment, status: item.status, lineItems: [item] });
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
                    <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>
                      {itemStage}
                    </Typography>
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem" }}>
                      {preorder ? allocationLabelForItem(item) : "—"}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", textAlign: "right" }}>
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
