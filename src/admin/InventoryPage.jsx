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
import { useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { BoxIcon, InventoryIcon, SearchIcon, ShieldIcon, SparkleIcon } from "../components/icons.jsx";
import { INVENTORY } from "../data/mockData.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pokemon", label: "Pokémon" },
  { id: "onepiece", label: "One Piece" },
  { id: "sealed", label: "Sealed" },
  { id: "preorder", label: "Pre-order" },
  { id: "low", label: "Low / out of stock" },
];

function stockStatus(row) {
  if (row.stock <= 0) return { label: "Out of stock", color: "error" };
  if (row.stock <= row.reorderAt) return { label: "Low stock", color: "warning" };
  return { label: "In stock", color: "success" };
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

export default function InventoryPage() {
  const theme = useTheme();
  const { surfaces } = useOutletContext();
  const { panelSx } = surfaces;
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return INVENTORY.filter((row) => {
      const matchesQuery =
        !query.trim() ||
        row.name.toLowerCase().includes(query.toLowerCase()) ||
        row.sku.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      switch (filter) {
        case "pokemon":
          return row.line.startsWith("Pokémon");
        case "onepiece":
          return row.line.startsWith("One Piece");
        case "sealed":
          return row.type === "Sealed";
        case "preorder":
          return row.type === "Pre-order";
        case "low":
          return row.stock <= row.reorderAt;
        default:
          return true;
      }
    });
  }, [filter, query]);

  const stats = useMemo(() => {
    const totalUnits = INVENTORY.reduce((sum, row) => sum + Math.max(row.stock, 0), 0);
    const outOfStock = INVENTORY.filter((row) => row.stock <= 0).length;
    const value = INVENTORY.reduce((sum, row) => sum + row.cost * Math.max(row.stock, 0), 0);
    return { skus: INVENTORY.length, totalUnits, outOfStock, value };
  }, []);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
        <Box>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Inventory</Typography>
          <Typography variant="h3">Stock control</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Track sealed and pre-order SKUs across Pokémon and One Piece.</Typography>
        </Box>
        <Button variant="contained" color="primary" sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.4)}` }}>+ Add product</Button>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={InventoryIcon} label="Total SKUs" value={stats.skus} accent="#7c3aed" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={BoxIcon} label="Units in stock" value={stats.totalUnits} accent="#06b6d4" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={ShieldIcon} label="Out of stock" value={stats.outOfStock} accent="#f43f5e" /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Stock value (cost)" value={PESO.format(stats.value)} accent="#f59e0b" /></Grid>
      </Grid>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {FILTERS.map((item) => (
              <Chip key={item.id} label={item.label} onClick={() => setFilter(item.id)} color={filter === item.id ? "primary" : "default"} variant={filter === item.id ? "filled" : "outlined"} sx={{ fontWeight: 700 }} />
            ))}
          </Stack>
          <TextField
            size="small"
            placeholder="Search SKU or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: { xs: "100%", md: 260 } }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
          />
        </Stack>
      </Box>

      <Box sx={{ ...panelSx, overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" } }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", sm: "table-cell" } }} align="right">Price</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Stock</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const status = stockStatus(row);
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700, whiteSpace: "nowrap" }}>{row.sku}</TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.3 }}>{row.name}</Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>{row.line}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      <Chip label={row.type} size="small" variant="outlined" color={row.type === "Pre-order" ? "secondary" : "default"} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>{PESO.format(row.price)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, fontFamily: MONO_FONT }}>{row.stock}</TableCell>
                    <TableCell align="right"><Chip label={status.label} size="small" color={status.color} variant="outlined" /></TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>No products match your filters.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}
