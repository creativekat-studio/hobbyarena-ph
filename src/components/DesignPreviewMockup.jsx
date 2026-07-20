import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { BrowserChrome } from "./WireframePreview.jsx";
import { useColorMode } from "../lib/colorMode.jsx";
import { useDesignProposal } from "../lib/designProposal.jsx";
import { useShopNavLayout } from "../lib/shopNavLayout.jsx";
import { useShopFilterLayout } from "../lib/shopFilterLayout.jsx";
import { usePreorderDisplay } from "../lib/preorderDisplayLayout.jsx";
import { useDesignSettings } from "../lib/designSettings.jsx";
import { SHOP_NAV_LAYOUTS } from "../data/shopNav.js";
import { SHOP_FILTER_LAYOUTS } from "../data/shopFilterLayout.js";
import {
  PREORDER_COUNTDOWN_VARIANTS,
  PREORDER_PRICING_VARIANTS,
} from "../data/preorderDisplay.js";
import { BIR_PAYMENT_LAYOUTS, DEFAULT_BIR_SEAL_IMAGE } from "../data/birSeal.js";
import {
  MockAnnouncementBar,
  MockListingHeader,
  MockListingWithFilters,
  MockStorefrontNav,
  useStorefrontMockSurfaces,
} from "./StorefrontMockupParts.jsx";

function MockPaymentBirSection({ layoutId, panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const layout = BIR_PAYMENT_LAYOUTS[layoutId] ?? BIR_PAYMENT_LAYOUTS.beside;
  const beside = layout.id === "beside";
  const underCopy = layout.id === "under_copy";
  const below = layout.id === "below";

  const badge = (
    <Box
      component="img"
      src={DEFAULT_BIR_SEAL_IMAGE}
      alt="BIR registered badge"
      sx={{
        width: "100%",
        maxWidth: beside ? 148 : 200,
        height: "auto",
        display: "block",
        bgcolor: "#fff",
        borderRadius: 0.5,
        flexShrink: 0,
      }}
    />
  );

  const logos = ["Maya", "BDO", "BPI", "GCash"];

  return (
    <Box sx={{ ...panelSx, mx: 1, my: 1, p: 1.5, overflow: "visible" }}>
      <Chip
        label="Secure checkout"
        size="small"
        sx={{
          mb: 1.25,
          height: 20,
          fontFamily: MONO_FONT,
          fontSize: "0.55rem",
          fontWeight: 700,
          letterSpacing: 0.6,
          border: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.35),
          bgcolor: "transparent",
          color: "primary.main",
          "& .MuiChip-label": { px: 0.85 },
        }}
      />

      {beside ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(110px, 148px)",
            gap: 1.25,
            alignItems: "center",
            mb: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", lineHeight: 1.25 }}>
              Choose from a wide variety of payment options available
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.62rem", mt: 0.6, lineHeight: 1.4 }}>
              Pay your way — Philippine banks and e-wallets accepted.
            </Typography>
          </Box>
          {badge}
        </Box>
      ) : (
        <Stack spacing={0.85} alignItems="center" textAlign="center" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", lineHeight: 1.25, maxWidth: 280 }}>
            Choose from a wide variety of payment options available
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.62rem", lineHeight: 1.4, maxWidth: 260 }}>
            Pay your way — Philippine banks and e-wallets accepted.
          </Typography>
          {underCopy ? badge : null}
        </Stack>
      )}

      <Stack direction="row" spacing={0.65} useFlexGap flexWrap="wrap">
        {logos.map((name) => (
          <Box
            key={name}
            sx={{
              width: 76,
              height: 40,
              borderRadius: 0.75,
              border: "1px solid",
              borderColor: surfaceBorderColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MONO_FONT,
              fontSize: "0.55rem",
              fontWeight: 800,
              color: "text.secondary",
            }}
          >
            {name}
          </Box>
        ))}
      </Stack>

      {below ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
          {badge}
        </Box>
      ) : null}
    </Box>
  );
}

export default function DesignPreviewMockup({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const { mode } = useColorMode();
  const { proposalId, proposal } = useDesignProposal();
  const { layoutId } = useShopNavLayout();
  const { layoutId: filterLayoutId } = useShopFilterLayout();
  const { countdownVariant, pricingVariant } = usePreorderDisplay();
  const { birPaymentLayoutId } = useDesignSettings();
  const { panelSx: cardPanelSx, isDarkMode } = useStorefrontMockSurfaces();

  const primary = theme.palette.primary.main;
  const storefrontBg = theme.palette.background.default;
  const filterMeta = SHOP_FILTER_LAYOUTS[filterLayoutId] ?? SHOP_FILTER_LAYOUTS.current;
  const birLayoutMeta = BIR_PAYMENT_LAYOUTS[birPaymentLayoutId] ?? BIR_PAYMENT_LAYOUTS.beside;

  const activeLabels = [
    proposal.name,
    mode === "dark" ? "Dark mode" : "Light mode",
    SHOP_NAV_LAYOUTS[layoutId]?.label,
    filterMeta.shortLabel,
    PREORDER_COUNTDOWN_VARIANTS[countdownVariant]?.label,
    PREORDER_PRICING_VARIANTS[pricingVariant]?.label,
    `BIR · ${birLayoutMeta.label}`,
  ];

  return (
    <Box sx={{ ...panelSx, p: { xs: 1.5, md: 2 }, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Stack spacing={0.35} sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Storefront preview</Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", lineHeight: 1.4 }}>
          BIR payment layout: <strong>{birLayoutMeta.label}</strong>
        </Typography>
      </Stack>

      <BrowserChrome
        url="hobbyarena.ph/#payment-options"
        contentSx={{
          bgcolor: storefrontBg,
          flex: 1,
          minHeight: 360,
          maxHeight: { xs: 520, lg: "calc(100dvh - 160px)" },
          overflowY: "auto",
          pb: 2,
        }}
      >
        <MockAnnouncementBar text="SEALED DROPS — Pokémon Mega Evolution now landing" />
        <MockStorefrontNav layoutId={layoutId} surfaceBorderColor={surfaceBorderColor} compact />

        {/* Payment / BIR first so layout switches are fully visible */}
        <MockPaymentBirSection
          layoutId={birPaymentLayoutId}
          panelSx={cardPanelSx}
          surfaceBorderColor={surfaceBorderColor}
        />

        <MockListingHeader overline="Products" title="In-stock sealed products & collectibles." />
        <Box sx={{ maxHeight: 160, overflow: "hidden", opacity: 0.85 }}>
          <MockListingWithFilters
            variant={filterLayoutId}
            panelSx={cardPanelSx}
            surfaceBorderColor={surfaceBorderColor}
            isDarkMode={isDarkMode}
            countdownVariant={countdownVariant}
            pricingVariant={pricingVariant}
          />
        </Box>
      </BrowserChrome>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25, flexShrink: 0 }}>
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
