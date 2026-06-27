import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { wider } from "../lib/layout.js";
import ProductCard from "../components/ProductCard.jsx";
import ShopFilters from "../components/ShopFilters.jsx";
import { BoxIcon, SparkleIcon } from "../components/icons.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";

const CATEGORIES = [
  { value: "all", label: "All Products" },
  { value: "sealed", label: "In-Stock Products" },
  { value: "preorder", label: "Pre-Orders" },
  { value: "accessories", label: "Card Accessories" },
];

const LINES = [
  { value: "all", label: "All lines" },
  { value: "pokemon", label: "Pokémon TCG", match: "Pokémon TCG" },
  { value: "one-piece", label: "One Piece CG", match: "One Piece Card Game" },
  { value: "gundam", label: "Gundam", match: "Gundam" },
];

const CATEGORY_COPY = {
  all: {
    overline: "Shop",
    title: "Browse the full catalog.",
    subtitle: "Sealed boxes, pre-orders, and grail drops — all in one place.",
    Icon: BoxIcon,
  },
  sealed: {
    overline: "Products",
    title: "Featured in-stock products.",
    subtitle: "Factory-fresh sealed boxes and collections ready to ship.",
    Icon: BoxIcon,
  },
  accessories: {
    overline: "Card accessories",
    title: "Sleeves, binders, and play essentials.",
    subtitle: "Everything you need to protect and show off your collection.",
    Icon: BoxIcon,
  },
  preorder: {
    overline: "Pre-Orders",
    title: "Featured pre-orders.",
    subtitle: "Lock your slot on incoming sets before they sell out.",
    Icon: SparkleIcon,
  },
};

function lineMatch(lineValue) {
  return LINES.find((line) => line.value === lineValue)?.match ?? null;
}

function CategoryChip({ label, selected, onClick, surfaceBorderColor }) {
  return (
    <Chip
      label={label}
      clickable
      onClick={onClick}
      variant={selected ? "filled" : "outlined"}
      sx={{
        fontFamily: MONO_FONT,
        fontWeight: 700,
        letterSpacing: 0.3,
        fontSize: "0.82rem",
        height: 36,
        ...(selected
          ? {
              bgcolor: "primary.main",
              color: "primary.contrastText",
              border: "1px solid",
              borderColor: "primary.main",
              "&:hover": { bgcolor: "primary.main" },
            }
          : {
              bgcolor: "background.paper",
              borderColor: surfaceBorderColor,
              color: "text.primary",
            }),
      }}
    />
  );
}

export default function ShopPage() {
  const { surfaces, isDarkMode } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { getPublishedByCategory } = useInventory();
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category") || "all";
  const line = searchParams.get("line") || "all";
  const activeCategory = CATEGORIES.some((item) => item.value === category) ? category : "all";
  const activeLine = LINES.some((item) => item.value === line) ? line : "all";

  const copy = CATEGORY_COPY[activeCategory] ?? CATEGORY_COPY.all;
  const HeaderIcon = copy.Icon;

  const categoryProducts = useMemo(() => {
    let list = getPublishedByCategory(activeCategory);
    const match = lineMatch(activeLine);
    if (match) {
      list = list.filter((product) => product.line === match);
    }
    return list;
  }, [activeCategory, activeLine, getPublishedByCategory]);

  const priceBounds = useMemo(() => {
    if (!categoryProducts.length) return [0, 10000];
    const prices = categoryProducts.map((product) => product.price);
    return [Math.min(...prices), Math.max(...prices)];
  }, [categoryProducts]);

  const [priceRange, setPriceRange] = useState(priceBounds);

  useEffect(() => {
    setPriceRange(priceBounds);
  }, [priceBounds[0], priceBounds[1]]);

  const products = useMemo(() => {
    return categoryProducts.filter(
      (product) => product.price >= priceRange[0] && product.price <= priceRange[1],
    );
  }, [categoryProducts, priceRange]);

  const hasActiveFilters =
    activeLine !== "all"
    || priceRange[0] > priceBounds[0]
    || priceRange[1] < priceBounds[1];

  function updateParams(next) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setPriceRange(priceBounds);
    updateParams({ line: "all" });
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Stack spacing={4}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <HeaderIcon sx={{ color: "primary.main" }} />
            <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>
              {copy.overline}
            </Typography>
          </Stack>
          <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: "1.85rem", md: "2.35rem" } }}>
            {copy.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: wider(560) }}>
            {copy.subtitle}
          </Typography>
        </Box>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
          spacing={{ xs: 1.5, sm: 2 }}
          useFlexGap
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
            {CATEGORIES.map((item) => (
              <CategoryChip
                key={item.value}
                label={item.label}
                selected={activeCategory === item.value}
                surfaceBorderColor={surfaceBorderColor}
                onClick={() => updateParams({ category: item.value })}
              />
            ))}
          </Stack>
          <Typography
            sx={{
              color: "text.secondary",
              fontFamily: MONO_FONT,
              fontSize: "0.78rem",
              letterSpacing: 0.5,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {products.length} {products.length === 1 ? "product" : "products"}
          </Typography>
        </Stack>

        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 3 }}>
            <ShopFilters
              panelSx={panelSx}
              surfaceBorderColor={surfaceBorderColor}
              lines={LINES}
              activeLine={activeLine}
              onLineChange={(value) => updateParams({ line: value })}
              priceBounds={priceBounds}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 9 }}>
            {products.length ? (
              <Grid container spacing={2.5}>
                  {products.map((product) => (
                    <Grid size={{ xs: 6, sm: 6, md: 4 }} key={product.id}>
                      <ProductCard product={product} panelSx={panelSx} isDarkMode={isDarkMode} />
                    </Grid>
                  ))}
                </Grid>
            ) : (
              <Box sx={{ ...panelSx, p: 5, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>No products match these filters.</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {activeCategory === "accessories"
                    ? "Accessories are coming soon — try another category."
                    : "Try adjusting the price range or product line."}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
