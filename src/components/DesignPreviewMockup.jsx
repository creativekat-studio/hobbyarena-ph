import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { BrowserChrome } from "./WireframePreview.jsx";
import { useColorMode } from "../lib/colorMode.jsx";
import { useDesignProposal } from "../lib/designProposal.jsx";
import { useShopNavLayout } from "../lib/shopNavLayout.jsx";
import { useShopFilterLayout } from "../lib/shopFilterLayout.jsx";
import { usePreorderDisplay } from "../lib/preorderDisplayLayout.jsx";
import { SHOP_NAV_LAYOUTS } from "../data/shopNav.js";
import { SHOP_FILTER_LAYOUTS } from "../data/shopFilterLayout.js";
import {
  PREORDER_COUNTDOWN_VARIANTS,
  PREORDER_PRICING_VARIANTS,
} from "../data/preorderDisplay.js";
import {
  MockAnnouncementBar,
  MockListingHeader,
  MockListingWithFilters,
  MockStorefrontNav,
  useStorefrontMockSurfaces,
} from "./StorefrontMockupParts.jsx";

export default function DesignPreviewMockup({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const { mode } = useColorMode();
  const { proposalId, proposal } = useDesignProposal();
  const { layoutId } = useShopNavLayout();
  const { layoutId: filterLayoutId } = useShopFilterLayout();
  const { countdownVariant, pricingVariant } = usePreorderDisplay();
  const { panelSx: cardPanelSx, isDarkMode } = useStorefrontMockSurfaces();

  const primary = theme.palette.primary.main;
  const storefrontBg = theme.palette.background.default;
  const filterMeta = SHOP_FILTER_LAYOUTS[filterLayoutId] ?? SHOP_FILTER_LAYOUTS.current;

  const activeLabels = [
    proposal.name,
    mode === "dark" ? "Dark mode" : "Light mode",
    SHOP_NAV_LAYOUTS[layoutId]?.label,
    filterMeta.shortLabel,
    PREORDER_COUNTDOWN_VARIANTS[countdownVariant]?.label,
    PREORDER_PRICING_VARIANTS[pricingVariant]?.label,
  ];

  return (
    <Box sx={{ ...panelSx, p: { xs: 1.5, md: 2 }, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Stack spacing={0.35} sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Storefront preview</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", lineHeight: 1.4 }}>
          Listing filters: <strong>{filterMeta.shortLabel}</strong>
        </Typography>
      </Stack>

      <BrowserChrome
        url="hobbyarena.ph/products"
        contentSx={{ bgcolor: storefrontBg, flex: 1, minHeight: 320, maxHeight: { xs: 480, lg: "calc(100dvh - 140px)" }, overflowY: "auto" }}
      >
        <MockAnnouncementBar text="SEALED DROPS — Pokémon Mega Evolution now landing" />
        <MockStorefrontNav layoutId={layoutId} surfaceBorderColor={surfaceBorderColor} compact />
        <MockListingHeader overline="Products" title="In-stock sealed products & collectibles." />

        <MockListingWithFilters
          variant={filterLayoutId}
          panelSx={cardPanelSx}
          surfaceBorderColor={surfaceBorderColor}
          isDarkMode={isDarkMode}
          countdownVariant={countdownVariant}
          pricingVariant={pricingVariant}
        />
      </BrowserChrome>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
        {activeLabels.map((label) => (
          <Chip
            key={label}
            label={label}
            size="small"
            sx={{
              fontFamily: MONO_FONT,
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: 0.3,
              border: "1px solid",
              borderColor: surfaceBorderColor,
              bgcolor: alpha(primary, proposalId === 1 ? 0.1 : 0.08),
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
