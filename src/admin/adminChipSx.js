import { MONO_FONT } from "../theme.js";

/** Status / kind chips — full size on desktop, slightly tighter on compact viewports. */
export const ADMIN_STATUS_CHIP_SX = {
  height: { xs: 28, md: 32 },
  fontSize: { xs: "0.68rem", md: "0.75rem" },
  fontWeight: 700,
  fontFamily: MONO_FONT,
  letterSpacing: 0.3,
  flexShrink: 0,
  maxWidth: "100%",
  "& .MuiChip-label": { px: { xs: 1, md: 1.25 }, whiteSpace: "nowrap" },
};
