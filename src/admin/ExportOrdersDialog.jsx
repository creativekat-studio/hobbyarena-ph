import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import {
  countExcelExportRows,
  exportOrdersToExcel,
} from "../lib/ordersExcelExport.js";
import { getOrderLineItems } from "../data/orderWorkflow.js";

function collectProductLineOptions(orders, catalogLines = []) {
  const seen = new Map();
  for (const line of catalogLines) {
    if (line?.active === false) continue;
    const value = String(line.match || line.label || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { value, label: String(line.label || line.match || value) });
    }
  }
  for (const order of orders || []) {
    for (const item of getOrderLineItems(order)) {
      const value = String(item.line || "").trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (!seen.has(key)) seen.set(key, { value, label: value });
    }
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export default function ExportOrdersDialog({
  open,
  onClose,
  orders = [],
  catalogLines = [],
  costByProductId = null,
  surfaceBorderColor,
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [productLine, setProductLine] = useState("all");
  const [error, setError] = useState("");

  const lineOptions = useMemo(
    () => collectProductLineOptions(orders, catalogLines),
    [orders, catalogLines],
  );

  const filters = useMemo(
    () => ({ from, to, productLine }),
    [from, to, productLine],
  );

  const rowCount = useMemo(
    () => countExcelExportRows(orders, filters),
    [orders, filters],
  );

  function resetAndClose() {
    setFrom("");
    setTo("");
    setProductLine("all");
    setError("");
    onClose();
  }

  function handleExport() {
    if (from && to && from > to) {
      setError("“From” date must be on or before “To”.");
      return;
    }
    if (!rowCount) {
      setError("No order lines match these filters.");
      return;
    }
    const ok = exportOrdersToExcel(orders, {
      ...filters,
      costByProductId,
    });
    if (!ok) {
      setError("Could not export. Try adjusting the filters.");
      return;
    }
    resetAndClose();
  }

  return (
    <Dialog open={open} onClose={resetAndClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Export orders</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
            Optionally narrow by date range and product line before downloading Excel.
          </Typography>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="From"
              type="date"
              size="small"
              fullWidth
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setError("");
              }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: to || undefined }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              fullWidth
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setError("");
              }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: from || undefined }}
            />
          </Stack>

          <FormControl size="small" fullWidth>
            <InputLabel id="export-product-line">Product line</InputLabel>
            <Select
              labelId="export-product-line"
              label="Product line"
              value={productLine}
              onChange={(e) => {
                setProductLine(e.target.value);
                setError("");
              }}
            >
              <MenuItem value="all">All product lines</MenuItem>
              {lineOptions.map((line) => (
                <MenuItem key={line.value} value={line.value}>{line.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: rowCount ? "text.secondary" : "warning.main",
              p: 1.25,
              borderRadius: 1,
              border: "1px solid",
              borderColor: surfaceBorderColor,
            }}
          >
            {rowCount
              ? `${rowCount} line${rowCount === 1 ? "" : "s"} ready to export`
              : "No matching lines"}
          </Typography>

          {error ? (
            <Typography sx={{ fontSize: "0.8rem", color: "error.main" }}>{error}</Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={resetAndClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={!rowCount}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
        >
          Download Excel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
