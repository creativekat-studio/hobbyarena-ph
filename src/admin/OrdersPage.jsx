import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate, useOutletContext } from "react-router-dom";
import { MONO_FONT, getStatAccents } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { BoxIcon, CardIcon, SearchIcon, SparkleIcon, TruckIcon } from "../components/icons.jsx";
import {
  ORDER_QUEUES,
  PAYMENT_COLOR,
  STATUS_COLOR,
  allocationLabelForItem,
  getOrderLineItems,
  getOrderStage,
  isBalanceDuePreorderStatus,
  isPreorderOrder,
  lineItemTrailLabel,
  migratePaymentStatus,
  migrateOrderStatus,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { useOrders } from "../lib/ordersStore.jsx";
import { sortOrdersByOrderNo } from "../lib/orderIds.js";
import AddOrderDialog from "./AddOrderDialog.jsx";

const ORDER_SUMMARY_GRID = "28px minmax(140px, 1.1fr) minmax(120px, 1fr) minmax(120px, 1.2fr) minmax(120px, 0.9fr) auto";
const LINEITEM_GRID = "minmax(160px, 1.6fr) minmax(110px, 0.9fr) minmax(80px, 0.7fr) minmax(90px, 0.7fr) minmax(120px, 0.95fr) minmax(120px, 0.95fr)";
const ORDER_TABLE_MIN_WIDTH = 720;
const LINEITEM_TABLE_MIN_WIDTH = 720;

function orderSummaryGridSx(overrides = {}) {
  return {
    display: "grid",
    gridTemplateColumns: ORDER_SUMMARY_GRID,
    columnGap: { xs: 1, md: 1.5 },
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
    px: { xs: 1.25, md: 2 },
    ...overrides,
  };
}

function lineItemGridSx(overrides = {}) {
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

function GridHeaderCell({ children, sx }) {
  return (
    <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", color: "text.secondary", ...sx }}>
      {children}
    </Typography>
  );
}

function StatCard({ panelSx, icon, label, value, accent }) {
  const theme = useTheme();
  const Icon = icon;
  const color = accent || theme.palette.primary.main;
  return (
    <Box sx={{ ...panelSx, p: 2.5, height: "100%" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 44, height: 44, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", color, bgcolor: alpha(color, 0.14) }}>
          <Icon />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.3rem" }}>{value}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{label}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

const DONE_STATUSES = new Set(["Fulfilled", "Refunded"]);

function isLineItemDone(item) {
  return DONE_STATUSES.has(migrateOrderStatus(item.status));
}

function AdminOrderAccordionRow({ order, surfaceBorderColor, onOpen, open, onToggle }) {
  const theme = useTheme();
  const lineItems = getOrderLineItems(order);
  const multiItem = lineItems.length > 1;
  const preorder = isPreorderOrder(order);
  const status = migrateOrderStatus(order.status);
  const needsReview = lineItems.some((item) => migratePaymentStatus(item.payment) === "Pending Verification");

  const doneCount = lineItems.filter(isLineItemDone).length;
  const allDone = lineItems.length > 0 && doneCount === lineItems.length;

  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
      <Box
        onClick={() => onToggle(order.id)}
        sx={{
          ...orderSummaryGridSx(),
          py: 1.25,
          cursor: "pointer",
          userSelect: "none",
          bgcolor: open ? alpha(theme.palette.primary.main, 0.04) : "transparent",
          "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
        }}
      >
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
            {needsReview ? (
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }} title="Needs payment review" />
            ) : null}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.85rem" }}>{order.id}</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{order.date}</Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {order.customer}
          </Typography>
          <Chip label={order.type} size="small" variant="outlined" color={order.type === "Pre-order" ? "secondary" : "default"} sx={{ height: 20, fontSize: "0.62rem", mt: 0.25 }} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {multiItem ? (
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>{lineItems.length} items</Typography>
          ) : (
            <Typography sx={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.items}</Typography>
          )}
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>Qty {order.qty}</Typography>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {allDone ? (
            <Chip label={orderStatusLabel(status)} size="small" color={STATUS_COLOR[status] || "default"} variant="outlined" sx={{ maxWidth: "100%" }} />
          ) : (
            <Tooltip
              arrow
              title={(
                <Box sx={{ py: 0.5 }}>
                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, mb: 0.5 }}>
                    {doneCount} of {lineItems.length} items fulfilled
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
                  size="small"
                  variant="outlined"
                  color={doneCount > 0 ? "warning" : "default"}
                  sx={{ fontFamily: MONO_FONT, fontWeight: 700, maxWidth: "100%" }}
                />
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "1px solid",
                    borderColor: "text.disabled",
                    color: "text.secondary",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    fontStyle: "italic",
                    fontFamily: "serif",
                  }}
                >
                  i
                </Box>
              </Stack>
            </Tooltip>
          )}
        </Box>

        <Button
          size="small"
          variant="outlined"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4 }}
        >
          View
        </Button>
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
                const lineTotal = item.lineTotal ?? (item.price ?? 0) * (item.quantity ?? 1);
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
                      <Chip label={itemPayment} size="small" color={PAYMENT_COLOR[itemPayment] || "default"} variant="outlined" sx={{ fontSize: "0.65rem", height: 24, maxWidth: "100%" }} />
                    </Box>
                    <Box>
                      <Chip label={orderStatusLabel(itemStatus)} size="small" color={STATUS_COLOR[itemStatus] || "default"} sx={{ fontSize: "0.65rem", height: 24, maxWidth: "100%" }} />
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

export default function OrdersPage() {
  const theme = useTheme();
  const accents = getStatAccents(theme);
  const navigate = useNavigate();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { orders, ordersError, ordersReady } = useOrders();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  function toggleOrderAccordion(id) {
    setExpandedOrderId((current) => (current === id ? null : id));
  }

  function openOrder(id) {
    navigate(`/admin/orders/${encodeURIComponent(id)}`);
  }

  const activeQueue = ORDER_QUEUES.find((q) => q.id === filter) ?? ORDER_QUEUES[0];

  const rows = useMemo(() => {
    return sortOrdersByOrderNo(orders.filter((o) => {
      const matchesQuery =
        !query.trim() ||
        o.id.toLowerCase().includes(query.toLowerCase()) ||
        o.customer.toLowerCase().includes(query.toLowerCase()) ||
        o.items.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (filter === "all") return true;
      return activeQueue.match?.(o) ?? false;
    }));
  }, [orders, filter, query, activeQueue]);

  const stats = useMemo(() => {
    const review = orders.filter((o) => migratePaymentStatus(o.payment) === "Pending Verification").length;
    const preorders = orders.filter((o) => o.type === "Pre-order").length;
    const balanceDue = orders.filter((o) =>
      isPreorderOrder(o) && (
        isBalanceDuePreorderStatus(migrateOrderStatus(o.status))
        || getOrderLineItems(o).some((item) => isBalanceDuePreorderStatus(item.status))
      ),
    ).length;
    const pickup = orders.filter((o) => migrateOrderStatus(o.status) === "Ready for Pickup").length;
    return { total: orders.length, review, preorders, balanceDue, pickup };
  }, [orders]);

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      {ordersError ? (
        <Alert severity="error">
          {ordersError}
          {" "}
          Run <code>yarn firebase:deploy:rules</code> if this is a new Firebase project.
        </Alert>
      ) : null}

      <AdminPageHeader
        eyebrow="Sales"
        title="Orders"
        subtitle="Work the pre-order pipeline: verify deposits, allocate stock, collect balance, then release for pickup."
        action={(
          <Button variant="contained" color="primary" onClick={() => setAddOpen(true)} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", flexShrink: 0, fontSize: "0.78rem" }}>
            Add order
          </Button>
        )}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Total orders" value={stats.total} accent={accents[0]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Needs review" value={stats.review} accent={accents[1]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={BoxIcon} label="Balance due" value={stats.balanceDue} accent={accents[2]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={TruckIcon} label="Awaiting pickup" value={stats.pickup} accent={theme.palette.success.main} /></Grid>
      </Grid>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {ORDER_QUEUES.map((item) => (
              <Chip key={item.id} label={item.label} onClick={() => setFilter(item.id)} color={filter === item.id ? "primary" : "default"} variant={filter === item.id ? "filled" : "outlined"} sx={{ fontWeight: 700 }} />
            ))}
          </Stack>
          <TextField
            size="small"
            placeholder="Search order, customer, item…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: { xs: "100%", md: 280 } }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
          />
        </Stack>
      </Box>

      <Box sx={{ ...panelSx, overflow: "hidden" }}>
        {!ordersReady ? (
          <Stack spacing={1.5} alignItems="center" sx={{ py: 6, color: "text.secondary" }}>
            <CircularProgress size={26} />
            <Typography variant="body2">Loading orders from Firestore…</Typography>
          </Stack>
        ) : rows.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
            No orders match your filters.
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Box
              sx={{
                ...orderSummaryGridSx(),
                py: 1.25,
                borderBottom: "1px solid",
                borderColor: surfaceBorderColor,
                bgcolor: alpha(theme.palette.text.primary, 0.03),
                minWidth: ORDER_TABLE_MIN_WIDTH,
              }}
            >
              <Box />
              <GridHeaderCell>Order</GridHeaderCell>
              <GridHeaderCell>Customer</GridHeaderCell>
              <GridHeaderCell>Items</GridHeaderCell>
              <GridHeaderCell>Status</GridHeaderCell>
              <Box />
            </Box>

            <Box sx={{ minWidth: ORDER_TABLE_MIN_WIDTH }}>
              {rows.map((order) => (
                <AdminOrderAccordionRow
                  key={order.id}
                  order={order}
                  surfaceBorderColor={surfaceBorderColor}
                  open={expandedOrderId === order.id}
                  onToggle={toggleOrderAccordion}
                  onOpen={() => openOrder(order.id)}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <AddOrderDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        surfaceBorderColor={surfaceBorderColor}
        onCreated={(id) => navigate(`/admin/orders/${encodeURIComponent(id)}`)}
      />
    </Stack>
  );
}
