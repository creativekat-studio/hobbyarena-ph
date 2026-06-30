import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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
  allocationLabel,
  getOrderStage,
  isPreorderOrder,
  migratePaymentStatus,
  migrateOrderStatus,
} from "../data/orderWorkflow.js";
import { useOrders } from "../lib/ordersStore.jsx";
import AddOrderDialog from "./AddOrderDialog.jsx";

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
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { orders } = useOrders();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  function openOrder(id) {
    navigate(`/admin/orders/${encodeURIComponent(id)}`);
  }

  const activeQueue = ORDER_QUEUES.find((q) => q.id === filter) ?? ORDER_QUEUES[0];

  const rows = useMemo(() => {
    return orders.filter((o) => {
      const matchesQuery =
        !query.trim() ||
        o.id.toLowerCase().includes(query.toLowerCase()) ||
        o.customer.toLowerCase().includes(query.toLowerCase()) ||
        o.items.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (filter === "all") return true;
      return activeQueue.match?.(o) ?? false;
    });
  }, [orders, filter, query, activeQueue]);

  const stats = useMemo(() => {
    const review = orders.filter((o) => migratePaymentStatus(o.payment) === "Pending Verification").length;
    const preorders = orders.filter((o) => o.type === "Pre-order").length;
    const balanceDue = orders.filter((o) => migratePaymentStatus(o.payment) === "Unpaid").length;
    const pickup = orders.filter((o) => migrateOrderStatus(o.status) === "Ready for Pickup").length;
    return { total: orders.length, review, preorders, balanceDue, pickup };
  }, [orders]);

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
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
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", lg: "table-cell" } }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" } }}>Allocation</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Balance</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 150 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 150 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((order) => {
                const stage = getOrderStage(order);
                const needsReview = migratePaymentStatus(order.payment) === "Pending Verification";
                return (
                  <TableRow key={order.id} hover sx={{ cursor: "pointer" }} onClick={() => openOrder(order.id)}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        {needsReview ? (
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }} title="Needs payment review" />
                        ) : null}
                        <Box>
                          <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.85rem" }}>{order.id}</Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{order.date}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{order.customer}</Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Chip label={order.type} size="small" variant="outlined" color={order.type === "Pre-order" ? "secondary" : "default"} sx={{ height: 20, fontSize: "0.62rem", mt: 0.25 }} />
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260, display: { xs: "none", lg: "table-cell" } }}>
                      <Typography sx={{ fontSize: "0.85rem" }}>{order.items}</Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>Qty {order.qty}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{stage}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" }, fontFamily: MONO_FONT, fontSize: "0.82rem" }}>
                      {isPreorderOrder(order) ? allocationLabel(order) : "—"}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
                      {isPreorderOrder(order) && (order.balanceDue ?? 0) > 0 ? PESO.format(order.balanceDue) : "—"}
                    </TableCell>
                    <TableCell>
                      <Chip label={order.payment} size="small" color={PAYMENT_COLOR[order.payment] || "default"} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={order.status} size="small" color={STATUS_COLOR[order.status] || "default"} variant="outlined" />
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>No orders match your filters.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
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
