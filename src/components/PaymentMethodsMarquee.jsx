import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { MONO_FONT } from "../theme.js";
import { paymentMethodsFromAccounts } from "../data/checkoutSettings.js";
import { marqueeDuration } from "../lib/marquee.js";
import { useDesignSettings } from "../lib/designSettings.jsx";
import BirSealBadge, { useBirSealVisible } from "./BirSealBadge.jsx";

const marqueeSlide = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const TRACK_REPEATS = 6;
const TRACK_BASE_SECONDS = 28;

function PaymentBadge({ method, account, surfaceBorderColor }) {
  const logo = account?.logo;

  return (
    <Box
      aria-label={method.name}
      sx={{
        width: 200,
        height: 108,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: logo ? "transparent" : (theme) => alpha(method.accent, 0.14),
        color: method.accent,
        fontFamily: MONO_FONT,
        fontWeight: 800,
        fontSize: "0.85rem",
        letterSpacing: 0.5,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        px: 2.5,
        py: 2,
      }}
    >
      {logo ? (
        <Box
          component="img"
          src={logo}
          alt={method.name}
          sx={{
            width: "auto",
            height: "auto",
            // Match BPI’s visual weight — roomy padding, not edge-to-edge.
            maxWidth: 132,
            maxHeight: 44,
            objectFit: "contain",
            objectPosition: "center",
            display: "block",
          }}
        />
      ) : (
        method.name.slice(0, 4).toUpperCase()
      )}
    </Box>
  );
}

function PaymentMarqueeGroup({ methods, accountsById, surfaceBorderColor, ariaHidden = false }) {
  const track = Array.from({ length: TRACK_REPEATS }, () => methods).flat();

  return (
    <Box
      aria-hidden={ariaHidden || undefined}
      sx={{
        display: "flex",
        flexShrink: 0,
        gap: 2,
        pr: 2,
      }}
    >
      {track.map((method, index) => (
        <PaymentBadge
          key={`${method.id}-${index}`}
          method={method}
          account={accountsById.get(method.id)}
          surfaceBorderColor={surfaceBorderColor}
        />
      ))}
    </Box>
  );
}

function PaymentSectionHeader({ bankDetails, showBir, layout }) {
  const theme = useTheme();
  const title = bankDetails?.title || "Choose from a wide variety of payment options available";
  const subtitle = bankDetails?.subtitle
    || "Pay your way — Philippine banks and e-wallets accepted. Upload proof of payment after checkout.";
  const beside = layout === "beside" && showBir;

  const chip = (
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
        alignSelf: beside ? { xs: "center", md: "flex-start" } : "center",
      }}
    />
  );

  if (beside) {
    return (
      <Stack spacing={2} sx={{ px: { xs: 2, md: 4 }, mb: 3 }}>
        {chip}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 1.25fr) minmax(300px, min(480px, 42%))",
            },
            columnGap: { xs: 2.5, md: 4 },
            rowGap: 2.5,
            // Bottom of seal lines up with “We offer secure…”
            alignItems: { xs: "center", md: "end" },
          }}
        >
          <Stack spacing={1.25} textAlign={{ xs: "center", md: "left" }} sx={{ minWidth: 0, pr: { md: 1 } }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                lineHeight: 1.2,
                mx: { xs: "auto", md: 0 },
                // Keep headline inside its column so it never paints over the seal.
                maxWidth: { xs: 520, md: "100%" },
              }}
            >
              {title}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{
                fontSize: "0.95rem",
                lineHeight: 1.55,
                mx: { xs: "auto", md: 0 },
                maxWidth: { xs: 520, md: "36rem" },
              }}
            >
              {subtitle}
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "flex",
              justifyContent: { xs: "center", md: "flex-end" },
              alignItems: "flex-end",
              alignSelf: { xs: "center", md: "end" },
              width: "100%",
              minWidth: 0,
            }}
          >
            <BirSealBadge
              placement="payment"
              maxWidth={480}
              sx={{
                width: "100%",
                maxWidth: { xs: 400, md: "100%" },
              }}
            />
          </Box>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ px: { xs: 2, md: 4 }, mb: 3 }}>
      {chip}
      <Typography variant="h4" sx={{ fontWeight: 800, maxWidth: 640, lineHeight: 1.2 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 520, fontSize: "0.95rem" }}>
        {subtitle}
      </Typography>
      {layout === "under_copy" && showBir ? (
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%", pt: 0.5 }}>
          <BirSealBadge placement="payment" maxWidth={400} />
        </Box>
      ) : null}
    </Stack>
  );
}

export default function PaymentMethodsMarquee({ panelSx, surfaceBorderColor, bankDetails }) {
  const theme = useTheme();
  const { birPaymentLayoutId } = useDesignSettings();
  const showBir = useBirSealVisible("payment");
  const layout = showBir ? birPaymentLayoutId : "below";
  const activeAccounts = (bankDetails?.accounts ?? []).filter((account) => account.active !== false);
  const accountsById = new Map(activeAccounts.map((account) => [account.id, account]));
  const methods = paymentMethodsFromAccounts(activeAccounts);
  const duration = marqueeDuration(TRACK_BASE_SECONDS, TRACK_REPEATS);

  if (!methods.length) return null;

  return (
    <Box id="payment-options" sx={{ ...panelSx, overflow: "hidden", py: { xs: 3, md: 4 } }}>
      <PaymentSectionHeader bankDetails={bankDetails} showBir={showBir} layout={layout} />

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
            display: "flex",
            width: "max-content",
            animation: `${marqueeSlide} ${duration}s linear infinite`,
            willChange: "transform",
            "&:hover": { animationPlayState: "paused" },
          }}
        >
          <PaymentMarqueeGroup methods={methods} accountsById={accountsById} surfaceBorderColor={surfaceBorderColor} />
          <PaymentMarqueeGroup methods={methods} accountsById={accountsById} surfaceBorderColor={surfaceBorderColor} ariaHidden />
        </Box>
      </Box>

      {layout === "below" && showBir ? (
        <Box sx={{ display: "flex", justifyContent: "center", px: { xs: 2, md: 4 }, mt: 3 }}>
          <BirSealBadge placement="payment" maxWidth={400} />
        </Box>
      ) : null}
    </Box>
  );
}
