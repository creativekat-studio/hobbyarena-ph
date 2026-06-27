import { useEffect, useState } from "react";
import {
  Button,
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
import { MONO_FONT } from "../theme.js";
import { DEFAULT_DEPOSIT_PERCENT, fromDatetimeLocalValue, toDatetimeLocalValue } from "../lib/preorder.js";

const LINES = [
  { value: "Pokémon TCG", label: "Pokémon TCG" },
  { value: "One Piece Card Game", label: "One Piece Card Game" },
];

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
};

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
  };
}

export default function AddProductDialog({
  open,
  onClose,
  product = null,
  onAdd,
  onUpdate,
  surfaceBorderColor,
}) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(formFromProduct(product));
      setError("");
    }
  }, [open, product]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function handleClose() {
    setForm(EMPTY);
    setError("");
    onClose();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Product name is required.");
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
      ...(form.type === "Pre-order"
        ? {
            preorderEndsAt: fromDatetimeLocalValue(form.preorderEndsAt),
            depositPercent: Number(form.depositPercent),
          }
        : {}),
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 800 }}>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
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
            autoFocus
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Line"
              select
              fullWidth
              value={form.line}
              onChange={(e) => update("line", e.target.value)}
            >
              {LINES.map((item) => (
                <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Price (₱)"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: 100 }}
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
            <TextField
              label="Cost (₱)"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: 100 }}
              value={form.cost}
              onChange={(e) => update("cost", e.target.value)}
              helperText={isEdit ? "Used for stock value stats." : "Defaults to ~72% of price if blank."}
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
          <TextField
            label="Image URL (optional)"
            fullWidth
            placeholder="/products/your-image.jpg"
            value={form.image}
            onChange={(e) => update("image", e.target.value)}
            helperText="Leave blank to use a placeholder thumbnail."
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
        <Button type="submit" variant="contained" color="primary" sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {isEdit ? "Save changes" : "Add product"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
