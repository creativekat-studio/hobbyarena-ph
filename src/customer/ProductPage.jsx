import { useEffect, useRef, useState } from "react";
import {
  Box,
  Breadcrumbs,
  Button,
  Container,
  Grid,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ProductRating from "../components/ProductRating.jsx";
import { useTheme } from "@mui/material/styles";
import { Link as RouterLink, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { OFF_WHITE } from "../lib/colors.js";
import { productMediaSurface } from "../lib/surfaces.js";
import { productCategoryLabel, productCategoryPath, productNeighbors } from "../lib/products.js";
import { useInventory } from "../lib/inventoryStore.jsx";
import { resolveProductAccent } from "../components/ProductCard.jsx";
import PreorderCountdown from "../components/PreorderCountdown.jsx";
import PreorderPricing from "../components/PreorderPricing.jsx";
import { CardIcon, HeartIcon, PokeballIcon } from "../components/icons.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { useWishlist } from "../lib/wishlistStore.jsx";
import { getCountdownParts, getDepositPercent } from "../lib/preorder.js";

export const PESO_DETAIL = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ProductImage({ product, isDarkMode }) {
  const isPokemon = product.line.startsWith("Pokémon");
  const Glyph = isPokemon ? PokeballIcon : CardIcon;

  return (
    <Box
      sx={{
        ...productMediaSurface(isDarkMode),
        p: { xs: 2, md: 3 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: { xs: 280, md: 380 },
      }}
    >
      {product.image ? (
        <Box
          component="img"
          src={product.image}
          alt={product.name}
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxHeight: { xs: 320, md: 460 },
            objectFit: "contain",
            filter: "drop-shadow(0 16px 32px rgba(0,0,0,0.25))",
          }}
        />
      ) : (
        <Glyph sx={{ fontSize: 120, color: OFF_WHITE.glyph, position: "relative", zIndex: 1 }} />
      )}
    </Box>
  );
}

export default function ProductPage() {
  const { productId } = useParams();
  const theme = useTheme();
  const navigate = useNavigate();
  const { surfaces, isDarkMode } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { isCustomer } = useAuth();
  const { addItem } = useCart();
  const { canWishlist, isWishlisted, toggle } = useWishlist();
  const { isPublished, getProduct, publishedCatalog } = useInventory();
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const resetTimer = useRef(null);

  const product = getProduct(productId);
  const { prev, next } = productNeighbors(productId, publishedCatalog);
  const accent = product ? resolveProductAccent(product, theme) : theme.palette.primary.main;
  const isPreorder = product?.tag === "Pre-order";
  const soldOut = product && !isPreorder && product.stock <= 0;
  const preorderClosed = isPreorder && getCountdownParts(product?.preorderEndsAt)?.expired;

  useEffect(() => {
    if (product) setWishlisted(isWishlisted(product.id));
  }, [isWishlisted, product]);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [productId]);

  if (!product || !isPublished(productId)) {
    return <Navigate to="/shop" replace />;
  }

  let actionLabel = "Add to cart";
  if (isPreorder) actionLabel = "Pre-order";
  else if (soldOut) actionLabel = "Out of stock";

  function handleAdd() {
    if (soldOut || preorderClosed) return;
    const ok = addItem(product);
    if (!ok) return;
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 1500);
  }

  function handleWishlist() {
    if (!canWishlist) return;
    toggle(product);
    setWishlisted((value) => !value);
  }

  const buttonLabel = added ? "Added ✓" : actionLabel;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
          <Breadcrumbs sx={{ fontSize: "0.82rem" }}>
            <Link component={RouterLink} to="/" underline="hover" color="inherit">Home</Link>
            <Link component={RouterLink} to={productCategoryPath(product)} underline="hover" color="inherit">
              {productCategoryLabel(product)}
            </Link>
            <Typography color="text.primary" sx={{ fontSize: "inherit", maxWidth: { xs: 220, sm: 360, md: 520 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {product.name}
            </Typography>
          </Breadcrumbs>

          <Stack direction="row" spacing={1.5} alignItems="center">
            {prev ? (
              <Button size="small" color="inherit" onClick={() => navigate(`/shop/${prev.id}`)} sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.5 }}>
                ‹ Prev
              </Button>
            ) : null}
            {next ? (
              <Button size="small" color="inherit" onClick={() => navigate(`/shop/${next.id}`)} sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.5 }}>
                Next ›
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ ...panelSx, overflow: "hidden" }}>
              <ProductImage product={product} isDarkMode={isDarkMode} />
              <ProductDescription
                sections={product.descriptionSections}
                surfaceBorderColor={surfaceBorderColor}
                embedded
              />
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2.5} sx={{ pt: { md: 0.5 } }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.7rem", color: accent, letterSpacing: 1.2, fontWeight: 800 }}>
                {product.line.toUpperCase()}
              </Typography>

              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15, fontSize: { xs: "1.45rem", md: "1.85rem" } }}>
                {product.name}
              </Typography>

              <ProductRating product={product} size="small" />

              {isPreorder && product.preorderEndsAt ? (
                <PreorderCountdown endsAt={product.preorderEndsAt} />
              ) : null}

              {isPreorder ? (
                <PreorderPricing product={product} pesoFormatter={PESO_DETAIL} />
              ) : (
                <>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.75rem", md: "2rem" }, color: "primary.main" }}>
                    {PESO_DETAIL.format(product.price)}
                  </Typography>
                  <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", fontWeight: 700, color: soldOut ? "error.main" : "success.main", letterSpacing: 0.5 }}>
                    {soldOut ? "OUT OF STOCK" : `${product.stock} IN STOCK`}
                  </Typography>
                </>
              )}

              {isPreorder ? (
                <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", fontWeight: 700, color: preorderClosed ? "error.main" : "warning.main", letterSpacing: 0.5 }}>
                  {preorderClosed ? "PRE-ORDER WINDOW CLOSED" : `${getDepositPercent(product)}% DEPOSIT DUE AT CHECKOUT — BALANCE BEFORE RELEASE`}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pt: 0.5 }}>
                <Button
                  variant={soldOut || preorderClosed ? "outlined" : added ? "outlined" : "contained"}
                  color={added ? "success" : "primary"}
                  disabled={soldOut || preorderClosed}
                  onClick={handleAdd}
                  size="large"
                  sx={{ flex: 1, py: 1.35, fontFamily: MONO_FONT, letterSpacing: 0.8, textTransform: "uppercase" }}
                >
                  {buttonLabel}
                </Button>
                {isCustomer && canWishlist ? (
                  <Tooltip title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                    <IconButton
                      onClick={handleWishlist}
                      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      sx={{
                        width: 52,
                        height: 52,
                        border: "1px solid",
                        borderColor: wishlisted ? theme.palette.error.main : surfaceBorderColor,
                        color: wishlisted ? theme.palette.error.main : "text.secondary",
                        "&:hover": { borderColor: theme.palette.error.main, color: theme.palette.error.main },
                      }}
                    >
                      <HeartIcon sx={{ fontSize: 22, fill: wishlisted ? "currentColor" : "none" }} />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
