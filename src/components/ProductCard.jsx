import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ProductRating from "./ProductRating.jsx";
import PreorderCountdown from "./PreorderCountdown.jsx";
import PreorderPricing from "./PreorderPricing.jsx";
import QtyStepper from "./QtyStepper.jsx";
import { MONO_FONT } from "../theme.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { getSurfaces } from "../lib/surfaces.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { useWishlist } from "../lib/wishlistStore.jsx";
import PreorderTermsDialog from "./PreorderTermsDialog.jsx";
import { CardIcon, HeartIcon, PokeballIcon } from "./icons.jsx";
import { OFF_WHITE } from "../lib/colors.js";
import { productMediaSurface } from "../lib/surfaces.js";
import { getCountdownParts } from "../lib/preorder.js";

export const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function resolveProductAccent(product, theme) {
  if (theme.ha?.proposalId === 2) {
    if (product.line?.startsWith("Pokémon")) return theme.palette.secondary.main;
    if (product.line?.startsWith("One Piece")) return theme.ha?.brand?.accentRose ?? theme.palette.error.main;
    return theme.palette.primary.main;
  }
  return product.accent || theme.palette.primary.main;
}

export default function ProductCard({ product, panelSx, isDarkMode }) {
  const theme = useTheme();
  const { mode } = useColorMode();
  const { surfaceBorderColor } = getSurfaces(theme, mode === "dark");
  const { isCustomer } = useAuth();
  const { addItem, setQuantity, items } = useCart();
  const { canWishlist, isWishlisted, toggle } = useWishlist();
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(() => isWishlisted(product.id));
  const [termsOpen, setTermsOpen] = useState(false);
  const resetTimer = useRef(null);
  const cartItem = items.find((item) => item.id === product.id);
  const inCart = Boolean(cartItem);
  const accent = resolveProductAccent(product, theme);
  const hoverAccent = theme.palette.secondary.main;
  const isPokemon = product.line?.startsWith("Pokémon");
  const Glyph = isPokemon ? PokeballIcon : CardIcon;
  const isPreorder = product.tag === "Pre-order";
  const soldOut = !isPreorder && product.stock <= 0;
  const preorderClosed = isPreorder && getCountdownParts(product.preorderEndsAt)?.expired;
  const maxQty = isPreorder ? 99 : Math.max(product.stock, 0);

  let actionLabel = "Add to cart";
  if (isPreorder) actionLabel = "Pre-order";
  else if (soldOut) actionLabel = "Out of stock";

  useEffect(() => {
    setWishlisted(isWishlisted(product.id));
  }, [isWishlisted, product.id]);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  function handleWishlist(event) {
    event.stopPropagation();
    if (!canWishlist) return;
    toggle(product);
    setWishlisted((prev) => !prev);
  }

  function addToCart() {
    const ok = addItem(product, 1);
    if (!ok) return;
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 1500);
  }

  function handleAction(event) {
    event.stopPropagation();
    if (soldOut || preorderClosed || inCart) return;
    if (isPreorder) {
      setTermsOpen(true);
      return;
    }
    addToCart();
  }

  function handlePreorderConfirm() {
    addToCart();
    setTermsOpen(false);
  }

  function handleQtyChange(nextQty) {
    setQuantity(product.id, nextQty);
  }

  let buttonLabel = actionLabel;
  if (added) buttonLabel = "Added ✓";
  if (preorderClosed) buttonLabel = "Closed";

  let overlayLabel = null;
  if (preorderClosed) overlayLabel = "Closed";
  else if (soldOut) overlayLabel = "Out of Stock";

  return (
    <Box sx={{ ...panelSx, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", transition: "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease", "&:hover": { transform: { md: "translateY(-6px)" }, borderColor: alpha(hoverAccent, 0.55) } }}>
      <Box component={RouterLink} to={`/shop/${product.id}`} sx={{ ...productMediaSurface(isDarkMode), aspectRatio: "4 / 3", display: "block", textDecoration: "none", color: "inherit" }}>
        {product.image ? (
          <Box component="img" src={product.image} alt={product.name} loading="lazy" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 1 }} />
        ) : (
          <Glyph sx={{ fontSize: 66, color: OFF_WHITE.glyph, position: "relative", zIndex: 1 }} />
        )}
        {isCustomer && canWishlist ? (
          <Tooltip title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
            <IconButton size="small" onClick={handleWishlist} sx={{ position: "absolute", top: 8, right: 8, zIndex: 3, bgcolor: "rgba(0,0,0,0.45)", color: wishlisted ? theme.palette.error.main : OFF_WHITE.textBright }}>
              <HeartIcon sx={{ fontSize: 18, fill: wishlisted ? "currentColor" : "none" }} />
            </IconButton>
          </Tooltip>
        ) : null}
        <Chip label={product.tag} size="small" sx={{ position: "absolute", top: 10, left: 10, bgcolor: "rgba(0,0,0,0.5)", color: OFF_WHITE.textBright, fontFamily: MONO_FONT, fontSize: "0.6rem", letterSpacing: 1 }} />
        {overlayLabel ? (
          <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
            <Typography sx={{ color: OFF_WHITE.textBright, fontFamily: MONO_FONT, fontWeight: 700, letterSpacing: 1 }}>{overlayLabel.toUpperCase()}</Typography>
          </Box>
        ) : null}
      </Box>

      <Stack spacing={1} sx={{ p: 2, flexGrow: 1 }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", color: accent, letterSpacing: 1, fontWeight: 700 }}>{product.line?.toUpperCase()}</Typography>
        <Typography component={RouterLink} to={`/shop/${product.id}`} sx={{ fontWeight: 700, lineHeight: 1.25, flexGrow: 1, fontSize: "0.95rem", color: "inherit", textDecoration: "none", "&:hover": { color: "primary.main" } }}>{product.name}</Typography>
        <ProductRating product={product} />
        {isPreorder && product.preorderEndsAt ? <PreorderCountdown endsAt={product.preorderEndsAt} compact /> : null}
        {isPreorder ? (
          <PreorderPricing product={product} compact />
        ) : (
          <Stack direction="row" alignItems="baseline" justifyContent="space-between">
            <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "primary.main" }}>{PESO.format(product.price)}</Typography>
            <Typography sx={{ fontSize: "0.7rem", color: soldOut ? "error.main" : "success.main", fontWeight: 700, fontFamily: MONO_FONT }}>{soldOut ? "Out of Stock" : `${product.stock} left`}</Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={1} alignItems="center">
          {inCart && !soldOut && !preorderClosed ? (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <QtyStepper value={cartItem.quantity} onChange={handleQtyChange} max={maxQty} size="small" />
            </Box>
          ) : (
            <Button variant={soldOut || preorderClosed ? "outlined" : added ? "outlined" : "contained"} color={added ? "success" : "primary"} disabled={soldOut || preorderClosed} onClick={handleAction} sx={{ flex: 1, mt: 0.5 }}>{buttonLabel}</Button>
          )}
        </Stack>
      </Stack>

      {isPreorder ? (
        <PreorderTermsDialog
          open={termsOpen}
          onClose={() => setTermsOpen(false)}
          onConfirm={handlePreorderConfirm}
          productName={product.name}
          panelSx={panelSx}
          surfaceBorderColor={surfaceBorderColor}
        />
      ) : null}
    </Box>
  );
}
