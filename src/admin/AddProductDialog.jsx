import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ProductDescriptionEditor, { normalizeDescriptionSections, serializeDescriptionSections } from "../components/ProductDescriptionEditor.jsx";
import { useCatalog } from "../lib/catalogStore.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useFirebaseData } from "../lib/firebase/config.js";
import { uploadProductImage } from "../lib/firebase/repositories/uploads.js";
import { compressProductImageFile } from "../lib/imageCompression.js";
import { UPLOAD_SIZE_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
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
  surfaceBorderColor,
}) {
  const isEdit = Boolean(product);
  const { inventoryById } = useInventory();
  const { activeLines, activeCategories } = useCatalog();
  const firebaseEnabled = useFirebaseData();
  const [form, setForm] = useState(EMPTY);
  const [copyFromId, setCopyFromId] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
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
    onClose();
  }

  function handleSubmit(event) {
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
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isEdit ? "Edit product" : copyMode ? "Add product from copy" : "Add product"}
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, md: 2.5 } }}>
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
                      <Button
                        variant="text"
                        size="small"
                        color="inherit"
                        onClick={() => update("image", "")}
                      >
                        Remove
                      </Button>
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
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
        <FormControlLabel
          sx={{ mr: "auto" }}
          control={(
            <Switch
              checked={form.published}
              onChange={(e) => update("published", e.target.checked)}
              color="primary"
            />
          )}
          label={form.published ? "Published on storefront" : "Draft — hidden from shop"}
        />
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button type="submit" variant="contained" color="primary" disabled={uploading} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {isEdit ? "Save changes" : "Add product"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
