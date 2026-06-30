import {
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import ConfettiBurst from "../components/ConfettiBurst.jsx";

function GoldRule({ children, sx }) {
  const theme = useTheme();
  const gold = theme.palette.primary.main;

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={sx}>
      <Box sx={{ flex: 1, height: 1, bgcolor: alpha(gold, 0.4) }} />
      {children}
      <Box sx={{ flex: 1, height: 1, bgcolor: alpha(gold, 0.4) }} />
    </Stack>
  );
}

function SummaryRow({ icon, label, value, valueColor = "text.primary" }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box sx={{ color: "primary.main", display: "flex", flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            fontWeight: 800,
            fontFamily: MONO_FONT,
            fontSize: "0.82rem",
            letterSpacing: 0.5,
            color: valueColor,
            lineHeight: 1.35,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

function ClockIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" width={22} height={22} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-.75 3.5a.75.75 0 0 1 1.5 0v4.69l3.22 1.84a.75.75 0 1 1-.74 1.3l-3.5-2A.75.75 0 0 1 11.25 12V7.5z" />
    </Box>
  );
}

function WalletIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" width={22} height={22} fill="currentColor">
      <path d="M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75V8h-1.5V6.75c0-.69-.56-1.25-1.25-1.25H6.75c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25H17.25c.69 0 1.25-.56 1.25-1.25V16H20v1.25A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75zM16.5 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm3.75-1.5H20a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-.75a1.5 1.5 0 1 1 0-3H20v-3h-.75a1.5 1.5 0 1 1 0-3z" />
    </Box>
  );
}

export default function CheckoutConfirmation({ order, panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const gold = theme.palette.primary.main;
  const dividerBorder = alpha(theme.palette.divider, 0.55);
  const total = Number(order?.total) || 0;
  const balanceDue = Number(order?.balanceDue) || 0;

  return (
    <>
      <ConfettiBurst />
      <Box
        sx={{
          ...panelSx,
          p: { xs: 3.5, md: 4.5 },
          textAlign: "center",
          maxWidth: 520,
          width: "100%",
          border: "1px solid",
          borderColor: alpha(gold, 0.45),
          boxShadow: `0 24px 64px ${alpha("#000", 0.28)}, inset 0 1px 0 ${alpha(gold, 0.12)}`,
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: "2px solid",
            borderColor: gold,
            bgcolor: alpha(gold, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2.5,
          }}
        >
          <Typography sx={{ fontSize: "1.75rem", lineHeight: 1 }} aria-hidden>
            ✓
          </Typography>
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 1.25 }}>
          <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.1, color: gold }}>
            Hooray!
          </Typography>
          <Typography component="span" sx={{ fontSize: "2rem", lineHeight: 1 }}>
            🎉
          </Typography>
        </Stack>

        <GoldRule sx={{ mb: 2 }}>
          <Typography
            variant="overline"
            sx={{
              color: "success.main",
              fontWeight: 800,
              letterSpacing: 2.2,
              fontFamily: MONO_FONT,
              fontSize: "0.68rem",
              whiteSpace: "nowrap",
            }}
          >
            Payment proof received
          </Typography>
        </GoldRule>

        <Typography color="text.secondary" sx={{ lineHeight: 1.65, fontSize: "0.92rem" }}>
          Your payment proof for{" "}
          <Box component="strong" sx={{ color: gold, fontWeight: 800 }}>
            Order #{order?.id}
          </Box>{" "}
          has been successfully submitted and is currently under review.
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 1.75, lineHeight: 1.65, fontSize: "0.92rem" }}>
          Our team will verify that the payment has been received in our bank account. Once verification has been
          completed, we will send a confirmation email with the status of your order.
        </Typography>

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: alpha(theme.palette.info.main, 0.35),
            bgcolor: alpha(theme.palette.info.main, 0.08),
          }}
        >
          <SummaryRow icon={<ClockIcon />} label="Status" value="PENDING VERIFICATION" valueColor="success.main" />
          <Divider sx={{ my: 1.5, borderColor: dividerBorder }} />
          <SummaryRow icon={<WalletIcon />} label="Amount" value={PESO.format(total)} valueColor={gold} />
          {balanceDue > 0 ? (
            <>
              <Divider sx={{ my: 1.5, borderColor: dividerBorder }} />
              <SummaryRow
                icon={<WalletIcon />}
                label="Balance before release"
                value={PESO.format(balanceDue)}
                valueColor="text.secondary"
              />
            </>
          ) : null}
        </Box>

        <Typography sx={{ color: "text.secondary", fontSize: "0.88rem", lineHeight: 1.5, mt: 3 }}>
          <Box component="span" sx={{ color: gold, mr: 0.5 }}>♥</Box>
          Thank you for choosing{" "}
          <Box component="strong" sx={{ color: gold, fontWeight: 800 }}>
            Hobby Arena.
          </Box>
        </Typography>

        {order?.email ? (
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mt: 1.5, lineHeight: 1.5 }}>
            We&apos;ll email updates to <strong>{order.email}</strong> once your payment is verified.
          </Typography>
        ) : null}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center" sx={{ mt: 3 }}>
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            size="large"
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", px: 3 }}
          >
            Back to shop
          </Button>
          {order?.userId ? (
            <Button
              component={RouterLink}
              to="/account"
              variant="outlined"
              color="inherit"
              size="large"
              sx={{
                borderColor: surfaceBorderColor,
                fontFamily: MONO_FONT,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              View account
            </Button>
          ) : null}
        </Stack>
      </Box>
    </>
  );
}
