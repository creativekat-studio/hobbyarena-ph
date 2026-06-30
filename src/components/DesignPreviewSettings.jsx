import { Box, Button, Grid, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
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

function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: MONO_FONT,
        fontSize: "0.68rem",
        letterSpacing: 1.2,
        textTransform: "uppercase",
        color: "text.secondary",
        fontWeight: 700,
      }}
    >
      {children}
    </Typography>
  );
}

function OptionButton({ active, onClick, children, color = "primary", surfaceBorderColor }) {
  return (
    <Button
      size="small"
      variant={active ? "contained" : "outlined"}
      color={active ? color : "inherit"}
      onClick={onClick}
      sx={{
        justifyContent: "flex-start",
        fontFamily: MONO_FONT,
        fontSize: "0.75rem",
        letterSpacing: 0.3,
        textTransform: "none",
        ...(!active && { borderColor: surfaceBorderColor, color: "text.secondary" }),
      }}
    >
      {children}
    </Button>
  );
}

function SettingsPanel({ panelSx, title, subtitle, children }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 1.75, md: 2 }, height: "100%" }}>
      <Stack spacing={0.25} sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>{title}</Typography>
        {subtitle ? <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", lineHeight: 1.45 }}>{subtitle}</Typography> : null}
      </Stack>
      {children}
    </Box>
  );
}

export default function DesignPreviewSettings({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const { mode, setMode } = useColorMode();
  const { proposalId, setProposalId, proposal } = useDesignProposal();
  const { layoutId, setLayoutId } = useShopNavLayout();
  const { layoutId: filterLayoutId, setLayoutId: setFilterLayoutId } = useShopFilterLayout();
  const { countdownVariant, pricingVariant, setCountdownVariant, setPricingVariant } = usePreorderDisplay();

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <SettingsPanel panelSx={panelSx} title="Storefront theme" subtitle="Color system and default light/dark mode — applies site-wide.">
          <Stack spacing={1.5}>
            <SectionLabel>Theme</SectionLabel>
            <Stack direction="row" spacing={0.75}>
              {[1, 2].map((id) => (
                <Button
                  key={id}
                  size="small"
                  variant={proposalId === id ? "contained" : "outlined"}
                  color={proposalId === id ? "primary" : "inherit"}
                  onClick={() => setProposalId(id)}
                  sx={{
                    minWidth: 0,
                    px: 2,
                    py: 0.75,
                    fontFamily: MONO_FONT,
                    fontSize: "0.78rem",
                    letterSpacing: 0.5,
                    ...(proposalId !== id && { borderColor: surfaceBorderColor, color: "text.secondary" }),
                  }}
                >
                  {id === 1 ? "Neon" : "Brand"}
                </Button>
              ))}
            </Stack>
            <SectionLabel>Default color mode</SectionLabel>
            <Stack direction="row" spacing={0.75}>
              {["light", "dark"].map((option) => (
                <Button
                  key={option}
                  size="small"
                  variant={mode === option ? "contained" : "outlined"}
                  color={mode === option ? "primary" : "inherit"}
                  onClick={() => setMode(option)}
                  sx={{
                    minWidth: 0,
                    px: 2,
                    py: 0.75,
                    fontFamily: MONO_FONT,
                    fontSize: "0.78rem",
                    letterSpacing: 0.5,
                    textTransform: "capitalize",
                    ...(mode !== option && { borderColor: surfaceBorderColor, color: "text.secondary" }),
                  }}
                >
                  {option}
                </Button>
              ))}
            </Stack>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary", lineHeight: 1.5 }}>
              Active: <strong>{proposal.name}</strong>
              {theme.ha?.useImageLogo ? " · image logo enabled" : ""}
              {" · "}
              <strong>{mode === "dark" ? "Dark" : "Light"}</strong> mode
              {mode !== proposal.defaultMode ? ` (theme default: ${proposal.defaultMode})` : ""}
            </Typography>
          </Stack>
        </SettingsPanel>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <SettingsPanel panelSx={panelSx} title="Listing filters" subtitle="How product line filtering appears on /products and /preorders — switch options and check the preview.">
          <Stack spacing={0.75}>
            {Object.values(SHOP_FILTER_LAYOUTS).map((layout) => (
              <OptionButton
                key={layout.id}
                active={filterLayoutId === layout.id}
                onClick={() => setFilterLayoutId(layout.id)}
                color="secondary"
                surfaceBorderColor={surfaceBorderColor}
              >
                {layout.label}
              </OptionButton>
            ))}
          </Stack>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.5, mt: 1.5 }}>
            {SHOP_FILTER_LAYOUTS[filterLayoutId]?.description}
          </Typography>
        </SettingsPanel>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <SettingsPanel panelSx={panelSx} title="Shop navigation" subtitle="Layout for category tabs and filters on listing pages.">
          <Stack spacing={1}>
            {Object.values(SHOP_NAV_LAYOUTS).map((layout) => (
              <OptionButton
                key={layout.id}
                active={layoutId === layout.id}
                onClick={() => setLayoutId(layout.id)}
                color="secondary"
                surfaceBorderColor={surfaceBorderColor}
              >
                {layout.label}
              </OptionButton>
            ))}
          </Stack>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.5, mt: 1.5 }}>
            {SHOP_NAV_LAYOUTS[layoutId]?.description}
          </Typography>
        </SettingsPanel>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <SettingsPanel panelSx={panelSx} title="Pre-order countdown" subtitle="Timer style on pre-order cards and product pages.">
          <Stack spacing={0.75}>
            {Object.values(PREORDER_COUNTDOWN_VARIANTS).map((option) => (
              <OptionButton
                key={option.id}
                active={countdownVariant === option.id}
                onClick={() => setCountdownVariant(option.id)}
                surfaceBorderColor={surfaceBorderColor}
              >
                {option.label}
              </OptionButton>
            ))}
          </Stack>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.5, mt: 1.5 }}>
            {PREORDER_COUNTDOWN_VARIANTS[countdownVariant]?.description}
          </Typography>
        </SettingsPanel>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <SettingsPanel panelSx={panelSx} title="Pre-order pricing" subtitle="How deposit and balance are shown at checkout and on product pages.">
          <Stack spacing={0.75}>
            {Object.values(PREORDER_PRICING_VARIANTS).map((option) => (
              <OptionButton
                key={option.id}
                active={pricingVariant === option.id}
                onClick={() => setPricingVariant(option.id)}
                surfaceBorderColor={surfaceBorderColor}
              >
                {option.label}
              </OptionButton>
            ))}
          </Stack>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.5, mt: 1.5 }}>
            {PREORDER_PRICING_VARIANTS[pricingVariant]?.description}
          </Typography>
        </SettingsPanel>
      </Grid>
    </Grid>
  );
}
