import { useMemo, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  Grid,
  Link as MuiLink,
  Popover,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink, useNavigate, useOutletContext } from "react-router-dom";
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
import { curveBumpX } from "d3-shape";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { InfoIcon } from "../components/icons.jsx";
import { computeDashboardAnalytics } from "../lib/dashboardAnalytics.js";
import { STATUS_COLOR as ORDER_STATUS_COLOR, orderStatusLabel } from "../data/orderWorkflow.js";
import { buildCostByProductId } from "../lib/orderRevenue.js";
import { isArchivedOrder, useOrders } from "../lib/ordersStore.jsx";
import { localDateKey } from "../lib/orderTimestamps.js";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useIsMobileMd } from "../lib/mobileUi.js";

const RECENT_ORDERS_GRID = "minmax(140px, 1.1fr) minmax(120px, 1fr) minmax(140px, 1.3fr) minmax(120px, 0.9fr)";
const RECENT_ORDERS_MIN_WIDTH = 560;

function recentOrdersGridSx(overrides = {}) {
  return {
    display: "grid",
    gridTemplateColumns: RECENT_ORDERS_GRID,
    columnGap: { xs: 1, md: 1.5 },
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
    px: { xs: 1.25, md: 1.5 },
    ...overrides,
  };
}

function RecentOrdersHeaderCell({ children, sx }) {
  return (
    <Typography
      sx={{
        fontFamily: MONO_FONT,
        fontWeight: 800,
        fontSize: "0.75rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "text.secondary",
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      {children}
    </Typography>
  );
}

const PERIOD_PRESETS = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "1Y", label: "1Y" },
];

/** Compact Y-axis labels — avoids clipping "2400k" to "400k" in a narrow axis. */
function formatAxisCompact(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    const label = Math.abs(millions - Math.round(millions)) < 0.05
      ? String(Math.round(millions))
      : millions.toFixed(1).replace(/\.0$/, "");
    return `${label}M`;
  }
  if (abs >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

/** Ceiling just above the peak (e.g. 4.8M → 5M, not 6M). */
function niceAxisMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const padded = value * 1.02;
  const exp = Math.max(0, Math.floor(Math.log10(padded)));
  const mag = 10 ** exp;
  const step = mag >= 1 ? mag / 2 : 1;
  return Math.ceil(padded / step) * step;
}

function buildAxisTicks(max, count = 5) {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const ticks = [];
  for (let i = 0; i < count; i += 1) {
    ticks.push((max * i) / (count - 1));
  }
  return ticks;
}

const PERIOD_TOGGLE_SX = {
  px: 1.5,
  fontFamily: MONO_FONT,
  fontSize: "0.68rem",
  letterSpacing: 0.4,
  textTransform: "uppercase",
  fontWeight: 700,
  "&.Mui-selected": {
    bgcolor: "primary.main",
    color: "primary.contrastText",
    borderColor: "primary.main",
    "&:hover": {
      bgcolor: "primary.main",
      color: "primary.contrastText",
      filter: "brightness(1.05)",
    },
  },
  "&.Mui-selected.Mui-disabled": {
    bgcolor: "primary.main",
    color: "primary.contrastText",
  },
};

function defaultCustomRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {
    from: localDateKey(start),
    to: localDateKey(end),
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

function PanelCollapseChevron({ open }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 24,
        height: 24,
        borderRadius: 1,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: open ? "primary.main" : "text.secondary",
        border: "1px solid",
        borderColor: open ? (theme) => alpha(theme.palette.primary.main, 0.45) : "divider",
        fontSize: "0.7rem",
        lineHeight: 1,
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform 180ms ease, color 180ms ease, border-color 180ms ease",
      }}
    >
      ▾
    </Box>
  );
}

/**
 * Dashboard widget chrome — matches CMS section accordions (title + subtitle header).
 * Collapsible on mobile only; expanded by default.
 */
function DashboardPanel({
  panelSx,
  surfaceBorderColor,
  title,
  subtitle,
  headerRight,
  children,
  defaultExpanded = true,
  collapsibleOnMobile = true,
  sx,
}) {
  const isMobile = useIsMobileMd();
  const collapsible = collapsibleOnMobile && isMobile;
  const [open, setOpen] = useState(defaultExpanded);
  const borderColor = surfaceBorderColor ?? panelSx?.borderColor ?? "divider";

  const header = (
    <Box
      sx={{
        width: "100%",
        px: { xs: 2, md: 2.5 },
        py: 1,
        boxSizing: "border-box",
        textAlign: "left",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minHeight: 40 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "0.88rem",
            lineHeight: 1.25,
            fontFamily: MONO_FONT,
            letterSpacing: 1.1,
            textTransform: "uppercase",
          }}
        >
          {typeof title === "string" ? title.toUpperCase() : title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ color: "text.secondary", fontSize: "0.75rem", mt: 0.25, lineHeight: 1.35 }}>
            {subtitle}
          </Typography>
        ) : null}
        </Box>
        {headerRight ? (
          <Box
            onClick={collapsible ? (event) => event.stopPropagation() : undefined}
            onKeyDown={collapsible ? (event) => event.stopPropagation() : undefined}
            sx={{
              flexShrink: 0,
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 1,
              justifyContent: "flex-end",
            }}
          >
            {headerRight}
          </Box>
        ) : null}
        {collapsible ? <PanelCollapseChevron open={open} /> : null}
      </Stack>
      {headerRight ? (
        <Box
          onClick={collapsible ? (event) => event.stopPropagation() : undefined}
          onKeyDown={collapsible ? (event) => event.stopPropagation() : undefined}
          sx={{
            display: { xs: "flex", sm: "none" },
            alignItems: "center",
            gap: 1,
            mt: 1,
            width: "100%",
          }}
        >
          {headerRight}
        </Box>
      ) : null}
    </Box>
  );

  const contentSx = {
    px: { xs: 2, md: 2.5 },
    pt: { xs: 1.75, md: 2 },
    pb: { xs: 2, md: 2.5 },
    borderTop: "1px solid",
    borderColor,
    minWidth: 0,
  };

  return (
    <Box
      sx={{
        ...panelSx,
        overflow: "hidden",
        minWidth: 0,
        // Default to content height. Grid siblings that need equal card
        // heights pass sx={{ height: "100%" }} — not full-page stretch.
        height: "auto",
        display: "flex",
        flexDirection: "column",
        ...(collapsible && open
          ? { borderColor: (theme) => alpha(theme.palette.primary.main, 0.4) }
          : {}),
        ...sx,
      }}
    >
      {collapsible ? (
        <ButtonBase
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          sx={{ display: "block", width: "100%", borderRadius: 0 }}
        >
          {header}
        </ButtonBase>
      ) : (
        header
      )}

      {collapsible ? (
        <Collapse in={open} timeout="auto" unmountOnExit={false}>
          <Box sx={contentSx}>{children}</Box>
        </Collapse>
      ) : (
        <Box sx={{ ...contentSx, flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

function KpiStrip({ panelSx, items, periodLabel }) {
  return (
    <Box
      sx={{
        ...panelSx,
        // flex-shrink + overflow:hidden collapses this strip in the page Stack
        // and clips the KPI values under the labels — keep natural height.
        flexShrink: 0,
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(3, minmax(0, 1fr))",
          md: "repeat(5, minmax(0, 1fr))",
        },
        columnGap: { xs: 2, md: 0 },
        rowGap: { xs: 2.5, md: 0 },
        px: { xs: 2, md: 0 },
        py: { xs: 2, md: 0 },
        overflow: "visible",
      }}
    >
      {items.map((item, index) => {
        const positive = (item.delta ?? 0) >= 0;
        return (
          <Box
            key={item.label}
            sx={{
              minWidth: 0,
              px: { xs: 0, md: 2.5 },
              py: { xs: 0, md: 2.5 },
              borderRight: {
                xs: "none",
                md: index < items.length - 1 ? "1px solid" : "none",
              },
              borderColor: { md: "divider" },
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              position: "relative",
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ width: "100%", minHeight: "2.5em" }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  fontSize: "0.65rem",
                  lineHeight: 1.25,
                  minWidth: 0,
                }}
              >
                {item.label}
              </Typography>
              {item.info ? (
                <Tooltip
                  title={(
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.75rem", mb: 0.25 }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", lineHeight: 1.35 }}>
                        {item.info}
                      </Typography>
                    </Box>
                  )}
                  placement="top"
                  arrow
                >
                  <Box
                    component="span"
                    sx={{
                      display: "inline-flex",
                      color: "text.secondary",
                      cursor: "help",
                      lineHeight: 0,
                      flexShrink: 0,
                      "&:hover": { color: "text.primary" },
                    }}
                    aria-label={`${item.label}: ${item.info}`}
                  >
                    <InfoIcon sx={{ fontSize: 14 }} />
                  </Box>
                </Tooltip>
              ) : null}
            </Stack>
            <Typography
              sx={{
                color: "text.primary",
                fontWeight: 800,
                fontSize: { xs: "1.2rem", md: "1.55rem" },
                lineHeight: 1.15,
                mt: 0.75,
                fontVariantNumeric: "tabular-nums",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {item.value}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="baseline" flexWrap="wrap" useFlexGap sx={{ mt: "auto", pt: 0.75 }}>
              <Typography
                sx={{
                  color: positive ? "success.main" : "error.main",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  fontFamily: MONO_FONT,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {positive ? "▲" : "▼"} {Math.abs(item.delta ?? 0)}%
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.68rem" }}>
                vs prior {periodLabel}
              </Typography>
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}

function ChartCard({
  panelSx,
  surfaceBorderColor,
  title,
  subtitle,
  headerRight,
  children,
  minHeight = 240,
  empty = false,
  emptyMessage,
  emptyHint,
}) {
  const body = empty ? (
    <CardEmptyState message={emptyMessage} hint={emptyHint} minHeight={minHeight} />
  ) : (
    <Box sx={{ width: "100%", height: minHeight, minWidth: 0, overflow: "visible" }}>
      <ResponsiveContainer width="100%" height={minHeight}>
        {children}
      </ResponsiveContainer>
    </Box>
  );

  return (
    <DashboardPanel
      panelSx={panelSx}
      surfaceBorderColor={surfaceBorderColor}
      title={title}
      subtitle={subtitle}
      headerRight={headerRight}
      sx={{ height: "100%" }}
    >
      {body}
    </DashboardPanel>
  );
}

/** Real Time = cash recognized now (incl. deposits). Fulfilled = completed lines only. */
const REVENUE_BASIS_FILTERS = [
  { id: "paid", label: "Real Time" },
  { id: "fulfilled", label: "Fulfilled" },
];

const REVENUE_BASIS_FILTER_SX = {
  px: 1.25,
  fontFamily: MONO_FONT,
  fontSize: "0.68rem",
  letterSpacing: 0.4,
  textTransform: "uppercase",
  fontWeight: 700,
};

function RevenueBasisToggle({ value, onChange }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next) => { if (next) onChange(next); }}
    >
      {REVENUE_BASIS_FILTERS.map((item) => (
        <ToggleButton key={item.id} value={item.id} sx={REVENUE_BASIS_FILTER_SX}>
          {item.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function SalesByLineCard({
  panelSx,
  surfaceBorderColor,
  tooltipStyle,
  salesByLine,
  revenue,
  mode,
}) {
  const chartHeight = 200;
  const subtitle = mode === "fulfilled"
    ? "Fulfilled lines only"
    : "Real-time sales before product cost";
  const centerLabel = mode === "fulfilled" ? "fulfilled gross" : "real-time gross";
  // Draw from revenue so tiny lines keep true share; skip empty slices so
  // paddingAngle does not open a fake gap when one line is ~100%.
  const hasLineRevenue = salesByLine.some((entry) => (entry.revenue ?? 0) > 0);
  const pieData = hasLineRevenue
    ? salesByLine.filter((entry) => entry.revenue > 0)
    : salesByLine.filter((entry) => entry.value > 0);
  const pieKey = hasLineRevenue ? "revenue" : "value";
  const piePadding = pieData.length > 1 ? 3 : 0;

  return (
    <DashboardPanel
      panelSx={panelSx}
      surfaceBorderColor={surfaceBorderColor}
      title="Sales by line"
      subtitle={subtitle}
      sx={{ height: "100%" }}
    >
      <Box sx={{ position: "relative", width: "100%", height: chartHeight, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey={pieKey}
              nameKey="name"
              innerRadius="64%"
              outerRadius="94%"
              paddingAngle={piePadding}
              stroke="none"
            >
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <RTooltip
              contentStyle={tooltipStyle}
              formatter={(value, _name, item) => {
                const pct = item?.payload?.value;
                if (!hasLineRevenue) return `${pct ?? value}%`;
                const amount = PESO.format(value);
                return pct != null ? `${amount} (${pct}%)` : amount;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none", px: 2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.05rem", md: "1.25rem" }, lineHeight: 1, textAlign: "center" }}>
            {revenue >= 1e6 ? `₱${(revenue / 1e6).toFixed(2)}M` : PESO.format(revenue)}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{centerLabel}</Typography>
        </Box>
      </Box>
      <Stack spacing={1} sx={{ mt: 1.5, minWidth: 0 }}>
        {salesByLine.map((entry) => (
          <Stack key={entry.name} direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: entry.color, flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, flexGrow: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</Typography>
            <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, flexShrink: 0 }}>
              {entry.value === 0 && entry.revenue > 0 ? "<1%" : `${entry.value}%`}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </DashboardPanel>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { orders } = useOrders();
  const { items: inventoryItems } = useInventory();

  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const gridColor = alpha(theme.palette.text.primary, 0.1);
  const axisColor = theme.palette.text.secondary;
  const chartColors = theme.ha?.chartColors ?? {};

  const [period, setPeriod] = useState("1M");
  const [customRange, setCustomRange] = useState(defaultCustomRange);
  const [customAnchor, setCustomAnchor] = useState(null);
  const [revenueBasis, setRevenueBasis] = useState("paid");
  const customOpen = Boolean(customAnchor);

  const periodQuery = useMemo(() => {
    if (period === "custom") {
      return { start: customRange.from, end: customRange.to };
    }
    return period;
  }, [period, customRange.from, customRange.to]);

  // Use raw inventory rows (always have cost) — catalogProducts previously omitted cost.
  const costByProductId = useMemo(
    () => buildCostByProductId(inventoryItems),
    [inventoryItems],
  );

  const analytics = useMemo(
    () => computeDashboardAnalytics(
      orders.filter((order) => !isArchivedOrder(order)),
      periodQuery,
      new Date(),
      revenueBasis,
      costByProductId,
    ),
    [orders, periodQuery, revenueBasis, costByProductId],
  );

  const salesByLine = useMemo(
    () => analytics.salesByLine.map((entry) => ({
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

  const {
    kpis,
    revenueTrend,
    channelSplit,
    topProducts,
    recentOrders,
    periodLabel,
    periodKey,
  } = analytics;

  const trendAxisMax = useMemo(() => {
    const peak = Math.max(0, ...revenueTrend.map((point) => Number(point.revenue) || 0));
    return niceAxisMax(peak);
  }, [revenueTrend]);
  const trendAxisTicks = useMemo(
    () => buildAxisTicks(trendAxisMax),
    [trendAxisMax],
  );

  const trendSubtitle = revenueBasis === "fulfilled"
    ? (periodKey === "custom"
      ? "Fulfilled lines only in selected range"
      : period === "1D"
        ? "Hourly fulfilled gross"
        : period === "1Y"
          ? "Monthly fulfilled gross"
          : "Fulfilled gross by period")
    : (periodKey === "custom"
      ? "Gross income in selected range"
      : period === "1D"
        ? "Hourly gross income"
        : period === "1Y"
          ? "Monthly gross income"
          : "Gross income by period");
  const kpiRevenueInfo = revenueBasis === "fulfilled"
    ? "Allocated × price on fulfilled lines."
    : "Allocated × price after allocation; deposit only before allocation.";
  const kpiNetInfo = revenueBasis === "fulfilled"
    ? "(Price − cost) × fulfilled units."
    : "(Price − cost) × allocated units. Deposit-only: (price − cost) × qty × deposit%.";

  function selectPeriod(next) {
    setPeriod(next);
    if (next === "custom" && (!customRange.from || !customRange.to)) {
      setCustomRange(defaultCustomRange());
    }
    if (next !== "custom") {
      setCustomAnchor(null);
    }
  }

  function openCustomPopover(event) {
    if (!customRange.from || !customRange.to) {
      setCustomRange(defaultCustomRange());
    }
    setPeriod("custom");
    setCustomAnchor(event.currentTarget);
  }

  function closeCustomPopover() {
    setCustomAnchor(null);
  }

  return (
    <Stack
      spacing={ADMIN_PAGE_SPACING}
      sx={{
        minWidth: 0,
        width: "100%",
        maxWidth: "100%",
        flexShrink: 0,
        // Prevent flex children (esp. overflow:hidden panels) from shrinking
        // below content and clipping KPIs / chart bodies.
        "& > *": { flexShrink: 0 },
      }}
    >
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Live sales from your order history."
        action={(
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ maxWidth: "100%" }}>
            <RevenueBasisToggle value={revenueBasis} onChange={setRevenueBasis} />

            <ToggleButtonGroup
              exclusive
              size="small"
              value={period === "custom" ? null : period}
              onChange={(_, next) => { if (next) selectPeriod(next); }}
              sx={{ flexWrap: "wrap" }}
            >
              {PERIOD_PRESETS.map(({ key, label }) => (
                <ToggleButton key={key} value={key} sx={PERIOD_TOGGLE_SX}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <Button
              size="small"
              variant={period === "custom" ? "contained" : "outlined"}
              color={period === "custom" ? "primary" : "inherit"}
              onClick={openCustomPopover}
              aria-haspopup="dialog"
              aria-expanded={customOpen}
              sx={{
                fontFamily: MONO_FONT,
                fontSize: "0.68rem",
                letterSpacing: 0.4,
                textTransform: "uppercase",
                fontWeight: 700,
                minHeight: 32,
                px: 1.5,
                ...(period !== "custom" ? { borderColor: surfaceBorderColor } : {}),
              }}
            >
              Custom
            </Button>

            <Popover
              open={customOpen}
              anchorEl={customAnchor}
              onClose={closeCustomPopover}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    p: 2,
                    minWidth: 280,
                    maxWidth: "calc(100vw - 32px)",
                    border: "1px solid",
                    borderColor: surfaceBorderColor,
                    ...panelSx,
                  },
                },
              }}
            >
              <Stack spacing={1.75}>
                <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "text.secondary" }}>
                  Custom dates
                </Typography>
                <TextField
                  label="From"
                  type="date"
                  size="small"
                  fullWidth
                  value={customRange.from}
                  onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="To"
                  type="date"
                  size="small"
                  fullWidth
                  value={customRange.to}
                  onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: customRange.from }}
                />
                <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", lineHeight: 1.4 }}>
                  Comparing to the same length immediately before your start date.
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={closeCustomPopover}
                  sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", fontSize: "0.68rem", alignSelf: "flex-end" }}
                >
                  Done
                </Button>
              </Stack>
            </Popover>
          </Stack>
        )}
      />

      <KpiStrip
        panelSx={panelSx}
        periodLabel={periodLabel}
        items={[
          { label: "Gross Income", value: PESO.format(kpis.revenue), delta: kpis.revenueDelta, info: kpiRevenueInfo },
          { label: "Net Income", value: PESO.format(kpis.netRevenue), delta: kpis.netRevenueDelta, info: kpiNetInfo },
          { label: "Orders", value: kpis.orders, delta: kpis.ordersDelta },
          { label: "Customers", value: kpis.customers.toLocaleString(), delta: kpis.customersDelta },
          { label: "Avg. order", value: PESO.format(kpis.avgOrder), delta: kpis.avgOrderDelta },
        ]}
      />

      <Grid container spacing={2.5} sx={{ width: "100%", m: 0 }}>
        <Grid size={{ xs: 12, md: 8 }} sx={{ minWidth: 0 }}>
          <ChartCard
            panelSx={panelSx}
            surfaceBorderColor={surfaceBorderColor}
            title="Revenue trend"
            subtitle={trendSubtitle}
          >
            <AreaChart data={revenueTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="month"
                stroke={axisColor}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval={0}
                padding={{ left: 8, right: 16 }}
              />
              <YAxis
                stroke={axisColor}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={48}
                domain={[0, trendAxisMax]}
                ticks={trendAxisTicks}
                tickFormatter={formatAxisCompact}
                allowDataOverflow={false}
              />
              <RTooltip contentStyle={tooltipStyle} formatter={(value) => PESO.format(value)} />
              <Area
                type={curveBumpX}
                dataKey="revenue"
                stroke={primary}
                strokeWidth={3}
                fill="url(#revFill)"
                dot={{ r: 4, strokeWidth: 2, stroke: primary, fill: theme.palette.background.paper }}
                activeDot={{ r: 5.5, strokeWidth: 2, stroke: primary, fill: theme.palette.background.paper }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
          <SalesByLineCard
            panelSx={panelSx}
            surfaceBorderColor={surfaceBorderColor}
            tooltipStyle={tooltipStyle}
            salesByLine={salesByLine}
            revenue={kpis.revenue}
            mode={revenueBasis}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ width: "100%", m: 0 }}>
        <Grid size={{ xs: 12, md: 5 }} sx={{ minWidth: 0 }}>
          <ChartCard
            panelSx={panelSx}
            surfaceBorderColor={surfaceBorderColor}
            title="Orders by type"
            subtitle="% of orders in period"
            empty={!channelSplit.length}
            emptyMessage="No orders in this period yet."
            emptyHint="Try a wider date range or wait for new orders to come in."
          >
            <BarChart data={channelSplit} margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
              <defs>
                <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={secondary} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={secondary} stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="channel" stroke={axisColor} tickLine={false} axisLine={false} fontSize={11} />
              <YAxis stroke={axisColor} tickLine={false} axisLine={false} fontSize={11} width={28} />
              <RTooltip contentStyle={tooltipStyle} formatter={(value) => `${value}%`} cursor={{ fill: alpha(secondary, 0.08) }} />
              <Bar dataKey="value" fill="url(#barFill)" radius={[8, 8, 0, 0]} maxBarSize={90} />
            </BarChart>
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }} sx={{ minWidth: 0 }}>
          <DashboardPanel
            panelSx={panelSx}
            surfaceBorderColor={surfaceBorderColor}
            title="Top products"
            subtitle={revenueBasis === "fulfilled" ? "By fulfilled gross in this period" : "By real-time gross in this period"}
            sx={{ height: "100%" }}
          >
            {topProducts.length ? (
              <Stack spacing={1.5}>
                {topProducts.map((product, index) => {
                  const max = topProducts[0].revenue || 1;
                  const pct = Math.round((product.revenue / max) * 100);
                  return (
                    <Box key={product.name} sx={{ minWidth: 0 }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.5 }}>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.88rem",
                            minWidth: 0,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          <Box component="span" sx={{ fontFamily: MONO_FONT, color: "text.secondary", mr: 1 }}>{index + 1}.</Box>
                          {product.name}
                        </Typography>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", whiteSpace: "nowrap", flexShrink: 0 }}>{PESO.format(product.revenue)}</Typography>
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
                message="No real-time line items in this period."
                hint="Top products appear once orders are marked paid or deposit received."
                minHeight={240}
              />
            )}
          </DashboardPanel>
        </Grid>
      </Grid>

      <DashboardPanel
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
        title="Recent orders"
        subtitle="Latest orders across queues"
        headerRight={(
          <>
            <Button size="small" color="inherit" onClick={() => navigate("/admin/customers")} sx={{ color: "text.secondary", whiteSpace: "nowrap", flex: { xs: 1, sm: "none" } }}>
              Customers →
            </Button>
            <Button size="small" variant="outlined" color="primary" onClick={() => navigate("/admin/orders")} sx={{ borderColor: surfaceBorderColor, whiteSpace: "nowrap", flex: { xs: 1, sm: "none" } }}>
              All orders →
            </Button>
          </>
        )}
      >
        {recentOrders.length === 0 ? (
          <Typography sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>No orders yet.</Typography>
        ) : (
          <Box sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch", mx: { xs: -2, md: -2.5 } }}>
            <Box sx={{ minWidth: RECENT_ORDERS_MIN_WIDTH }}>
              <Box
                sx={{
                  ...recentOrdersGridSx(),
                  py: 1,
                  borderBottom: "1px solid",
                  borderColor: surfaceBorderColor,
                }}
              >
                <RecentOrdersHeaderCell>Order</RecentOrdersHeaderCell>
                <RecentOrdersHeaderCell>Customer</RecentOrdersHeaderCell>
                <RecentOrdersHeaderCell>Items</RecentOrdersHeaderCell>
                <RecentOrdersHeaderCell>Status</RecentOrdersHeaderCell>
              </Box>

              {recentOrders.map((order) => (
                <Box
                  key={order.id}
                  sx={{
                    ...recentOrdersGridSx(),
                    py: 1.25,
                    borderBottom: "1px solid",
                    borderColor: surfaceBorderColor,
                    "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <MuiLink
                      component={RouterLink}
                      to={`/admin/orders/${encodeURIComponent(order.id)}`}
                      underline="hover"
                      sx={{
                        fontFamily: MONO_FONT,
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        whiteSpace: "nowrap",
                        color: "primary.main",
                        display: "inline-block",
                      }}
                    >
                      {order.id}
                    </MuiLink>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", whiteSpace: "nowrap", fontFamily: MONO_FONT }}>
                      {order.date}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.customer}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.items || "—"}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>
                      {PESO.format(order.total)}
                      {order.qtyLabel ? ` · Qty ${order.qtyLabel}` : ""}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Chip
                      label={orderStatusLabel(order.status)}
                      size="small"
                      color={ORDER_STATUS_COLOR[order.status] || "default"}
                      variant="outlined"
                      sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                    />
                  </Box>

                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DashboardPanel>
    </Stack>
  );
}
