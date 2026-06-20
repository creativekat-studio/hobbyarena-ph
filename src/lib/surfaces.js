import { alpha } from "@mui/material/styles";
import { BORDER_RADIUS } from "../theme.js";
import { getDesignProposal } from "../themes/index.js";
import { OFF_WHITE } from "./colors.js";

// Shared surface + background styling per design proposal.
export function getSurfaces(theme, isDarkMode, proposalId = theme.ha?.proposalId ?? 2) {
  const proposal = getDesignProposal(proposalId);
  const {
    pageBackground,
    surfaceBorderColor,
    surfaceBackground,
    surfaceShadow,
    navbarBackground,
  } = proposal.createSurfaces(theme, isDarkMode);

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

/** Avatar / profile circle gradient using active brand tokens. */
export function avatarGradient(theme) {
  const brand = theme.ha?.brand;
  if (brand?.avatarGradient) {
    return brand.avatarGradient(theme.palette.primary.main);
  }
  return `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`;
}

/** Avatar circle background + initial color. */
export function avatarStyles(theme) {
  const brand = theme.ha?.brand ?? {};
  return {
    background: avatarGradient(theme),
    color: brand.avatarColor ?? theme.palette.primary.contrastText,
  };
}

/** CMS preview banner gradient. */
export function cmsPreviewGradient(theme) {
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  return `linear-gradient(140deg, ${alpha(primary, 0.16)}, ${alpha(secondary, 0.12)})`;
}

/** Hero headline sx based on active design proposal. */
export function heroHeadlineSx(theme) {
  const brand = theme.ha?.brand;
  const style = brand?.headlineStyle ?? "gradient";

  if (style === "gold") {
    return {
      fontSize: { xs: "2.5rem", md: "4.2rem" },
      lineHeight: 1.02,
      backgroundImage: brand.heroGradient,
      backgroundSize: "100% 100%",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      textShadow: "none",
      filter: `drop-shadow(0 2px 12px ${alpha("#F5C518", 0.25)})`,
    };
  }

  if (style === "navy") {
    return {
      fontSize: { xs: "2.5rem", md: "3.9rem" },
      lineHeight: 1.03,
      backgroundImage: brand.heroGradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    };
  }

  return {
    fontSize: { xs: "2.5rem", md: "3.9rem" },
    lineHeight: 1.03,
    backgroundImage: brand?.heroGradient,
    backgroundSize: "200% 200%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    animation: "gradientShift 6s ease-in-out infinite",
  };
}

/** Section titles — same moving gradient, smaller type scale. */
export function sectionHeadlineSx(theme) {
  return {
    ...heroHeadlineSx(theme),
    fontSize: { xs: "1.85rem", md: "2.35rem" },
    lineHeight: 1.15,
  };
}

/** Announcement bar colors from brand tokens. */
export function announcementBarColors(theme) {
  const brand = theme.ha?.brand;
  const primary = theme.palette.primary.main;
  return {
    bgcolor: brand?.announcementBg?.(primary) ?? primary,
    color: brand?.announcementColor ?? OFF_WHITE.textBright,
  };
}
