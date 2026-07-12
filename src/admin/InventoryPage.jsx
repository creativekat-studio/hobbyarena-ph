import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Select,
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
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import InventoryProductThumb from "../components/InventoryProductThumb.jsx";
import { BoxIcon, EditIcon, InventoryIcon, SearchIcon, ShieldIcon, SparkleIcon, TrashIcon, ViewGridIcon, ViewTableIcon } from "../components/icons.jsx";
import { MAX_FEATURED_PRODUCTS, useInventory } from "../lib/inventoryStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { openOrdersByProductId } from "../data/orderWorkflow.js";
import AddProductDialog from "./AddProductDialog.jsx";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "featured", label: "Featured" },
  { id: "low", label: "Low stock" },
  { id: "deleted", label: "Deleted" },
];

const CATALOG_FILTERS = [
  { id: "all", label: "All catalog" },
  { id: "pokemon", label: "Pokémon" },
  { id: "onepiece", label: "One Piece" },
  { id: "sealed", label: "Sealed" },
  { id: "preorder", label: "Pre-order" },
];

function isDeletedRow(row) {
  return Boolean(row?.deletedAt || row?.deleted);
}

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

function PublishControl({ row, togglePublished }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" onClick={(event) => event.stopPropagation()}>
      <Switch
        checked={row.published}
        onChange={() => togglePublished(row.id)}
        color="primary"
        size="small"
        disabled={isDeletedRow(row)}
        inputProps={{ "aria-label": row.published ? "Unpublish product" : "Publish product" }}
      />
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: row.published ? "success.main" : "text.secondary", minWidth: 36 }}>
        {row.published ? "Live" : "Draft"}
      </Typography>
    </Stack>
  );
}

function FeaturedCheckbox({ row, featuredCountSealed, featuredCountPreorder, toggleFeatured }) {
  const deleted = isDeletedRow(row);
  const outOfStock = row.stock <= 0;
  const isPreorder = row.type === "Pre-order";
  const kindCount = isPreorder ? featuredCountPreorder : featuredCountSealed;
  const kindLabel = isPreorder ? "pre-order" : "in-stock";
  const atLimit = !row.featured && kindCount >= MAX_FEATURED_PRODUCTS;
  const disabled = deleted || atLimit || (outOfStock && !row.featured);
  const title = deleted
    ? "Deleted products can’t be featured"
    : outOfStock && !row.featured
      ? "Out of stock items can’t be featured"
      : atLimit
        ? `Homepage ${kindLabel} featured limit is ${MAX_FEATURED_PRODUCTS}`
        : row.featured
          ? "Remove from homepage featured"
          : "Feature on homepage";

  return (
    <Tooltip title={title}>
      <span>
        <Checkbox
          checked={Boolean(row.featured)}
          disabled={disabled}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleFeatured(row.id)}
          size="small"
          color="secondary"
          inputProps={{ "aria-label": title }}
        />
      </span>
    </Tooltip>
  );
}

function InventoryTableView({
  rows,
  togglePublished,
  toggleFeatured,
  featuredCountSealed,
  featuredCountPreorder,
  isDarkMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  openOrdersByProduct,
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = rows.some((row) => selectedIds.has(row.id));

  return (
    <TableContainer sx={{ flex: 1, minHeight: 0 }}>
      <Table stickyHeader>
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
            <TableCell sx={{ fontWeight: 800 }} align="right">Stock</TableCell>
            <TableCell sx={{ fontWeight: 800 }} align="center">Live</TableCell>
            <TableCell sx={{ fontWeight: 800 }} align="center">
              <Tooltip title={`Up to ${MAX_FEATURED_PRODUCTS} in-stock and ${MAX_FEATURED_PRODUCTS} pre-order on the homepage`}>
                <Box component="span" sx={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.2 }}>
                  <Box component="span">Featured</Box>
                  <Box component="span" sx={{ fontWeight: 600, fontSize: "0.65rem", color: "text.secondary", fontFamily: MONO_FONT }}>
                    {featuredCountSealed}/{MAX_FEATURED_PRODUCTS} · {featuredCountPreorder}/{MAX_FEATURED_PRODUCTS}
                  </Box>
                </Box>
              </Tooltip>
            </TableCell>
            <TableCell sx={{ fontWeight: 800 }} align="right">Status</TableCell>
            <TableCell sx={{ fontWeight: 800, width: 96 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const status = stockStatus(row);
            const isSelected = selectedIds.has(row.id);
            const deleted = isDeletedRow(row);
            const openOrders = openOrdersByProduct?.get(row.id) ?? [];
            const deleteBlocked = openOrders.length > 0;
            return (
              <TableRow
                key={row.id}
                hover
                selected={isSelected}
                sx={{ opacity: deleted ? 0.55 : row.published ? 1 : 0.72, cursor: "pointer" }}
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
                <TableCell align="right" sx={{ fontWeight: 800, fontFamily: MONO_FONT }}>{row.stock}</TableCell>
                <TableCell align="center">
                  <PublishControl row={row} togglePublished={togglePublished} />
                </TableCell>
                <TableCell align="center">
                  <FeaturedCheckbox
                    row={row}
                    featuredCountSealed={featuredCountSealed}
                    featuredCountPreorder={featuredCountPreorder}
                    toggleFeatured={toggleFeatured}
                  />
                </TableCell>
                <TableCell align="right">
                  {deleted ? (
                    <Chip label="Deleted" size="small" color="error" variant="outlined" />
                  ) : (
                    <Chip label={status.label} size="small" color={status.color} variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                  <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                    <Tooltip title="Edit">
                      <span>
                        <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)} disabled={deleted}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={deleted ? "Already deleted" : deleteBlocked ? "Unable to delete — existing in-progress order" : "Delete"}>
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Delete ${row.name}`}
                          onClick={() => onDelete(row)}
                          disabled={deleted || deleteBlocked}
                          color="error"
                        >
                          <TrashIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
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
  );
}

function InventoryCardView({
  rows,
  panelSx,
  togglePublished,
  toggleFeatured,
  featuredCountSealed,
  featuredCountPreorder,
  isDarkMode,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  openOrdersByProduct,
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
        const deleted = isDeletedRow(row);
        const openOrders = openOrdersByProduct?.get(row.id) ?? [];
        const deleteBlocked = openOrders.length > 0;
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
                opacity: deleted ? 0.55 : row.published ? 1 : 0.78,
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
              <Box sx={{ position: "absolute", top: 10, left: 10, zIndex: 1 }} onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggleSelect(row.id)}
                  size="small"
                  sx={{ p: 0.5, bgcolor: (t) => alpha(t.palette.background.paper, 0.85), borderRadius: 1 }}
                  inputProps={{ "aria-label": `Select ${row.name}` }}
                />
              </Box>

              <Stack
                direction="row"
                spacing={0.25}
                sx={{ position: "absolute", top: 6, right: 6, zIndex: 1 }}
                onClick={(event) => event.stopPropagation()}
              >
                <Tooltip title="Edit">
                  <span>
                    <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)} disabled={deleted}>
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={deleted ? "Already deleted" : deleteBlocked ? "Unable to delete — existing in-progress order" : "Delete"}>
                  <span>
                    <IconButton size="small" aria-label={`Delete ${row.name}`} onClick={() => onDelete(row)} disabled={deleted || deleteBlocked} color="error">
                      <TrashIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ pl: 4, pr: 6 }}>
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

              <Box sx={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                <Chip label={row.type} size="small" variant="outlined" color={row.type === "Pre-order" ? "secondary" : "default"} />
                {deleted ? (
                  <Chip label="Deleted" size="small" color="error" variant="outlined" />
                ) : (
                  <Chip label={status.label} size="small" color={status.color} variant="outlined" />
                )}
              </Box>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ position: "absolute", bottom: 8, right: 8 }}
                onClick={(event) => event.stopPropagation()}
              >
                <FeaturedCheckbox
                  row={row}
                  featuredCountSealed={featuredCountSealed}
                  featuredCountPreorder={featuredCountPreorder}
                  toggleFeatured={toggleFeatured}
                />
                <PublishControl row={row} togglePublished={togglePublished} />
              </Stack>
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
  const {
    items,
    togglePublished,
    setPublishedMany,
    toggleFeatured,
    featuredCountSealed,
    featuredCountPreorder,
    softDeleteMany,
    restoreMany,
    addProduct,
    updateProduct,
  } = useInventory();
  const { orders } = useOrders();
  const openOrdersByProduct = useMemo(() => openOrdersByProductId(orders), [orders]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("table");
  const [formOpen, setFormOpen] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteTargetIds, setDeleteTargetIds] = useState([]);
  const [deleteBlockAlert, setDeleteBlockAlert] = useState(null);
  const [actionsAnchor, setActionsAnchor] = useState(null);

  function openAddForm() {
    setEditingProduct(null);
    setCopyMode(false);
    setFormOpen(true);
  }

  function openCopyForm() {
    setEditingProduct(null);
    setCopyMode(true);
    setFormOpen(true);
  }

  function openEditForm(product) {
    setEditingProduct(product);
    setCopyMode(false);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setCopyMode(false);
    setEditingProduct(null);
  }

  const rows = useMemo(() => {
    return items.filter((row) => {
      const deleted = isDeletedRow(row);
      if (statusFilter === "deleted") {
        if (!deleted) return false;
      } else if (deleted) {
        return false;
      }

      const matchesQuery =
        !query.trim()
        || row.name.toLowerCase().includes(query.toLowerCase())
        || row.sku.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;

      switch (statusFilter) {
        case "published":
          if (!row.published) return false;
          break;
        case "draft":
          if (row.published) return false;
          break;
        case "featured":
          if (!row.featured) return false;
          break;
        case "low":
          if (row.stock > row.reorderAt) return false;
          break;
        default:
          break;
      }

      switch (catalogFilter) {
        case "pokemon":
          return row.line.startsWith("Pokémon");
        case "onepiece":
          return row.line.startsWith("One Piece");
        case "sealed":
          return row.type === "Sealed";
        case "preorder":
          return row.type === "Pre-order";
        default:
          return true;
      }
    });
  }, [items, statusFilter, catalogFilter, query]);

  const itemIds = useMemo(() => new Set(items.map((row) => row.id)), [items]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => itemIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [itemIds]);

  const activeItems = useMemo(() => items.filter((row) => !isDeletedRow(row)), [items]);

  const stats = useMemo(() => {
    const totalUnits = activeItems.reduce((sum, row) => sum + Math.max(row.stock, 0), 0);
    const outOfStock = activeItems.filter((row) => row.stock <= 0).length;
    const value = activeItems.reduce((sum, row) => sum + row.cost * Math.max(row.stock, 0), 0);
    const published = activeItems.filter((row) => row.published).length;
    return { skus: activeItems.length, totalUnits, outOfStock, value, published };
  }, [activeItems]);

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
    setActionsAnchor(null);
  }

  function requestDeleteRow(row) {
    const openOrders = openOrdersByProduct.get(row.id) ?? [];
    if (openOrders.length) {
      setDeleteBlockAlert({
        title: "Unable to delete product",
        message: "Unable to delete — there is an existing in-progress order for this product.",
      });
      return;
    }
    setDeleteTargetIds([row.id]);
  }

  function requestBulkDelete() {
    const candidates = [...selectedIds].filter((id) => {
      const row = items.find((entry) => entry.id === id);
      return row && !isDeletedRow(row);
    });
    setActionsAnchor(null);
    if (!candidates.length) return;

    const blocked = [];
    const allowed = [];
    candidates.forEach((id) => {
      const openOrders = openOrdersByProduct.get(id) ?? [];
      if (openOrders.length) blocked.push(id);
      else allowed.push(id);
    });

    if (blocked.length) {
      setDeleteBlockAlert({
        title: blocked.length === candidates.length
          ? "Unable to delete products"
          : "Some products can’t be deleted",
        message: blocked.length === candidates.length
          ? "Unable to delete — selected products have existing in-progress orders."
          : `${blocked.length} of ${candidates.length} selected products have in-progress orders and were skipped.`,
      });
    }

    if (allowed.length) {
      setDeleteTargetIds(allowed);
    }
  }

  function confirmSoftDelete() {
    if (!deleteTargetIds.length) return;
    softDeleteMany(deleteTargetIds);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      deleteTargetIds.forEach((id) => next.delete(id));
      return next;
    });
    setDeleteTargetIds([]);
  }

  function bulkRestore() {
    if (!selectedIds.size) return;
    restoreMany([...selectedIds]);
    setSelectedIds(new Set());
    setActionsAnchor(null);
  }

  const selectedCount = selectedIds.size;
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const deleteCount = deleteTargetIds.length;
  const deleteDialogOpen = deleteCount > 0;
  const viewingDeleted = statusFilter === "deleted";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: (t) => t.spacing(ADMIN_PAGE_SPACING) }}>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Products & stock"
        subtitle={`Manage SKUs and storefront visibility. Featured slots: in-stock ${featuredCountSealed}/${MAX_FEATURED_PRODUCTS}, pre-order ${featuredCountPreorder}/${MAX_FEATURED_PRODUCTS}.`}
        action={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              color="inherit"
              onClick={openCopyForm}
              disabled={activeItems.length === 0}
              sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.78rem" }}
            >
              Copy from product
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={openAddForm}
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.78rem" }}
            >
              + Add product
            </Button>
          </Stack>
        )}
      />

      <Stack spacing={ADMIN_PAGE_SPACING} sx={{ flexShrink: 0 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={InventoryIcon} label="Total SKUs" value={stats.skus} accent={accents[0]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Published on shop" value={stats.published} accent={accents[1]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={ShieldIcon} label="Out of stock" value={stats.outOfStock} accent={accents[2]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={BoxIcon} label="Stock value (cost)" value={PESO.format(stats.value)} accent={accents[3]} /></Grid>
        </Grid>

        <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={statusFilter}
                onChange={(_, next) => { if (next) setStatusFilter(next); }}
                sx={{ flexWrap: "wrap" }}
              >
                {STATUS_FILTERS.map((item) => (
                  <ToggleButton
                    key={item.id}
                    value={item.id}
                    sx={{
                      px: 1.5,
                      fontFamily: MONO_FONT,
                      fontSize: "0.68rem",
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>

              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 160 } }}>
                <InputLabel id="inventory-catalog-filter">Catalog</InputLabel>
                <Select
                  labelId="inventory-catalog-filter"
                  label="Catalog"
                  value={catalogFilter}
                  onChange={(event) => setCatalogFilter(event.target.value)}
                >
                  {CATALOG_FILTERS.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ flex: 1 }} />

              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", gap: 1 }}>
                {selectedCount > 0 ? (
                  <>
                    <Chip
                      label={`${selectedCount} selected`}
                      onDelete={() => setSelectedIds(new Set())}
                      sx={{ fontWeight: 700 }}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={(event) => setActionsAnchor(event.currentTarget)}
                      sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
                    >
                      Actions
                    </Button>
                    <Menu
                      anchorEl={actionsAnchor}
                      open={Boolean(actionsAnchor)}
                      onClose={() => setActionsAnchor(null)}
                    >
                      {viewingDeleted ? (
                        <MenuItem onClick={bulkRestore}>Restore</MenuItem>
                      ) : (
                        [
                          <MenuItem key="publish" onClick={() => bulkPublish(true)}>Publish</MenuItem>,
                          <MenuItem key="unpublish" onClick={() => bulkPublish(false)}>Unpublish</MenuItem>,
                          <MenuItem key="delete" onClick={requestBulkDelete} sx={{ color: "error.main" }}>Delete…</MenuItem>,
                        ]
                      )}
                    </Menu>
                  </>
                ) : (
                  <Chip
                    label={allVisibleSelected ? "Deselect visible" : "Select visible"}
                    onClick={toggleSelectAllVisible}
                    disabled={!rows.length}
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                )}

                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={view}
                  onChange={(_, next) => { if (next) setView(next); }}
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
                  sx={{ minWidth: { xs: "100%", sm: 220 } }}
                  InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
                />
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Stack>

      {view === "table" ? (
        <Box sx={{ flex: 1, minHeight: 0, ...panelSx, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <InventoryTableView
            rows={rows}
            togglePublished={togglePublished}
            toggleFeatured={toggleFeatured}
            featuredCountSealed={featuredCountSealed}
            featuredCountPreorder={featuredCountPreorder}
            isDarkMode={isDarkMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllVisible}
            onEdit={openEditForm}
            onDelete={requestDeleteRow}
            openOrdersByProduct={openOrdersByProduct}
          />
        </Box>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pb: 0.5 }}>
          <InventoryCardView
            rows={rows}
            panelSx={panelSx}
            togglePublished={togglePublished}
            toggleFeatured={toggleFeatured}
            featuredCountSealed={featuredCountSealed}
            featuredCountPreorder={featuredCountPreorder}
            isDarkMode={isDarkMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onEdit={openEditForm}
            onDelete={requestDeleteRow}
            openOrdersByProduct={openOrdersByProduct}
          />
        </Box>
      )}

      <AddProductDialog
        open={formOpen}
        onClose={closeForm}
        product={editingProduct}
        products={activeItems}
        copyMode={copyMode}
        onAdd={addProduct}
        onUpdate={updateProduct}
        onDelete={(id) => softDeleteMany([id])}
        deleteBlocked={Boolean(editingProduct && (openOrdersByProduct.get(editingProduct.id)?.length ?? 0) > 0)}
        surfaceBorderColor={surfaceBorderColor}
        featuredCountSealed={featuredCountSealed}
        featuredCountPreorder={featuredCountPreorder}
        maxFeatured={MAX_FEATURED_PRODUCTS}
      />

      <TypeConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteTargetIds([])}
        onConfirm={confirmSoftDelete}
        title={deleteCount > 1 ? `Delete ${deleteCount} products` : "Delete product"}
        description={
          deleteCount > 1
            ? `Soft-delete ${deleteCount} selected products. They will be hidden from the storefront and inventory, but can be restored from the Deleted filter.`
            : "Soft-delete this product. It will be hidden from the storefront and inventory, but can be restored from the Deleted filter."
        }
        confirmLabel={deleteCount > 1 ? `Delete ${deleteCount}` : "Delete"}
        surfaceBorderColor={surfaceBorderColor}
      />

      <Dialog
        open={Boolean(deleteBlockAlert)}
        onClose={() => setDeleteBlockAlert(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>{deleteBlockAlert?.title || "Unable to delete"}</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: "text.secondary", fontSize: "0.9rem", lineHeight: 1.5 }}>
            {deleteBlockAlert?.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
          <Button onClick={() => setDeleteBlockAlert(null)} variant="contained" color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
