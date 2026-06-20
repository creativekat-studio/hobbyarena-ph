import { useEffect, useRef, useState } from "react";
import { Box, Button, Chip, IconButton, Rating, Stack, Tooltip, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { useWishlist } from "../lib/wishlistStore.jsx";
import { CardIcon, HeartIcon, PokeballIcon } from "./icons.jsx";

export const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export default function ProductCard({ product, panelSx, isDarkMode }) {
  const theme = useTheme();
  const { isCustomer } = useAuth();
  const { addItem } = useCart();
  const { canWishlist, isWishlisted, toggle } = useWishlist();
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(() => isWishlisted(product.id));
  const resetTimer = useRef(null);
  const accent = product.accent || theme.palette.primary.main;
  const isPokemon = product.line.startsWith("Pokémon");
  const Glyph = isPokemon ? PokeballIcon : CardIcon;
  const isPreorder = product.tag === "Pre-order";
  const soldOut = !isPreorder && product.stock <= 0;

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
    if (soldOut) return;
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
          borderColor: alpha(accent, 0.55),
          boxShadow: isDarkMode
            ? `0 28px 60px rgba(0,0,0,0.55), 0 0 26px ${alpha(accent, 0.4)}`
            : `0 26px 54px ${alpha(accent, 0.22)}`,
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          aspectRatio: "4 / 3",
          background: `linear-gradient(150deg, ${alpha(accent, 0.95)} 0%, ${alpha(accent, 0.4)} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 30% 18%, rgba(255,255,255,0.45) 0%, transparent 55%)",
          },
        }}
      >
        <Glyph sx={{ fontSize: 66, color: "rgba(255,255,255,0.92)", position: "relative", zIndex: 1 }} />
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
                color: wishlisted ? "#f43f5e" : "#fff",
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
            color: "#fff",
            fontFamily: MONO_FONT,
            fontSize: "0.6rem",
            letterSpacing: 1,
            backdropFilter: "blur(4px)",
          }}
        />
        {soldOut ? (
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
            <Typography sx={{ color: "#fff", fontFamily: MONO_FONT, fontWeight: 700, letterSpacing: 1 }}>
              OUT OF STOCK
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Stack spacing={1} sx={{ p: 2, flexGrow: 1 }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", color: accent, letterSpacing: 1, fontWeight: 700 }}>
          {product.line.toUpperCase()}
        </Typography>
        <Typography sx={{ fontWeight: 700, lineHeight: 1.25, flexGrow: 1, fontSize: "0.95rem" }}>
          {product.name}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Rating value={product.rating} precision={0.1} size="small" readOnly />
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
            ({product.reviews})
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between">
          <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: "primary.main" }}>
            {PESO.format(product.price)}
          </Typography>
          {!isPreorder ? (
            <Typography sx={{ fontSize: "0.7rem", color: soldOut ? "error.main" : "success.main", fontWeight: 700, fontFamily: MONO_FONT }}>
              {soldOut ? "0 LEFT" : `${product.stock} LEFT`}
            </Typography>
          ) : (
            <Typography sx={{ fontSize: "0.7rem", color: "warning.main", fontWeight: 700, fontFamily: MONO_FONT }}>
              PRE-ORDER
            </Typography>
          )}
        </Stack>
        <Button
          variant={soldOut ? "outlined" : added ? "outlined" : "contained"}
          color={added ? "success" : "primary"}
          disabled={soldOut}
          onClick={handleAction}
          sx={{ mt: 0.5 }}
        >
          {buttonLabel}
        </Button>
      </Stack>
    </Box>
  );
}
