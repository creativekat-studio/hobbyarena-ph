import { createTheme, alpha } from "@mui/material";
import { getDesignProposal } from "./themes/index.js";
import { CONTENT_MAX_WIDTH_LG } from "./lib/layout.js";
import { OFF_WHITE } from "./lib/colors.js";

export const MONO_FONT =
  "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace";

export const DISPLAY_FONT = "'Sora', 'Inter', 'Helvetica', 'Arial', sans-serif";
export const BODY_FONT = '"Inter", "Helvetica", "Arial", sans-serif';

/** Standard corner radius across the app (8px). MUI sx `borderRadius: 1` = this value. */
export const BORDER_RADIUS = 8;

export function createAppTheme(mode, proposalId = 2) {
  const proposal = getDesignProposal(proposalId);
  const isDarkMode = mode === "dark";
  const palette = proposal.createPalette(mode);
  const brand = proposal.createBrand(mode);
  const displayFont = proposal.displayFont || DISPLAY_FONT;

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
      fontFamily: BODY_FONT,
      h1: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.03em" },
      h2: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.03em" },
      h3: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.02em" },
      h4: { fontFamily: displayFont, fontWeight: 800, letterSpacing: "-0.02em" },
      h5: { fontFamily: displayFont, fontWeight: 800 },
      h6: { fontFamily: displayFont, fontWeight: 700 },
      overline: {
        fontFamily: MONO_FONT,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
      },
      button: {
        fontFamily: MONO_FONT,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      },
      caption: {
        fontFamily: MONO_FONT,
        // Helper/info text — sentence case, not all caps.
        textTransform: "none",
        letterSpacing: "0.02em",
      },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: BORDER_RADIUS,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontFamily: MONO_FONT,
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
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: BORDER_RADIUS,
            backgroundImage: "none",
            boxShadow: "none",
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { backgroundImage: "none", boxShadow: "none" } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: BORDER_RADIUS,
            boxShadow: "none",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: BORDER_RADIUS,
            fontWeight: 700,
            fontFamily: MONO_FONT,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: BORDER_RADIUS },
          input: {
            "&::placeholder": {
              fontFamily: MONO_FONT,
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              opacity: 0.7,
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontFamily: MONO_FONT,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontSize: "0.8rem",
            "&.MuiInputLabel-shrink": {
              fontSize: "0.82rem",
            },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontFamily: MONO_FONT,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            fontFamily: MONO_FONT,
          },
        },
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
      MuiTabs: {
        defaultProps: {
          textColor: "primary",
          indicatorColor: "primary",
        },
        styleOverrides: {
          root: {
            minHeight: 48,
          },
          indicator: {
            height: 2,
            borderRadius: 1,
          },
          scrollButtons: {
            "&.Mui-disabled": { opacity: 0.25 },
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            minHeight: 48,
            paddingInline: 14,
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: "0.72rem",
            lineHeight: 1.2,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "text.secondary",
            opacity: 1,
            "&.Mui-selected": {
              color: "primary.main",
              fontWeight: 800,
            },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            fontFamily: MONO_FONT,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: "outlined" },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: isDarkMode ? OFF_WHITE.border : "rgba(15,23,42,0.08)" },
          head: {
            fontFamily: MONO_FONT,
            fontWeight: 800,
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "text.secondary",
            whiteSpace: "nowrap",
          },
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
