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
  Typography,
} from "@mui/material";
import ProductDescriptionEditor, { normalizeDescriptionSections, serializeDescriptionSections } from "../components/ProductDescriptionEditor.jsx";
import { useCatalog } from "../lib/catalogStore.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useFirebaseData } from "../lib/firebase/config.js";
import { uploadProductImage } from "../lib/firebase/repositories/uploads.js";
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
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError("");
    setUploading(true);
    try {
      // Pre-prod uses Firebase Storage; local dev falls back to an inline data URL.
      const url = firebaseEnabled
        ? await uploadProductImage(product?.id, file)
        : await readAsDataUrl(file);
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isEdit ? "Edit product" : copyMode ? "Add product from copy" : "Add product"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {!isEdit && copyMode ? (
            <TextField
              label="Copy from product"
              select
              required
              fullWidth
              value={copyFromId}
              onChange={(e) => handleCopyFromChange(e.target.value)}
              helperText="Pre-fills line, pricing, description, and pre-order settings. Name gets “(Copy)” and stock resets to 0."
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
              label="SKU"
              fullWidth
              value={product.sku}
              disabled
              helperText="SKU cannot be changed."
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
              label="Selling price (₱)"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: 100 }}
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              helperText="Shown to customers on the storefront."
            />
            <TextField
              label="Cost (₱)"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: 100 }}
              value={form.cost}
              onChange={(e) => update("cost", e.target.value)}
              helperText={isEdit ? "What Hobby Arena pays to buy it. Drives net revenue & stock value." : "What Hobby Arena pays to buy it. Defaults to ~72% of price if blank."}
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
              label="Reorder at"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: 1 }}
              value={form.reorderAt}
              onChange={(e) => update("reorderAt", e.target.value)}
              helperText="Low-stock alert threshold."
            />
          </Stack>
          {form.type === "Pre-order" ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Pre-order deadline"
                type="datetime-local"
                fullWidth
                value={form.preorderEndsAt}
                onChange={(e) => update("preorderEndsAt", e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Countdown timer on the storefront ends at this date."
              />
              <TextField
                label="Deposit % (due now)"
                type="number"
                fullWidth
                inputProps={{ min: 1, max: 99, step: 1 }}
                value={form.depositPercent}
                onChange={(e) => update("depositPercent", e.target.value)}
                helperText="Balance due before release (e.g. 30% now, 70% later)."
              />
            </Stack>
          ) : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Rating (0–5)"
              type="number"
              fullWidth
              inputProps={{ min: 0, max: 5, step: 0.1 }}
              value={form.rating}
              onChange={(e) => update("rating", e.target.value)}
              helperText="Leave at 0 to hide until reviews are enabled in CMS."
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
                    sx={{ textTransform: "none" }}
                  >
                    {form.image ? "Replace image" : "Upload image"}
                  </Button>
                  {form.image && !uploading ? (
                    <Button
                      variant="text"
                      size="small"
                      color="inherit"
                      onClick={() => update("image", "")}
                      sx={{ textTransform: "none" }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </Stack>
                <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", lineHeight: 1.4 }}>
                  PNG, JPG, or WebP · up to 5MB. Stored in Firebase Storage.
                </Typography>
              </Stack>
            </Stack>
          </Box>
          <ProductDescriptionEditor
            sections={form.descriptionSections}
            onChange={(descriptionSections) => update("descriptionSections", descriptionSections)}
            surfaceBorderColor={surfaceBorderColor}
          />
          <FormControlLabel
            control={(
              <Switch
                checked={form.published}
                onChange={(e) => update("published", e.target.checked)}
                color="primary"
              />
            )}
            label={form.published ? "Published on storefront" : "Draft — hidden from shop"}
          />
          {error ? (
            <Typography color="error" sx={{ fontSize: "0.85rem" }}>{error}</Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button type="submit" variant="contained" color="primary" disabled={uploading} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {isEdit ? "Save changes" : "Add product"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
