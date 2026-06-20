import {
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { CardIcon, PokeballIcon } from "../components/icons.jsx";
import { PESO } from "../components/ProductCard.jsx";
import { OFF_WHITE } from "../lib/colors.js";
import { useCart } from "../lib/cartStore.jsx";

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
    </svg>
  );
}

function CartLineItem({ item, onQuantityChange, onRemove, surfaceBorderColor }) {
  const theme = useTheme();
  const accent = item.accent || theme.palette.primary.main;
  const Glyph = item.line.startsWith("Pokémon") ? PokeballIcon : CardIcon;

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
          overflow: "hidden",
          background: item.image
            ? alpha(theme.palette.background.default, 0.4)
            : `linear-gradient(150deg, ${alpha(accent, 0.95)} 0%, ${alpha(accent, 0.4)} 100%)`,
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
          {item.tag.toUpperCase()} · {PESO.format(item.price)}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
          <Stack direction="row" alignItems="center" sx={{ border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
            <IconButton size="small" onClick={() => onQuantityChange(item.id, item.quantity - 1)} aria-label="Decrease quantity">−</IconButton>
            <Typography sx={{ minWidth: 24, textAlign: "center", fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.85rem" }}>
              {item.quantity}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              disabled={item.quantity >= item.maxQuantity}
              aria-label="Increase quantity"
            >
              +
            </IconButton>
          </Stack>
          <Button size="small" color="error" onClick={() => onRemove(item.id)} sx={{ minWidth: 0, px: 1 }}>
            Remove
          </Button>
        </Stack>
      </Box>

      <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", flexShrink: 0 }}>
        {PESO.format(item.price * item.quantity)}
      </Typography>
    </Stack>
  );
}

export default function CartDrawer({ open, onClose, surfaceBorderColor }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { items, itemCount, subtotal, setQuantity, removeItem, clearCart } = useCart();

  function goToCheckout() {
    onClose();
    navigate("/checkout");
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Your cart</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
              {itemCount === 0 ? "No items yet" : `${itemCount} item${itemCount === 1 ? "" : "s"}`}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close cart">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ flexGrow: 1, overflow: "auto", px: 2.5, py: 2 }}>
          {items.length === 0 ? (
            <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 8, textAlign: "center", color: "text.secondary" }}>
              <Typography>Your cart is empty.</Typography>
              <Button variant="outlined" onClick={onClose}>Continue shopping</Button>
            </Stack>
          ) : (
            <Stack spacing={2.5} divider={<Divider flexItem />}>
              {items.map((item) => (
                <CartLineItem
                  key={item.id}
                  item={item}
                  surfaceBorderColor={surfaceBorderColor}
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
              <Typography sx={{ color: "text.secondary" }}>Subtotal</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>{PESO.format(subtotal)}</Typography>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={goToCheckout}
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
