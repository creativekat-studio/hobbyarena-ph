import { alpha } from "@mui/material/styles";
import { OFF_WHITE } from "../lib/colors.js";

/** Design Proposal 1 — Neon Arena (purple / cyan gaming aesthetic) */
export const PROPOSAL_1 = {
  id: 1,
  name: "Neon Arena",
  tagline: "Design Proposal 1",
  defaultMode: "light",
  useImageLogo: false,
  displayFont: "'Sora', 'Inter', 'Helvetica', 'Arial', sans-serif",
  confettiColors: ["#7c3aed", "#06b6d4", "#f43f5e", "#f59e0b", "#22c55e", "#a78bfa", OFF_WHITE.textBright],
  statAccents: ["#7c3aed", "#06b6d4", "#f59e0b", "#f43f5e"],
  cmsSwatches: ["#7c3aed", "#06b6d4", "#f43f5e", "#f59e0b", "#22c55e", "#ec4899"],
  chartColors: {
    pokemon: "#7c3aed",
    onePiece: "#06b6d4",
    accessories: "#f59e0b",
  },
  selectionBg: "rgba(124, 58, 237, 0.26)",
  createPalette(mode) {
    const isDarkMode = mode === "dark";
    return {
      mode,
      primary: { main: isDarkMode ? "#a78bfa" : "#7c3aed", contrastText: OFF_WHITE.textBright },
      secondary: { main: isDarkMode ? "#22d3ee" : "#06b6d4", contrastText: OFF_WHITE.textBright },
      warning: { main: "#f59e0b" },
      success: { main: "#22c55e" },
      error: { main: "#f43f5e" },
      background: {
        default: isDarkMode ? "#0b0b14" : "#f4f5fb",
        paper: isDarkMode ? "#15151f" : OFF_WHITE.paper,
      },
      text: {
        primary: isDarkMode ? OFF_WHITE.textBright : "#161427",
        secondary: isDarkMode ? "#a5b0c2" : "#5b6172",
      },
    };
  },
  createBrand(mode) {
    const isDarkMode = mode === "dark";
    return {
      accentCyan: "#06b6d4",
      accentRose: "#f43f5e",
      accentGold: "#f59e0b",
      liveDot: "#22c55e",
      heroGradient: isDarkMode
        ? `linear-gradient(120deg, ${OFF_WHITE.textBright} 35%, #a78bfa, #06b6d4, #f43f5e)`
        : "linear-gradient(120deg, #161427 35%, #7c3aed, #06b6d4, #f43f5e)",
      heroShowcaseGradient: (accent) =>
        `linear-gradient(150deg, ${alpha(accent, 0.95)} 0%, ${alpha("#06b6d4", 0.9)} 55%, ${alpha("#f43f5e", 0.85)} 100%)`,
      avatarGradient: () => "linear-gradient(145deg, #5B21B6 0%, #7C3AED 50%, #0891B2 100%)",
      avatarColor: OFF_WHITE.textBright,
      announcementBg: (primary) => primary,
      announcementColor: OFF_WHITE.textBright,
      headlineStyle: "gradient",
      buttonGlow: (primary) => alpha(primary, 0.5),
    };
  },
  createSurfaces(theme, isDarkMode) {
    const primary = theme.palette.primary.main;
    const pageBackground = isDarkMode
      ? `radial-gradient(circle at 12% -5%, ${alpha(primary, 0.28)} 0%, transparent 36%), radial-gradient(circle at 88% 0%, ${alpha("#06b6d4", 0.22)} 0%, transparent 32%), radial-gradient(circle at 60% 120%, ${alpha("#f43f5e", 0.16)} 0%, transparent 40%), linear-gradient(180deg, #0b0b14 0%, #0e0e1a 55%, #14141f 100%)`
      : `radial-gradient(circle at 10% -5%, ${alpha(primary, 0.16)} 0%, transparent 34%), radial-gradient(circle at 92% 0%, ${alpha("#06b6d4", 0.14)} 0%, transparent 30%), radial-gradient(circle at 55% 120%, ${alpha("#f43f5e", 0.1)} 0%, transparent 40%), linear-gradient(180deg, #eef0fb 0%, #f4f5fb 45%, ${OFF_WHITE.paper} 100%)`;
    const surfaceBorderColor = isDarkMode
      ? alpha(OFF_WHITE.textBright, 0.1)
      : alpha(theme.palette.common.black, 0.07);
    const surfaceBackground = isDarkMode
      ? alpha(theme.palette.background.paper, 0.82)
      : alpha(OFF_WHITE.paper, 0.92);
    const surfaceShadow = isDarkMode
      ? "0 24px 70px rgba(0,0,0,0.5)"
      : "0 20px 50px rgba(86, 64, 160, 0.1)";
    const navbarBackground = isDarkMode
      ? alpha(theme.palette.background.default, 0.78)
      : alpha(OFF_WHITE.paper, 0.82);

    return { pageBackground, surfaceBorderColor, surfaceBackground, surfaceShadow, navbarBackground };
  },
};
