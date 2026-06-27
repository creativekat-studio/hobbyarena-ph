import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ProductRating from "./ProductRating.jsx";
import PreorderCountdown from "./PreorderCountdown.jsx";
import PreorderPricing from "./PreorderPricing.jsx";
import { MONO_FONT } from "../theme.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { useWishlist } from "../lib/wishlistStore.jsx";
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
    if (product.line.startsWith("Pokémon")) return theme.palette.secondary.main;
    if (product.line.startsWith("One Piece")) return theme.ha?.brand?.accentRose ?? theme.palette.error.main;
    return theme.palette.primary.main;
  }
  return product.accent || theme.palette.primary.main;
}

export default function ProductCard({ product, panelSx, isDarkMode }) {
  const theme = useTheme();
  const { isCustomer } = useAuth();
  const { addItem } = useCart();
  const { canWishlist, isWishlisted, toggle } = useWishlist();
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(() => isWishlisted(product.id));
  const resetTimer = useRef(null);
  const accent = resolveProductAccent(product, theme);
  const hoverAccent = theme.palette.secondary.main;
  const isPokemon = product.line.startsWith("Pokémon");
  const Glyph = isPokemon ? PokeballIcon : CardIcon;
  const isPreorder = product.tag === "Pre-order";
  const soldOut = !isPreorder && product.stock <= 0;
  const preorderClosed = isPreorder && getCountdownParts(product.preorderEndsAt)?.expired;

  let actionLabel = "Add to cart";
  if (isPreorder) actionLabel = "Pre-order";
  else if (soldOut) actionLabel = "Notify me";

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

  function handleAction() {
    if (soldOut || preorderClosed) return;
    const ok = addItem(product);
    if (!ok) return;
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 1500);
  }

  let buttonLabel = actionLabel;
  if (added) buttonLabel = "Added ✓";

  return (
    <Box
      sx={{
        ...panelSx,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease",
        "&:hover": {
          transform: { md: "translateY(-6px)" },
          borderColor: alpha(hoverAccent, 0.55),
          boxShadow: isDarkMode
            ? `0 28px 60px rgba(0,0,0,0.55), 0 0 26px ${alpha(hoverAccent, 0.4)}`
            : `0 26px 54px ${alpha(hoverAccent, 0.22)}`,
        },
      }}
    >
      <Box
        component={RouterLink}
        to={`/shop/${product.id}`}
        sx={{
          ...productMediaSurface(isDarkMode),
          aspectRatio: "4 / 3",
          display: "block",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        {product.image ? (
          <Box
            component="img"
            src={product.image}
            alt={product.name}
            loading="lazy"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
            }}
          />
        ) : (
          <Glyph sx={{ fontSize: 66, color: OFF_WHITE.glyph, position: "relative", zIndex: 1 }} />
        )}
        {isCustomer && canWishlist ? (
          <Tooltip title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
            <IconButton
              size="small"
              onClick={handleWishlist}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 3,
                bgcolor: "rgba(0,0,0,0.45)",
                color: wishlisted ? theme.palette.error.main : OFF_WHITE.textBright,
                backdropFilter: "blur(4px)",
                "&:hover": { bgcolor: "rgba(0,0,0,0.6)" },
              }}
            >
              <HeartIcon sx={{ fontSize: 18, fill: wishlisted ? "currentColor" : "none" }} />
            </IconButton>
          </Tooltip>
        ) : null}
        <Chip
          label={product.tag}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            bgcolor: "rgba(0,0,0,0.5)",
            color: OFF_WHITE.textBright,
            fontFamily: MONO_FONT,
            fontSize: "0.6rem",
            letterSpacing: 1,
            backdropFilter: "blur(4px)",
          }}
        />
        {soldOut || preorderClosed ? (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
            }}
          >
            <Typography sx={{ color: OFF_WHITE.textBright, fontFamily: MONO_FONT, fontWeight: 700, letterSpacing: 1 }}>
              {preorderClosed ? "PRE-ORDER CLOSED" : "OUT OF STOCK"}
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Stack spacing={1} sx={{ p: 2, flexGrow: 1 }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", color: accent, letterSpacing: 1, fontWeight: 700 }}>
          {product.line.toUpperCase()}
        </Typography>
        <Typography
          component={RouterLink}
          to={`/shop/${product.id}`}
          sx={{
            fontWeight: 700,
            lineHeight: 1.25,
            flexGrow: 1,
            fontSize: "0.95rem",
            color: "inherit",
            textDecoration: "none",
            "&:hover": { color: "primary.main" },
          }}
        >
          {product.name}
        </Typography>
        <ProductRating product={product} />
        {isPreorder && product.preorderEndsAt ? (
          <PreorderCountdown endsAt={product.preorderEndsAt} compact />
        ) : null}
        {isPreorder ? (
          <PreorderPricing product={product} compact />
        ) : (
          <Stack direction="row" alignItems="baseline" justifyContent="space-between">
            <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "primary.main" }}>
              {PESO.format(product.price)}
            </Typography>
            <Typography sx={{ fontSize: "0.7rem", color: soldOut ? "error.main" : "success.main", fontWeight: 700, fontFamily: MONO_FONT }}>
              {soldOut ? "0 LEFT" : `${product.stock} LEFT`}
            </Typography>
          </Stack>
        )}
        <Button
          variant={soldOut || preorderClosed ? "outlined" : added ? "outlined" : "contained"}
          color={added ? "success" : "primary"}
          disabled={soldOut || preorderClosed}
          onClick={(event) => {
            event.stopPropagation();
            handleAction();
          }}
          sx={{ mt: 0.5 }}
        >
          {buttonLabel}
        </Button>
      </Stack>
    </Box>
  );
}
