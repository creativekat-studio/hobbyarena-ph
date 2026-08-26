import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/system";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { CardIcon, PokeballIcon, TrashIcon } from "../components/icons.jsx";
import QtyStepper from "../components/QtyStepper.jsx";
import { PESO } from "../components/ProductCard.jsx";
import { OFF_WHITE } from "../lib/colors.js";
import { productMediaSurface } from "../lib/surfaces.js";
import { useCart, cartItemDueNow, cartItemBalanceDue } from "../lib/cartStore.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useStockHolds } from "../lib/stockHoldStore.jsx";
import { isPreorderProduct } from "../lib/preorder.js";
import { maxStorefrontQuantity, productTracksStock } from "../lib/quantityLimits.js";
import { formatCartAvailabilityError, validateCartAgainstCatalog } from "../lib/cartAvailability.js";

const addedFlash = keyframes`
  0% { opacity: 0; transform: translateY(-6px); }
  18% { opacity: 1; transform: translateY(0); }
  75% { opacity: 1; }
  100% { opacity: 0; }
`;

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
    </svg>
  );
}

function CartLineItem({ item, onQuantityChange, onRemove, surfaceBorderColor, isDarkMode }) {
  const { getProduct } = useInventory();
  const { availableStock } = useStockHolds();
  const Glyph = item.line?.startsWith?.("Pokémon") ? PokeballIcon : CardIcon;
  const isPreorder = isPreorderProduct(item);
  const dueNow = cartItemDueNow(item);
  const balance = cartItemBalanceDue(item);
  const product = getProduct(item.id);
  const remaining = product && productTracksStock(product)
    ? availableStock(product.id, product.stock)
    : (product
      ? undefined
      : Math.max(0, Number(item.maxQuantity) || 0));
  const maxQty = maxStorefrontQuantity(product ?? item, remaining);

  useEffect(() => {
    if (item.quantity > maxQty) {
      onQuantityChange(item.id, maxQty, { maxQuantity: maxQty });
    } else if (item.maxQuantity !== maxQty) {
      onQuantityChange(item.id, item.quantity, { maxQuantity: maxQty });
    }
  }, [item.id, item.maxQuantity, item.quantity, maxQty, onQuantityChange]);

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 1,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...productMediaSurface(isDarkMode),
        }}
      >
        {item.image ? (
          <Box component="img" src={item.image} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Glyph sx={{ fontSize: 28, color: OFF_WHITE.glyph }} />
        )}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", lineHeight: 1.3 }}>{item.name}</Typography>
        <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", fontFamily: MONO_FONT, mt: 0.25 }}>
          {(item.tag ?? "Item").toUpperCase()}
          {isPreorder
            ? ` · ${item.depositPercent ?? 30}% now ${PESO.format(dueNow)} · balance ${PESO.format(balance)}`
            : ` · ${PESO.format(item.price)}`}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Box sx={{ width: 128 }}>
            <QtyStepper
              value={item.quantity}
              onChange={(nextQty) => onQuantityChange(item.id, nextQty, { maxQuantity: maxQty })}
              max={maxQty}
              min={1}
              clearAtZero
              size="small"
            />
          </Box>
          <IconButton size="small" color="error" aria-label="Remove from cart" onClick={() => onRemove(item.id)}>
            <TrashIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Box>

      <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", flexShrink: 0 }}>
        {PESO.format(isPreorder ? dueNow : item.price * item.quantity)}
      </Typography>
    </Stack>
  );
}

export default function CartDrawer({ open, onClose, surfaceBorderColor, isDarkMode }) {
  const navigate = useNavigate();
  const { getProduct } = useInventory();
  const { items, itemCount, subtotal, balanceDue, hasPreorder, setQuantity, removeItem, clearCart, addPulse } = useCart();
  const [showAdded, setShowAdded] = useState(false);
  const cartAvailabilityError = useMemo(
    () => formatCartAvailabilityError(validateCartAgainstCatalog(items, getProduct)),
    [items, getProduct],
  );

  useEffect(() => {
    if (!addPulse || !open) return undefined;
    setShowAdded(true);
    const timer = window.setTimeout(() => setShowAdded(false), 1400);
    return () => window.clearTimeout(timer);
  }, [addPulse, open]);

  function goToCheckout() {
    if (cartAvailabilityError) return;
    onClose();
    navigate("/checkout");
  }

  function continueShopping() {
    onClose();
    navigate("/products");
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 420 },
          bgcolor: "background.default",
          borderLeft: "1px solid",
          borderColor: surfaceBorderColor,
        },
      }}
    >
      <Stack sx={{ height: "100%" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: surfaceBorderColor, position: "relative" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Your cart</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
              {itemCount === 0 ? "No items yet" : `${itemCount} item${itemCount === 1 ? "" : "s"}`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close cart">
            <CloseIcon />
          </IconButton>
          {showAdded ? (
            <Typography
              sx={{
                position: "absolute",
                left: 20,
                right: 56,
                bottom: 4,
                fontFamily: MONO_FONT,
                fontSize: "0.68rem",
                fontWeight: 800,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: "success.main",
                pointerEvents: "none",
                animation: `${addedFlash} 1.35s ease forwards`,
              }}
            >
              Added to cart
            </Typography>
          ) : null}
        </Stack>

        <Box sx={{ flexGrow: 1, overflow: "auto", px: 2.5, py: 2 }}>
          {items.length === 0 ? (
            <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 8, textAlign: "center", color: "text.secondary" }}>
              <Typography>Your cart is empty.</Typography>
              <Button variant="outlined" onClick={continueShopping}>Continue shopping</Button>
            </Stack>
          ) : (
            <Stack spacing={2.5} divider={<Divider flexItem />}>
              {items.map((item) => (
                <CartLineItem
                  key={item.id}
                  item={item}
                  surfaceBorderColor={surfaceBorderColor}
                  isDarkMode={isDarkMode}
                  onQuantityChange={setQuantity}
                  onRemove={removeItem}
                />
              ))}
            </Stack>
          )}
        </Box>

        {items.length > 0 ? (
          <Box sx={{ px: 2.5, py: 2.5, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 2 }}>
              <Typography sx={{ color: "text.secondary" }}>{hasPreorder ? "Due now (deposit)" : "Subtotal"}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>{PESO.format(subtotal)}</Typography>
            </Stack>
            {hasPreorder && balanceDue > 0 ? (
              <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mb: 2, fontFamily: MONO_FONT }}>
                Balance due before release: {PESO.format(balanceDue)}
              </Typography>
            ) : null}
            {cartAvailabilityError ? (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                {cartAvailabilityError}
              </Alert>
            ) : null}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={goToCheckout}
              disabled={Boolean(cartAvailabilityError)}
              sx={{
                mb: 1,
                fontFamily: MONO_FONT,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Checkout
            </Button>
            <Button fullWidth variant="text" color="inherit" onClick={clearCart} sx={{ color: "text.secondary" }}>
              Clear cart
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Drawer>
  );
}
