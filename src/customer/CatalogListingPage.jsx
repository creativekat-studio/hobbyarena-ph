import { useMemo } from "react";
import {
  Box,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { wider } from "../lib/layout.js";
import ProductCard from "../components/ProductCard.jsx";
import {
  ShopFiltersSidebar,
  ShopFilterFranchiseRail,
  ShopFilterCommandBar,
  ShopFilterFranchiseTiles,
  ShopFilterBreadcrumb,
  getFilterLayoutMode,
  getTopFilterVariant,
  embedsCategoryTabs,
} from "../components/ShopFilters.jsx";
import { useShopFilterLayout } from "../lib/shopFilterLayout.jsx";
import { BoxIcon, SparkleIcon } from "../components/icons.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useCatalog, lineMatchFromOptions } from "../lib/catalogStore.jsx";
import { getCountdownParts } from "../lib/preorder.js";

const PREORDER_TABS = [
  { value: "all", label: "All Pre-orders" },
  { value: "ongoing", label: "Ongoing Pre-orders" },
  { value: "closed", label: "Closed" },
];

const PAGE_COPY = {
  preorder: {
    overline: "Pre-Orders",
    title: "Reserve incoming sets before they sell out.",
    subtitle: "Secure your slot with a deposit — balance due before release.",
    Icon: SparkleIcon,
  },
  product: {
    overline: "Products",
    title: "In-stock sealed products & collectibles.",
    subtitle: "Factory-fresh boxes, accessories, and more — ready to ship.",
    Icon: BoxIcon,
  },
};

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
          ? { bgcolor: "primary.main", color: "primary.contrastText", border: "1px solid", borderColor: "primary.main" }
          : { bgcolor: "background.paper", borderColor: surfaceBorderColor, color: "text.primary" }),
      }}
    />
  );
}

export default function CatalogListingPage({ mode }) {
  const { surfaces, isDarkMode } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { publishedCatalog } = useInventory();
  const { lineOptions, activeCategories } = useCatalog();
  const { layoutId } = useShopFilterLayout();
  const filterMode = getFilterLayoutMode(layoutId);
  const topFilterVariant = getTopFilterVariant(layoutId);
  const showCategoryTabs = !embedsCategoryTabs(layoutId);
  const [searchParams, setSearchParams] = useSearchParams();

  const line = searchParams.get("line") || "all";
  const tab = searchParams.get("tab") || "all";
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const activeLine = lineOptions.some((item) => item.value === line) ? line : "all";

  const copy = PAGE_COPY[mode];
  const HeaderIcon = copy.Icon;

  const productTabs = useMemo(
    () => [
      { value: "all", label: "All Products" },
      ...activeCategories.map((cat) => ({ value: cat.id, label: cat.label })),
    ],
    [activeCategories],
  );

  const tabs = mode === "preorder" ? PREORDER_TABS : productTabs;
  const activeTab = tabs.some((t) => t.value === tab) ? tab : "all";

  const products = useMemo(() => {
    let list = publishedCatalog.filter((p) =>
      mode === "preorder" ? p.tag === "Pre-order" : p.tag !== "Pre-order",
    );

    if (mode === "product") {
      if (activeTab !== "all") {
        list = list.filter((p) => (p.category || "tcg") === activeTab);
      }
    } else if (activeTab === "ongoing") {
      list = list.filter((p) => !getCountdownParts(p.preorderEndsAt)?.expired);
    } else if (activeTab === "closed") {
      list = list.filter((p) => getCountdownParts(p.preorderEndsAt)?.expired);
    }

    const match = lineMatchFromOptions(lineOptions, activeLine);
    if (match) list = list.filter((p) => p.line === match);

    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.line?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [publishedCatalog, mode, activeTab, activeLine, lineOptions, q]);

  const hasActiveFilters = activeLine !== "all";

  function updateParams(next) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
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
          {q ? (
            <Typography sx={{ mt: 1, fontFamily: MONO_FONT, fontSize: "0.78rem", color: "text.secondary" }}>
              Search: &ldquo;{q}&rdquo; · {products.length} result{products.length === 1 ? "" : "s"}
            </Typography>
          ) : null}
        </Box>

        {topFilterVariant === "commandBar" ? (
          <ShopFilterCommandBar
            surfaceBorderColor={surfaceBorderColor}
            lines={lineOptions}
            activeLine={activeLine}
            onLineChange={(value) => updateParams({ line: value })}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(value) => updateParams({ tab: value })}
            itemCount={products.length}
          />
        ) : null}

        {topFilterVariant === "franchiseTiles" ? (
          <ShopFilterFranchiseTiles
            panelSx={panelSx}
            surfaceBorderColor={surfaceBorderColor}
            lines={lineOptions}
            activeLine={activeLine}
            onLineChange={(value) => updateParams({ line: value })}
          />
        ) : null}

        {topFilterVariant === "breadcrumb" ? (
          <ShopFilterBreadcrumb
            sectionLabel={mode === "preorder" ? "Pre-orders" : "Products"}
            lines={lineOptions}
            activeLine={activeLine}
            onLineChange={(value) => updateParams({ line: value })}
            itemCount={products.length}
          />
        ) : null}

        {showCategoryTabs ? (
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={{ xs: 1.5, sm: 2 }} useFlexGap>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1 }}>
              {tabs.map((item) => (
                <CategoryChip
                  key={item.value}
                  label={item.label}
                  selected={activeTab === item.value}
                  surfaceBorderColor={surfaceBorderColor}
                  onClick={() => updateParams({ tab: item.value })}
                />
              ))}
            </Stack>
            <Typography sx={{ color: "text.secondary", fontFamily: MONO_FONT, fontSize: "0.78rem", flexShrink: 0 }}>
              {products.length} {products.length === 1 ? "item" : "items"}
            </Typography>
          </Stack>
        ) : null}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 3, md: filterMode === "rail" ? 2.5 : 3.5 },
            alignItems: "flex-start",
          }}
        >
          {filterMode === "sidebar" ? (
            <Box sx={{ width: { xs: "100%", md: 232, lg: 252 }, flexShrink: 0 }}>
              <ShopFiltersSidebar
                panelSx={panelSx}
                surfaceBorderColor={surfaceBorderColor}
                lines={lineOptions}
                activeLine={activeLine}
                onLineChange={(value) => updateParams({ line: value })}
                onReset={() => updateParams({ line: "all" })}
                hasActiveFilters={hasActiveFilters}
              />
            </Box>
          ) : null}

          {filterMode === "rail" ? (
            <ShopFilterFranchiseRail
              panelSx={panelSx}
              surfaceBorderColor={surfaceBorderColor}
              lines={lineOptions}
              activeLine={activeLine}
              onLineChange={(value) => updateParams({ line: value })}
            />
          ) : null}

          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            {products.length ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    md: "repeat(3, minmax(0, 1fr))",
                    lg: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 2.5,
                }}
              >
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} panelSx={panelSx} isDarkMode={isDarkMode} />
                ))}
              </Box>
            ) : (
              <Box sx={{ ...panelSx, p: 5, textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>No items match these filters.</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>Try another product line or tab.</Typography>
              </Box>
            )}
          </Box>
        </Box>

      </Stack>
    </Container>
  );
}
