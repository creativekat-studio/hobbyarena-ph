import { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import {
  getPaymentOptionsForKind,
  getStatusOptionsForKind,
} from "../data/orderWorkflow.js";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { isPreorderProduct, preorderBalanceDue, preorderDueNow } from "../lib/preorder.js";

const DEFAULTS_BY_KIND = {
  "Pre-order": {
    payment: "Pending Verification",
    status: "Pending Verification",
  },
  "In-stock": {
    payment: "Pending Verification",
    status: "Pending Verification",
  },
};

const EMPTY = {
  customer: "",
  email: "",
  phone: "",
  orderKind: "In-stock",
  notes: "",
  payment: DEFAULTS_BY_KIND["In-stock"].payment,
  status: DEFAULTS_BY_KIND["In-stock"].status,
  deductStock: true,
};

export default function AddOrderDialog({ open, onClose, surfaceBorderColor, onCreated }) {
  const { catalogProducts, decrementStockForCart } = useInventory();
  const { placeOrder } = useOrders();
  const [form, setForm] = useState(EMPTY);
  const [lineItems, setLineItems] = useState([]);
  const [picker, setPicker] = useState(null);
  const [pickerQty, setPickerQty] = useState(1);
  const [error, setError] = useState("");

  const productOptions = useMemo(() => {
    return catalogProducts.filter((product) => {
      const isPreorder = isPreorderProduct(product);
      return form.orderKind === "Pre-order" ? isPreorder : !isPreorder;
    });
  }, [catalogProducts, form.orderKind]);

  const paymentOptions = getPaymentOptionsForKind(form.orderKind);
  const statusOptions = getStatusOptionsForKind(form.orderKind);

  const totals = useMemo(() => {
    let fullSubtotal = 0;
    let dueNow = 0;
    let balanceDue = 0;
    for (const item of lineItems) {
      const lineTotal = item.price * item.quantity;
      fullSubtotal += lineTotal;
      if (form.orderKind === "Pre-order") {
        dueNow += preorderDueNow(item, item.quantity);
        balanceDue += preorderBalanceDue(item, item.quantity);
      } else {
        dueNow += lineTotal;
      }
    }
    return { fullSubtotal, dueNow, balanceDue, total: dueNow };
  }, [lineItems, form.orderKind]);

  useEffect(() => {
    if (!open) return;
    setPicker(null);
    setLineItems([]);
  }, [form.orderKind, open]);

  function reset() {
    setForm(EMPTY);
    setLineItems([]);
    setPicker(null);
    setPickerQty(1);
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function handleKindChange(_, value) {
    if (!value) return;
    const defaults = DEFAULTS_BY_KIND[value];
    setForm((prev) => ({
      ...prev,
      orderKind: value,
      payment: defaults.payment,
      status: defaults.status,
      deductStock: value === "In-stock",
    }));
    setLineItems([]);
    setPicker(null);
    setError("");
  }

  function addLineItem() {
    if (!picker) {
      setError("Select a product to add.");
      return;
    }
    const qty = Math.max(1, Number(pickerQty) || 1);
    setLineItems((prev) => {
      const existing = prev.find((item) => item.id === picker.id);
      if (existing) {
        return prev.map((item) =>
          item.id === picker.id ? { ...item, quantity: item.quantity + qty } : item,
        );
      }
      return [
        ...prev,
        {
          id: picker.id,
          name: picker.name,
          price: picker.price,
          quantity: qty,
          tag: picker.tag,
          line: picker.line,
        },
      ];
    });
    setPicker(null);
    setPickerQty(1);
    setError("");
  }

  function removeLineItem(id) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!form.customer.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Customer email is required.");
      return;
    }
    if (!lineItems.length) {
      setError("Add at least one product.");
      return;
    }

    const order = placeOrder({
      type: form.orderKind,
      customer: form.customer.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim(),
      cartItems: lineItems,
      subtotal: totals.dueNow,
      shippingFee: 0,
      total: totals.total,
      fullSubtotal: totals.fullSubtotal,
      balanceDue: totals.balanceDue,
      manual: true,
      initialPayment: form.payment,
      initialStatus: form.status,
    });

    if (order && form.deductStock && form.orderKind === "In-stock") {
      decrementStockForCart(lineItems);
    }

    if (order) {
      onCreated?.(order.id);
      handleClose();
    } else {
      setError("Could not create order. Try again.");
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth component="form" onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 800 }}>Add order manually</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>Order type</Typography>
            <ToggleButtonGroup
              exclusive
              value={form.orderKind}
              onChange={handleKindChange}
              size="small"
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="In-stock" sx={{ fontFamily: MONO_FONT, fontSize: "0.75rem", px: 2 }}>
                In-stock product
              </ToggleButton>
              <ToggleButton value="Pre-order" sx={{ fontFamily: MONO_FONT, fontSize: "0.75rem", px: 2 }}>
                Pre-order
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
              {form.orderKind === "Pre-order"
                ? "Deposit + balance workflow with stock allocation."
                : "Single payment workflow for items in stock."}
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Customer name" required fullWidth value={form.customer} onChange={(e) => update("customer", e.target.value)} autoFocus />
            <TextField label="Email" required fullWidth type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Stack>
          <TextField label="Phone (optional)" fullWidth value={form.phone} onChange={(e) => update("phone", e.target.value)} />

          <Box sx={{ p: 2, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
              Line items
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({form.orderKind} products only)
              </Typography>
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-end" }}>
              <Autocomplete
                options={productOptions}
                getOptionLabel={(option) => `${option.name} — ${PESO.format(option.price)}`}
                value={picker}
                onChange={(_, value) => setPicker(value)}
                renderInput={(params) => <TextField {...params} label="Product" size="small" />}
                sx={{ flex: 1 }}
                noOptionsText={`No ${form.orderKind.toLowerCase()} products found`}
              />
              <TextField
                label="Qty"
                type="number"
                size="small"
                inputProps={{ min: 1, step: 1 }}
                value={pickerQty}
                onChange={(e) => setPickerQty(e.target.value)}
                sx={{ width: 90 }}
              />
              <Button variant="outlined" onClick={addLineItem} sx={{ whiteSpace: "nowrap" }}>Add item</Button>
            </Stack>

            {lineItems.length ? (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {lineItems.map((item) => (
                  <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{item.name}</Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.75rem", fontFamily: MONO_FONT }}>
                        {item.tag} · Qty {item.quantity} · {PESO.format(item.price)} each
                      </Typography>
                    </Box>
                    <Button size="small" color="error" onClick={() => removeLineItem(item.id)}>Remove</Button>
                  </Stack>
                ))}
                <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ pt: 1 }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                    Due now: <Box component="span" sx={{ fontWeight: 800, color: "text.primary" }}>{PESO.format(totals.dueNow)}</Box>
                  </Typography>
                  {form.orderKind === "Pre-order" && totals.balanceDue > 0 ? (
                    <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                      Balance later: {PESO.format(totals.balanceDue)}
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            ) : (
              <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 1.5 }}>No items yet.</Typography>
            )}
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Initial payment status" select fullWidth value={form.payment} onChange={(e) => update("payment", e.target.value)}>
              {paymentOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
            <TextField label="Initial order status" select fullWidth value={form.status} onChange={(e) => update("status", e.target.value)}>
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField label="Internal notes (optional)" fullWidth multiline minRows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} />

          {form.orderKind === "In-stock" ? (
            <FormControlLabel
              control={<Checkbox checked={form.deductStock} onChange={(e) => update("deductStock", e.target.checked)} />}
              label="Deduct in-stock quantities from inventory"
            />
          ) : null}

          {error ? <Typography color="error" sx={{ fontSize: "0.85rem" }}>{error}</Typography> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button type="submit" variant="contained" color="primary" sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Create order
        </Button>
      </DialogActions>
    </Dialog>
  );
}
