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
  TableSortLabel,
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
import { BoxIcon, EditIcon, InfoIcon, InventoryIcon, SearchIcon, ShieldIcon, SparkleIcon, TrashIcon, ViewGridIcon, ViewTableIcon } from "../components/icons.jsx";
import { lineMatchFromOptions, useCatalog } from "../lib/catalogStore.jsx";
import { MAX_FEATURED_PRODUCTS, useInventory } from "../lib/inventoryStore.jsx";
import { isPreorderStockLimited, productTracksStock } from "../lib/quantityLimits.js";
import { useOrders } from "../lib/ordersStore.jsx";
import { openOrdersByProductId } from "../data/orderWorkflow.js";
import { sortRowsBy, toggleSortState } from "../lib/tableSort.js";
import { useInfiniteScroll } from "../lib/useInfiniteScroll.js";
import {
  InfiniteScrollSentinel,
  InfiniteScrollTableSentinel,
} from "../components/InfiniteScrollSentinel.jsx";
import {
  AdminTableHeaderCell,
  AdminTableSortHeader,
  AdminListFilterTabs,
  ADMIN_LIST_BULK_BAR_SX,
  ADMIN_LIST_FILTER_BAR_SX,
  ADMIN_LIST_FILTER_ROW_SX,
  ADMIN_LIST_FILTER_SELECT_SX,
  ADMIN_LIST_PAGE_SX,
  ADMIN_LIST_PANEL_SX,
  ADMIN_LIST_SCROLL_SX,
  ADMIN_LIST_SEARCH_FIELD_SX,
  ADMIN_LIST_STATS_SX,
  ADMIN_TABLE_SORT_LABEL_SX,
} from "./adminTableHeader.jsx";
import AddProductDialog from "./AddProductDialog.jsx";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "featured", label: "Featured" },
  { id: "low", label: "Low stock" },
  { id: "archived", label: "Archived" },
];

const TYPE_FILTERS = [
  { id: "all", label: "All types" },
  { id: "sealed", label: "Sealed / on-hand" },
  { id: "preorder", label: "Pre-order" },
];

function isArchivedRow(row) {
  return Boolean(row?.deletedAt || row?.deleted);
}

function stockStatus(row) {
  if (row.comingSoon) return { label: "Coming soon", color: "warning" };
  if (!productTracksStock(row)) return { label: "No slot cap", color: "success" };
  if (row.stock <= 0) return { label: "Out of stock", color: "error" };
  if (row.stock <= row.reorderAt) return { label: "Low stock", color: "warning" };
  return { label: row.type === "Pre-order" ? "Slots left" : "In stock", color: "success" };
}

function stockDisplay(row) {
  if (row.type === "Pre-order" && !isPreorderStockLimited(row)) return "—";
  return row.stock;
}

/** On-hand inventory value — sealed only (matches KPI). */
function onHandStockValue(row) {
  if (!row || row.type === "Pre-order") return null;
  return (Number(row.cost) || 0) * Math.max(Number(row.stock) || 0, 0);
}

const INVENTORY_SORT_ACCESSORS = {
  sku: (row) => row.sku || "",
  product: (row) => row.name || "",
  type: (row) => row.type || "",
  price: (row) => Number(row.price) || 0,
  cost: (row) => Number(row.cost) || 0,
  stock: (row) => Number(row.stock) || 0,
  value: (row) => onHandStockValue(row) ?? -1,
  live: (row) => Boolean(row.published),
  featured: (row) => Boolean(row.featured),
  comingSoon: (row) => Boolean(row.comingSoon),
  status: (row) => (isArchivedRow(row) ? "Archived" : stockStatus(row).label),
};

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
        disabled={isArchivedRow(row)}
        inputProps={{ "aria-label": row.published ? "Unpublish product" : "Publish product" }}
      />
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: row.published ? "success.main" : "text.secondary", minWidth: 36 }}>
        {row.published ? "Live" : "Draft"}
      </Typography>
    </Stack>
  );
}

function FeaturedCheckbox({ row, featuredCountSealed, featuredCountPreorder, toggleFeatured }) {
  const archived = isArchivedRow(row);
  const outOfStock = productTracksStock(row) && row.stock <= 0;
  const isPreorder = row.type === "Pre-order";
  const kindCount = isPreorder ? featuredCountPreorder : featuredCountSealed;
  const kindLabel = isPreorder ? "pre-order" : "in-stock";
  const atLimit = !row.featured && kindCount >= MAX_FEATURED_PRODUCTS;
  const disabled = archived || atLimit || (outOfStock && !row.featured);
  const title = archived
    ? "Archived products can’t be featured"
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

function ComingSoonCheckbox({ row, toggleComingSoon }) {
  const archived = isArchivedRow(row);
  const title = archived
    ? "Archived products can’t be marked coming soon"
    : row.comingSoon
      ? "Remove coming soon — allow purchase / countdown"
      : "Mark coming soon — visible, not for sale";

  return (
    <Tooltip title={title}>
      <span>
        <Checkbox
          checked={Boolean(row.comingSoon)}
          disabled={archived}
          onClick={(event) => event.stopPropagation()}
          onChange={() => toggleComingSoon(row.id)}
          size="small"
          color="warning"
          inputProps={{ "aria-label": title }}
        />
      </span>
    </Tooltip>
  );
}

function InventoryTableView({
  rows,
  sort,
  onSort,
  togglePublished,
  toggleFeatured,
  toggleComingSoon,
  featuredCountSealed,
  featuredCountPreorder,
  isDarkMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  openOrdersByProduct,
  scrollRootRef,
  sentinelRef,
  hasMore,
  visibleCount,
  totalCount,
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));
  const someSelected = rows.some((row) => selectedIds.has(row.id));

  function SortHeader({ id, label, align = "left", sx }) {
    return (
      <AdminTableSortHeader
        id={id}
        label={label}
        sort={sort}
        onSort={onSort}
        align={align}
        sx={sx}
      />
    );
  }

  return (
    <Box ref={scrollRootRef} sx={ADMIN_LIST_SCROLL_SX}>
      <TableContainer sx={{ overflow: "visible" }}>
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
            <AdminTableHeaderCell sx={{ width: 56 }} />
            <SortHeader id="sku" label="SKU" />
            <SortHeader id="product" label="Product" />
            <SortHeader id="type" label="Type" sx={{ display: { xs: "none", md: "table-cell" } }} />
            <SortHeader id="price" label="Price" align="right" sx={{ display: { xs: "none", sm: "table-cell" } }} />
            <SortHeader id="cost" label="Cost" align="right" sx={{ display: { xs: "none", md: "table-cell" } }} />
            <SortHeader id="stock" label="Stock" align="right" />
            <SortHeader id="value" label="Value" align="right" sx={{ display: { xs: "none", sm: "table-cell" } }} />
            <SortHeader id="live" label="Live" align="center" />
            <TableCell
              align="center"
              sortDirection={sort.key === "featured" ? sort.dir : false}
            >
              <TableSortLabel
                active={sort.key === "featured"}
                direction={sort.key === "featured" ? sort.dir : "asc"}
                onClick={() => onSort("featured")}
                sx={{ ...ADMIN_TABLE_SORT_LABEL_SX, alignItems: "center" }}
              >
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  <Box component="span">Featured</Box>
                  <Tooltip
                    title={`In-stock featured: ${featuredCountSealed}/${MAX_FEATURED_PRODUCTS}. Pre-order featured: ${featuredCountPreorder}/${MAX_FEATURED_PRODUCTS}. Up to ${MAX_FEATURED_PRODUCTS} of each on the homepage.`}
                  >
                    <Box
                      component="span"
                      onClick={(event) => event.stopPropagation()}
                      sx={{
                        display: "inline-flex",
                        color: "text.secondary",
                        cursor: "help",
                        lineHeight: 0,
                        "&:hover": { color: "text.primary" },
                      }}
                      aria-label={`Featured slots: in-stock ${featuredCountSealed} of ${MAX_FEATURED_PRODUCTS}, pre-order ${featuredCountPreorder} of ${MAX_FEATURED_PRODUCTS}`}
                    >
                      <InfoIcon sx={{ fontSize: 14 }} />
                    </Box>
                  </Tooltip>
                </Box>
              </TableSortLabel>
            </TableCell>
            <TableCell
              align="center"
              sortDirection={sort.key === "comingSoon" ? sort.dir : false}
            >
              <TableSortLabel
                active={sort.key === "comingSoon"}
                direction={sort.key === "comingSoon" ? sort.dir : "asc"}
                onClick={() => onSort("comingSoon")}
                sx={{ ...ADMIN_TABLE_SORT_LABEL_SX, alignItems: "center" }}
              >
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                  <Box component="span">Coming soon</Box>
                  <Tooltip title="Visible on the shop, but not for sale. Overrides pre-order countdown until turned off.">
                    <Box
                      component="span"
                      onClick={(event) => event.stopPropagation()}
                      sx={{
                        display: "inline-flex",
                        color: "text.secondary",
                        cursor: "help",
                        lineHeight: 0,
                        "&:hover": { color: "text.primary" },
                      }}
                      aria-label="Coming soon: visible on the shop, but not for sale"
                    >
                      <InfoIcon sx={{ fontSize: 14 }} />
                    </Box>
                  </Tooltip>
                </Box>
              </TableSortLabel>
            </TableCell>
            <SortHeader id="status" label="Status" align="right" />
            <AdminTableHeaderCell sx={{ width: 96 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const status = stockStatus(row);
            const isSelected = selectedIds.has(row.id);
            const archived = isArchivedRow(row);
            const openOrders = openOrdersByProduct?.get(row.id) ?? [];
            const deleteBlocked = openOrders.length > 0;
            const stockValue = onHandStockValue(row);
            return (
              <TableRow
                key={row.id}
                hover
                selected={isSelected}
                sx={{ opacity: archived ? 0.55 : row.published ? 1 : 0.72, cursor: "pointer" }}
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
                <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", md: "table-cell" }, color: "text.secondary" }}>
                  {PESO.format(Number(row.cost) || 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontFamily: MONO_FONT }}>{stockDisplay(row)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" }, fontFamily: MONO_FONT }}>
                  {stockValue == null ? "—" : PESO.format(stockValue)}
                </TableCell>
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
                <TableCell align="center">
                  <ComingSoonCheckbox row={row} toggleComingSoon={toggleComingSoon} />
                </TableCell>
                <TableCell align="right">
                  {archived ? (
                    <Chip label="Archived" size="small" color="error" variant="outlined" />
                  ) : (
                    <Chip label={status.label} size="small" color={status.color} variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                  <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                    <Tooltip title="Edit">
                      <span>
                        <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)} disabled={archived}>
                          <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={archived ? "Already archived" : deleteBlocked ? "Unable to archive — existing in-progress order" : "Archive"}>
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Archive ${row.name}`}
                          onClick={() => onDelete(row)}
                          disabled={archived || deleteBlocked}
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
              <TableCell colSpan={14} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
                No products match your filters.
              </TableCell>
            </TableRow>
          ) : (
            <InfiniteScrollTableSentinel
              sentinelRef={sentinelRef}
              hasMore={hasMore}
              visibleCount={visibleCount}
              totalCount={totalCount}
              colSpan={14}
            />
          )}
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
  toggleFeatured,
  toggleComingSoon,
  featuredCountSealed,
  featuredCountPreorder,
  isDarkMode,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  openOrdersByProduct,
  sentinelRef,
  hasMore,
  visibleCount,
  totalCount,
}) {
  const theme = useTheme();
  const hoverAccent = theme.palette.secondary.main;

  if (!totalCount) {
    return (
      <Box sx={{ ...panelSx, p: 5, textAlign: "center", color: "text.secondary" }}>
        No products match your filters.
      </Box>
    );
  }

  return (
    <>
    <Grid container spacing={2.5}>
      {rows.map((row) => {
        const status = stockStatus(row);
        const isSelected = selectedIds.has(row.id);
        const archived = isArchivedRow(row);
        const openOrders = openOrdersByProduct?.get(row.id) ?? [];
        const deleteBlocked = openOrders.length > 0;
        const stockValue = onHandStockValue(row);
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
                opacity: archived ? 0.55 : row.published ? 1 : 0.78,
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
                    <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)} disabled={archived}>
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={archived ? "Already archived" : deleteBlocked ? "Unable to archive — existing in-progress order" : "Archive"}>
                  <span>
                    <IconButton size="small" aria-label={`Archive ${row.name}`} onClick={() => onDelete(row)} disabled={archived || deleteBlocked} color="error">
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

              <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: "auto", pl: 4 }} useFlexGap flexWrap="wrap" spacing={1}>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>{PESO.format(row.price)}</Typography>
                <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, color: "text.secondary" }}>
                  Stock: {stockDisplay(row)}
                  {stockValue != null ? ` · Value ${PESO.format(stockValue)}` : ""}
                </Typography>
              </Stack>

              <Box sx={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                <Chip label={row.type} size="small" variant="outlined" color={row.type === "Pre-order" ? "secondary" : "default"} />
                {archived ? (
                  <Chip label="Archived" size="small" color="error" variant="outlined" />
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
                <ComingSoonCheckbox row={row} toggleComingSoon={toggleComingSoon} />
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
    <InfiniteScrollSentinel
      sentinelRef={sentinelRef}
      hasMore={hasMore}
      visibleCount={visibleCount}
      totalCount={totalCount}
    />
    </>
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
    toggleComingSoon,
    featuredCountSealed,
    featuredCountPreorder,
    softDeleteMany,
    restoreMany,
    addProduct,
    updateProduct,
  } = useInventory();
  const { lineOptions } = useCatalog();
  const { orders } = useOrders();
  const openOrdersByProduct = useMemo(() => openOrdersByProductId(orders), [orders]);
  const catalogFilters = useMemo(
    () => lineOptions.map((opt) => (
      opt.value === "all" ? { ...opt, label: "All catalog" } : opt
    )),
    [lineOptions],
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("table");
  const [formOpen, setFormOpen] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteTargetIds, setDeleteTargetIds] = useState([]);
  const [deleteBlockAlert, setDeleteBlockAlert] = useState(null);
  const [actionsAnchor, setActionsAnchor] = useState(null);
  const [sort, setSort] = useState({ key: "product", dir: "asc" });

  function handleSort(key) {
    setSort((prev) => toggleSortState(prev, key, {
      defaultDir: key === "price" || key === "cost" || key === "stock" || key === "value" ? "desc" : "asc",
    }));
  }

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
    const filtered = items.filter((row) => {
      const archived = isArchivedRow(row);
      if (statusFilter === "archived") {
        if (!archived) return false;
      } else if (archived) {
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
          if (!productTracksStock(row) || row.stock > row.reorderAt) return false;
          break;
        default:
          break;
      }

      switch (typeFilter) {
        case "sealed":
          if (row.type === "Pre-order") return false;
          break;
        case "preorder":
          if (row.type !== "Pre-order") return false;
          break;
        default:
          break;
      }

      const lineMatch = lineMatchFromOptions(catalogFilters, catalogFilter);
      if (lineMatch) {
        const productLine = String(row.line || "");
        if (productLine !== lineMatch && !productLine.startsWith(lineMatch)) return false;
      }

      return true;
    });
    return sortRowsBy(filtered, sort, INVENTORY_SORT_ACCESSORS, (a, b) =>
      String(a.sku || "").localeCompare(String(b.sku || ""), undefined, { numeric: true }),
    );
  }, [items, statusFilter, catalogFilter, catalogFilters, typeFilter, query, sort]);

  useEffect(() => {
    if (!catalogFilters.some((opt) => opt.value === catalogFilter)) {
      setCatalogFilter("all");
    }
  }, [catalogFilters, catalogFilter]);

  const {
    visibleItems,
    rootRef: scrollRootRef,
    sentinelRef,
    hasMore,
    visibleCount,
    totalCount,
  } = useInfiniteScroll(rows, { pageSize: 40, observeKey: view });

  const itemIds = useMemo(() => new Set(items.map((row) => row.id)), [items]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => itemIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [itemIds]);

  const activeItems = useMemo(() => items.filter((row) => !isArchivedRow(row)), [items]);

  const stats = useMemo(() => {
    const totalUnits = activeItems.reduce((sum, row) => sum + Math.max(row.stock, 0), 0);
    const outOfStock = activeItems.filter((row) => productTracksStock(row) && row.stock <= 0).length;
    // Cost of on-hand / sealed only — pre-orders are not inventory on the shelf.
    const value = activeItems
      .filter((row) => row.type !== "Pre-order")
      .reduce((sum, row) => sum + (Number(row.cost) || 0) * Math.max(row.stock, 0), 0);
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
    const allLoadedSelected = visibleItems.length > 0 && visibleItems.every((row) => selectedIds.has(row.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allLoadedSelected) {
        visibleItems.forEach((row) => next.delete(row.id));
      } else {
        visibleItems.forEach((row) => next.add(row.id));
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
        title: "Unable to archive product",
        message: "Unable to archive — there is an existing in-progress order for this product.",
      });
      return;
    }
    setDeleteTargetIds([row.id]);
  }

  function requestBulkDelete() {
    const candidates = [...selectedIds].filter((id) => {
      const row = items.find((entry) => entry.id === id);
      return row && !isArchivedRow(row);
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
          ? "Unable to archive products"
          : "Some products can’t be archived",
        message: blocked.length === candidates.length
          ? "Unable to archive — selected products have existing in-progress orders."
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
  const allVisibleSelected = visibleItems.length > 0 && visibleItems.every((row) => selectedIds.has(row.id));
  const deleteCount = deleteTargetIds.length;
  const deleteDialogOpen = deleteCount > 0;
  const viewingArchived = statusFilter === "archived";

  return (
    <Box sx={{ ...ADMIN_LIST_PAGE_SX, gap: { xs: 1, md: ADMIN_PAGE_SPACING } }}>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Products & stock"
        subtitle={`Manage SKUs and storefront visibility. Featured slots: in-stock ${featuredCountSealed}/${MAX_FEATURED_PRODUCTS}, pre-order ${featuredCountPreorder}/${MAX_FEATURED_PRODUCTS}.`}
        action={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={openCopyForm}
              disabled={activeItems.length === 0}
              sx={{
                borderColor: surfaceBorderColor,
                fontFamily: MONO_FONT,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                fontSize: "0.72rem",
                display: { xs: "none", sm: "inline-flex" },
              }}
            >
              Copy from product
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={openAddForm}
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
            >
              + Add product
            </Button>
          </Stack>
        )}
      />

      <Stack spacing={{ xs: 1, md: ADMIN_PAGE_SPACING }} sx={{ flexShrink: 0 }}>
        <Grid container spacing={2} sx={ADMIN_LIST_STATS_SX}>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={InventoryIcon} label="Total SKUs" value={stats.skus} accent={accents[0]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Published on shop" value={stats.published} accent={accents[1]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={ShieldIcon} label="Out of stock" value={stats.outOfStock} accent={accents[2]} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={BoxIcon} label="On-hand value (cost)" value={PESO.format(stats.value)} accent={accents[3]} /></Grid>
        </Grid>

        <Box sx={{ ...panelSx, ...ADMIN_LIST_FILTER_BAR_SX }}>
          <Stack spacing={1.25} sx={{ width: "100%", minWidth: 0 }}>
            {selectedCount > 0 ? (
              <Stack sx={ADMIN_LIST_BULK_BAR_SX}>
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
                  {viewingArchived ? (
                    <MenuItem onClick={bulkRestore}>Restore</MenuItem>
                  ) : (
                    [
                      <MenuItem key="publish" onClick={() => bulkPublish(true)}>Publish</MenuItem>,
                      <MenuItem key="unpublish" onClick={() => bulkPublish(false)}>Unpublish</MenuItem>,
                      <MenuItem key="archive" onClick={requestBulkDelete} sx={{ color: "error.main" }}>Archive…</MenuItem>,
                    ]
                  )}
                </Menu>
              </Stack>
            ) : null}

            {/* Desktop: single filter row */}
            <Stack
              direction="row"
              alignItems="center"
              sx={{ ...ADMIN_LIST_FILTER_ROW_SX, display: { xs: "none", md: "flex" } }}
            >
              <AdminListFilterTabs
                label="Status"
                labelId="inventory-status-filter"
                options={STATUS_FILTERS}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="inventory-type-filter">Type</InputLabel>
                <Select
                  labelId="inventory-type-filter"
                  label="Type"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  {TYPE_FILTERS.map((item) => (
                    <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="inventory-catalog-filter">Catalog</InputLabel>
                <Select
                  labelId="inventory-catalog-filter"
                  label="Catalog"
                  value={catalogFilter}
                  onChange={(event) => setCatalogFilter(event.target.value)}
                >
                  {catalogFilters.map((item) => (
                    <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1, minWidth: 8 }} />
              {selectedCount === 0 ? (
                <Chip
                  label={allVisibleSelected ? "Deselect loaded" : "Select loaded"}
                  onClick={toggleSelectAllVisible}
                  disabled={!visibleItems.length}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              ) : null}
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
                sx={ADMIN_LIST_SEARCH_FIELD_SX}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
              />
            </Stack>

            {/* Mobile: stacked filters so labels and search never crush */}
            <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, width: "100%", minWidth: 0 }}>
              <AdminListFilterTabs
                label="Status"
                labelId="inventory-status-filter-mobile"
                options={STATUS_FILTERS}
                value={statusFilter}
                onChange={setStatusFilter}
              />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
                <FormControl size="small" sx={ADMIN_LIST_FILTER_SELECT_SX}>
                  <InputLabel id="inventory-type-filter-mobile">Type</InputLabel>
                  <Select
                    labelId="inventory-type-filter-mobile"
                    label="Type"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                  >
                    {TYPE_FILTERS.map((item) => (
                      <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={ADMIN_LIST_FILTER_SELECT_SX}>
                  <InputLabel id="inventory-catalog-filter-mobile">Catalog</InputLabel>
                  <Select
                    labelId="inventory-catalog-filter-mobile"
                    label="Catalog"
                    value={catalogFilter}
                    onChange={(event) => setCatalogFilter(event.target.value)}
                  >
                    {catalogFilters.map((item) => (
                      <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={view}
                  onChange={(_, next) => { if (next) setView(next); }}
                  sx={{ flexShrink: 0 }}
                >
                  <ToggleButton value="table" aria-label="Table view" sx={{ px: 1.1 }}>
                    <ViewTableIcon sx={{ fontSize: 20 }} />
                  </ToggleButton>
                  <ToggleButton value="cards" aria-label="Cards view" sx={{ px: 1.1 }}>
                    <ViewGridIcon sx={{ fontSize: 20 }} />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <TextField
                size="small"
                placeholder="Search SKU or name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                fullWidth
                sx={ADMIN_LIST_SEARCH_FIELD_SX}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
              />
            </Stack>
          </Stack>
        </Box>
      </Stack>

      {view === "table" ? (
        <Box sx={{ ...ADMIN_LIST_PANEL_SX, ...panelSx }}>
          <InventoryTableView
            rows={visibleItems}
            sort={sort}
            onSort={handleSort}
            togglePublished={togglePublished}
            toggleFeatured={toggleFeatured}
            toggleComingSoon={toggleComingSoon}
            featuredCountSealed={featuredCountSealed}
            featuredCountPreorder={featuredCountPreorder}
            isDarkMode={isDarkMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllVisible}
            onEdit={openEditForm}
            onDelete={requestDeleteRow}
            openOrdersByProduct={openOrdersByProduct}
            scrollRootRef={scrollRootRef}
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            visibleCount={visibleCount}
            totalCount={totalCount}
          />
        </Box>
      ) : (
        <Box sx={ADMIN_LIST_PANEL_SX}>
          <Box ref={scrollRootRef} sx={{ ...ADMIN_LIST_SCROLL_SX, pb: 0.5 }}>
            <InventoryCardView
              rows={visibleItems}
              panelSx={panelSx}
              togglePublished={togglePublished}
              toggleFeatured={toggleFeatured}
              toggleComingSoon={toggleComingSoon}
              featuredCountSealed={featuredCountSealed}
              featuredCountPreorder={featuredCountPreorder}
              isDarkMode={isDarkMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onEdit={openEditForm}
              onDelete={requestDeleteRow}
              openOrdersByProduct={openOrdersByProduct}
              sentinelRef={sentinelRef}
              hasMore={hasMore}
              visibleCount={visibleCount}
              totalCount={totalCount}
            />
          </Box>
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
        title={deleteCount > 1 ? `Archive ${deleteCount} products` : "Archive product"}
        description={
          deleteCount > 1
            ? `Archive ${deleteCount} selected products. They will be hidden from the storefront and inventory, but can be restored from the Archived filter.`
            : "Archive this product. It will be hidden from the storefront and inventory, but can be restored from the Archived filter."
        }
        confirmLabel={deleteCount > 1 ? `Archive ${deleteCount}` : "Archive"}
        confirmWord="archive"
        surfaceBorderColor={surfaceBorderColor}
      />

      <Dialog
        open={Boolean(deleteBlockAlert)}
        onClose={() => setDeleteBlockAlert(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>{deleteBlockAlert?.title || "Unable to archive"}</DialogTitle>
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
