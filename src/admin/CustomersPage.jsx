import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { MONO_FONT, getStatAccents } from "../theme.js";
import { avatarStyles } from "../lib/surfaces.js";
import { PESO } from "../components/ProductCard.jsx";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import {
  CardIcon,
  CollapseCornersIcon,
  ExpandCornersIcon,
  SearchIcon,
  SparkleIcon,
  UserIcon,
} from "../components/icons.jsx";
import { InfiniteScrollTableSentinel } from "../components/InfiniteScrollSentinel.jsx";
import {
  AdminListFilterTabs,
  AdminTableHeaderCell,
  AdminTableSortHeader,
  ADMIN_LIST_FILTER_BAR_SX,
  ADMIN_LIST_FILTER_ROW_SX,
  ADMIN_LIST_FILTER_SELECT_SX,
  ADMIN_LIST_PAGE_SX,
  ADMIN_LIST_PANEL_SX,
  ADMIN_LIST_SCROLL_SX,
  ADMIN_LIST_SEARCH_FIELD_SX,
  ADMIN_LIST_STATS_SX,
} from "./adminTableHeader.jsx";
import { ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import { useCustomers } from "../lib/customersStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useClientTiers } from "../lib/clientTiersStore.jsx";
import { useInfiniteScroll } from "../lib/useInfiniteScroll.js";
import {
  computeFulfilledSpendForEmail,
  computeTotalSpentForEmail,
  getNextTierProgress,
  resolveClientTier,
} from "../lib/clientTier.js";
import { sortOrdersByOrderNo } from "../lib/orderIds.js";
import { orderCustomerTotal } from "../lib/orderRevenue.js";
import { formatOrderTimestamp, resolveOrderPlacedAt } from "../lib/orderTimestamps.js";
import {
  getOrderLineItems,
  lineItemTrailLabel,
  migrateOrderStatus,
  migratePaymentStatus,
  orderStatusLabel,
  PAYMENT_COLOR,
  STATUS_COLOR,
} from "../data/orderWorkflow.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "marketing", label: "Opt-in" },
  { id: "active", label: "Active" },
  { id: "dormant", label: "Dormant" },
];

const AUTH_PROVIDER_LABEL = {
  google: "Google",
  password: "Email",
  guest: "Guest",
  unknown: "Web",
};

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

function customerStatus(orderCount, lastOrderDate) {
  if (!orderCount) return "New";
  if (!lastOrderDate) return "Active";
  const days = (Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
  return days > 90 ? "Dormant" : "Active";
}

function customerStatusChipSx(status, theme) {
  const dark = theme.palette.mode === "dark";
  const tones = {
    New: {
      color: dark ? theme.palette.info.light : theme.palette.info.dark,
      bgcolor: alpha(theme.palette.info.main, dark ? 0.22 : 0.12),
    },
    Active: {
      color: dark ? theme.palette.success.light : theme.palette.success.dark,
      bgcolor: alpha(theme.palette.success.main, dark ? 0.22 : 0.12),
    },
    Dormant: {
      color: theme.palette.text.secondary,
      bgcolor: alpha(theme.palette.text.secondary, dark ? 0.16 : 0.1),
    },
  };
  const tone = tones[status] || tones.Dormant;
  return {
    ...ADMIN_STATUS_CHIP_SX,
    fontWeight: 800,
    border: "none",
    ...tone,
  };
}

function CustomerStatusChip({ status }) {
  const theme = useTheme();
  return (
    <Chip
      label={status}
      variant="filled"
      sx={customerStatusChipSx(status, theme)}
    />
  );
}

function mixedBreakdownTitle(order, kind) {
  const items = getOrderLineItems(order);
  if (!items.length) return kind === "payment" ? "Mixed payment" : "Mixed status";

  return (
    <Box sx={{ py: 0.25, maxWidth: 280 }}>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, mb: 0.5 }}>
        {kind === "payment" ? "Payment by item" : "Status by item"}
      </Typography>
      <Stack spacing={0.35}>
        {items.map((item) => {
          const payment = migratePaymentStatus(item.payment);
          const status = migrateOrderStatus(item.status);
          const value = kind === "payment" ? (payment || "—") : orderStatusLabel(status);
          return (
            <Typography key={item.id || item.name} sx={{ fontSize: "0.68rem", lineHeight: 1.35 }}>
              {lineItemTrailLabel(item)} — {value}
            </Typography>
          );
        })}
      </Stack>
    </Box>
  );
}

function OrderMetaChip({ label, color, mixedTitle }) {
  const chip = (
    <Chip
      label={label || "—"}
      color={color || "default"}
      variant="outlined"
      sx={{
        ...ADMIN_STATUS_CHIP_SX,
        ...(mixedTitle ? { cursor: "help" } : {}),
      }}
    />
  );
  if (!mixedTitle) return chip;
  return (
    <Tooltip arrow title={mixedTitle}>
      <span>{chip}</span>
    </Tooltip>
  );
}

function formatAddress(address) {
  if (!address || typeof address !== "object") return "";
  return [address.street, address.city, address.province, address.postal].filter(Boolean).join(", ");
}

function DetailField({ label, value }) {
  return (
    <Box>
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", fontWeight: 800, letterSpacing: 1, color: "text.secondary", textTransform: "uppercase", mb: 0.35 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", wordBreak: "break-word" }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

function CustomerDetailDialog({ customer, open, onClose, panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const [tab, setTab] = useState("history");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableExpanded, setTableExpanded] = useState(false);

  const orderList = customer?.orderList;
  const statusOptions = useMemo(() => {
    const seen = new Set();
    (orderList || []).forEach((order) => {
      const status = migrateOrderStatus(order.status);
      if (status) seen.add(status);
    });
    return [...seen].sort((a, b) => orderStatusLabel(a).localeCompare(orderStatusLabel(b)));
  }, [orderList]);

  const filteredOrders = useMemo(() => {
    const list = orderList || [];
    if (statusFilter === "all") return list;
    return list.filter((order) => migrateOrderStatus(order.status) === statusFilter);
  }, [orderList, statusFilter]);

  useEffect(() => {
    if (!open) return;
    setStatusFilter("all");
    setTab("history");
    // Mobile: collapse profile chrome so order history has room to render.
    setTableExpanded(isMobile);
  }, [open, customer?.email, customer?.uid, customer?.id, isMobile]);
  if (!customer) return null;

  const tierColor = customer.tier?.badgeColor || theme.palette.primary.main;
  const progressPct = Math.round((customer.tierProgress?.progress || 0) * 100);
  const addressLine = formatAddress(customer.address);
  const customerKey = String(customer.email || customer.uid || customer.id || "").trim().toLowerCase();

  function openOrderFromHistory(orderId) {
    onClose();
    navigate(`/admin/orders/${encodeURIComponent(orderId)}`, {
      state: {
        backTo: {
          path: "/admin/customers",
          label: customer.name || customer.email || "customer",
          reopenCustomerKey: customerKey,
        },
      },
    });
  }

  function handleRequestClose() {
    // Desktop: first collapse an expanded table. Mobile starts expanded — close immediately.
    if (tableExpanded && !isMobile) {
      setTableExpanded(false);
      return;
    }
    onClose();
  }

  return (
    <Dialog
      key={customer.email || customer.uid || customer.id}
      open={open}
      onClose={handleRequestClose}
      fullWidth
      maxWidth="xl"
      PaperProps={{
        sx: {
          ...panelSx,
          bgcolor: "background.paper",
          backgroundImage: "none",
          width: { md: "min(1180px, 96vw)" },
          height: { xs: "92dvh", md: "min(820px, 90dvh)" },
          maxHeight: "92dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.25, md: 1.5 }, flexShrink: 0 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: { xs: 40, md: 48 }, height: { xs: 40, md: 48 }, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: { xs: "1rem", md: "1.2rem" }, flexShrink: 0, ...avatarStyles(theme) }}>
            {(customer.name || "?").charAt(0)}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: { xs: "1.05rem", md: "1.25rem" } }}>{customer.name}</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{customer.email}</Typography>
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="flex-end" sx={{ display: { xs: tableExpanded ? "none" : "flex", sm: "flex" } }}>
            <Chip
              label={customer.tier?.name || "Member"}
              sx={{
                ...ADMIN_STATUS_CHIP_SX,
                fontWeight: 800,
                color: tierColor,
                borderColor: tierColor,
                bgcolor: alpha(tierColor, 0.12),
              }}
              variant="outlined"
            />
            <CustomerStatusChip status={customer.status} />
          </Stack>
        </Stack>
      </DialogTitle>

      {!tableExpanded ? (
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            pb: 2,
            // Desktop: don't shrink — overflow was painting over the order-history bar.
            flexShrink: { xs: 1, md: 0 },
            minHeight: 0,
            maxHeight: { xs: "42%", md: "none" },
            overflow: { xs: "auto", md: "visible" },
            borderBottom: "1px solid",
            borderColor: surfaceBorderColor,
          }}
        >
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Phone" value={customer.phone} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Sign-in" value={customer.signInMethod} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Joined" value={customer.joined} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><DetailField label="Marketing" value={customer.marketingOptIn ? "Opted in" : "Not opted in"} /></Grid>
              <Grid size={{ xs: 12 }}><DetailField label="Address" value={addressLine} /></Grid>
            </Grid>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", letterSpacing: 0.8, color: "text.secondary", textTransform: "uppercase" }}>Orders</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", mt: 0.25 }}>{customer.orders}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", letterSpacing: 0.8, color: "text.secondary", textTransform: "uppercase" }}>Total spent</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", mt: 0.5 }}>{PESO.format(customer.totalSpent)}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", letterSpacing: 0.8, color: "text.secondary", textTransform: "uppercase" }}>Fulfilled</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", mt: 0.5 }}>{PESO.format(customer.fulfilledSpend)}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Box sx={{ p: 1.5, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", letterSpacing: 0.8, color: "text.secondary", textTransform: "uppercase" }}>Last order</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mt: 0.5, fontFamily: MONO_FONT }}>{customer.lastOrderDate || "—"}</Typography>
                </Box>
              </Grid>
            </Grid>

            <Box sx={{ p: 1.75, borderRadius: 1, border: "1px solid", borderColor: alpha(tierColor, 0.45), bgcolor: alpha(tierColor, 0.08) }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 800, letterSpacing: 1, color: tierColor, textTransform: "uppercase" }}>
                    Member tier
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{customer.tier?.name || "Member"}</Typography>
                </Stack>
                {customer.tierProgress?.atTop ? (
                  <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>Top tier reached.</Typography>
                ) : customer.tierProgress?.nextTier ? (
                  <>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
                      {PESO.format(customer.tierProgress.remaining)} more fulfilled spend to reach {customer.tierProgress.nextTier.name}.
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                      <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 800, color: tierColor }}>
                        {progressPct}%
                      </Typography>
                      <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", color: "text.secondary" }}>
                        {PESO.format(customer.fulfilledSpend || 0)} / {PESO.format(customer.tierProgress.nextTier.minSpend ?? 0)}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progressPct}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: alpha(tierColor, 0.18),
                        "& .MuiLinearProgress-bar": { bgcolor: tierColor, borderRadius: 1 },
                      }}
                    />
                    {(customer.fulfilledSpend || 0) <= 0 ? (
                      <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                        Only Fulfilled line items count — ready-for-pickup and deposits don’t.
                      </Typography>
                    ) : null}
                  </>
                ) : (
                  <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>No tier ladder configured.</Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      ) : null}

      <Box sx={{ flexShrink: 0, px: { xs: 2, md: 3 }, borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ pt: 1.25, pb: 0.75, flexWrap: "wrap", rowGap: 1 }}
        >
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            sx={{
              minHeight: 40,
              flex: "1 1 auto",
              minWidth: 0,
              "& .MuiTab-root": {
                fontFamily: MONO_FONT,
                fontWeight: 800,
                fontSize: "0.68rem",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                minHeight: 40,
                px: { xs: 1, sm: 1.5 },
              },
            }}
          >
            <Tab
              value="history"
              label={isMobile
                ? `Orders (${filteredOrders.length})`
                : `Order history (${filteredOrders.length}${statusFilter !== "all" ? ` / ${(orderList || []).length}` : ""})`}
            />
          </Tabs>
          {(orderList || []).length > 0 ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 180 } }}>
                <InputLabel id="customer-order-status-filter">Status</InputLabel>
                <Select
                  labelId="customer-order-status-filter"
                  label="Status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <MenuItem value="all">All statuses</MenuItem>
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {orderStatusLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Tooltip title={tableExpanded ? "Show profile" : "Focus order table"}>
                <IconButton
                  size="small"
                  aria-label={tableExpanded ? "Show customer profile" : "Focus order table"}
                  onClick={() => setTableExpanded((prev) => !prev)}
                  sx={{ color: "text.secondary", border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}
                >
                  {tableExpanded ? <CollapseCornersIcon sx={{ fontSize: 18 }} /> : <ExpandCornersIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>
            </Stack>
          ) : null}
        </Stack>
      </Box>

      <DialogContent
        sx={{
          p: "0 !important",
          flex: "1 1 auto",
          minHeight: { xs: 200, md: 0 },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {tab === "history" ? (
          orderList?.length ? (
            filteredOrders.length ? (
              <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
                <Table stickyHeader size="small" sx={{ minWidth: { xs: 420, sm: 560 } }}>
                  <TableHead>
                    <TableRow>
                      <AdminTableHeaderCell>Order</AdminTableHeaderCell>
                      <AdminTableHeaderCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                      <AdminTableHeaderCell align="right">Final</AdminTableHeaderCell>
                      <AdminTableHeaderCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const payment = migratePaymentStatus(order.payment);
                      const status = migrateOrderStatus(order.status);
                      return (
                        <TableRow key={order.id} hover>
                          <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700, whiteSpace: "nowrap", color: "primary.main" }}>
                            {order.id}
                          </TableCell>
                          <TableCell sx={{ color: "text.secondary", display: { xs: "none", sm: "table-cell" }, whiteSpace: "nowrap", fontFamily: MONO_FONT, fontSize: "0.75rem" }}>
                            {formatOrderTimestamp(order)}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                              <OrderMetaChip
                                label={payment}
                                color={PAYMENT_COLOR[payment] || "default"}
                                mixedTitle={payment === "Mixed" ? mixedBreakdownTitle(order, "payment") : null}
                              />
                              <OrderMetaChip
                                label={orderStatusLabel(status)}
                                color={STATUS_COLOR[status] || "default"}
                                mixedTitle={status === "Mixed" ? mixedBreakdownTitle(order, "status") : null}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: "primary.main", whiteSpace: "nowrap" }}>
                            {PESO.format(orderCustomerTotal(order))}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openOrderFromHistory(order.id)}
                              sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4 }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
                No orders match this status.
              </Box>
            )
          ) : (
            <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
              No orders yet.
            </Box>
          )
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, md: 3 }, py: 1.5, flexShrink: 0 }}>
        <Button onClick={handleRequestClose} color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CustomersPage() {
  const theme = useTheme();
  const accents = getStatAccents(theme);
  const location = useLocation();
  const navigate = useNavigate();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { customers } = useCustomers();
  const { orders } = useOrders();
  const { tiers } = useClientTiers();
  const [filter, setFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [sort, setSort] = useState({ key: "joined", dir: "asc" });

  function handleSort(key) {
    setSort((prev) => (
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    ));
  }

  const tierFilterOptions = useMemo(() => {
    const active = (tiers || [])
      .filter((tier) => tier.active !== false)
      .slice()
      .sort((a, b) => (a.minSpend ?? 0) - (b.minSpend ?? 0));
    return [
      { id: "all", label: "All tiers" },
      ...active.map((tier) => ({ id: tier.id, label: tier.name || "Member" })),
      { id: "none", label: "No tier" },
    ];
  }, [tiers]);

  const enrichedCustomers = useMemo(() => {
    const ordersByEmail = new Map();
    orders.forEach((order) => {
      const key = String(order.email || "").trim().toLowerCase();
      if (!key) return;
      const current = ordersByEmail.get(key) || { count: 0, lastOrder: null, list: [] };
      const placedAt = resolveOrderPlacedAt(order)?.getTime() || 0;
      const currentPlacedAt = resolveOrderPlacedAt(current.lastOrder)?.getTime() || 0;
      ordersByEmail.set(key, {
        count: current.count + 1,
        lastOrder: placedAt >= currentPlacedAt ? order : current.lastOrder,
        list: [...current.list, order],
      });
    });

    return customers.map((customer) => {
      const stats = ordersByEmail.get(String(customer.email || "").trim().toLowerCase()) || {
        count: 0,
        lastOrder: null,
        list: [],
      };
      const lastOrderDate = stats.lastOrder
        ? formatOrderTimestamp(stats.lastOrder)
        : null;
      const status = customerStatus(
        stats.count,
        resolveOrderPlacedAt(stats.lastOrder)?.toISOString() || null,
      );
      // Total spent = recognized revenue (alloc × price, or DP before alloc).
      const totalSpent = computeTotalSpentForEmail(orders, customer.email);
      // Fulfilled = Fulfilled line finals only (loyalty base).
      const fulfilledSpend = computeFulfilledSpendForEmail(orders, customer.email);
      const tier = resolveClientTier(fulfilledSpend, tiers);
      const tierProgress = getNextTierProgress(fulfilledSpend, tiers);
      return {
        ...customer,
        orders: stats.count,
        totalSpent,
        lastOrderDate,
        orderList: sortOrdersByOrderNo(stats.list),
        status,
        tier,
        tierProgress,
        fulfilledSpend,
        signInMethod: AUTH_PROVIDER_LABEL[customer.authProvider] || AUTH_PROVIDER_LABEL.unknown,
      };
    });
  }, [customers, orders, tiers]);

  // Re-open customer dialog when returning from an order opened via Order history.
  useEffect(() => {
    const key = String(location.state?.reopenCustomerKey || "").trim().toLowerCase();
    if (!key || !enrichedCustomers.length) return;
    const match = enrichedCustomers.find((customer) => {
      const email = String(customer.email || "").trim().toLowerCase();
      const uid = String(customer.uid || customer.id || "").trim().toLowerCase();
      return email === key || uid === key;
    });
    if (match) setSelectedCustomer(match);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, enrichedCustomers, navigate]);

  const rows = useMemo(() => {
    const filtered = enrichedCustomers.filter((c) => {
      const matchesQuery =
        !query.trim() ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;

      if (tierFilter === "none") {
        if (c.tier?.id) return false;
      } else if (tierFilter !== "all") {
        if (c.tier?.id !== tierFilter) return false;
      }

      switch (filter) {
        case "marketing":
          return c.marketingOptIn;
        case "active":
          return c.status === "Active";
        case "dormant":
          return c.status === "Dormant";
        default:
          return true;
      }
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const byName = () => String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });

      if (sort.key === "name") {
        const nameCmp = byName();
        if (nameCmp) return nameCmp * dir;
        return String(a.email || "").localeCompare(String(b.email || "")) * dir;
      }

      if (sort.key === "tier") {
        const spendA = Number(a.tier?.minSpend ?? -1);
        const spendB = Number(b.tier?.minSpend ?? -1);
        if (spendA !== spendB) return (spendA - spendB) * dir;
        const nameA = String(a.tier?.name || "");
        const nameB = String(b.tier?.name || "");
        if (nameA !== nameB) return nameA.localeCompare(nameB, undefined, { sensitivity: "base" }) * dir;
        return byName();
      }

      if (sort.key === "orders") {
        const ordersA = Number(a.orders) || 0;
        const ordersB = Number(b.orders) || 0;
        if (ordersA !== ordersB) return (ordersA - ordersB) * dir;
        return byName();
      }

      if (sort.key === "totalSpent") {
        const spentA = Number(a.totalSpent) || 0;
        const spentB = Number(b.totalSpent) || 0;
        if (spentA !== spentB) return (spentA - spentB) * dir;
        return byName();
      }

      // joined (default): earliest first when ascending
      const joinedA = String(a.joined || "");
      const joinedB = String(b.joined || "");
      if (joinedA !== joinedB) return joinedA.localeCompare(joinedB) * dir;
      return byName();
    });
  }, [enrichedCustomers, filter, query, sort, tierFilter]);

  const {
    visibleItems,
    rootRef: scrollRootRef,
    sentinelRef,
    hasMore,
    visibleCount,
    totalCount,
  } = useInfiniteScroll(rows, { pageSize: 40 });

  const stats = useMemo(() => {
    const optIn = enrichedCustomers.filter((c) => c.marketingOptIn).length;
    const ltv = enrichedCustomers.reduce((sum, c) => sum + c.totalSpent, 0);
    const total = enrichedCustomers.length;
    return {
      total,
      optIn,
      optInPct: total ? Math.round((optIn / total) * 100) : 0,
      ltv,
      avgSpend: total ? Math.round(ltv / total) : 0,
    };
  }, [enrichedCustomers]);

  function exportMarketingList() {
    const list = enrichedCustomers.filter((c) => c.marketingOptIn);
    const csv = ["name,email", ...list.map((c) => `"${c.name}","${c.email}"`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "marketing-optin.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box sx={{ ...ADMIN_LIST_PAGE_SX, gap: { xs: 1, md: ADMIN_PAGE_SPACING } }}>
      <AdminPageHeader
        eyebrow="People"
        title="Customers"
        subtitle="Storefront accounts and guest checkouts — open a row to view profile, tier, and orders."
        action={(
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={exportMarketingList}
            disabled={!stats.optIn}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
          >
            Export opt-in
          </Button>
        )}
      />

      <Stack spacing={{ xs: 1, md: ADMIN_PAGE_SPACING }} sx={{ flexShrink: 0 }}>
        <Grid container spacing={2} sx={ADMIN_LIST_STATS_SX}>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={UserIcon} label="Customers" value={stats.total} accent={accents[0]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Marketing opt-in" value={`${stats.optIn} (${stats.optInPct}%)`} accent={accents[1]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Lifetime value" value={PESO.format(stats.ltv)} accent={theme.palette.success.main} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Avg. spend" value={PESO.format(stats.avgSpend)} accent={accents[3]} /></Grid>
        </Grid>

        <Box sx={{ ...panelSx, ...ADMIN_LIST_FILTER_BAR_SX }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.25}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ width: "100%", minWidth: 0 }}
          >
            <Stack direction="row" alignItems="center" sx={{ ...ADMIN_LIST_FILTER_ROW_SX, flex: { md: 1 } }}>
              <AdminListFilterTabs
                label="View"
                labelId="customers-filter"
                options={FILTERS}
                value={filter}
                onChange={setFilter}
              />
              <FormControl size="small" sx={{ ...ADMIN_LIST_FILTER_SELECT_SX, minWidth: { xs: 140, md: 160 } }}>
                <InputLabel id="customers-tier-filter">Tier</InputLabel>
                <Select
                  labelId="customers-tier-filter"
                  label="Tier"
                  value={tierFilter}
                  onChange={(event) => setTierFilter(event.target.value)}
                >
                  {tierFilterOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1, minWidth: 8, display: { xs: "none", md: "block" } }} />
            </Stack>

            <TextField
              size="small"
              placeholder="Search name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
              sx={ADMIN_LIST_SEARCH_FIELD_SX}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
            />
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ ...ADMIN_LIST_PANEL_SX, ...panelSx }}>
        <Box ref={scrollRootRef} sx={ADMIN_LIST_SCROLL_SX}>
          <TableContainer sx={{ overflow: "visible" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <AdminTableSortHeader
                    id="name"
                    label="Customer"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <AdminTableSortHeader
                    id="tier"
                    label="Tier"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <AdminTableSortHeader
                    id="joined"
                    label="Joined"
                    sort={sort}
                    onSort={handleSort}
                    sx={{ display: { xs: "none", sm: "table-cell" } }}
                  />
                  <AdminTableHeaderCell sx={{ display: { xs: "none", md: "table-cell" } }}>Sign-in</AdminTableHeaderCell>
                  <AdminTableSortHeader
                    id="orders"
                    label="Orders"
                    sort={sort}
                    onSort={handleSort}
                    align="right"
                    sx={{ display: { xs: "none", sm: "table-cell" } }}
                  />
                  <AdminTableSortHeader
                    id="totalSpent"
                    label="Total spent"
                    sort={sort}
                    onSort={handleSort}
                    align="right"
                    sx={{ display: { xs: "none", md: "table-cell" } }}
                  />
                  <AdminTableHeaderCell align="center" sx={{ display: { xs: "none", lg: "table-cell" } }}>Marketing</AdminTableHeaderCell>
                  <AdminTableHeaderCell align="center">Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleItems.map((customer) => (
                  <TableRow
                    key={customer.id || customer.uid || customer.email}
                    hover
                    onClick={() => setSelectedCustomer(customer)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, ...avatarStyles(theme) }}>
                          {customer.name.charAt(0)}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{customer.name}</Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{customer.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={customer.tier?.name || "Member"}
                        variant="outlined"
                        sx={{
                          ...ADMIN_STATUS_CHIP_SX,
                          fontWeight: 800,
                          color: customer.tier?.badgeColor || "primary.main",
                          borderColor: customer.tier?.badgeColor || "primary.main",
                          bgcolor: customer.tier?.badgeColor
                            ? alpha(customer.tier.badgeColor, 0.12)
                            : alpha(theme.palette.primary.main, 0.08),
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", display: { xs: "none", sm: "table-cell" } }}>{customer.joined}</TableCell>
                    <TableCell sx={{ color: "text.secondary", display: { xs: "none", md: "table-cell" } }}>{customer.signInMethod}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontFamily: MONO_FONT, display: { xs: "none", sm: "table-cell" } }}>{customer.orders}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", md: "table-cell" } }}>{PESO.format(customer.totalSpent)}</TableCell>
                    <TableCell align="center" sx={{ display: { xs: "none", lg: "table-cell" } }}>
                      <Chip
                        label={customer.marketingOptIn ? "Opted in" : "No"}
                        color={customer.marketingOptIn ? "success" : "default"}
                        variant="outlined"
                        sx={ADMIN_STATUS_CHIP_SX}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <CustomerStatusChip status={customer.status} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                        sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4 }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {totalCount === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
                      No customers yet. Accounts appear here after Google/email sign-up or guest checkout.
                    </TableCell>
                  </TableRow>
                ) : (
                  <InfiniteScrollTableSentinel
                    sentinelRef={sentinelRef}
                    hasMore={hasMore}
                    visibleCount={visibleCount}
                    totalCount={totalCount}
                    colSpan={9}
                  />
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>

      <CustomerDetailDialog
        customer={selectedCustomer}
        open={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}
