import { useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import {
  CHANNEL_SPLIT,
  KPIS,
  RECENT_ORDERS,
  REVENUE_TREND,
  SALES_BY_LINE,
  TOP_PRODUCTS,
} from "../data/analytics.js";

const ORDER_STATUS_COLOR = {
  Processing: "warning",
  Paid: "success",
  Shipped: "info",
  "Pre-order": "secondary",
  Cancelled: "error",
};

function KpiCard({ panelSx, label, value, delta }) {
  const positive = delta >= 0;
  return (
    <Box sx={{ ...panelSx, p: 2.5, height: "100%" }}>
      <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", mt: 0.5 }}>{value}</Typography>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
        <Typography sx={{ color: positive ? "success.main" : "error.main", fontWeight: 800, fontSize: "0.8rem", fontFamily: MONO_FONT }}>
          {positive ? "▲" : "▼"} {Math.abs(delta)}%
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>vs last month</Typography>
      </Stack>
    </Box>
  );
}

function ChartCard({ panelSx, title, subtitle, children, minHeight = 280 }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 3 }, height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack spacing={0.25} sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
        {subtitle ? <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>{subtitle}</Typography> : null}
      </Stack>
      <Box sx={{ width: "100%", flex: 1, minHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}

function SalesByLineCard({ panelSx, tooltipStyle, salesByLine }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 3 }, height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack spacing={0.25} sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Sales by line</Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>Share of revenue</Typography>
      </Stack>
      <Box sx={{ position: "relative", flex: 1, minHeight: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={salesByLine} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="94%" paddingAngle={3} stroke="none">
              {salesByLine.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <RTooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", lineHeight: 1 }}>
            ₱{(KPIS.revenue / 1e6).toFixed(2)}M
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>6-mo revenue</Typography>
        </Box>
      </Box>
      <Stack spacing={1} sx={{ mt: 1.5 }}>
        {salesByLine.map((entry) => (
          <Stack key={entry.name} direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: entry.color }} />
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, flexGrow: 1 }}>{entry.name}</Typography>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 800 }}>{entry.value}%</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;

  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const gridColor = alpha(theme.palette.text.primary, 0.1);
  const axisColor = theme.palette.text.secondary;
  const chartColors = theme.ha?.chartColors ?? {};

  const salesByLine = useMemo(
    () =>
      SALES_BY_LINE.map((entry) => ({
        ...entry,
        color:
          entry.name.includes("Pokémon")
            ? chartColors.pokemon ?? entry.color
            : entry.name.includes("One Piece")
              ? chartColors.onePiece ?? entry.color
              : chartColors.accessories ?? entry.color,
      })),
    [chartColors.pokemon, chartColors.onePiece, chartColors.accessories],
  );

  const tooltipStyle = {
    background: theme.palette.background.paper,
    border: `1px solid ${surfaceBorderColor}`,
    borderRadius: 1,
    fontSize: 12,
    color: theme.palette.text.primary,
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Overview</Typography>
        <Typography variant="h3">Dashboard</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Sales, orders, and inventory health at a glance.</Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard panelSx={panelSx} label="Revenue (6 mo)" value={PESO.format(KPIS.revenue)} delta={KPIS.revenueDelta} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard panelSx={panelSx} label="Orders" value={KPIS.orders} delta={KPIS.ordersDelta} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard panelSx={panelSx} label="Customers" value={KPIS.customers.toLocaleString()} delta={KPIS.customersDelta} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard panelSx={panelSx} label="Avg. order" value={PESO.format(KPIS.avgOrder)} delta={KPIS.avgOrderDelta} /></Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <ChartCard panelSx={panelSx} title="Revenue trend" subtitle="Monthly gross revenue (PHP)">
            <AreaChart data={REVENUE_TREND} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="month" stroke={axisColor} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke={axisColor} tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
              <RTooltip contentStyle={tooltipStyle} formatter={(value) => PESO.format(value)} />
              <Area type="monotone" dataKey="revenue" stroke={primary} strokeWidth={3} fill="url(#revFill)" />
            </AreaChart>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SalesByLineCard panelSx={panelSx} tooltipStyle={tooltipStyle} salesByLine={salesByLine} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard panelSx={panelSx} title="Sales by channel" subtitle="% of orders">
            <BarChart data={CHANNEL_SPLIT} margin={{ top: 6, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={secondary} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={secondary} stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="channel" stroke={axisColor} tickLine={false} axisLine={false} fontSize={12} />
              <YAxis stroke={axisColor} tickLine={false} axisLine={false} fontSize={12} />
              <RTooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} cursor={{ fill: alpha(secondary, 0.08) }} />
              <Bar dataKey="value" fill="url(#barFill)" radius={[8, 8, 0, 0]} maxBarSize={90} />
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ ...panelSx, p: { xs: 2, md: 3 }, height: "100%" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Top products</Typography>
            <Stack spacing={1.5}>
              {TOP_PRODUCTS.map((product, index) => {
                const max = TOP_PRODUCTS[0].revenue;
                const pct = Math.round((product.revenue / max) * 100);
                return (
                  <Box key={product.name}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>
                        <Box component="span" sx={{ fontFamily: MONO_FONT, color: "text.secondary", mr: 1 }}>{index + 1}.</Box>
                        {product.name}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", ml: 1 }}>{PESO.format(product.revenue)}</Typography>
                    </Stack>
                    <Box sx={{ height: 8, borderRadius: 1, bgcolor: alpha(primary, 0.12), overflow: "hidden" }}>
                      <Box sx={{ width: `${pct}%`, height: "100%", borderRadius: 1, background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Recent orders</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" color="inherit" onClick={() => navigate("/admin/customers")} sx={{ color: "text.secondary" }}>Customers →</Button>
            <Button size="small" variant="outlined" color="primary" onClick={() => navigate("/admin/orders")} sx={{ borderColor: surfaceBorderColor }}>All orders →</Button>
          </Stack>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 800, display: { xs: "none", sm: "table-cell" } }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Total</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {RECENT_ORDERS.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700 }}>{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell sx={{ color: "text.secondary", display: { xs: "none", sm: "table-cell" } }}>{order.date}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{PESO.format(order.total)}</TableCell>
                <TableCell align="right"><Chip label={order.status} size="small" color={ORDER_STATUS_COLOR[order.status] || "default"} variant="outlined" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
