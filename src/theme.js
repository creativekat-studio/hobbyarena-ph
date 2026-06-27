import { createTheme, alpha } from "@mui/material";
import { getDesignProposal } from "./themes/index.js";
import { CONTENT_MAX_WIDTH_LG } from "./lib/layout.js";
import { OFF_WHITE } from "./lib/colors.js";

export const MONO_FONT =
  "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace";

export const DISPLAY_FONT = "'Sora', 'Inter', 'Helvetica', 'Arial', sans-serif";

/** Standard corner radius across the app (8px). MUI sx `borderRadius: 1` = this value. */
export const BORDER_RADIUS = 8;

export function createAppTheme(mode, proposalId = 2) {
  const proposal = getDesignProposal(proposalId);
  const isDarkMode = mode === "dark";
  const palette = proposal.createPalette(mode);
  const brand = proposal.createBrand(mode);
  const displayFont = proposal.displayFont;

  return createTheme({
    palette,
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 900,
        lg: CONTENT_MAX_WIDTH_LG,
        xl: 1613,
      },
    },
    ha: {
      proposalId: proposal.id,
      proposalName: proposal.name,
      brand,
      statAccents: proposal.statAccents,
      confettiColors: proposal.confettiColors,
      cmsSwatches: proposal.cmsSwatches,
      chartColors: proposal.chartColors,
      useImageLogo: proposal.useImageLogo,
      selectionBg: proposal.selectionBg,
    },
    shape: {
      borderRadius: BORDER_RADIUS,
    },
    typography: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      h1: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.03em" },
      h2: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.03em" },
      h3: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.02em" },
      h4: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.02em" },
      h5: { fontFamily: displayFont, fontWeight: 800 },
      h6: { fontFamily: displayFont, fontWeight: 700 },
      button: { fontWeight: 700 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: BORDER_RADIUS,
            textTransform: "none",
            fontWeight: 700,
            paddingInline: 22,
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
            "&:active": { boxShadow: "none" },
            "&:focus-visible": { boxShadow: "none" },
          },
          contained: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
            "&:active": { boxShadow: "none" },
          },
          containedPrimary: proposal.id === 2
            ? {
                background: "transparent",
                boxShadow: "none",
                border: "1px solid",
                borderColor: isDarkMode ? alpha("#F5C518", 0.5) : alpha("#C9A227", 0.6),
                color: isDarkMode ? "#F5C518" : "#B8921E",
                "&:hover": {
                  background: alpha(isDarkMode ? "#F5C518" : "#C9A227", 0.08),
                  boxShadow: "none",
                  borderColor: isDarkMode ? "#F5C518" : "#C9A227",
                },
              }
            : {
                boxShadow: "none",
                "&:hover": { boxShadow: "none" },
              },
          outlinedPrimary: proposal.id === 2
            ? {
                borderColor: isDarkMode ? alpha("#F5C518", 0.45) : alpha("#C9A227", 0.55),
                color: isDarkMode ? "#F5C518" : "#B8921E",
                "&:hover": {
                  borderColor: isDarkMode ? "#F5C518" : "#C9A227",
                  background: alpha(isDarkMode ? "#F5C518" : "#C9A227", 0.06),
                },
              }
            : {},
        },
      },
      MuiPaper: {
        styleOverrides: { root: { borderRadius: BORDER_RADIUS, backgroundImage: "none" } },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: BORDER_RADIUS } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: BORDER_RADIUS, fontWeight: 700 } },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: BORDER_RADIUS } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: BORDER_RADIUS } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: BORDER_RADIUS } },
      },
      MuiDrawer: {
        styleOverrides: { paper: { borderRadius: 0 } },
      },
      MuiTab: {
        styleOverrides: { root: { borderRadius: BORDER_RADIUS } },
      },
      MuiTextField: {
        defaultProps: { variant: "outlined" },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: isDarkMode ? OFF_WHITE.border : "rgba(15,23,42,0.08)" },
        },
      },
    },
  });
}

/** Read brand tokens from the active MUI theme. */
export function getBrand(theme) {
  return theme.ha?.brand ?? {};
}

/** Read stat accent colors for dashboard cards. */
export function getStatAccents(theme) {
  return theme.ha?.statAccents ?? ["#7c3aed", "#06b6d4", "#f59e0b", "#f43f5e"];
}
