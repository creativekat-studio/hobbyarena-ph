import { Box, Typography } from "@mui/material";
import { MONO_FONT } from "../theme.js";

export const adminSectionTitleSx = {
  fontWeight: 800,
  fontFamily: MONO_FONT,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  lineHeight: 1.35,
};

export default function AdminSectionTitle({ children, suffix, variant, sx, ...props }) {
  const label = typeof children === "string" ? children.toUpperCase() : children;

  return (
    <Typography
      variant={variant}
      sx={{
        ...adminSectionTitleSx,
        ...(variant === "h6" ? {} : { fontSize: "1rem" }),
        ...sx,
      }}
      {...props}
    >
      {label}
      {suffix ? (
        <>
          {" FOR "}
          <Box component="span" sx={{ textTransform: "none", letterSpacing: 0.15, fontWeight: 700 }}>
            {suffix}
          </Box>
        </>
      ) : null}
    </Typography>
  );
}
