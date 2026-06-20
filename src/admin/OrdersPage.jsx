import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
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
import { useLocation, useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { BoxIcon, CardIcon, SearchIcon, SparkleIcon, TruckIcon } from "../components/icons.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import OrderDetailDialog, { PAYMENT_COLOR, PAYMENT_OPTIONS, STATUS_COLOR, STATUS_OPTIONS } from "./OrderDetailDialog.jsx";

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "In-stock", label: "In-stock" },
  { id: "Pre-order", label: "Pre-order" },
  { id: "unpaid", label: "Awaiting payment" },
];

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
  const location = useLocation();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { orders, setStatus, setPayment, markOrderSeen } = useOrders();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const selectedOrder = orders.find((o) => o.id === selectedId) || null;

  useEffect(() => {
    const openOrderId = location.state?.openOrderId;
    if (openOrderId) {
      setSelectedId(openOrderId);
      markOrderSeen(openOrderId);
    }
  }, [location.state?.openOrderId, markOrderSeen]);

  function openOrder(id) {
    setSelectedId(id);
    markOrderSeen(id);
  }

  const rows = useMemo(() => {
    return orders.filter((o) => {
      const matchesQuery =
        !query.trim() ||
        o.id.toLowerCase().includes(query.toLowerCase()) ||
        o.customer.toLowerCase().includes(query.toLowerCase()) ||
        o.items.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (filter === "all") return true;
      if (filter === "unpaid") {
        return o.payment === "Unpaid" || o.payment === "Deposit" || o.payment === "Pending Verification";
      }
      return o.type === filter;
    });
  }, [orders, filter, query]);

  const stats = useMemo(() => {
    const preorders = orders.filter((o) => o.type === "Pre-order").length;
    const awaiting = orders.filter((o) => o.payment === "Unpaid" || o.payment === "Deposit" || o.payment === "Pending Verification").length;
    const revenue = orders
      .filter((o) => o.payment === "Paid")
      .reduce((sum, o) => sum + o.total, 0);
    return { total: orders.length, preorders, awaiting, revenue };
  }, [orders]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Sales</Typography>
        <Typography variant="h3">Orders</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Review proof of payment, set payment status manually, and advance orders.
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Total orders" value={stats.total} accent="#7c3aed" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Pre-orders" value={stats.preorders} accent="#06b6d4" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={BoxIcon} label="Awaiting payment" value={stats.awaiting} accent="#f59e0b" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={TruckIcon} label="Paid revenue" value={PESO.format(stats.revenue)} accent="#22c55e" /></Grid>
      </Grid>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {TYPE_FILTERS.map((item) => (
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
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" } }}>Items</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Total</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 175 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 800, minWidth: 170 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Proof</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((order) => (
                <TableRow key={order.id} hover sx={{ cursor: "pointer" }} onClick={() => openOrder(order.id)}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.85rem" }}>{order.id}</Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{order.date}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{order.customer}</Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{order.email}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260, display: { xs: "none", md: "table-cell" } }}>
                    <Typography sx={{ fontSize: "0.85rem" }}>{order.items}</Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>Qty {order.qty}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={order.type} size="small" variant="outlined" color={order.type === "Pre-order" ? "secondary" : "default"} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{PESO.format(order.total)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      size="small"
                      value={order.payment}
                      onChange={(e) => setPayment(order.id, e.target.value)}
                      sx={{ minWidth: 158, fontSize: "0.8rem", "& .MuiOutlinedInput-notchedOutline": { borderColor: surfaceBorderColor } }}
                      renderValue={(value) => <Chip label={value} size="small" color={PAYMENT_COLOR[value] || "default"} variant="outlined" />}
                    >
                      {PAYMENT_OPTIONS.map((payment) => (
                        <MenuItem key={payment} value={payment} sx={{ fontSize: "0.85rem" }}>{payment}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      size="small"
                      value={order.status}
                      onChange={(e) => setStatus(order.id, e.target.value)}
                      sx={{ minWidth: 158, fontSize: "0.8rem", "& .MuiOutlinedInput-notchedOutline": { borderColor: surfaceBorderColor } }}
                      renderValue={(value) => <Chip label={value} size="small" color={STATUS_COLOR[value] || "default"} variant="outlined" />}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <MenuItem key={status} value={status} sx={{ fontSize: "0.85rem" }}>{status}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Button size="small" variant="outlined" color="inherit" onClick={() => openOrder(order.id)} sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.68rem" }}>
                      {order.proofOfPayment ? "View proof" : "Details"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>No orders match your filters.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <OrderDetailDialog
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedId(null)}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
        setPayment={setPayment}
        setStatus={setStatus}
      />
    </Stack>
  );
}
