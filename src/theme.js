import { createTheme } from "@mui/material";

export const MONO_FONT =
  "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace";

export const DISPLAY_FONT = "'Sora', 'Inter', 'Helvetica', 'Arial', sans-serif";

/** Standard corner radius across the app (8px). MUI sx `borderRadius: 1` = this value. */
export const BORDER_RADIUS = 8;

export function createAppTheme(mode) {
  const isDarkMode = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDarkMode ? "#a78bfa" : "#7c3aed",
      },
      secondary: {
        main: isDarkMode ? "#22d3ee" : "#06b6d4",
      },
      warning: {
        main: "#f59e0b",
      },
      success: {
        main: "#22c55e",
      },
      error: {
        main: "#f43f5e",
      },
      background: {
        default: isDarkMode ? "#0b0b14" : "#f4f5fb",
        paper: isDarkMode ? "#15151f" : "#ffffff",
      },
      text: {
        primary: isDarkMode ? "#f8fafc" : "#161427",
        secondary: isDarkMode ? "#a5b0c2" : "#5b6172",
      },
    },
    shape: {
      borderRadius: BORDER_RADIUS,
    },
    typography: {
      fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
      h1: { fontFamily: DISPLAY_FONT, fontWeight: 800, letterSpacing: "-0.03em" },
      h2: { fontFamily: DISPLAY_FONT, fontWeight: 800, letterSpacing: "-0.03em" },
      h3: { fontFamily: DISPLAY_FONT, fontWeight: 800, letterSpacing: "-0.02em" },
      h4: { fontFamily: DISPLAY_FONT, fontWeight: 800, letterSpacing: "-0.02em" },
      h5: { fontFamily: DISPLAY_FONT, fontWeight: 800 },
      h6: { fontFamily: DISPLAY_FONT, fontWeight: 700 },
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
          },
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
          root: { borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)" },
        },
      },
    },
  });
}
