import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";

export function WireBlock({ sx, children, label }) {
  return (
    <Box
      sx={{
        bgcolor: (theme) => alpha(theme.palette.text.primary, 0.06),
        border: "1px dashed",
        borderColor: (theme) => alpha(theme.palette.text.primary, 0.18),
        borderRadius: 1,
        position: "relative",
        ...sx,
      }}
    >
      {label ? (
        <Typography
          sx={{
            position: "absolute",
            top: 4,
            left: 6,
            fontSize: "0.52rem",
            fontFamily: MONO_FONT,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: "text.secondary",
            fontWeight: 700,
          }}
        >
          {label}
        </Typography>
      ) : null}
      {children}
    </Box>
  );
}

export function BrowserChrome({ url, children, contentSx }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: alpha(theme.palette.text.primary, 0.12),
        boxShadow: `0 12px 40px ${alpha(theme.palette.common.black, 0.22)}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: alpha(theme.palette.text.primary, 0.07),
          borderBottom: "1px solid",
          borderColor: alpha(theme.palette.text.primary, 0.1),
        }}
      >
        <Stack direction="row" spacing={0.5}>
          {["#EF4444", "#FACC15", "#22C55E"].map((color) => (
            <Box key={color} sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, opacity: 0.85 }} />
          ))}
        </Stack>
        <Box
          sx={{
            flex: 1,
            py: 0.45,
            px: 1.25,
            borderRadius: 1,
            bgcolor: "background.paper",
            fontFamily: MONO_FONT,
            fontSize: "0.62rem",
            color: "text.secondary",
            letterSpacing: 0.3,
          }}
        >
          {url}
        </Box>
      </Stack>
      <Box sx={contentSx}>{children}</Box>
    </Box>
  );
}

export function WireSection({ active, children, sx }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        borderRadius: 1,
        border: "1px dashed",
        borderColor: active ? alpha(theme.palette.primary.main, 0.55) : alpha(theme.palette.text.primary, 0.12),
        bgcolor: active ? alpha(theme.palette.primary.main, 0.06) : "transparent",
        boxShadow: active ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.15)} inset` : "none",
        opacity: active ? 1 : 0.62,
        transition: "opacity 0.2s ease, border-color 0.2s ease",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
