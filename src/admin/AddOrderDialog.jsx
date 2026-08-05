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
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import { TrashIcon } from "../components/icons.jsx";
import { PESO } from "../components/ProductCard.jsx";
import {
  getPaymentOptionsForKind,
  getOrderStatusOptionsForPayment,
  resolveOrderStatusForPayment,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useFirebaseData } from "../lib/firebase/config.js";
import { roundMoney } from "../lib/money.js";
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
  discount: "",
  payment: DEFAULTS_BY_KIND["In-stock"].payment,
  status: DEFAULTS_BY_KIND["In-stock"].status,
  deductStock: true,
};

export default function AddOrderDialog({ open, onClose, surfaceBorderColor, onCreated }) {
  const firebaseEnabled = useFirebaseData();
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
  const statusOptions = getOrderStatusOptionsForPayment(form.payment, form.orderKind);

  const totals = useMemo(() => {
    let fullSubtotal = 0;
    let dueNow = 0;
    let balanceDue = 0;
    for (const item of lineItems) {
      const lineTotal = roundMoney(item.price * item.quantity);
      fullSubtotal = roundMoney(fullSubtotal + lineTotal);
      if (form.orderKind === "Pre-order") {
        dueNow = roundMoney(dueNow + preorderDueNow(item, item.quantity));
        balanceDue = roundMoney(balanceDue + preorderBalanceDue(item, item.quantity));
      } else {
        dueNow = roundMoney(dueNow + lineTotal);
      }
    }
    const rawDiscount = Math.max(0, Number(form.discount) || 0);
    const discount = roundMoney(Math.min(rawDiscount, dueNow));
    const total = roundMoney(Math.max(0, dueNow - discount));
    return { fullSubtotal, dueNow, balanceDue, discount, total };
  }, [lineItems, form.orderKind, form.discount]);

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

  function updatePayment(value) {
    setForm((prev) => {
      const nextStatus = resolveOrderStatusForPayment(value, prev.status, prev.orderKind);
      return { ...prev, payment: value, status: nextStatus };
    });
    setError("");
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
          cost: picker.cost ?? 0,
          quantity: qty,
          tag: picker.tag,
          line: picker.line,
          image: picker.image || null,
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

  async function handleSubmit(event) {
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

    try {
      const order = await placeOrder({
        type: form.orderKind,
        customer: form.customer.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        notes: form.notes.trim(),
        cartItems: lineItems,
        subtotal: totals.total,
        shippingFee: 0,
        total: totals.total,
        fullSubtotal: totals.fullSubtotal,
        balanceDue: totals.balanceDue,
        discount: totals.discount,
        manual: true,
        deductStock: form.deductStock && form.orderKind === "In-stock",
        initialPayment: form.payment,
        initialStatus: form.status,
      });

      // Firebase create-order already deducted when deductStock was true.
      // Local mode still needs the client inventory update.
      if (order && !firebaseEnabled && form.deductStock && form.orderKind === "In-stock") {
        decrementStockForCart(lineItems);
      }

      if (order) {
        onCreated?.(order.id);
        handleClose();
      } else {
        setError("Could not create order. Try again.");
      }
    } catch (error) {
      console.error("[admin] placeOrder failed:", error);
      setError(error?.code === "permission-denied"
        ? "Could not save order to Firestore. Deploy security rules and try again."
        : "Could not create order. Try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      component="form"
      onSubmit={handleSubmit}
      PaperProps={{
        sx: {
          maxHeight: "calc(100vh - 32px)",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, flexShrink: 0 }}>Add order manually</DialogTitle>
      <DialogContent
        dividers
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          pt: 0.5,
        }}
      >
        <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <Box sx={{ flexShrink: 0 }}>
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

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flexShrink: 0 }}>
            <TextField
              label="Customer name"
              required
              fullWidth
              value={form.customer}
              onChange={(e) => update("customer", e.target.value)}
              autoFocus
              sx={{ flex: { sm: "1.1 1 0" } }}
            />
            <TextField
              label="Email"
              required
              fullWidth
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              sx={{ flex: { sm: "0.9 1 0" }, maxWidth: { sm: 220 } }}
            />
            <TextField
              label="Phone (optional)"
              fullWidth
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              sx={{ flex: { sm: "1 1 0" }, minWidth: { sm: 180 } }}
            />
          </Stack>

          <Box
            sx={{
              flex: "1 1 auto",
              minHeight: 180,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: 1,
              border: "1px solid",
              borderColor: surfaceBorderColor,
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ sm: "flex-end" }}
              sx={{ p: 2, pb: 1.5, flexShrink: 0, borderBottom: "1px solid", borderColor: surfaceBorderColor }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
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
                  <Button variant="outlined" onClick={addLineItem} sx={{ whiteSpace: "nowrap" }}>
                    Add item
                  </Button>
                </Stack>
              </Box>
            </Stack>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, py: 1.25 }}>
              {lineItems.length ? (
                <Stack spacing={1}>
                  {lineItems.map((item) => (
                    <Stack key={item.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Box sx={{ minWidth: 0, pr: 1 }}>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{item.name}</Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: "0.75rem", fontFamily: MONO_FONT }}>
                          {item.tag} · Qty {item.quantity} · {PESO.format(item.price)} each
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error" aria-label="Remove item" onClick={() => removeLineItem(item.id)}>
                        <TrashIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", py: 2 }}>
                  No items yet.
                </Typography>
              )}
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              alignItems={{ sm: "center" }}
              justifyContent="space-between"
              sx={{
                flexShrink: 0,
                px: 2,
                py: 1.25,
                borderTop: "1px solid",
                borderColor: surfaceBorderColor,
                bgcolor: "action.hover",
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
                <TextField
                  size="small"
                  type="number"
                  placeholder="0"
                  value={form.discount}
                  onChange={(e) => update("discount", e.target.value)}
                  inputProps={{ min: 0, step: "0.01", "aria-label": "Discount amount" }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", whiteSpace: "nowrap" }}>
                          Discount
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: 160,
                    "& .MuiOutlinedInput-root": { bgcolor: "background.paper" },
                    "& .MuiOutlinedInput-input": { textAlign: "right", py: 0.85, fontSize: "0.85rem" },
                  }}
                />
                {form.orderKind === "Pre-order" ? (
                  <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                    Due later {PESO.format(totals.balanceDue)}
                  </Typography>
                ) : null}
              </Stack>

              <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={0.2}>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.2 }}>
                  Total{" "}
                  <Box component="span" sx={{ color: "primary.main" }}>
                    {PESO.format(totals.total)}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", lineHeight: 1.35 }}>
                  Subtotal {PESO.format(totals.dueNow)}
                  {totals.discount > 0 ? ` · Discount −${PESO.format(totals.discount)}` : ""}
                </Typography>
              </Stack>
            </Stack>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flexShrink: 0 }}>
            <TextField label="Initial payment status" select fullWidth value={form.payment} onChange={(e) => updatePayment(e.target.value)}>
              {paymentOptions.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
            <TextField label="Initial order status" select fullWidth value={form.status} onChange={(e) => update("status", e.target.value)}>
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>{orderStatusLabel(option)}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            label="Internal notes (optional)"
            fullWidth
            multiline
            minRows={2}
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            sx={{ flexShrink: 0 }}
          />

          {form.orderKind === "In-stock" ? (
            <FormControlLabel
              sx={{ flexShrink: 0 }}
              control={<Checkbox checked={form.deductStock} onChange={(e) => update("deductStock", e.target.checked)} />}
              label="Deduct in-stock quantities from inventory"
            />
          ) : null}

          {error ? <Typography color="error" sx={{ fontSize: "0.85rem", flexShrink: 0 }}>{error}</Typography> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: surfaceBorderColor, flexShrink: 0 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button type="submit" variant="contained" color="primary" sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Create order
        </Button>
      </DialogActions>
    </Dialog>
  );
}
