import { useMemo } from "react";
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
import { BoxIcon, SparkleIcon } from "../components/icons.jsx";
import { ALL_PRODUCTS, PREORDER_PRODUCTS, SEALED_PRODUCTS } from "../data/mockData.js";

const CATEGORIES = [
  { value: "all", label: "All products" },
  { value: "sealed", label: "Sealed" },
  { value: "preorder", label: "Pre-orders" },
];

const LINES = [
  { value: "all", label: "All lines" },
  { value: "pokemon", label: "Pokémon TCG", match: "Pokémon TCG" },
  { value: "one-piece", label: "One Piece CG", match: "One Piece Card Game" },
];

const CATEGORY_COPY = {
  all: {
    overline: "Shop",
    title: "Browse the full catalog.",
    subtitle: "Sealed boxes, pre-orders, and grail drops — all in one place.",
    Icon: BoxIcon,
  },
  sealed: {
    overline: "Sealed products",
    title: "Get it sealed before it's gone.",
    subtitle: "Factory-fresh boxes and collections ready to ship.",
    Icon: BoxIcon,
  },
  preorder: {
    overline: "Pre-order products",
    title: "Pre-order now. Thank yourself later.",
    subtitle: "Lock your slot on incoming sets before they sell out.",
    Icon: SparkleIcon,
  },
};

function productsForCategory(category) {
  if (category === "sealed") return SEALED_PRODUCTS;
  if (category === "preorder") return PREORDER_PRODUCTS;
  return ALL_PRODUCTS;
}

function lineMatch(lineValue) {
  return LINES.find((line) => line.value === lineValue)?.match ?? null;
}

export default function ShopPage() {
  const { surfaces, isDarkMode } = useOutletContext();
  const { panelSx } = surfaces;
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category") || "all";
  const line = searchParams.get("line") || "all";
  const activeCategory = CATEGORIES.some((item) => item.value === category) ? category : "all";
  const activeLine = LINES.some((item) => item.value === line) ? line : "all";

  const copy = CATEGORY_COPY[activeCategory] ?? CATEGORY_COPY.all;
  const HeaderIcon = copy.Icon;

  const products = useMemo(() => {
    let list = productsForCategory(activeCategory);
    const match = lineMatch(activeLine);
    if (match) {
      list = list.filter((product) => product.line === match);
    }
    return list;
  }, [activeCategory, activeLine]);

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

        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {CATEGORIES.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                clickable
                color={activeCategory === item.value ? "primary" : "default"}
                variant={activeCategory === item.value ? "filled" : "outlined"}
                onClick={() => updateParams({ category: item.value })}
                sx={{ fontFamily: MONO_FONT, fontWeight: 700, letterSpacing: 0.5 }}
              />
            ))}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {LINES.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                size="small"
                clickable
                color={activeLine === item.value ? "secondary" : "default"}
                variant={activeLine === item.value ? "filled" : "outlined"}
                onClick={() => updateParams({ line: item.value })}
                sx={{ fontFamily: MONO_FONT, fontWeight: 600, letterSpacing: 0.5 }}
              />
            ))}
          </Stack>
        </Stack>

        <Typography sx={{ color: "text.secondary", fontFamily: MONO_FONT, fontSize: "0.78rem", letterSpacing: 0.5 }}>
          {products.length} {products.length === 1 ? "product" : "products"}
        </Typography>

        {products.length ? (
          <Grid container spacing={2.5}>
            {products.map((product) => (
              <Grid size={{ xs: 6, sm: 6, md: 3 }} key={product.id}>
                <ProductCard product={product} panelSx={panelSx} isDarkMode={isDarkMode} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ ...panelSx, p: 5, textAlign: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>No products match these filters.</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Try a different category or line.
            </Typography>
          </Box>
        )}
      </Stack>
    </Container>
  );
}
