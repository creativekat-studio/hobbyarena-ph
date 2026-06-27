import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { wider } from "../lib/layout.js";
import { CardIcon, ShieldIcon, SparkleIcon } from "./icons.jsx";
import { PAYMENT_METHODS } from "../data/checkoutSettings.js";

function PaymentBadge({ method, surfaceBorderColor }) {
  const theme = useTheme();
  const isBank = method.type === "bank";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: alpha(theme.palette.background.paper, 0.72),
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(method.accent, 0.14),
          color: method.accent,
          fontFamily: MONO_FONT,
          fontWeight: 800,
          fontSize: "0.58rem",
          letterSpacing: 0.4,
          lineHeight: 1,
          textAlign: "center",
        }}
      >
        {method.name.slice(0, 4).toUpperCase()}
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", lineHeight: 1.1 }}>{method.name}</Typography>
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.58rem", letterSpacing: 0.6, color: "text.secondary", textTransform: "uppercase" }}>
        {isBank ? "Bank" : "E-wallet"}
      </Typography>
    </Box>
  );
}

function PaymentCategoryRow({ icon: Icon, title, subtitle, children, panelSx }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.25 }, mb: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 3 }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: { md: 220 }, flexShrink: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, letterSpacing: 1.2, fontSize: "0.72rem", textTransform: "uppercase" }}>
              {title}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 0.25 }}>{subtitle}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ justifyContent: { xs: "flex-start", md: "flex-end" } }}>
          {children}
        </Stack>
      </Stack>
    </Box>
  );
}

function ComingSoonRow({ panelSx }) {
  const theme = useTheme();

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.25 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 2, md: 3 }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: { md: 220 }, flexShrink: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <CardIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, letterSpacing: 1.2, fontSize: "0.72rem", textTransform: "uppercase" }}>
              Credit card
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 0.25 }}>More ways to pay coming soon.</Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: "text.secondary" }}>
          <SparkleIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, letterSpacing: 1.5, fontSize: "0.72rem" }}>
            COMING SOON
          </Typography>
          <SparkleIcon sx={{ fontSize: 18, color: "primary.main" }} />
        </Stack>
      </Stack>
    </Box>
  );
}

export default function BankDetailsSection({ bankDetails, panelSx, surfaceBorderColor }) {
  const theme = useTheme();

  if (!bankDetails?.enabled) return null;

  const activeIds = new Set(
    (bankDetails.accounts ?? []).filter((account) => account.active !== false).map((account) => account.id),
  );
  const banks = PAYMENT_METHODS.filter((method) => method.type === "bank" && activeIds.has(method.id));
  const ewallets = PAYMENT_METHODS.filter((method) => method.type === "ewallet" && activeIds.has(method.id));

  return (
    <Box id="payment-options" sx={{ ...panelSx, overflow: "hidden", py: { xs: 3, md: 4 }, px: { xs: 2.5, md: 4 } }}>
      <Grid container spacing={{ xs: 3, md: 5 }} alignItems="center">
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2.5}>
            <Chip
              label="Secure checkout"
              size="small"
              icon={<ShieldIcon sx={{ fontSize: "16px !important" }} />}
              sx={{
                alignSelf: "flex-start",
                fontFamily: MONO_FONT,
                fontWeight: 700,
                letterSpacing: 0.8,
                border: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.35),
                bgcolor: "transparent",
                color: "primary.main",
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.15, maxWidth: wider(420) }}>
              {bankDetails.title}
            </Typography>
            <Box sx={{ width: 48, height: 3, borderRadius: 1, bgcolor: "primary.main" }} />
            <Typography color="text.secondary" sx={{ fontSize: "0.95rem", maxWidth: wider(360), lineHeight: 1.6 }}>
              {bankDetails.subtitle}
            </Typography>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          {banks.length ? (
            <PaymentCategoryRow
              icon={ShieldIcon}
              title="Banks"
              subtitle="Direct and secure bank transfers."
              panelSx={panelSx}
            >
              {banks.map((method) => (
                <PaymentBadge key={method.id} method={method} surfaceBorderColor={surfaceBorderColor} />
              ))}
            </PaymentCategoryRow>
          ) : null}

          {ewallets.length ? (
            <PaymentCategoryRow
              icon={CardIcon}
              title="E-Wallet"
              subtitle="Fast and easy payments."
              panelSx={panelSx}
            >
              {ewallets.map((method) => (
                <PaymentBadge key={method.id} method={method} surfaceBorderColor={surfaceBorderColor} />
              ))}
            </PaymentCategoryRow>
          ) : null}

          <ComingSoonRow panelSx={panelSx} />
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1.5, sm: 3 }}
        justifyContent="center"
        alignItems="center"
        sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: surfaceBorderColor }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <ShieldIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            Your transactions are <strong>secure and protected.</strong>
          </Typography>
        </Stack>
        <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
          Need help? <strong>Contact us anytime.</strong>
        </Typography>
      </Stack>
    </Box>
  );
}
