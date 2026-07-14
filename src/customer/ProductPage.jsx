import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  IconButton,
  Link,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ProductRating from "../components/ProductRating.jsx";
import { useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { Link as RouterLink, Navigate, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { MONO_FONT, getBrand } from "../theme.js";
import { OFF_WHITE } from "../lib/colors.js";
import { productMediaSurface } from "../lib/surfaces.js";
import { productCategoryLabel, productCategoryPath } from "../lib/products.js";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useStockHolds } from "../lib/stockHoldStore.jsx";
import { PESO } from "../components/ProductCard.jsx";
import ProductDescription from "../components/ProductDescription.jsx";
import PreorderCountdown from "../components/PreorderCountdown.jsx";
import PreorderPricing from "../components/PreorderPricing.jsx";
import ProductTermsSection from "../components/ProductTermsSection.jsx";
import QtyStepper from "../components/QtyStepper.jsx";
import { CardIcon, HeartIcon, PokeballIcon } from "../components/icons.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { useWishlist } from "../lib/wishlistStore.jsx";
import { getCountdownParts, getDepositPercent } from "../lib/preorder.js";

const stockDot = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.55); }
  50% { opacity: 0.85; transform: scale(1.08); box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
`;

export const PESO_DETAIL = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function ProductImage({ product, isDarkMode }) {
  const isPokemon = product.line?.startsWith("Pokémon");
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
        <Box component="img" src={product.image} alt={product.name} decoding="async" fetchpriority="high" sx={{ position: "relative", zIndex: 1, width: "100%", maxHeight: { xs: 320, md: 460 }, objectFit: "contain" }} />
      ) : (
        <Glyph sx={{ fontSize: 120, color: OFF_WHITE.glyph, position: "relative", zIndex: 1 }} />
      )}
    </Box>
  );
}

export default function ProductPage() {
  const { productId } = useParams();
  const theme = useTheme();
  const brand = getBrand(theme);
  const navigate = useNavigate();
  const { surfaces, isDarkMode } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { isCustomer } = useAuth();
  const { addItem, setQuantity, items } = useCart();
  const { canWishlist, isWishlisted, toggle } = useWishlist();
  const { isPublished, getProduct } = useInventory();
  const { availableStock } = useStockHolds();
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAlert, setTermsAlert] = useState(false);
  const resetTimer = useRef(null);

  const product = getProduct(productId);
  const cartItem = product ? items.find((item) => item.id === product.id) : null;
  const inCart = Boolean(cartItem);
  const isPreorder = product?.tag === "Pre-order";
  // Subtract stock other shoppers are actively holding so racers see it as unavailable.
  const effectiveStock = product && !isPreorder ? availableStock(product.id, product.stock) : (product?.stock ?? 0);
  const soldOut = product && !isPreorder && effectiveStock <= 0;
  const preorderClosed = isPreorder && getCountdownParts(product?.preorderEndsAt)?.expired;
  const maxQty = isPreorder ? 99 : Math.max(effectiveStock, 0);

  useEffect(() => {
    if (product) setWishlisted(isWishlisted(product.id));
  }, [isWishlisted, product]);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTermsAccepted(false);
    setTermsAlert(false);
  }, [productId]);

  useEffect(() => {
    if (!product || !cartItem || soldOut || maxQty <= 0) return;
    if (cartItem.quantity > maxQty) {
      setQuantity(product.id, maxQty, { maxQuantity: maxQty });
    } else if (cartItem.maxQuantity !== maxQty) {
      setQuantity(product.id, cartItem.quantity, { maxQuantity: maxQty });
    }
  }, [cartItem, maxQty, product, setQuantity, soldOut]);

  if (!product || !isPublished(productId)) {
    return <Navigate to="/products" replace />;
  }

  let actionLabel = "Add to cart";
  if (isPreorder) actionLabel = "Pre-order";
  else if (soldOut) actionLabel = "Out of stock";

  function addToCart(qty = 1) {
    const nextQty = Math.min(Math.max(Number(qty) || 1, 1), Math.max(maxQty, 1));
    if (soldOut || maxQty < 1) return;
    if (isPreorder && !termsAccepted) {
      setTermsAlert(true);
      return;
    }
    setTermsAlert(false);
    const ok = addItem(product, nextQty, { maxQuantity: maxQty });
    if (!ok) return;
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 1500);
  }

  function handleAdd() {
    if (soldOut || preorderClosed) return;
    addToCart(1);
  }

  function handleQtyChange(nextQty) {
    setQuantity(product.id, nextQty, { maxQuantity: maxQty });
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
        <Box>
          <Button
            component={RouterLink}
            to={productCategoryPath(product)}
            variant="text"
            color="inherit"
            sx={{
              mb: 1,
              px: 0,
              minWidth: 0,
              justifyContent: "flex-start",
              color: "text.secondary",
              fontFamily: MONO_FONT,
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: 0.3,
              textDecoration: "none",
              "&:hover": {
                bgcolor: "transparent",
                color: "text.primary",
                textDecoration: "none",
              },
            }}
          >
            ← Back to {isPreorder ? "pre-orders" : "products"}
          </Button>
          <Breadcrumbs
            separator="›"
            sx={{
              fontSize: "0.82rem",
              fontFamily: MONO_FONT,
              "& .MuiBreadcrumbs-separator": { color: "text.secondary", mx: 0.5 },
              "& a": { color: "text.secondary", fontWeight: 700, letterSpacing: 0.3 },
              "& a:hover": { color: "primary.main" },
            }}
          >
            <Link component={RouterLink} to="/" underline="hover" color="inherit">Home</Link>
            <Link component={RouterLink} to={productCategoryPath(product)} underline="hover" color="inherit">{productCategoryLabel(product)}</Link>
            <Typography
              sx={{
                fontSize: "inherit",
                fontFamily: MONO_FONT,
                fontWeight: 800,
                color: "primary.main",
                letterSpacing: 0.3,
                maxWidth: { xs: 220, sm: 360, md: 520 },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {product.name}
            </Typography>
          </Breadcrumbs>
        </Box>

        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="stretch">
          <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex" }}>
            <Box
              sx={{
                ...panelSx,
                overflow: "hidden",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ProductImage product={product} isDarkMode={isDarkMode} />
              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <ProductDescription sections={product.descriptionSections} surfaceBorderColor={surfaceBorderColor} embedded />
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex" }}>
            <Stack spacing={2.5} sx={{ width: "100%", height: "100%", pt: { md: 0.5 } }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.7rem", color: "primary.main", letterSpacing: 1.2, fontWeight: 800 }}>{product.line?.toUpperCase()}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15, fontSize: { xs: "1.45rem", md: "1.85rem" } }}>{product.name}</Typography>
              <ProductRating product={product} size="small" />

              {isPreorder && product.preorderEndsAt ? <PreorderCountdown endsAt={product.preorderEndsAt} wrapLabel={false} tone="dark" /> : null}

              {isPreorder ? (
                <PreorderPricing product={product} pesoFormatter={PESO_DETAIL} />
              ) : (
                <>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.75rem", md: "2rem" }, color: "primary.main" }}>{PESO_DETAIL.format(product.price)}</Typography>
                  {soldOut ? (
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", fontWeight: 700, color: "error.main", letterSpacing: 0.5 }}>
                      OUT OF STOCK
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: brand.liveDot ?? "success.main",
                          flexShrink: 0,
                          animation: `${stockDot} 1.6s ease-in-out infinite`,
                        }}
                      />
                      <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.78rem", fontWeight: 700, color: "text.secondary", letterSpacing: 1.2, lineHeight: 1 }}>
                        IN STOCK
                      </Typography>
                    </Stack>
                  )}
                </>
              )}

              {isPreorder ? (
                <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", fontWeight: 700, color: preorderClosed ? "error.main" : "warning.main", letterSpacing: 0.5 }}>
                  {preorderClosed ? "CLOSED" : `${getDepositPercent(product)}% deposit due at checkout — balance before release`}
                </Typography>
              ) : null}

              <ProductTermsSection
                isPreorder={isPreorder}
                panelSx={panelSx}
                surfaceBorderColor={surfaceBorderColor}
                showAcceptance={isPreorder}
                accepted={termsAccepted}
                onAcceptChange={(value) => {
                  setTermsAccepted(value);
                  if (value) setTermsAlert(false);
                }}
              />

              {termsAlert ? <Alert severity="warning">Please read and accept the pre-order terms before continuing.</Alert> : null}

              <Stack spacing={1.5} sx={{ pt: 0.5 }}>
                {inCart && !soldOut && !preorderClosed ? (
                  <>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: { xs: 140, sm: 160 }, flexShrink: 0 }}>
                        <QtyStepper
                          value={cartItem.quantity}
                          onChange={handleQtyChange}
                          max={maxQty}
                          min={1}
                          clearAtZero
                        />
                      </Box>
                      {isCustomer && canWishlist ? (
                        <Tooltip title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                          <IconButton
                            onClick={handleWishlist}
                            sx={{
                              width: 52,
                              height: 52,
                              borderRadius: "8px !important",
                              border: "1px solid",
                              borderColor: wishlisted ? theme.palette.error.main : surfaceBorderColor,
                              color: wishlisted ? theme.palette.error.main : "text.secondary",
                            }}
                          >
                            <HeartIcon solid={wishlisted} sx={{ fontSize: 22 }} />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </Stack>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={() => navigate("/checkout")}
                      sx={{ py: 1.35, fontFamily: MONO_FONT, letterSpacing: 0.8, textTransform: "uppercase" }}
                    >
                      Continue to checkout
                    </Button>
                  </>
                ) : (
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                      variant={soldOut ? "outlined" : added ? "outlined" : "contained"}
                      color={added ? "success" : "primary"}
                      disabled={soldOut || (preorderClosed && isPreorder) || maxQty < 1}
                      onClick={handleAdd}
                      size="large"
                      sx={{ flex: 1, py: 1.35, fontFamily: MONO_FONT, letterSpacing: 0.8, textTransform: "uppercase" }}
                    >
                      {preorderClosed && isPreorder ? "Closed" : buttonLabel}
                    </Button>
                    {isCustomer && canWishlist ? (
                      <Tooltip title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                        <IconButton
                          onClick={handleWishlist}
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "8px !important",
                            border: "1px solid",
                            borderColor: wishlisted ? theme.palette.error.main : surfaceBorderColor,
                            color: wishlisted ? theme.palette.error.main : "text.secondary",
                          }}
                        >
                          <HeartIcon solid={wishlisted} sx={{ fontSize: 22 }} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
