import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { MONO_FONT } from "../theme.js";
import { PAYMENT_METHODS } from "../data/checkoutSettings.js";

const marqueeSlide = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

function PaymentBadge({ method, surfaceBorderColor }) {
  const theme = useTheme();
  const isBank = method.type === "bank";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1.25,
        px: 2,
        py: 1.25,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(method.accent, 0.14),
          color: method.accent,
          fontFamily: MONO_FONT,
          fontWeight: 800,
          fontSize: "0.62rem",
          letterSpacing: 0.5,
          lineHeight: 1,
          textAlign: "center",
        }}
      >
        {method.name.slice(0, 4).toUpperCase()}
      </Box>
      <Stack spacing={0.25}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", lineHeight: 1.1 }}>{method.name}</Typography>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", letterSpacing: 0.8, color: "text.secondary", textTransform: "uppercase" }}>
          {isBank ? "Bank transfer" : "E-wallet"}
        </Typography>
      </Stack>
    </Box>
  );
}

export default function PaymentMethodsMarquee({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const loop = [...PAYMENT_METHODS, ...PAYMENT_METHODS];

  return (
    <Box id="payment-options" sx={{ ...panelSx, overflow: "hidden", py: { xs: 3, md: 4 } }}>
      <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ px: { xs: 2, md: 4 }, mb: 3 }}>
        <Chip
          label="Secure checkout"
          size="small"
          sx={{
            fontFamily: MONO_FONT,
            fontWeight: 700,
            letterSpacing: 0.8,
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.35),
            bgcolor: "transparent",
            color: "primary.main",
          }}
        />
        <Typography variant="h4" sx={{ fontWeight: 800, maxWidth: 640, lineHeight: 1.2 }}>
          Choose from a wide variety of payment options available
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520, fontSize: "0.95rem" }}>
          Pay your way — Philippine banks and e-wallets accepted. Upload proof of payment after checkout.
        </Typography>
      </Stack>

      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          py: 1,
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 48,
            zIndex: 1,
            pointerEvents: "none",
          },
          "&::before": {
            left: 0,
            background: `linear-gradient(90deg, ${alpha(theme.palette.background.paper, 0.95)}, transparent)`,
          },
          "&::after": {
            right: 0,
            background: `linear-gradient(270deg, ${alpha(theme.palette.background.paper, 0.95)}, transparent)`,
          },
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            gap: 2,
            whiteSpace: "nowrap",
            animation: `${marqueeSlide} 45s linear infinite`,
            px: 2,
            "&:hover": { animationPlayState: "paused" },
          }}
        >
          {loop.map((method, index) => (
            <PaymentBadge key={`${method.id}-${index}`} method={method} surfaceBorderColor={surfaceBorderColor} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
