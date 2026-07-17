import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate, useOutletContext } from "react-router-dom";
import { MONO_FONT, getStatAccents } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { ArchiveIcon, BoxIcon, CardIcon, RestoreIcon, SearchIcon, SparkleIcon, TruckIcon } from "../components/icons.jsx";
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
import { isArchivedOrder, useOrders } from "../lib/ordersStore.jsx";
import { compareOrdersByOrderNo } from "../lib/orderIds.js";
import { exportOrdersToExcel } from "../lib/ordersExcelExport.js";
import { formatOrderTimestamp, resolveOrderPlacedAt } from "../lib/orderTimestamps.js";
import { sortRowsBy, toggleSortState } from "../lib/tableSort.js";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";
import { InfiniteScrollSentinel } from "../components/InfiniteScrollSentinel.jsx";
import { useInfiniteScroll } from "../lib/useInfiniteScroll.js";
import { AdminGridHeaderLabel, AdminGridSortHeader, adminStickyHeaderRowSx } from "./adminTableHeader.jsx";
import AddOrderDialog from "./AddOrderDialog.jsx";

const ORDER_SORT_ACCESSORS = {
  order: (o) => resolveOrderPlacedAt(o)?.getTime() ?? 0,
  customer: (o) => o.customer || "",
  items: (o) => o.items || "",
  status: (o) => orderStatusLabel(migrateOrderStatus(o.status)),
};

const QUEUE_FILTERS = [
  ...ORDER_QUEUES.filter((q) => q.id !== "preorder" && q.id !== "instock"),
  { id: "archived", label: "Archived" },
];
const KIND_FILTERS = [
  { id: "all", label: "All kinds" },
  { id: "preorder", label: "Pre-orders" },
  { id: "instock", label: "In-stock" },
];

const FILTER_TOGGLE_SX = {
  px: 1.5,
  fontFamily: MONO_FONT,
  fontSize: "0.68rem",
  letterSpacing: 0.4,
  textTransform: "uppercase",
  fontWeight: 700,
};

const ORDER_SUMMARY_GRID = "36px 28px minmax(140px, 1.1fr) minmax(120px, 1fr) minmax(120px, 1.2fr) minmax(120px, 0.9fr) auto";
const LINEITEM_GRID = "minmax(160px, 1.25fr) minmax(100px, 0.85fr) minmax(72px, 0.6fr) minmax(88px, 0.65fr) minmax(110px, 0.85fr) minmax(110px, 0.85fr)";
const ORDER_TABLE_MIN_WIDTH = 760;
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

function SortableGridHeader({ label, sortKey, sort, onSort, sx }) {
  return (
    <AdminGridSortHeader label={label} sortKey={sortKey} sort={sort} onSort={onSort} sx={sx} />
  );
}

function GridHeaderCell({ children, sx }) {
  return <AdminGridHeaderLabel sx={sx}>{children}</AdminGridHeaderLabel>;
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

function AdminOrderAccordionRow({
  order,
  surfaceBorderColor,
  onOpen,
  open,
  onToggle,
  onArchive,
  onRestore,
  selected,
  onToggleSelect,
}) {
  const theme = useTheme();
  const lineItems = getOrderLineItems(order);
  const multiItem = lineItems.length > 1;
  const preorder = isPreorderOrder(order);
  const status = migrateOrderStatus(order.status);
  const archived = isArchivedOrder(order);
  const needsReview = !archived && lineItems.some((item) => migratePaymentStatus(item.payment) === "Pending Verification");

  const doneCount = lineItems.filter(isLineItemDone).length;
  const allDone = lineItems.length > 0 && doneCount === lineItems.length;

  return (
    <Box sx={{ borderBottom: "1px solid", borderColor: surfaceBorderColor, opacity: archived ? 0.72 : 1 }}>
      <Box
        onClick={() => onToggle(order.id)}
        sx={{
          ...orderSummaryGridSx(),
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
        <Checkbox
          size="small"
          checked={selected}
          onClick={(event) => event.stopPropagation()}
          onChange={() => onToggleSelect(order.id)}
          inputProps={{ "aria-label": `Select ${order.id}` }}
          sx={{ p: 0.5, justifySelf: "center" }}
        />
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
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap" }}>{order.id}</Typography>
                {archived ? (
                  <Chip label="Archived" size="small" color="default" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />
                ) : null}
              </Stack>
              <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", whiteSpace: "nowrap", fontFamily: MONO_FONT }}>
                {formatOrderTimestamp(order)}
              </Typography>
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
            <Tooltip title="Restore">
              <IconButton size="small" aria-label={`Restore ${order.id}`} onClick={onRestore} color="primary">
                <RestoreIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Archive">
              <IconButton size="small" aria-label={`Archive ${order.id}`} onClick={onArchive} sx={{ color: "text.secondary" }}>
                <ArchiveIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
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
  const { orders, ordersError, ordersReady, archiveOrders, restoreOrders } = useOrders();
  const [queueFilter, setQueueFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [sort, setSort] = useState({ key: "order", dir: "desc" });
  const [archiveTargetIds, setArchiveTargetIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [actionsAnchor, setActionsAnchor] = useState(null);

  function handleSort(key) {
    setSort((prev) => toggleSortState(prev, key, { defaultDir: key === "order" ? "desc" : "asc" }));
  }

  function toggleOrderAccordion(id) {
    setExpandedOrderId((current) => (current === id ? null : id));
  }

  function openOrder(id) {
    navigate(`/admin/orders/${encodeURIComponent(id)}`);
  }

  function handleExportExcel() {
    exportOrdersToExcel(rows);
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllLoaded() {
    const allLoadedSelected = visibleItems.length > 0 && visibleItems.every((row) => selectedIds.has(row.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allLoadedSelected) {
        visibleItems.forEach((row) => next.delete(row.id));
      } else {
        visibleItems.forEach((row) => next.add(row.id));
      }
      return next;
    });
  }

  function requestBulkArchive() {
    const ids = [...selectedIds].filter((id) => {
      const order = orders.find((row) => row.id === id);
      return order && !isArchivedOrder(order);
    });
    setActionsAnchor(null);
    if (!ids.length) return;
    setArchiveTargetIds(ids);
  }

  function bulkRestore() {
    const ids = [...selectedIds].filter((id) => {
      const order = orders.find((row) => row.id === id);
      return order && isArchivedOrder(order);
    });
    setActionsAnchor(null);
    if (!ids.length) return;
    restoreOrders(ids);
    setSelectedIds(new Set());
  }

  function confirmArchiveOrders() {
    if (!archiveTargetIds.length) return;
    archiveOrders(archiveTargetIds);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      archiveTargetIds.forEach((id) => next.delete(id));
      return next;
    });
    setArchiveTargetIds([]);
  }

  const activeQueue = QUEUE_FILTERS.find((q) => q.id === queueFilter) ?? QUEUE_FILTERS[0];
  const viewingArchived = queueFilter === "archived";

  const activeOrders = useMemo(
    () => orders.filter((o) => !isArchivedOrder(o)),
    [orders],
  );

  const rows = useMemo(() => {
    const filtered = orders.filter((o) => {
      const archived = isArchivedOrder(o);
      if (viewingArchived) {
        if (!archived) return false;
      } else if (archived) {
        return false;
      }
      const matchesQuery =
        !query.trim() ||
        o.id.toLowerCase().includes(query.toLowerCase()) ||
        o.customer.toLowerCase().includes(query.toLowerCase()) ||
        o.items.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (kindFilter === "preorder" && o.type !== "Pre-order") return false;
      if (kindFilter === "instock" && o.type !== "In-stock") return false;
      if (queueFilter === "all" || viewingArchived) return true;
      return activeQueue.match?.(o) ?? false;
    });
    return sortRowsBy(filtered, sort, ORDER_SORT_ACCESSORS, (a, b) => compareOrdersByOrderNo(a, b));
  }, [orders, queueFilter, kindFilter, query, activeQueue, sort, viewingArchived]);

  const {
    visibleItems,
    rootRef: scrollRootRef,
    sentinelRef,
    hasMore,
    visibleCount,
    totalCount,
  } = useInfiniteScroll(rows, { pageSize: 40 });

  const rowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => rowIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rowIds]);

  const selectedCount = selectedIds.size;
  const allLoadedSelected = visibleItems.length > 0 && visibleItems.every((row) => selectedIds.has(row.id));
  const someLoadedSelected = visibleItems.some((row) => selectedIds.has(row.id));
  const archiveCount = archiveTargetIds.length;

  const stats = useMemo(() => {
    const review = activeOrders.filter((o) => migratePaymentStatus(o.payment) === "Pending Verification").length;
    const preorders = activeOrders.filter((o) => o.type === "Pre-order").length;
    const balanceDue = activeOrders.filter((o) =>
      isPreorderOrder(o) && (
        isBalanceDuePreorderStatus(migrateOrderStatus(o.status))
        || getOrderLineItems(o).some((item) => isBalanceDuePreorderStatus(item.status))
      ),
    ).length;
    const pickup = activeOrders.filter((o) => migrateOrderStatus(o.status) === "Ready for Pickup").length;
    return { total: activeOrders.length, review, preorders, balanceDue, pickup };
  }, [activeOrders]);

  const { surfaceBackground } = surfaces;
  const stickyHeaderBg = theme.palette.mode === "dark" ? "#12204A" : surfaceBackground;

  return (
    /*
     * flex: 1 + minHeight: 0 makes this page fill the scrollable content pane in AdminLayout.
     * The chrome (stats + filters) is flexShrink: 0 so it never scrolls away.
     * The grid panel takes flex: 1 and scrolls its rows internally.
     */
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: (t) => t.spacing(ADMIN_PAGE_SPACING) }}>
      <AdminPageHeader
        eyebrow="Sales"
        title="Orders"
        subtitle="Work the pre-order pipeline: verify deposits, allocate stock, collect balance, then release for pickup."
        action={(
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              color="primary"
              disabled={!ordersReady || rows.length === 0}
              onClick={handleExportExcel}
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.78rem" }}
            >
              Export to Excel
            </Button>
            <Button variant="contained" color="primary" onClick={() => setAddOpen(true)} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.78rem" }}>
              Add order
            </Button>
          </Stack>
        )}
      />

      {ordersError ? (
        <Alert severity="error">
          {ordersError}
          {" "}
          Run <code>yarn firebase:deploy:rules</code> if this is a new Firebase project.
        </Alert>
      ) : null}

      {/* ── Sticky upper chrome: stat cards + filter bar ── */}
      <Stack spacing={ADMIN_PAGE_SPACING} sx={{ flexShrink: 0 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Total orders" value={stats.total} accent={accents[0]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Needs review" value={stats.review} accent={accents[1]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={BoxIcon} label="Balance due" value={stats.balanceDue} accent={accents[2]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={TruckIcon} label="Awaiting pickup" value={stats.pickup} accent={theme.palette.success.main} /></Grid>
        </Grid>

        <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={queueFilter}
              onChange={(_, next) => { if (next) setQueueFilter(next); }}
              sx={{ flexWrap: "wrap" }}
            >
              {QUEUE_FILTERS.map((item) => (
                <ToggleButton key={item.id} value={item.id} sx={FILTER_TOGGLE_SX}>
                  {item.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 150 } }}>
              <InputLabel id="orders-kind-filter">Kind</InputLabel>
              <Select
                labelId="orders-kind-filter"
                label="Kind"
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value)}
              >
                {KIND_FILTERS.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
              {selectedCount > 0 ? (
                <>
                  <Chip
                    label={`${selectedCount} selected`}
                    onDelete={() => setSelectedIds(new Set())}
                    sx={{ fontWeight: 700 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={(event) => setActionsAnchor(event.currentTarget)}
                    sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
                  >
                    Actions
                  </Button>
                  <Menu
                    anchorEl={actionsAnchor}
                    open={Boolean(actionsAnchor)}
                    onClose={() => setActionsAnchor(null)}
                  >
                    {viewingArchived ? (
                      <MenuItem onClick={bulkRestore}>Restore</MenuItem>
                    ) : (
                      <MenuItem onClick={requestBulkArchive} sx={{ color: "error.main" }}>Archive…</MenuItem>
                    )}
                  </Menu>
                </>
              ) : (
                <Chip
                  label={allLoadedSelected ? "Deselect loaded" : "Select loaded"}
                  onClick={toggleSelectAllLoaded}
                  disabled={!visibleItems.length}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}

              <TextField
                size="small"
                placeholder="Search order, customer, item…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ minWidth: { xs: "100%", sm: 260 } }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
              />
            </Stack>
          </Stack>
        </Box>
      </Stack>

      {/* ── Scrolling grid panel ── */}
      <Box sx={{ flex: 1, minHeight: 0, ...panelSx, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!ordersReady ? (
          <Stack spacing={1.5} alignItems="center" sx={{ py: 6, color: "text.secondary" }}>
            <CircularProgress size={26} />
            <Typography variant="body2">Loading orders from Firestore…</Typography>
          </Stack>
        ) : totalCount === 0 ? (
          <Typography sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
            No orders match your filters.
          </Typography>
        ) : (
          /* Single overflow: auto container handles both horizontal and vertical scroll.
             The column header row is position: sticky so it stays visible while rows scroll. */
          <Box ref={scrollRootRef} sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <Box sx={{ minWidth: ORDER_TABLE_MIN_WIDTH }}>
              <Box
                sx={{
                  ...orderSummaryGridSx(),
                  py: 1.25,
                  ...adminStickyHeaderRowSx(stickyHeaderBg, surfaceBorderColor),
                }}
              >
                <Checkbox
                  size="small"
                  indeterminate={someLoadedSelected && !allLoadedSelected}
                  checked={allLoadedSelected}
                  onChange={toggleSelectAllLoaded}
                  inputProps={{ "aria-label": "Select loaded orders" }}
                  sx={{ p: 0.5, justifySelf: "center" }}
                />
                <Box />
                <SortableGridHeader label="Order" sortKey="order" sort={sort} onSort={handleSort} />
                <SortableGridHeader label="Customer" sortKey="customer" sort={sort} onSort={handleSort} />
                <SortableGridHeader label="Items" sortKey="items" sort={sort} onSort={handleSort} />
                <SortableGridHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />
                <Box />
              </Box>

              {visibleItems.map((order) => (
                <AdminOrderAccordionRow
                  key={order.id}
                  order={order}
                  surfaceBorderColor={surfaceBorderColor}
                  open={expandedOrderId === order.id}
                  onToggle={toggleOrderAccordion}
                  onOpen={() => openOrder(order.id)}
                  onArchive={() => setArchiveTargetIds([order.id])}
                  onRestore={() => restoreOrders([order.id])}
                  selected={selectedIds.has(order.id)}
                  onToggleSelect={toggleSelect}
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
        )}
      </Box>

      <AddOrderDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        surfaceBorderColor={surfaceBorderColor}
        onCreated={(id) => navigate(`/admin/orders/${encodeURIComponent(id)}`)}
      />

      <TypeConfirmDialog
        open={archiveCount > 0}
        onClose={() => setArchiveTargetIds([])}
        onConfirm={confirmArchiveOrders}
        title={archiveCount > 1 ? `Archive ${archiveCount} orders` : "Archive order"}
        description={
          archiveCount > 1
            ? `Archive ${archiveCount} selected orders. They will be hidden from active queues and dashboard stats, but can be restored from the Archived filter.`
            : "Archive this order. It will be hidden from active queues and dashboard stats, but can be restored from the Archived filter."
        }
        confirmLabel={archiveCount > 1 ? `Archive ${archiveCount}` : "Archive"}
        confirmWord="archive"
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}
