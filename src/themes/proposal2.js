import { alpha } from "@mui/material/styles";
import { OFF_WHITE } from "../lib/colors.js";

/** Design Proposal 2 — Official Brand (navy / gold, matches Hobby Arena logo) */
export const PROPOSAL_2 = {
  id: 2,
  name: "Official Brand",
  tagline: "Design Proposal 2",
  defaultMode: "dark",
  useImageLogo: true,
  displayFont: "'Sora', 'Inter', 'Helvetica', 'Arial', sans-serif",
  confettiColors: ["#F5C518", "#2563EB", "#EF4444", "#FACC15", "#38BDF8", OFF_WHITE.textBright, "#1E3A8A"],
  statAccents: ["#F5C518", "#38BDF8", "#EF4444", "#2563EB"],
  cmsSwatches: ["#F5C518", "#2563EB", "#EF4444", "#38BDF8", "#1E3A8A", "#FACC15"],
  chartColors: {
    pokemon: "#2563EB",
    onePiece: "#EF4444",
    accessories: "#F5C518",
  },
  selectionBg: "rgba(245, 197, 24, 0.28)",
  createPalette(mode) {
    const isDarkMode = mode === "dark";
    return {
      mode,
      primary: {
        main: isDarkMode ? "#F5C518" : "#C9A227",
        light: "#FDE68A",
        dark: "#B45309",
        contrastText: "#0B1538",
      },
      secondary: {
        main: isDarkMode ? "#2563EB" : "#1E3A8A",
        light: "#38BDF8",
        dark: "#1E3A8A",
        contrastText: OFF_WHITE.textBright,
      },
      warning: { main: "#FACC15" },
      success: { main: "#22c55e" },
      error: { main: "#EF4444" },
      background: {
        default: isDarkMode ? "#070E24" : "#EBE8E0",
        paper: isDarkMode ? "#0F1D42" : OFF_WHITE.paper,
      },
      text: {
        primary: isDarkMode ? OFF_WHITE.textBright : "#0B1538",
        secondary: isDarkMode ? "#94A3B8" : "#475569",
      },
    };
  },
  createBrand(mode) {
    const isDarkMode = mode === "dark";
    return {
      accentCyan: "#38BDF8",
      accentRose: "#EF4444",
      accentGold: "#FACC15",
      liveDot: "#22c55e",
      heroGradient: isDarkMode
        ? `linear-gradient(120deg, ${OFF_WHITE.textBright} 35%, #F5C518, #38BDF8, #EF4444)`
        : "linear-gradient(120deg, #0B1538 35%, #C9A227, #2563EB, #EF4444)",
      heroShowcaseGradient: (accent) =>
        `linear-gradient(150deg, ${alpha("#0B1538", 0.98)} 0%, ${alpha(accent || "#2563EB", 0.92)} 45%, ${alpha("#38BDF8", 0.75)} 100%)`,
      avatarGradient: () => "linear-gradient(155deg, #142952 0%, #1C3F7A 48%, #2A5CA8 100%)",
      avatarColor: OFF_WHITE.textBright,
      announcementBg: () => "#0B1538",
      announcementColor: "#F5C518",
      headlineStyle: "gradient",
      heroGlowColor: "#2563EB",
      buttonGlow: (primary) => alpha(primary, 0.45),
      navbarBorder: alpha("#F5C518", 0.22),
      panelBorder: isDarkMode ? alpha("#F5C518", 0.14) : alpha("#1E3A8A", 0.12),
    };
  },
  createSurfaces(theme, isDarkMode) {
    const gold = theme.palette.primary.main;
    const navy = isDarkMode ? "#070E24" : "#EEF2FA";
    const pageBackground = isDarkMode
      ? `radial-gradient(circle at 15% -8%, ${alpha("#2563EB", 0.22)} 0%, transparent 38%), radial-gradient(circle at 50% 110%, ${alpha("#1E3A8A", 0.35)} 0%, transparent 45%), linear-gradient(180deg, #070E24 0%, #0B1538 50%, #0F1D42 100%)`
      : `linear-gradient(180deg, #EBE8E0 0%, ${OFF_WHITE.paperSoft} 55%, ${OFF_WHITE.paper} 100%)`;
    const surfaceBorderColor = isDarkMode
      ? alpha(gold, 0.14)
      : alpha("#1E3A8A", 0.1);
    const surfaceBackground = isDarkMode
      ? alpha("#12204A", 0.88)
      : alpha(OFF_WHITE.paper, 0.94);
    const surfaceShadow = isDarkMode
      ? `0 24px 70px rgba(0,0,0,0.55), 0 0 0 1px ${alpha(gold, 0.06)}`
      : `0 20px 50px ${alpha("#1E3A8A", 0.08)}`;
    const navbarBackground = isDarkMode
      ? alpha("#0B1538", 0.92)
      : alpha(OFF_WHITE.paper, 0.9);

    return { pageBackground, surfaceBorderColor, surfaceBackground, surfaceShadow, navbarBackground };
  },
};
