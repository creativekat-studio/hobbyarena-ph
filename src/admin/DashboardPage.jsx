import { useMemo, useState } from "react";
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
  TextField,
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
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import AdminSectionTitle from "../components/AdminSectionTitle.jsx";
import { computeDashboardAnalytics } from "../lib/dashboardAnalytics.js";
import { STATUS_COLOR as ORDER_STATUS_COLOR } from "../data/orderWorkflow.js";
import { useOrders } from "../lib/ordersStore.jsx";

const PERIOD_PRESETS = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "1Y", label: "1Y" },
  { key: "custom", label: "Custom" },
];

function defaultCustomRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function CardEmptyState({ message, hint, minHeight = 220 }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        flex: 1,
        minHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 3,
        py: 4,
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(theme.palette.text.primary, 0.06),
          color: "text.secondary",
          fontFamily: MONO_FONT,
          fontWeight: 800,
          fontSize: "1.1rem",
          mb: 1.5,
        }}
      >
        —
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", maxWidth: 320 }}>{message}</Typography>
      {hint ? (
        <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 0.75, maxWidth: 300, lineHeight: 1.45 }}>
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

function KpiCard({ panelSx, label, value, delta, periodLabel }) {
  const positive = delta >= 0;
  return (
    <Box sx={{ ...panelSx, p: 2.5, height: "100%" }}>
      <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", mt: 0.5 }}>{value}</Typography>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
        <Typography sx={{ color: positive ? "success.main" : "error.main", fontWeight: 800, fontSize: "0.8rem", fontFamily: MONO_FONT }}>
          {positive ? "▲" : "▼"} {Math.abs(delta)}%
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>vs prior {periodLabel}</Typography>
      </Stack>
    </Box>
  );
}

function ChartCard({ panelSx, title, subtitle, children, minHeight = 280, empty = false, emptyMessage, emptyHint }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 3 }, height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack spacing={0.25} sx={{ mb: 2 }}>
        <AdminSectionTitle variant="h6">{title}</AdminSectionTitle>
        {subtitle ? <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>{subtitle}</Typography> : null}
      </Stack>
      {empty ? (
        <CardEmptyState message={emptyMessage} hint={emptyHint} minHeight={minHeight} />
      ) : (
        <Box sx={{ width: "100%", flex: 1, minHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}

function SalesByLineCard({ panelSx, tooltipStyle, salesByLine, revenue }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 3 }, height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack spacing={0.25} sx={{ mb: 1 }}>
        <AdminSectionTitle variant="h6">Sales by line</AdminSectionTitle>
        <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>Share of paid revenue</Typography>
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
          <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", lineHeight: 1, textAlign: "center" }}>
            {revenue >= 1e6 ? `₱${(revenue / 1e6).toFixed(2)}M` : PESO.format(revenue)}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>period revenue</Typography>
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
  const { orders } = useOrders();

  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const gridColor = alpha(theme.palette.text.primary, 0.1);
  const axisColor = theme.palette.text.secondary;
  const chartColors = theme.ha?.chartColors ?? {};

  const [period, setPeriod] = useState("1M");
  const [customRange, setCustomRange] = useState(defaultCustomRange);

  const periodQuery = useMemo(() => {
    if (period === "custom") {
      return { start: customRange.from, end: customRange.to };
    }
    return period;
  }, [period, customRange.from, customRange.to]);

  const analytics = useMemo(
    () => computeDashboardAnalytics(orders, periodQuery),
    [orders, periodQuery],
  );

  const revenuePeriodLabel = period === "custom" ? "Custom" : period;

  const salesByLine = useMemo(
    () =>
      analytics.salesByLine.map((entry) => ({
        ...entry,
        color:
          entry.name.includes("Pokémon")
            ? chartColors.pokemon ?? entry.color
            : entry.name.includes("One Piece")
              ? chartColors.onePiece ?? entry.color
              : chartColors.accessories ?? entry.color,
      })),
    [analytics.salesByLine, chartColors.pokemon, chartColors.onePiece, chartColors.accessories],
  );

  const tooltipStyle = {
    background: theme.palette.background.paper,
    border: `1px solid ${surfaceBorderColor}`,
    borderRadius: 1,
    fontSize: 12,
    color: theme.palette.text.primary,
  };

  const { kpis, revenueTrend, channelSplit, topProducts, recentOrders, periodLabel, periodKey } = analytics;
  const trendSubtitle = periodKey === "custom"
    ? "Revenue in selected range (PHP)"
    : period === "1D"
      ? "Hourly gross revenue (PHP)"
      : period === "1Y"
        ? "Monthly gross revenue (PHP)"
        : "Revenue by period (PHP)";

  function selectPeriod(next) {
    setPeriod(next);
    if (next === "custom" && (!customRange.from || !customRange.to)) {
      setCustomRange(defaultCustomRange());
    }
  }

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Live sales from your order history."
        action={(
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
            {PERIOD_PRESETS.map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                onClick={() => selectPeriod(key)}
                color={period === key ? "primary" : "default"}
                variant={period === key ? "filled" : "outlined"}
                sx={{ fontWeight: 700, fontFamily: MONO_FONT, height: 32 }}
              />
            ))}
          </Stack>
        )}
      />

      {period === "custom" ? (
        <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "flex-end" }}>
            <TextField
              label="From"
              type="date"
              size="small"
              value={customRange.from}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { sm: 160 } }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={customRange.to}
              onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: customRange.from }}
              sx={{ minWidth: { sm: 160 } }}
            />
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", pb: { sm: 1 } }}>
              Comparing to the same length immediately before your start date.
            </Typography>
          </Stack>
        </Box>
      ) : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard panelSx={panelSx} label={`Revenue (${revenuePeriodLabel})`} value={PESO.format(kpis.revenue)} delta={kpis.revenueDelta} periodLabel={periodLabel} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard panelSx={panelSx} label="Orders" value={kpis.orders} delta={kpis.ordersDelta} periodLabel={periodLabel} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard panelSx={panelSx} label="Customers" value={kpis.customers.toLocaleString()} delta={kpis.customersDelta} periodLabel={periodLabel} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><KpiCard panelSx={panelSx} label="Avg. order" value={PESO.format(kpis.avgOrder)} delta={kpis.avgOrderDelta} periodLabel={periodLabel} /></Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <ChartCard panelSx={panelSx} title="Revenue trend" subtitle={trendSubtitle}>
            <AreaChart data={revenueTrend} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
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
          <SalesByLineCard panelSx={panelSx} tooltipStyle={tooltipStyle} salesByLine={salesByLine} revenue={kpis.revenue} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <ChartCard
            panelSx={panelSx}
            title="Orders by type"
            subtitle="% of orders in period"
            empty={!channelSplit.length}
            emptyMessage="No orders in this period yet."
            emptyHint="Try a wider date range or wait for new orders to come in."
          >
            <BarChart data={channelSplit} margin={{ top: 6, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%">
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
          <Box sx={{ ...panelSx, p: { xs: 2, md: 3 }, height: "100%", display: "flex", flexDirection: "column" }}>
            <AdminSectionTitle variant="h6" sx={{ mb: 2 }}>Top products</AdminSectionTitle>
            {topProducts.length ? (
              <Stack spacing={1.5}>
                {topProducts.map((product, index) => {
                  const max = topProducts[0].revenue || 1;
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
            ) : (
              <CardEmptyState
                message="No paid line items in this period."
                hint="Top products appear once orders are marked paid or deposit received."
                minHeight={240}
              />
            )}
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <AdminSectionTitle variant="h6">Recent orders</AdminSectionTitle>
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
            {recentOrders.map((order) => (
              <TableRow key={order.id} hover sx={{ cursor: "pointer" }} onClick={() => navigate(`/admin/orders/${encodeURIComponent(order.id)}`)}>
                <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700 }}>{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell sx={{ color: "text.secondary", display: { xs: "none", sm: "table-cell" } }}>{order.date}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{PESO.format(order.total)}</TableCell>
                <TableCell align="right"><Chip label={order.status} size="small" color={ORDER_STATUS_COLOR[order.status] || "default"} variant="outlined" /></TableCell>
              </TableRow>
            ))}
            {recentOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>No orders yet.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}
