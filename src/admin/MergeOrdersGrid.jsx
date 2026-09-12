import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import {
  AdminGridHeaderLabel,
  ADMIN_LIST_SCROLL_SX,
} from "./adminTableHeader.jsx";
import { STATUS_COLOR } from "../data/orderWorkflow.js";
import {
  applyMergeSimulationToOrder,
  buildMergeSourceRows,
  collectMergeProducts,
  describeMergeSelection,
  simulateMergeRows,
  simulateMergeTotals,
} from "../lib/orderMergeSimulation.js";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";

const MERGE_GRID = [
  "minmax(110px, 0.7fr)",
  "minmax(120px, 0.85fr)",
  "minmax(180px, 1.4fr)",
  "minmax(56px, 0.4fr)",
  "minmax(92px, 0.55fr)",
  "minmax(92px, 0.55fr)",
  "minmax(92px, 0.55fr)",
  "minmax(76px, 0.45fr)",
  "minmax(56px, 0.4fr)",
  "minmax(76px, 0.45fr)",
  "minmax(96px, 0.55fr)",
  "minmax(104px, 0.6fr)",
  "minmax(160px, 1fr)",
].join(" ");

const MERGE_TABLE_MIN_WIDTH = 1280;

function mergeGridSx(overrides = {}) {
  return {
    display: "grid",
    gridTemplateColumns: MERGE_GRID,
    columnGap: { xs: 1, md: 1.25 },
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
    px: { xs: 1.25, md: 1.5 },
    ...overrides,
  };
}

function moneyColor(value) {
  if (value > 0) return "success.main";
  if (value < 0) return "error.main";
  return "text.primary";
}

function CompactField({ value, onChange, sx, ...props }) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      sx={{
        minWidth: 0,
        "& .MuiInputBase-input": {
          fontFamily: MONO_FONT,
          fontSize: "0.78rem",
          py: 0.65,
          px: 0.85,
        },
        ...sx,
      }}
      {...props}
    />
  );
}

export default function MergeOrdersGrid({
  orders,
  updateOrder,
  surfaceBorderColor,
  stickyHeaderBg,
  onClose,
}) {
  const theme = useTheme();
  const sourceRows = useMemo(() => buildMergeSourceRows(orders), [orders]);
  const products = useMemo(() => collectMergeProducts(sourceRows), [sourceRows]);
  const summary = useMemo(
    () => describeMergeSelection(orders, sourceRows),
    [orders, sourceRows],
  );

  const [percentByProduct, setPercentByProduct] = useState({});
  const [finalByRow, setFinalByRow] = useState({});
  const [confirmApply, setConfirmApply] = useState(false);
  const [appliedNote, setAppliedNote] = useState("");
  const selectionKey = sourceRows.map((row) => row.key).join("|");

  useEffect(() => {
    const next = {};
    for (const row of sourceRows) {
      if (next[row.productKey] == null) {
        next[row.productKey] = row.defaultPercent || 0;
      }
    }
    setPercentByProduct(next);
    setFinalByRow({});
    setAppliedNote("");
    // Re-seed only when the selected line set changes, not on live order snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const simulatedRows = useMemo(
    () => simulateMergeRows(sourceRows, { percentByProduct, finalByRow }),
    [sourceRows, percentByProduct, finalByRow],
  );
  const totals = useMemo(
    () => simulateMergeTotals(simulatedRows),
    [simulatedRows],
  );

  function setProductPercent(productKey, value) {
    const numeric = value === "" ? 0 : Number(value);
    setPercentByProduct((prev) => ({
      ...prev,
      [productKey]: Number.isFinite(numeric) ? Math.max(0, numeric) : 0,
    }));
    setFinalByRow((prev) => {
      const next = { ...prev };
      for (const row of sourceRows) {
        if (row.productKey === productKey) delete next[row.key];
      }
      return next;
    });
    setAppliedNote("");
  }

  function setRowFinal(rowKey, value) {
    setFinalByRow((prev) => ({ ...prev, [rowKey]: value }));
    setAppliedNote("");
  }

  function applySimulation() {
    let count = 0;
    for (const order of orders) {
      const patch = applyMergeSimulationToOrder(order, simulatedRows);
      if (!patch) continue;
      updateOrder(order.id, patch);
      count += 1;
    }
    setAppliedNote(`Applied allocation to ${count} order${count === 1 ? "" : "s"}. Emails were not sent.`);
    setConfirmApply(false);
  }

  if (!sourceRows.length) {
    return (
      <Stack spacing={2} sx={{ p: 3 }}>
        <Alert severity="info">
          Selected orders have no pre-order lines waiting for allocation. Closed, unpaid, and in-stock lines stay on their own order pages.
        </Alert>
        <Button onClick={onClose} variant="outlined">Back to orders</Button>
      </Stack>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Stack spacing={1.5} sx={{ px: { xs: 1.5, md: 2 }, pt: 1.5, pb: 1, flexShrink: 0 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1rem" }}>
              Merge &amp; simulate allocation
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
              {summary.orderCount} orders · {summary.customerCount} customer{summary.customerCount === 1 ? "" : "s"} · {summary.lineCount} line{summary.lineCount === 1 ? "" : "s"}
              {" "}· source orders stay separate · emails not sent
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              variant="outlined"
              onClick={onClose}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
            >
              Back to orders
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => setConfirmApply(true)}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
            >
              Apply to orders
            </Button>
          </Stack>
        </Stack>

        {appliedNote ? <Alert severity="success">{appliedNote}</Alert> : null}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {products.map((product) => (
            <Stack
              key={product.productKey}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                border: "1px solid",
                borderColor: surfaceBorderColor,
                borderRadius: 1,
                px: 1.25,
                py: 0.75,
                minWidth: { xs: "100%", md: 280 },
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.8rem" }} noWrap>
                  {product.name}
                </Typography>
                <Typography sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
                  {product.qty} ordered · {product.customerCount} customer{product.customerCount === 1 ? "" : "s"}
                </Typography>
              </Box>
              <CompactField
                type="number"
                value={percentByProduct[product.productKey] ?? 0}
                onChange={(value) => setProductPercent(product.productKey, value)}
                inputProps={{ min: 0, step: 0.1, "aria-label": `Allocation percent for ${product.name}` }}
                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                sx={{ width: 96 }}
              />
            </Stack>
          ))}
        </Stack>
      </Stack>

      <Box sx={ADMIN_LIST_SCROLL_SX}>
        <Box sx={{ minWidth: MERGE_TABLE_MIN_WIDTH }}>
          <Box
            sx={{
              ...mergeGridSx(),
              py: 1,
              position: "sticky",
              top: 0,
              zIndex: 2,
              bgcolor: stickyHeaderBg,
              borderBottom: "1px solid",
              borderColor: surfaceBorderColor,
            }}
          >
            <AdminGridHeaderLabel>Order</AdminGridHeaderLabel>
            <AdminGridHeaderLabel>Customer</AdminGridHeaderLabel>
            <AdminGridHeaderLabel>Item</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>Qty</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>Unit price</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>DP amount</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>Balance</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>Alloc %</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>Raw</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>Final alloc</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>New amount</AdminGridHeaderLabel>
            <AdminGridHeaderLabel sx={{ textAlign: "right" }}>Final price</AdminGridHeaderLabel>
            <AdminGridHeaderLabel>Conclusion</AdminGridHeaderLabel>
          </Box>

          {simulatedRows.map((row, index) => (
            <Box
              key={row.key}
              sx={{
                ...mergeGridSx(),
                py: 1,
                borderBottom: "1px solid",
                borderColor: alpha(surfaceBorderColor, 0.45),
                bgcolor: index % 2 ? alpha(theme.palette.text.primary, 0.02) : "transparent",
              }}
            >
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", fontWeight: 700 }}>
                {row.orderId}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }} noWrap>
                {row.customer}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }} noWrap>
                {row.name}
              </Typography>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", textAlign: "right" }}>
                {row.qty}
              </Typography>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", textAlign: "right" }}>
                {PESO.format(row.unitPrice)}
              </Typography>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", textAlign: "right" }}>
                {PESO.format(row.dpAmount)}
              </Typography>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", textAlign: "right" }}>
                {PESO.format(row.balanceAmount)}
              </Typography>
              <CompactField
                type="number"
                value={percentByProduct[row.productKey] ?? 0}
                onChange={(value) => setProductPercent(row.productKey, value)}
                inputProps={{ min: 0, step: 0.1, "aria-label": `Allocation percent for ${row.name}` }}
              />
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", textAlign: "right" }}>
                {row.rawAllocation}
              </Typography>
              <CompactField
                type="number"
                value={row.finalAllocation}
                onChange={(value) => setRowFinal(row.key, value)}
                inputProps={{ min: 0, max: row.qty, step: 1, "aria-label": `Final allocation for ${row.name}` }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: alpha(theme.palette.warning.main, 0.16),
                  },
                }}
              />
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", textAlign: "right" }}>
                {row.finalAllocation > 0 ? PESO.format(row.newAmount) : "—"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: MONO_FONT,
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  textAlign: "right",
                  color: moneyColor(row.finalPrice),
                }}
              >
                {PESO.format(row.finalPrice)}
              </Typography>
              <Chip
                label={row.conclusionLabel}
                color={STATUS_COLOR[row.status] || "default"}
                variant="outlined"
                sx={ADMIN_STATUS_CHIP_SX}
              />
            </Box>
          ))}

          <Box
            sx={{
              ...mergeGridSx(),
              py: 1.25,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              borderTop: "1px solid",
              borderColor: surfaceBorderColor,
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", gridColumn: "span 10" }}>
              Final
            </Typography>
            <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.82rem", textAlign: "right" }}>
              {PESO.format(totals.newAmount)}
            </Typography>
            <Typography
              sx={{
                fontFamily: MONO_FONT,
                fontWeight: 800,
                fontSize: "0.82rem",
                textAlign: "right",
                color: moneyColor(totals.finalPrice),
              }}
            >
              {PESO.format(totals.finalPrice)}
            </Typography>
            <Chip
              label={totals.conclusionLabel}
              color={STATUS_COLOR[totals.status] || "default"}
              variant="outlined"
              sx={ADMIN_STATUS_CHIP_SX}
            />
          </Box>
        </Box>
      </Box>

      <TypeConfirmDialog
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        onConfirm={applySimulation}
        title="Apply merged allocation"
        description={`Write the simulated allocation and status onto ${summary.orderCount} selected order${summary.orderCount === 1 ? "" : "s"}. Each order stays on its own customer. Emails are not sent.`}
        confirmLabel="Apply"
        confirmWord="apply"
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}
