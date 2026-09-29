import { MONO_FONT } from "../theme.js";

/** Status / kind pills. Smaller than an action button so they don't read as controls. */
export const ADMIN_STATUS_CHIP_SX = {
  height: 22,
  fontSize: "0.62rem",
  fontWeight: 700,
  fontFamily: MONO_FONT,
  letterSpacing: 0.3,
  borderRadius: 999,
  flexShrink: 0,
  maxWidth: "100%",
  "&&": {
    height: 22,
    borderRadius: 999,
    fontSize: "0.62rem",
  },
  "& .MuiChip-label": {
    px: 0.85,
    whiteSpace: "nowrap",
    fontSize: "0.62rem",
    lineHeight: 1,
  },
};

/** Solid action buttons, distinct from the outlined status pills. */
export const ADMIN_ACTION_BUTTON_SX = {
  fontFamily: MONO_FONT,
  fontSize: "0.72rem",
  letterSpacing: 0.4,
  fontWeight: 800,
  minHeight: 32,
  bgcolor: "primary.main",
  color: "primary.contrastText",
  border: "none",
  "&:hover": { bgcolor: "primary.dark", border: "none" },
  "&.Mui-disabled": {
    bgcolor: "action.disabledBackground",
    color: "text.disabled",
    border: "none",
  },
};
