import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

/** MUI `md` breakpoint — keep in sync with theme.breakpoints.values.md */
export const MOBILE_MD_QUERY = "(max-width: 899.95px)";

/** True when the viewport is below the `md` breakpoint. */
export function isMobileMdViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_MD_QUERY).matches;
}

/**
 * Accordion / section open state for controlled panels.
 * Desktop: starts at `desktopDefault`. Mobile: starts collapsed (`false`).
 */
export function initialAccordionExpanded(desktopDefault) {
  return isMobileMdViewport() ? false : desktopDefault;
}

/** Hook: `[expanded, setExpanded]` with mobile-collapsed defaults. */
export function useAccordionExpanded(desktopDefault) {
  return useState(() => initialAccordionExpanded(desktopDefault));
}

/** Hook: true below the `md` breakpoint. */
export function useIsMobileMd() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("md"));
}
