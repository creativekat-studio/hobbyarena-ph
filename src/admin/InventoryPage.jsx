import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT, getStatAccents } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import InventoryProductThumb from "../components/InventoryProductThumb.jsx";
import { BoxIcon, EditIcon, InventoryIcon, SearchIcon, ShieldIcon, SparkleIcon, ViewGridIcon, ViewTableIcon } from "../components/icons.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import AddProductDialog from "./AddProductDialog.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
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

function PublishControl({ row, togglePublished, align = "center" }) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      justifyContent={align === "end" ? "flex-end" : { xs: "flex-start", md: "center" }}
      onClick={(event) => event.stopPropagation()}
    >
      <Switch
        checked={row.published}
        onChange={() => togglePublished(row.id)}
        color="primary"
        size="small"
        inputProps={{ "aria-label": row.published ? "Unpublish product" : "Publish product" }}
      />
      <Chip
        label={row.published ? "Live" : "Draft"}
        size="small"
        color={row.published ? "success" : "default"}
        variant="outlined"
        sx={{ minWidth: 58 }}
      />
    </Stack>
  );
}

function InventoryTableView({
  rows,
  panelSx,
  togglePublished,
  isDarkMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = rows.some((row) => selectedIds.has(row.id));

  return (
    <Box sx={{ ...panelSx, overflow: "hidden" }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected && !allSelected}
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  inputProps={{ "aria-label": "Select all products" }}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 800, width: 56 }} />
              <TableCell sx={{ fontWeight: 800 }}>SKU</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Product</TableCell>
              <TableCell sx={{ fontWeight: 800, display: { xs: "none", md: "table-cell" } }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800, display: { xs: "none", sm: "table-cell" } }} align="right">Price</TableCell>
              <TableCell sx={{ fontWeight: 800, display: { xs: "none", lg: "table-cell" } }} align="center">Deposit</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Stock</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Storefront</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Status</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 52 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const status = stockStatus(row);
              const isSelected = selectedIds.has(row.id);
              return (
                <TableRow
                  key={row.id}
                  hover
                  selected={isSelected}
                  sx={{ opacity: row.published ? 1 : 0.72, cursor: "pointer" }}
                  onClick={() => onToggleSelect(row.id)}
                >
                  <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => onToggleSelect(row.id)}
                      inputProps={{ "aria-label": `Select ${row.name}` }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <InventoryProductThumb row={row} size={44} isDarkMode={isDarkMode} />
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700, whiteSpace: "nowrap" }}>{row.sku}</TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.3 }}>{row.name}</Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>{row.line}</Typography>
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    <Chip label={row.type} size="small" variant="outlined" color={row.type === "Pre-order" ? "secondary" : "default"} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>{PESO.format(row.price)}</TableCell>
                  <TableCell align="center" sx={{ display: { xs: "none", lg: "table-cell" } }}>
                    {row.type === "Pre-order" ? (
                      <Chip label={`${row.depositPercent ?? 30}%`} size="small" color="warning" variant="outlined" sx={{ fontFamily: MONO_FONT, fontWeight: 800 }} />
                    ) : (
                      <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: MONO_FONT }}>{row.stock}</TableCell>
                  <TableCell align="center" onClick={(event) => event.stopPropagation()}>
                    <PublishControl row={row} togglePublished={togglePublished} />
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={status.label} size="small" color={status.color} variant="outlined" />
                  </TableCell>
                  <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                    <Tooltip title="Edit">
                      <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)}>
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
                  No products match your filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function InventoryCardView({
  rows,
  panelSx,
  togglePublished,
  isDarkMode,
  selectedIds,
  onToggleSelect,
  onEdit,
}) {
  const theme = useTheme();
  const hoverAccent = theme.palette.secondary.main;

  if (!rows.length) {
    return (
      <Box sx={{ ...panelSx, p: 5, textAlign: "center", color: "text.secondary" }}>
        No products match your filters.
      </Box>
    );
  }

  return (
    <Grid container spacing={2.5}>
      {rows.map((row) => {
        const status = stockStatus(row);
        const isSelected = selectedIds.has(row.id);
        return (
          <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={row.id}>
            <Box
              onClick={() => onToggleSelect(row.id)}
              sx={{
                ...panelSx,
                position: "relative",
                p: 2,
                pb: 5.5,
                height: "100%",
                opacity: row.published ? 1 : 0.78,
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                cursor: "pointer",
                transition: "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
                borderColor: isSelected ? alpha(hoverAccent, 0.55) : panelSx.borderColor,
                transform: isSelected ? "translateY(-4px)" : "none",
                boxShadow: isSelected
                  ? isDarkMode
                    ? `0 24px 52px rgba(0,0,0,0.5), 0 0 22px ${alpha(hoverAccent, 0.35)}`
                    : `0 22px 48px ${alpha(hoverAccent, 0.18)}`
                  : panelSx.boxShadow,
                "&:hover": {
                  transform: "translateY(-4px)",
                  borderColor: alpha(hoverAccent, 0.55),
                  boxShadow: isDarkMode
                    ? `0 24px 52px rgba(0,0,0,0.5), 0 0 22px ${alpha(hoverAccent, 0.35)}`
                    : `0 22px 48px ${alpha(hoverAccent, 0.18)}`,
                },
              }}
            >
              <Box
                sx={{ position: "absolute", top: 10, left: 10, zIndex: 1 }}
                onClick={(event) => event.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggleSelect(row.id)}
                  size="small"
                  sx={{
                    p: 0.5,
                    bgcolor: (t) => alpha(t.palette.background.paper, 0.85),
                    borderRadius: 1,
                  }}
                  inputProps={{ "aria-label": `Select ${row.name}` }}
                />
              </Box>

              {row.custom ? (
                <Box sx={{ position: "absolute", top: 12, right: 44 }}>
                  <Chip label="Custom" size="small" variant="outlined" />
                </Box>
              ) : null}

              <Box
                sx={{ position: "absolute", top: 6, right: 6, zIndex: 1 }}
                onClick={(event) => event.stopPropagation()}
              >
                <Tooltip title="Edit">
                  <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)}>
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ pl: 4, pr: row.custom ? 6 : 0 }}>
                <InventoryProductThumb row={row} size={72} isDarkMode={isDarkMode} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", color: "text.secondary", fontWeight: 700 }}>
                    {row.sku}
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", lineHeight: 1.3, mt: 0.25 }}>
                    {row.name}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", mt: 0.35 }}>{row.line}</Typography>
                </Box>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: "auto", pl: 4 }}>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>{PESO.format(row.price)}</Typography>
                <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, color: "text.secondary" }}>
                  Stock: {row.stock}
                </Typography>
              </Stack>

              <Box sx={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                <Chip
                  label={row.type}
                  size="small"
                  variant="outlined"
                  color={row.type === "Pre-order" ? "secondary" : "default"}
                />
                <Chip label={status.label} size="small" color={status.color} variant="outlined" />
              </Box>

              <Box sx={{ position: "absolute", bottom: 12, right: 12 }}>
                <PublishControl row={row} togglePublished={togglePublished} align="end" />
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}

export default function InventoryPage() {
  const accents = getStatAccents(useTheme());
  const { surfaces, isDarkMode } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { items, togglePublished, setPublishedMany, addProduct, updateProduct } = useInventory();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("table");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  function openAddForm() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function openEditForm(product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingProduct(null);
  }

  const rows = useMemo(() => {
    return items.filter((row) => {
      const matchesQuery =
        !query.trim()
        || row.name.toLowerCase().includes(query.toLowerCase())
        || row.sku.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      switch (filter) {
        case "published":
          return row.published;
        case "draft":
          return !row.published;
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
  }, [items, filter, query]);

  const itemIds = useMemo(() => new Set(items.map((row) => row.id)), [items]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => itemIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [itemIds]);

  const stats = useMemo(() => {
    const totalUnits = items.reduce((sum, row) => sum + Math.max(row.stock, 0), 0);
    const outOfStock = items.filter((row) => row.stock <= 0).length;
    const value = items.reduce((sum, row) => sum + row.cost * Math.max(row.stock, 0), 0);
    const published = items.filter((row) => row.published).length;
    return { skus: items.length, totalUnits, outOfStock, value, published };
  }, [items]);

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        rows.forEach((row) => next.delete(row.id));
      } else {
        rows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  }

  function bulkPublish(published) {
    if (!selectedIds.size) return;
    setPublishedMany([...selectedIds], published);
  }

  const selectedCount = selectedIds.size;
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
        <Box>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Inventory</Typography>
          <Typography variant="h3">Products & stock</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage SKUs, stock levels, and what appears on the storefront.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={openAddForm}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
        >
          + Add product
        </Button>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={InventoryIcon} label="Total SKUs" value={stats.skus} accent={accents[0]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Published on shop" value={stats.published} accent={accents[1]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={ShieldIcon} label="Out of stock" value={stats.outOfStock} accent={accents[2]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={BoxIcon} label="Stock value (cost)" value={PESO.format(stats.value)} accent={accents[3]} /></Grid>
      </Grid>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ xs: "stretch", lg: "center" }} justifyContent="space-between">
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, flex: 1, alignItems: "center" }}>
              {FILTERS.map((item) => (
                <Chip key={item.id} label={item.label} onClick={() => setFilter(item.id)} color={filter === item.id ? "primary" : "default"} variant={filter === item.id ? "filled" : "outlined"} sx={{ fontWeight: 700 }} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
              <Chip
                label={allVisibleSelected ? "Deselect visible" : "Select visible"}
                onClick={toggleSelectAllVisible}
                disabled={!rows.length}
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label="Publish"
                onClick={() => bulkPublish(true)}
                disabled={!selectedCount}
                variant="outlined"
                color="success"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label="Unpublish"
                onClick={() => bulkPublish(false)}
                disabled={!selectedCount}
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
              <Box sx={{ width: "1px", height: 24, bgcolor: surfaceBorderColor, mx: 0.5, display: { xs: "none", sm: "block" } }} />
              <ToggleButtonGroup
                exclusive
                size="small"
                value={view}
                onChange={(_, next) => { if (next) setView(next); }}
                sx={{ flexShrink: 0 }}
              >
                <Tooltip title="Table">
                  <ToggleButton value="table" aria-label="Table view" sx={{ px: 1.25 }}>
                    <ViewTableIcon sx={{ fontSize: 20 }} />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Cards">
                  <ToggleButton value="cards" aria-label="Cards view" sx={{ px: 1.25 }}>
                    <ViewGridIcon sx={{ fontSize: 20 }} />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
              <TextField
                size="small"
                placeholder="Search SKU or name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ minWidth: { xs: "100%", sm: 240 } }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
              />
            </Stack>
          </Stack>
        </Stack>
      </Box>

      {view === "table" ? (
        <InventoryTableView
          rows={rows}
          panelSx={panelSx}
          togglePublished={togglePublished}
          isDarkMode={isDarkMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAllVisible}
          onEdit={openEditForm}
        />
      ) : (
        <InventoryCardView
          rows={rows}
          panelSx={panelSx}
          togglePublished={togglePublished}
          isDarkMode={isDarkMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onEdit={openEditForm}
        />
      )}

      <AddProductDialog
        open={formOpen}
        onClose={closeForm}
        product={editingProduct}
        onAdd={addProduct}
        onUpdate={updateProduct}
        surfaceBorderColor={surfaceBorderColor}
      />
    </Stack>
  );
}
