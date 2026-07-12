import { Box, Button, Grid, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { useDesignSettings } from "../lib/designSettings.jsx";
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

function DesignSectionSaveBar({ surfaceBorderColor }) {
  const { dirty, saving, saveError, saveOk, saveSettings, hydrated } = useDesignSettings();

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: 1.75,
        py: 1.25,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.02),
      }}
    >
      <Typography
        sx={{
          color: saveError ? "error.main" : dirty ? "warning.main" : saveOk ? "success.main" : "text.secondary",
          fontSize: "0.78rem",
          fontWeight: dirty || saveError || saveOk ? 600 : 500,
          lineHeight: 1.4,
        }}
      >
        {saveError
          ? saveError
          : dirty
            ? "Unsaved changes"
            : saveOk
              ? "Saved"
              : "Edits stay local until you save"}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        disabled={!hydrated || !dirty || saving}
        onClick={() => saveSettings()}
        sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </Box>
  );
}

export default function DesignPreviewSettings({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const { mode, setModePreview } = useColorMode();
  const {
    proposalId,
    setProposalId,
    proposal,
    defaultColorMode,
    setDefaultColorMode,
    filterLayoutId,
    setFilterLayoutId,
    navLayoutId,
    setNavLayoutId,
    countdownVariant,
    pricingVariant,
    setCountdownVariant,
    setPricingVariant,
  } = useDesignSettings();

  function chooseColorMode(option) {
    setModePreview(option);
    setDefaultColorMode(option);
  }

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SettingsPanel panelSx={panelSx} title="Storefront theme" subtitle="Color system and default light/dark mode — applies site-wide after Save.">
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
                    variant={defaultColorMode === option ? "contained" : "outlined"}
                    color={defaultColorMode === option ? "primary" : "inherit"}
                    onClick={() => chooseColorMode(option)}
                    sx={{
                      minWidth: 0,
                      px: 2,
                      py: 0.75,
                      fontFamily: MONO_FONT,
                      fontSize: "0.78rem",
                      letterSpacing: 0.5,
                      textTransform: "capitalize",
                      ...(defaultColorMode !== option && { borderColor: surfaceBorderColor, color: "text.secondary" }),
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
                <strong>{mode === "dark" ? "Dark" : "Light"}</strong> preview
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
                  active={navLayoutId === layout.id}
                  onClick={() => setNavLayoutId(layout.id)}
                  color="secondary"
                  surfaceBorderColor={surfaceBorderColor}
                >
                  {layout.label}
                </OptionButton>
              ))}
            </Stack>
            <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.5, mt: 1.5 }}>
              {SHOP_NAV_LAYOUTS[navLayoutId]?.description}
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

      <DesignSectionSaveBar surfaceBorderColor={surfaceBorderColor} />
    </Stack>
  );
}
