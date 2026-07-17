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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate, useOutletContext } from "react-router-dom";
import { MONO_FONT, getStatAccents } from "../theme.js";
import { avatarStyles } from "../lib/surfaces.js";
import { PESO } from "../components/ProductCard.jsx";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { CardIcon, SearchIcon, SparkleIcon, UserIcon } from "../components/icons.jsx";
import { InfiniteScrollTableSentinel } from "../components/InfiniteScrollSentinel.jsx";
import { AdminTableHeaderCell, AdminTableSortHeader } from "./adminTableHeader.jsx";
import { useCustomers } from "../lib/customersStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useClientTiers } from "../lib/clientTiersStore.jsx";
import { useInfiniteScroll } from "../lib/useInfiniteScroll.js";
import {
  computeFulfilledSpendForEmail,
  getNextTierProgress,
  resolveClientTier,
} from "../lib/clientTier.js";
import { sortOrdersByOrderNo } from "../lib/orderIds.js";
import { migrateOrderStatus, orderStatusLabel, refundedAmountForOrder, STATUS_COLOR } from "../data/orderWorkflow.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "marketing", label: "Opt-in" },
  { id: "active", label: "Active" },
  { id: "dormant", label: "Dormant" },
];

const FILTER_TOGGLE_SX = {
  px: 1.5,
  fontFamily: MONO_FONT,
  fontSize: "0.68rem",
  letterSpacing: 0.4,
  textTransform: "uppercase",
  fontWeight: 700,
};

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

/** Soft filled tags — not outlined, so they don’t read as buttons beside View. */
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
    height: 22,
    fontSize: "0.62rem",
    fontFamily: MONO_FONT,
    fontWeight: 800,
    letterSpacing: 0.4,
    border: "none",
    ...tone,
  };
}

function CustomerStatusChip({ status }) {
  const theme = useTheme();
  return (
    <Chip
      label={status}
      size="small"
      variant="filled"
      sx={customerStatusChipSx(status, theme)}
    />
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
  const navigate = useNavigate();
  const [tab, setTab] = useState("history");
  const [statusFilter, setStatusFilter] = useState("all");

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
  }, [open, customer?.email, customer?.uid, customer?.id]);

  if (!customer) return null;

  const tierColor = customer.tier?.badgeColor || theme.palette.primary.main;
  const progressPct = Math.round((customer.tierProgress?.progress || 0) * 100);
  const addressLine = formatAddress(customer.address);

  return (
    <Dialog
      key={customer.email || customer.uid || customer.id}
      open={open}
      onClose={onClose}
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
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.5, flexShrink: 0 }}>
        <Stack direction="row" spacing={1.75} alignItems="center">
          <Box sx={{ width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.2rem", flexShrink: 0, ...avatarStyles(theme) }}>
            {(customer.name || "?").charAt(0)}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{customer.name}</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>{customer.email}</Typography>
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="flex-end">
            <Chip
              label={customer.tier?.name || "Member"}
              size="small"
              sx={{
                fontFamily: MONO_FONT,
                fontWeight: 800,
                fontSize: "0.62rem",
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

      <Box sx={{ px: 3, pb: 2, flexShrink: 0, borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
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
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", mt: 0.5 }}>{customer.lastOrderDate || "—"}</Typography>
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
                      Pending orders don’t count yet — only fulfilled / ready-for-pickup (and allocated) spend.
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

      <Box sx={{ flexShrink: 0, px: 3, borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{ py: 0.5 }}
        >
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                fontFamily: MONO_FONT,
                fontWeight: 800,
                fontSize: "0.72rem",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                minHeight: 44,
              },
            }}
          >
            <Tab value="history" label={`Order history (${filteredOrders.length}${statusFilter !== "all" ? ` / ${(orderList || []).length}` : ""})`} />
          </Tabs>
          {(orderList || []).length > 0 ? (
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220 }, my: 1 }}>
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
          ) : null}
        </Stack>
      </Box>

      <DialogContent
        sx={{
          p: 0,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {tab === "history" ? (
          orderList?.length ? (
            filteredOrders.length ? (
              <TableContainer sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <AdminTableHeaderCell>Order</AdminTableHeaderCell>
                      <AdminTableHeaderCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                      <AdminTableHeaderCell sx={{ display: { xs: "none", md: "table-cell" } }}>Items</AdminTableHeaderCell>
                      <AdminTableHeaderCell align="right">Total</AdminTableHeaderCell>
                      <AdminTableHeaderCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const status = migrateOrderStatus(order.status);
                      return (
                        <TableRow key={order.id} hover>
                          <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700, whiteSpace: "nowrap", color: "primary.main" }}>
                            {order.id}
                          </TableCell>
                          <TableCell sx={{ color: "text.secondary", display: { xs: "none", sm: "table-cell" }, whiteSpace: "nowrap" }}>
                            {order.date || "—"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={orderStatusLabel(status)}
                              size="small"
                              color={STATUS_COLOR[status] || "default"}
                              variant="outlined"
                              sx={{ fontSize: "0.65rem", height: 24, maxWidth: 220 }}
                            />
                          </TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" }, maxWidth: 420 }}>
                            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {order.items || "Order"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: "primary.main", whiteSpace: "nowrap" }}>
                            {PESO.format(order.total || 0)}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                onClose();
                                navigate(`/admin/orders/${encodeURIComponent(order.id)}`);
                              }}
                              sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4 }}
                            >
                              Open
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

      <DialogActions sx={{ px: 3, py: 2, flexShrink: 0 }}>
        <Button onClick={onClose} color="inherit">Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CustomersPage() {
  const theme = useTheme();
  const accents = getStatAccents(theme);
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { customers } = useCustomers();
  const { orders } = useOrders();
  const { tiers } = useClientTiers();
  const [filter, setFilter] = useState("all");
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

  const enrichedCustomers = useMemo(() => {
    const ordersByEmail = new Map();
    orders.forEach((order) => {
      const key = String(order.email || "").trim().toLowerCase();
      if (!key) return;
      const current = ordersByEmail.get(key) || { count: 0, totalSpent: 0, lastOrderDate: null, list: [] };
      const orderTotal = Number(order.total) || 0;
      // Total spent = order totals minus refunds (refunded amounts never count).
      const netSpent = Math.max(0, orderTotal - (refundedAmountForOrder(order) || 0));
      const orderDate = order.date || null;
      ordersByEmail.set(key, {
        count: current.count + 1,
        totalSpent: current.totalSpent + netSpent,
        lastOrderDate:
          !current.lastOrderDate || (orderDate && orderDate > current.lastOrderDate)
            ? orderDate
            : current.lastOrderDate,
        list: [...current.list, order],
      });
    });

    return customers.map((customer) => {
      const stats = ordersByEmail.get(String(customer.email || "").trim().toLowerCase()) || {
        count: 0,
        totalSpent: 0,
        lastOrderDate: null,
        list: [],
      };
      const status = customerStatus(stats.count, stats.lastOrderDate);
      const fulfilledSpend = computeFulfilledSpendForEmail(orders, customer.email);
      const tier = resolveClientTier(fulfilledSpend, tiers);
      const tierProgress = getNextTierProgress(fulfilledSpend, tiers);
      return {
        ...customer,
        orders: stats.count,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate,
        orderList: sortOrdersByOrderNo(stats.list),
        status,
        tier,
        tierProgress,
        fulfilledSpend,
        signInMethod: AUTH_PROVIDER_LABEL[customer.authProvider] || AUTH_PROVIDER_LABEL.unknown,
      };
    });
  }, [customers, orders, tiers]);

  const rows = useMemo(() => {
    const filtered = enrichedCustomers.filter((c) => {
      const matchesQuery =
        !query.trim() ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
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
      if (sort.key === "name") {
        const byName = String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
        if (byName) return byName * dir;
        return String(a.email || "").localeCompare(String(b.email || "")) * dir;
      }
      // joined (default): earliest first when ascending
      const joinedA = String(a.joined || "");
      const joinedB = String(b.joined || "");
      if (joinedA !== joinedB) return joinedA.localeCompare(joinedB) * dir;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, { sensitivity: "base" });
    });
  }, [enrichedCustomers, filter, query, sort]);

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
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: (t) => t.spacing(ADMIN_PAGE_SPACING) }}>
      <AdminPageHeader
        eyebrow="People"
        title="Customers"
        subtitle="Storefront accounts and guest checkouts — open a row to view profile, tier, and orders."
        action={(
          <Button variant="contained" color="primary" onClick={exportMarketingList} disabled={!stats.optIn} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.78rem" }}>
            Export opt-in list
          </Button>
        )}
      />

      <Stack spacing={ADMIN_PAGE_SPACING} sx={{ flexShrink: 0 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={UserIcon} label="Customers" value={stats.total} accent={accents[0]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Marketing opt-in" value={`${stats.optIn} (${stats.optInPct}%)`} accent={accents[1]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Lifetime value" value={PESO.format(stats.ltv)} accent={theme.palette.success.main} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Avg. spend" value={PESO.format(stats.avgSpend)} accent={accents[3]} /></Grid>
        </Grid>

        <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={filter}
              onChange={(_, next) => { if (next) setFilter(next); }}
              sx={{ flexWrap: "wrap" }}
            >
              {FILTERS.map((item) => (
                <ToggleButton key={item.id} value={item.id} sx={FILTER_TOGGLE_SX}>
                  {item.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Box sx={{ flex: 1 }} />

            <TextField
              size="small"
              placeholder="Search name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 260 } }}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
            />
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, ...panelSx, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <TableContainer ref={scrollRootRef} sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <AdminTableSortHeader
                  id="name"
                  label="Customer"
                  sort={sort}
                  onSort={handleSort}
                />
                <AdminTableHeaderCell>Tier</AdminTableHeaderCell>
                <AdminTableSortHeader
                  id="joined"
                  label="Joined"
                  sort={sort}
                  onSort={handleSort}
                  sx={{ display: { xs: "none", sm: "table-cell" } }}
                />
                <AdminTableHeaderCell sx={{ display: { xs: "none", md: "table-cell" } }}>Sign-in</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">Orders</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">Total spent</AdminTableHeaderCell>
                <AdminTableHeaderCell align="center">Marketing</AdminTableHeaderCell>
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
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 22,
                        fontSize: "0.62rem",
                        fontFamily: MONO_FONT,
                        fontWeight: 800,
                        letterSpacing: 0.4,
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
                  <TableCell align="right" sx={{ fontWeight: 700, fontFamily: MONO_FONT }}>{customer.orders}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{PESO.format(customer.totalSpent)}</TableCell>
                  <TableCell align="center">
                    <Chip label={customer.marketingOptIn ? "Opted in" : "No"} size="small" color={customer.marketingOptIn ? "success" : "default"} variant="outlined" />
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
