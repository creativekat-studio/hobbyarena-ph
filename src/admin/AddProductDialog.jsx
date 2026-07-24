import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProductDescriptionEditor, { normalizeDescriptionSections, serializeDescriptionSections } from "../components/ProductDescriptionEditor.jsx";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";
import { MenuIcon, TrashIcon } from "../components/icons.jsx";
import { AdminTableHeaderCell } from "./adminTableHeader.jsx";
import { useCatalog } from "../lib/catalogStore.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useFirebaseData } from "../lib/firebase/config.js";
import { uploadProductImage } from "../lib/firebase/repositories/uploads.js";
import { compressProductImageFile } from "../lib/imageCompression.js";
import { UPLOAD_SIZE_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
import { orderHistoryForProduct, STATUS_COLOR } from "../data/orderWorkflow.js";
import { MONO_FONT } from "../theme.js";
import { DEFAULT_DEPOSIT_PERCENT, fromDatetimeLocalValue, toDatetimeLocalValue } from "../lib/preorder.js";

const TYPES = [
  { value: "Sealed", label: "Sealed" },
  { value: "Pre-order", label: "Pre-order" },
];

const EMPTY = {
  name: "",
  line: "Pokémon TCG",
  type: "Sealed",
  price: "",
  cost: "",
  stock: "0",
  reorderAt: "3",
  image: "",
  published: false,
  featured: false,
  comingSoon: false,
  rating: "",
  reviews: "0",
  preorderEndsAt: "",
  depositPercent: String(DEFAULT_DEPOSIT_PERCENT),
  category: "tcg",
  descriptionSections: [],
};

function InfoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden {...props}>
      <path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
  );
}

/** Label with optional (i) tooltip — tip uses sentence case, not all-caps helper text. */
function fieldLabel(text, tip) {
  if (!tip) return text;
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.4 }}>
      <Box component="span">{text}</Box>
      <Tooltip
        title={tip}
        arrow
        placement="top"
        enterTouchDelay={0}
        slotProps={{
          tooltip: {
            sx: {
              fontFamily: MONO_FONT,
              fontSize: "0.72rem",
              fontWeight: 500,
              letterSpacing: 0.2,
              textTransform: "none",
              lineHeight: 1.45,
              maxWidth: 260,
            },
          },
        }}
      >
        <Box
          component="span"
          role="img"
          aria-label={tip}
          onMouseDown={(event) => event.preventDefault()}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            color: "text.secondary",
            cursor: "help",
            lineHeight: 0,
            "&:hover": { color: "primary.main" },
          }}
        >
          <InfoIcon style={{ fontSize: 13 }} />
        </Box>
      </Tooltip>
    </Box>
  );
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formFromProduct(product) {
  if (!product) return EMPTY;
  return {
    name: product.name ?? "",
    line: product.line ?? "Pokémon TCG",
    type: product.type ?? "Sealed",
    price: String(product.price ?? ""),
    cost: String(product.cost ?? ""),
    stock: String(product.stock ?? 0),
    reorderAt: String(product.reorderAt ?? 3),
    image: product.image ?? "",
    published: Boolean(product.published),
    featured: Boolean(product.featured),
    comingSoon: Boolean(product.comingSoon),
    rating: product.rating != null ? String(product.rating) : "",
    reviews: String(product.reviews ?? 0),
    preorderEndsAt: toDatetimeLocalValue(product.preorderEndsAt),
    depositPercent: String(product.depositPercent ?? DEFAULT_DEPOSIT_PERCENT),
    category: product.category ?? "tcg",
    descriptionSections: normalizeDescriptionSections(product.descriptionSections),
  };
}

function formFromCopy(product) {
  const base = formFromProduct(product);
  const copyLabel = base.name.trim().endsWith("(Copy)") ? base.name : `${base.name.trim()} (Copy)`;
  return {
    ...base,
    name: copyLabel,
    published: false,
    featured: false,
    stock: "0",
  };
}

export default function AddProductDialog({
  open,
  onClose,
  product = null,
  products = [],
  copyMode = false,
  onAdd,
  onUpdate,
  onDelete,
  surfaceBorderColor,
  featuredCountSealed = 0,
  featuredCountPreorder = 0,
  maxFeatured = 4,
  deleteBlocked = false,
}) {
  const isEdit = Boolean(product);
  const navigate = useNavigate();
  const { inventoryById } = useInventory();
  const { orders } = useOrders();
  const { activeLines, activeCategories } = useCatalog();
  const firebaseEnabled = useFirebaseData();
  const [form, setForm] = useState(EMPTY);
  const [copyFromId, setCopyFromId] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBlockedOpen, setDeleteBlockedOpen] = useState(false);
  const [visibilityMenuAnchor, setVisibilityMenuAnchor] = useState(null);
  const fileInputRef = useRef(null);
  const isPreorderForm = form.type === "Pre-order";
  let featuredOthers = isPreorderForm ? featuredCountPreorder : featuredCountSealed;
  if (
    isEdit
    && product?.featured
    && ((product.type === "Pre-order") === isPreorderForm)
  ) {
    featuredOthers = Math.max(0, featuredOthers - 1);
  }
  const featuredCount = form.featured ? featuredOthers + 1 : featuredOthers;
  const featuredAtLimit = !form.featured && featuredOthers >= maxFeatured;
  const outOfStock = Number(form.stock) <= 0;
  const featuredDisabled = featuredAtLimit || (outOfStock && !form.featured);
  const featuredKindLabel = isPreorderForm ? "pre-order" : "in-stock";

  const orderHistory = useMemo(
    () => (isEdit && product?.id ? orderHistoryForProduct(orders, product.id) : []),
    [isEdit, product?.id, orders],
  );

  useEffect(() => {
    if (open) {
      setTab(0);
      setDeleteConfirmOpen(false);
      setDeleteBlockedOpen(false);
      if (isEdit) {
        const source = inventoryById.get(product.id) ?? product;
        setForm(formFromProduct(source));
        setCopyFromId("");
      } else if (copyMode && products.length === 1) {
        setCopyFromId(products[0].id);
        setForm(formFromCopy(inventoryById.get(products[0].id) ?? products[0]));
      } else {
        setForm(EMPTY);
        setCopyFromId("");
      }
      setError("");
    }
  }, [open, product, isEdit, copyMode, inventoryById, products]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Image must be a PNG, JPG, or WebP file.");
      return;
    }
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }

    setError("");
    setUploading(true);
    try {
      const compressedFile = await compressProductImageFile(file);
      const url = firebaseEnabled
        ? await uploadProductImage(product?.id, compressedFile)
        : await readAsDataUrl(compressedFile);
      setForm((prev) => ({ ...prev, image: url }));
    } catch (uploadError) {
      console.error("[product] Image upload failed:", uploadError);
      setError("Could not upload the image. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleCopyFromChange(productId) {
    setCopyFromId(productId);
    if (!productId) {
      setForm(EMPTY);
      return;
    }
    const source = inventoryById.get(productId) ?? products.find((row) => row.id === productId);
    if (source) setForm(formFromCopy(source));
  }

  function handleClose() {
    setForm(EMPTY);
    setCopyFromId("");
    setError("");
    setUploading(false);
    setTab(0);
    setDeleteConfirmOpen(false);
    setDeleteBlockedOpen(false);
    setVisibilityMenuAnchor(null);
    onClose();
  }

  function requestDelete() {
    if (deleteBlocked) {
      setDeleteBlockedOpen(true);
      return;
    }
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    if (!product?.id || !onDelete) return;
    onDelete(product.id);
    handleClose();
  }

  function openOrder(orderId) {
    handleClose();
    navigate(`/admin/orders/${encodeURIComponent(orderId)}`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (tab !== 0) return;
    event.preventDefault();
    if (uploading) {
      setError("Please wait for the image to finish uploading.");
      return;
    }
    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (copyMode && !isEdit && !copyFromId) {
      setError("Choose a product to copy from.");
      return;
    }

    const payload = {
      name: form.name,
      line: form.line,
      type: form.type,
      price: Number(form.price),
      cost: Number(form.cost),
      stock: Number(form.stock),
      reorderAt: Number(form.reorderAt),
      image: form.image,
      published: form.published,
      featured: form.featured,
      comingSoon: Boolean(form.comingSoon),
      rating: form.rating === "" ? 0 : Number(form.rating),
      reviews: Number(form.reviews),
      descriptionSections: serializeDescriptionSections(form.descriptionSections),
      ...(form.type === "Pre-order"
        ? {
            preorderEndsAt: fromDatetimeLocalValue(form.preorderEndsAt),
            depositPercent: Number(form.depositPercent),
          }
        : { category: form.category }),
    };

    const ok = isEdit
      ? onUpdate(product.id, payload)
      : Boolean(onAdd(payload));

    if (!ok) {
      setError(isEdit ? "Could not save changes. Check the form and try again." : "Could not add product. Check the form and try again.");
      return;
    }
    handleClose();
  }

  let imagePreview;
  if (uploading) {
    imagePreview = <CircularProgress size={22} />;
  } else if (form.image) {
    imagePreview = (
      <Box
        component="img"
        src={form.image}
        alt="Product preview"
        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  } else {
    imagePreview = (
      <Typography sx={{ fontSize: "0.65rem", color: "text.disabled", textAlign: "center", px: 1 }}>
        No image
      </Typography>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      component="form"
      onSubmit={handleSubmit}
      PaperProps={{
        sx: {
          width: "min(1320px, calc(100vw - 32px))",
          maxHeight: "min(900px, calc(100vh - 32px))",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: isEdit ? 1 : 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography component="span" sx={{ fontWeight: 800, fontSize: "inherit", flex: 1, minWidth: 0 }}>
            {isEdit ? "Edit product" : copyMode ? "Add product from copy" : "Add product"}
          </Typography>
          {tab === 0 ? (
            <>
              <Tooltip title="Visibility">
                <IconButton
                  size="small"
                  aria-label="Product visibility options"
                  aria-haspopup="menu"
                  aria-expanded={Boolean(visibilityMenuAnchor)}
                  onClick={(event) => setVisibilityMenuAnchor(event.currentTarget)}
                  sx={{
                    border: "1px solid",
                    borderColor: surfaceBorderColor,
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                >
                  <MenuIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={visibilityMenuAnchor}
                open={Boolean(visibilityMenuAnchor)}
                onClose={() => setVisibilityMenuAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{
                  paper: {
                    sx: {
                      minWidth: 280,
                      border: "1px solid",
                      borderColor: surfaceBorderColor,
                    },
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }} onClick={(event) => event.stopPropagation()}>
                  <Stack spacing={1.25}>
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 800, letterSpacing: 0.8, color: "text.secondary", textTransform: "uppercase" }}>
                      Visibility
                    </Typography>
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={form.published}
                          onChange={(e) => update("published", e.target.checked)}
                          color="primary"
                        />
                      )}
                      label={form.published ? "Published on storefront" : "Draft — hidden from shop"}
                      sx={{ mx: 0, alignItems: "center" }}
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={form.comingSoon}
                          onChange={(e) => update("comingSoon", e.target.checked)}
                          color="warning"
                        />
                      )}
                      label={form.comingSoon
                        ? "Coming soon — visible, not for sale"
                        : "Coming soon"}
                      sx={{ mx: 0, alignItems: "center" }}
                    />
                    <FormControlLabel
                      control={(
                        <Switch
                          checked={form.featured && !outOfStock}
                          onChange={(e) => update("featured", e.target.checked)}
                          color="secondary"
                          disabled={featuredDisabled}
                        />
                      )}
                      label={
                        outOfStock
                          ? "Out of stock — can’t feature"
                          : featuredAtLimit
                            ? `${featuredKindLabel} featured full (${featuredCount}/${maxFeatured})`
                            : form.featured
                              ? `Featured on homepage (${featuredCount}/${maxFeatured} ${featuredKindLabel})`
                              : `Feature on homepage (${featuredCount}/${maxFeatured} ${featuredKindLabel})`
                      }
                      sx={{ mx: 0, alignItems: "center" }}
                    />
                  </Stack>
                </Box>
              </Menu>
            </>
          ) : null}
        </Stack>
        {isEdit ? (
          <Tabs
            value={tab}
            onChange={(_, next) => setTab(next)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mt: 1.5,
              borderBottom: "1px solid",
              borderColor: surfaceBorderColor || "divider",
            }}
          >
            <Tab label="Details" />
            <Tab label={`Order history${orderHistory.length ? ` (${orderHistory.length})` : ""}`} />
          </Tabs>
        ) : null}
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, md: 2.5 } }}>
        {isEdit && tab === 1 ? (
          <TableContainer sx={{ maxHeight: "min(560px, calc(100vh - 260px))" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <AdminTableHeaderCell>Order</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Customer</AdminTableHeaderCell>
                  <AdminTableHeaderCell align="right">Qty</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderHistory.map((row) => (
                  <TableRow key={row.orderId} hover sx={{ cursor: "pointer" }} onClick={() => openOrder(row.orderId)}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={(event) => {
                          event.stopPropagation();
                          openOrder(row.orderId);
                        }}
                        sx={{
                          fontFamily: MONO_FONT,
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "primary.main",
                          textAlign: "left",
                        }}
                      >
                        {row.orderId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{row.customer}</Typography>
                      {row.email ? (
                        <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{row.email}</Typography>
                      ) : null}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: MONO_FONT, fontWeight: 700 }}>
                      {row.quantity}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.statusLabel}
                        size="small"
                        color={STATUS_COLOR[row.status] || "default"}
                        variant={row.fulfilled ? "filled" : "outlined"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {orderHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
                      No orders include this product yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1.05fr) minmax(0, 0.95fr)" },
            gap: { xs: 2.5, md: 3 },
            alignItems: "start",
            pt: 0.5,
          }}
        >
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            {!isEdit && copyMode ? (
              <TextField
                label={fieldLabel(
                  "Copy from product",
                  "Pre-fills line, pricing, description, and pre-order settings. Name gets “(Copy)” and stock resets to 0.",
                )}
                select
                required
                fullWidth
                value={copyFromId}
                onChange={(e) => handleCopyFromChange(e.target.value)}
                autoFocus
              >
                <MenuItem value="" disabled>Select a product…</MenuItem>
                {products.map((row) => (
                  <MenuItem key={row.id} value={row.id}>
                    {row.name} · {row.sku}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {isEdit ? (
              <TextField
                label={fieldLabel("SKU", "SKU cannot be changed.")}
                fullWidth
                value={product.sku}
                disabled
              />
            ) : null}
            <TextField
              label="Product name"
              required
              fullWidth
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              autoFocus={!copyMode || isEdit}
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Line"
                select
                fullWidth
                value={form.line}
                onChange={(e) => update("line", e.target.value)}
              >
                {activeLines.map((item) => (
                  <MenuItem key={item.id} value={item.label}>{item.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Type"
                select
                fullWidth
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
              >
                {TYPES.map((item) => (
                  <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                ))}
              </TextField>
            </Stack>
            {form.type !== "Pre-order" ? (
              <TextField
                label="Category"
                select
                fullWidth
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                {activeCategories.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>
                ))}
              </TextField>
            ) : null}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={fieldLabel("Selling price (₱)", "Shown to customers on the storefront.")}
                type="number"
                fullWidth
                inputProps={{ min: 0, step: "any" }}
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
              />
              <TextField
                label={fieldLabel(
                  "Cost (₱)",
                  isEdit
                    ? "What Hobby Arena pays to buy it. Drives net revenue & stock value."
                    : "What Hobby Arena pays to buy it. Defaults to ~72% of price if blank.",
                )}
                type="number"
                fullWidth
                inputProps={{ min: 0, step: "any" }}
                value={form.cost}
                onChange={(e) => update("cost", e.target.value)}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Stock"
                type="number"
                fullWidth
                inputProps={{ min: 0, step: 1 }}
                value={form.stock}
                onChange={(e) => update("stock", e.target.value)}
              />
              <TextField
                label={fieldLabel("Reorder at", "Low-stock alert threshold.")}
                type="number"
                fullWidth
                inputProps={{ min: 0, step: 1 }}
                value={form.reorderAt}
                onChange={(e) => update("reorderAt", e.target.value)}
              />
            </Stack>
            {form.type === "Pre-order" ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label={fieldLabel("Pre-order deadline", "Countdown timer on the storefront ends at this date.")}
                  type="datetime-local"
                  fullWidth
                  value={form.preorderEndsAt}
                  onChange={(e) => update("preorderEndsAt", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label={fieldLabel("Deposit % (due now)", "Balance due before release (e.g. 30% now, 70% later).")}
                  type="number"
                  fullWidth
                  inputProps={{ min: 1, max: 99, step: 1 }}
                  value={form.depositPercent}
                  onChange={(e) => update("depositPercent", e.target.value)}
                />
              </Stack>
            ) : null}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={fieldLabel("Rating (0–5)", "Leave at 0 to hide until reviews are enabled in CMS.")}
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 5, step: 0.1 }}
                value={form.rating}
                onChange={(e) => update("rating", e.target.value)}
              />
              <TextField
                label="Review count"
                type="number"
                fullWidth
                inputProps={{ min: 0, step: 1 }}
                value={form.reviews}
                onChange={(e) => update("reviews", e.target.value)}
              />
            </Stack>
            <Box>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, mb: 1, color: "text.secondary" }}>
                Product image
              </Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                hidden
                onChange={handleImageChange}
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 88,
                    height: 88,
                    borderRadius: 2,
                    border: "1px dashed",
                    borderColor: surfaceBorderColor || "divider",
                    bgcolor: "action.hover",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {imagePreview}
                </Box>
                <Stack spacing={0.75} sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {form.image ? "Replace image" : "Upload image"}
                    </Button>
                    {form.image && !uploading ? (
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Remove image"
                        onClick={() => update("image", "")}
                      >
                        <TrashIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    ) : null}
                  </Stack>
                  <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", lineHeight: 1.4 }}>
                    PNG, JPG, or WebP. {UPLOAD_SIZE_DISCLAIMER}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
            {error ? (
              <Typography color="error" sx={{ fontSize: "0.85rem" }}>{error}</Typography>
            ) : null}
          </Stack>

          <Box
            sx={{
              minWidth: 0,
              height: { md: "100%" },
              p: { xs: 1.75, md: 2 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: surfaceBorderColor || "divider",
              bgcolor: "action.hover",
              display: "flex",
              flexDirection: "column",
              maxHeight: { md: "min(640px, calc(100vh - 220px))" },
              overflow: "hidden",
            }}
          >
            <ProductDescriptionEditor
              sections={form.descriptionSections}
              onChange={(descriptionSections) => update("descriptionSections", descriptionSections)}
              surfaceBorderColor={surfaceBorderColor}
            />
          </Box>
        </Box>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: surfaceBorderColor,
          justifyContent: "flex-start",
          gap: 1,
        }}
      >
        {isEdit && onDelete ? (
          <Tooltip title={deleteBlocked ? "Unable to archive — existing in-progress order" : "Archive product"}>
            <span>
              <IconButton
                color="error"
                onClick={requestDelete}
                disabled={deleteBlocked}
                aria-label="Archive product"
                size="small"
                sx={{
                  border: "1px solid",
                  borderColor: "error.main",
                  borderRadius: 1,
                }}
              >
                <TrashIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        {tab === 0 ? (
          <Button type="submit" variant="contained" color="primary" disabled={uploading} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {isEdit ? "Save changes" : "Add product"}
          </Button>
        ) : null}
      </DialogActions>      <TypeConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Archive product"
        description="Archive this product. It will be hidden from the storefront and inventory, but can be restored from the Archived filter."
        confirmLabel="Archive"
        confirmWord="archive"
        surfaceBorderColor={surfaceBorderColor}
      />

      <Dialog open={deleteBlockedOpen} onClose={() => setDeleteBlockedOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Unable to archive product</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ color: "text.secondary", fontSize: "0.9rem", lineHeight: 1.5 }}>
            Unable to archive — there is an existing in-progress order for this product.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteBlockedOpen(false)} variant="contained" color="primary">OK</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
