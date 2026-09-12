import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { MONO_FONT, getStatAccents } from "../theme.js";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { BoxIcon, CardIcon, SearchIcon, SparkleIcon, TruckIcon } from "../components/icons.jsx";
import {
  ORDER_QUEUES,
  migrateOrderStatus,
  orderMatchesKind,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { isArchivedOrder, isUnseenOrder, useOrders } from "../lib/ordersStore.jsx";
import { compareOrdersByOrderNo } from "../lib/orderIds.js";
import { buildCostByProductId } from "../lib/orderRevenue.js";
import { resolveOrderPlacedAt } from "../lib/orderTimestamps.js";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useCatalog } from "../lib/catalogStore.jsx";
import { sortRowsBy, toggleSortState } from "../lib/tableSort.js";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";
import { InfiniteScrollSentinel } from "../components/InfiniteScrollSentinel.jsx";
import { useInfiniteScroll } from "../lib/useInfiniteScroll.js";
import {
  AdminGridSortHeader,
  AdminListFilterTabs,
  ADMIN_LIST_BULK_BAR_SX,
  ADMIN_LIST_FILTER_BAR_SX,
  ADMIN_LIST_FILTER_ROW_SX,
  ADMIN_LIST_FILTER_SELECT_SX,
  ADMIN_LIST_PAGE_SX,
  ADMIN_LIST_PANEL_SX,
  ADMIN_LIST_SCROLL_SX,
  ADMIN_LIST_SEARCH_FIELD_SX,
  ADMIN_LIST_STATS_SX,
  adminStickyHeaderRowSx,
} from "./adminTableHeader.jsx";
import AddOrderDialog from "./AddOrderDialog.jsx";
import ExportOrdersDialog from "./ExportOrdersDialog.jsx";
import { MergeSimulateDialog, MergedOrdersPanel } from "./MergeOrdersGrid.jsx";
import { evaluateMergeSelection } from "../lib/orderMergeSimulation.js";
import AdminOrderAccordionRow, {
  ORDER_TABLE_MIN_WIDTH,
  orderSummaryGridSx,
} from "./AdminOrderAccordionRow.jsx";

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
const ORDERS_VIEWS = [
  { id: "individual", label: "Individual orders" },
  { id: "merged", label: "Consolidated Orders" },
];

function SortableGridHeader({ label, sortKey, sort, onSort, sx }) {
  return (
    <AdminGridSortHeader label={label} sortKey={sortKey} sort={sort} onSort={onSort} sx={sx} />
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


export default function OrdersPage() {
  const theme = useTheme();
  const accents = getStatAccents(theme);
  const navigate = useNavigate();
  const location = useLocation();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { orders, ordersError, ordersReady, archiveOrders, restoreOrders, updateOrder, sendConsolidatedAllocationEmail } = useOrders();
  const { items: inventoryItems } = useInventory();
  const { lines: catalogLines } = useCatalog();
  const costByProductId = useMemo(
    () => buildCostByProductId(inventoryItems),
    [inventoryItems],
  );
  const [queueFilter, setQueueFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [sort, setSort] = useState({ key: "order", dir: "desc" });
  const [archiveTargetIds, setArchiveTargetIds] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [ordersView, setOrdersView] = useState(
    () => (location.state?.ordersView === "merged" ? "merged" : "individual"),
  );
  const [simulateOpen, setSimulateOpen] = useState(false);
  const onMergedTab = ordersView === "merged";

  useEffect(() => {
    if (location.state?.ordersView === "merged" || location.state?.ordersView === "individual") {
      setOrdersView(location.state.ordersView);
    }
  }, [location.state]);

  function handleSort(key) {
    setSort((prev) => toggleSortState(prev, key, { defaultDir: key === "order" ? "desc" : "asc" }));
  }

  function toggleOrderAccordion(id) {
    setExpandedOrderId((current) => (current === id ? null : id));
  }

  function openOrder(id) {
    navigate(`/admin/orders/${encodeURIComponent(id)}`, {
      state: { backTo: { path: "/admin/orders", label: "orders", ordersView } },
    });
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
    if (!ids.length) return;
    setArchiveTargetIds(ids);
  }

  function openMergeSimulation() {
    const selected = orders.filter((order) => selectedIds.has(order.id) && !isArchivedOrder(order));
    if (!evaluateMergeSelection(selected).canMerge) return;
    setSimulateOpen(true);
  }

  function closeMergeSimulation() {
    setSimulateOpen(false);
  }

  function showIndividualOrders() {
    setOrdersView("individual");
  }

  function bulkRestore() {
    const ids = [...selectedIds].filter((id) => {
      const order = orders.find((row) => row.id === id);
      return order && isArchivedOrder(order);
    });
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
      if (!orderMatchesKind(o, kindFilter)) return false;
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
    if (onMergedTab) return;
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => rowIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rowIds, onMergedTab]);

  const selectedCount = selectedIds.size;
  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedIds.has(order.id) && !isArchivedOrder(order)),
    [orders, selectedIds],
  );
  const mergeSelection = useMemo(
    () => evaluateMergeSelection(selectedOrders),
    [selectedOrders],
  );
  const canMergeSelected = mergeSelection.canMerge;

  const allLoadedSelected = visibleItems.length > 0 && visibleItems.every((row) => selectedIds.has(row.id));
  const someLoadedSelected = visibleItems.some((row) => selectedIds.has(row.id));
  const archiveCount = archiveTargetIds.length;

  const queueMatch = (id) => ORDER_QUEUES.find((q) => q.id === id)?.match ?? (() => false);

  const stats = useMemo(() => {
    const review = activeOrders.filter(queueMatch("review")).length;
    const preorders = activeOrders.filter(queueMatch("preorder")).length;
    const balanceDue = activeOrders.filter(queueMatch("balance-due")).length;
    const pickup = activeOrders.filter(queueMatch("pickup")).length;
    return { total: activeOrders.length, review, preorders, balanceDue, pickup };
  }, [activeOrders]);

  const queueFilterOptions = useMemo(
    () => QUEUE_FILTERS.map((filter) => {
      if (filter.id === "archived") return filter;
      const unseen = activeOrders.filter((order) => {
        if (!isUnseenOrder(order)) return false;
        if (filter.id === "all") return true;
        return filter.match?.(order) ?? false;
      }).length;
      return unseen > 0 ? { ...filter, count: unseen } : filter;
    }),
    [activeOrders],
  );

  const { surfaceBackground } = surfaces;
  const stickyHeaderBg = theme.palette.mode === "dark" ? "#12204A" : surfaceBackground;
  return (
    <Box sx={{ ...ADMIN_LIST_PAGE_SX, gap: { xs: 1, md: ADMIN_PAGE_SPACING } }}>
      <AdminPageHeader
        eyebrow="Sales"
        title="Orders"
        subtitle={onMergedTab
          ? "Consolidated orders for the same customer."
          : "Work the pre-order pipeline: verify deposits, allocate stock, collect balance, then release for pickup."
        }
        action={(
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              disabled={!ordersReady || rows.length === 0}
              onClick={() => setExportOpen(true)}
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => setAddOpen(true)}
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
            >
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

      {/* ── KPIs, then CMS-style tabs; filters + grid live inside the tab ── */}
      <Stack spacing={{ xs: 1, md: ADMIN_PAGE_SPACING }} sx={{ flexShrink: 0 }}>
        <Grid container spacing={2} sx={ADMIN_LIST_STATS_SX}>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Total orders" value={stats.total} accent={accents[0]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Needs review" value={stats.review} accent={accents[1]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={BoxIcon} label="Balance due" value={stats.balanceDue} accent={accents[2]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={TruckIcon} label="Awaiting pickup" value={stats.pickup} accent={theme.palette.success.main} /></Grid>
        </Grid>

        <Tabs
          value={ordersView}
          onChange={(_, value) => { if (value) setOrdersView(value); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: "1px solid",
            borderColor: surfaceBorderColor,
            minHeight: 48,
          }}
        >
          {ORDERS_VIEWS.map((item) => (
            <Tab key={item.id} value={item.id} label={item.label} />
          ))}
        </Tabs>
      </Stack>

      {!onMergedTab ? (
        <Box sx={{ ...panelSx, ...ADMIN_LIST_FILTER_BAR_SX, flexShrink: 0 }}>
          <Stack spacing={1.25} sx={{ width: "100%", minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              sx={{ ...ADMIN_LIST_FILTER_ROW_SX, display: { xs: "none", md: "flex" } }}
            >
              <AdminListFilterTabs
                label="Queue"
                labelId="orders-queue-filter"
                options={queueFilterOptions}
                value={queueFilter}
                onChange={setQueueFilter}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
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
              <Box sx={{ flex: 1, minWidth: 8 }} />
              {selectedCount === 0 ? (
                <Chip
                  label={allLoadedSelected ? "Deselect loaded" : "Select loaded"}
                  onClick={toggleSelectAllLoaded}
                  disabled={!visibleItems.length}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              ) : null}
              <TextField
                size="small"
                placeholder="Search order, customer, item…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={ADMIN_LIST_SEARCH_FIELD_SX}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
              />
            </Stack>

            <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, width: "100%", minWidth: 0 }}>
              <AdminListFilterTabs
                label="Queue"
                labelId="orders-queue-filter-mobile"
                options={queueFilterOptions}
                value={queueFilter}
                onChange={setQueueFilter}
              />
              <FormControl size="small" sx={ADMIN_LIST_FILTER_SELECT_SX}>
                <InputLabel id="orders-kind-filter-mobile">Kind</InputLabel>
                <Select
                  labelId="orders-kind-filter-mobile"
                  label="Kind"
                  value={kindFilter}
                  onChange={(event) => setKindFilter(event.target.value)}
                >
                  {KIND_FILTERS.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                placeholder="Search order, customer, item…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                fullWidth
                sx={ADMIN_LIST_SEARCH_FIELD_SX}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
              />
            </Stack>
          </Stack>
        </Box>
      ) : null}

      <Box sx={{ ...ADMIN_LIST_PANEL_SX, ...panelSx }}>
        {!onMergedTab && selectedCount > 0 ? (
          <Stack
            sx={{
              ...ADMIN_LIST_BULK_BAR_SX,
              px: { xs: 1.25, md: 2 },
              py: 1,
              borderBottom: "1px solid",
              borderColor: surfaceBorderColor,
              flexShrink: 0,
            }}
          >
            <Chip
              label={`${selectedCount} selected`}
              onDelete={() => setSelectedIds(new Set())}
              sx={{ fontWeight: 700 }}
            />
            {!viewingArchived ? (
              <Tooltip title={!canMergeSelected ? mergeSelection.blockReason : ""}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    disabled={!canMergeSelected}
                    onClick={openMergeSimulation}
                    sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
                  >
                    Merge & simulate
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {viewingArchived ? (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={bulkRestore}
                sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
              >
                Restore
              </Button>
            ) : (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={requestBulkArchive}
                sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
              >
                Archive
              </Button>
            )}
          </Stack>
        ) : null}
        {onMergedTab ? (
          <MergedOrdersPanel
            orders={orders}
            updateOrder={updateOrder}
            sendConsolidatedAllocationEmail={sendConsolidatedAllocationEmail}
            surfaceBorderColor={surfaceBorderColor}
            stickyHeaderBg={stickyHeaderBg}
            onBack={showIndividualOrders}
            onOpenOrder={openOrder}
          />
        ) : !ordersReady ? (
          <Stack spacing={1.5} alignItems="center" sx={{ py: 6, color: "text.secondary" }}>
            <CircularProgress size={26} />
            <Typography variant="body2">Loading orders from Firestore…</Typography>
          </Stack>
        ) : totalCount === 0 ? (
          <Typography sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
            No orders match your filters.
          </Typography>
        ) : (
          <Box ref={scrollRootRef} sx={ADMIN_LIST_SCROLL_SX}>
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
        onCreated={(id) => navigate(`/admin/orders/${encodeURIComponent(id)}`, {
          state: { backTo: { path: "/admin/orders", label: "orders" } },
        })}
      />

      <MergeSimulateDialog
        open={simulateOpen}
        orders={selectedOrders}
        allOrders={orders}
        updateOrder={updateOrder}
        sendConsolidatedAllocationEmail={sendConsolidatedAllocationEmail}
        surfaceBorderColor={surfaceBorderColor}
        onClose={closeMergeSimulation}
        onApplied={() => {
          setSimulateOpen(false);
          setOrdersView("merged");
        }}
      />

      <ExportOrdersDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        orders={rows}
        catalogLines={catalogLines}
        costByProductId={costByProductId}
        surfaceBorderColor={surfaceBorderColor}
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
