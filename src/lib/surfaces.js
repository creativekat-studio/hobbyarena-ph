import { alpha } from "@mui/material/styles";
import { BORDER_RADIUS } from "../theme.js";

// Shared surface + background styling so every page (Home, Account, Inventory)
// looks consistent. Gaming style, light-first.
export function getSurfaces(theme, isDarkMode) {
  const primary = theme.palette.primary.main;

  const pageBackground = isDarkMode
    ? `radial-gradient(circle at 12% -5%, ${alpha(primary, 0.28)} 0%, transparent 36%), radial-gradient(circle at 88% 0%, ${alpha("#06b6d4", 0.22)} 0%, transparent 32%), radial-gradient(circle at 60% 120%, ${alpha("#f43f5e", 0.16)} 0%, transparent 40%), linear-gradient(180deg, #0b0b14 0%, #0e0e1a 55%, #14141f 100%)`
    : `radial-gradient(circle at 10% -5%, ${alpha(primary, 0.16)} 0%, transparent 34%), radial-gradient(circle at 92% 0%, ${alpha("#06b6d4", 0.14)} 0%, transparent 30%), radial-gradient(circle at 55% 120%, ${alpha("#f43f5e", 0.1)} 0%, transparent 40%), linear-gradient(180deg, #eef0fb 0%, #f4f5fb 45%, #ffffff 100%)`;

  const surfaceBorderColor = isDarkMode
    ? alpha(theme.palette.common.white, 0.1)
    : alpha(theme.palette.common.black, 0.07);

  const surfaceBackground = isDarkMode
    ? alpha(theme.palette.background.paper, 0.82)
    : alpha("#ffffff", 0.92);

  const surfaceShadow = isDarkMode
    ? "0 24px 70px rgba(0,0,0,0.5)"
    : "0 20px 50px rgba(86, 64, 160, 0.1)";

  const navbarBackground = isDarkMode
    ? alpha(theme.palette.background.default, 0.78)
    : alpha("#ffffff", 0.82);

  const panelSx = {
    borderRadius: `${BORDER_RADIUS}px`,
    border: "1px solid",
    borderColor: surfaceBorderColor,
    backgroundColor: surfaceBackground,
    boxShadow: surfaceShadow,
    backdropFilter: "blur(16px)",
  };

  return {
    pageBackground,
    surfaceBorderColor,
    surfaceBackground,
    surfaceShadow,
    navbarBackground,
    panelSx,
  };
}
