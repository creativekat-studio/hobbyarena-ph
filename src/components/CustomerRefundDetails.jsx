import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCustomers } from "../lib/customersStore.jsx";
import { formatPayoutMethodLabel, resolvePrimaryPayoutMethod } from "../lib/customerPayoutMethods.js";
import { itemNeedsRefundDetails, refundedAmountForLineItem } from "../data/orderWorkflow.js";

const BANK_DETAILS_HREF = "/account?tab=profile#bank-details";

export default function CustomerRefundDetails({ order, item, amount, active = false }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { getCustomerProfile } = useCustomers();

  const fromItem = item ? itemNeedsRefundDetails(item) : false;
  if (!fromItem && !active) return null;

  const refundAmount = amount ?? (item
    ? (item.refundAmount ?? refundedAmountForLineItem(item, order.depositPercent ?? 30))
    : 0);
  const profile = getCustomerProfile(user?.email);
  const primary = resolvePrimaryPayoutMethod(profile);
  const primaryLabel = formatPayoutMethodLabel(primary);

  return (
    <Box
      sx={{
        mb: 1.5,
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: alpha(theme.palette.info.main, 0.35),
        bgcolor: alpha(theme.palette.info.main, 0.06),
      }}
    >
      <Stack spacing={1.25} alignItems="flex-start">
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "0.82rem" }}>
            Refund of {refundAmount > 0 ? PESO.format(refundAmount) : "your payment"} is being processed
          </Typography>
          {primary ? (
            <>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.35, lineHeight: 1.45 }}>
                We'll send it to your Primary payout account — the one you've chosen on your profile for refunds.
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.85, flexWrap: "wrap", rowGap: 0.5 }}>
                <Chip
                  size="small"
                  color="primary"
                  label="Primary"
                  sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.62rem", letterSpacing: 0.5 }}
                />
                {primaryLabel ? (
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700 }}>
                    {primaryLabel}
                  </Typography>
                ) : null}
              </Stack>
              <Typography sx={{ fontSize: "0.74rem", color: "text.secondary", mt: 0.7, lineHeight: 1.4 }}>
                Change which account is Primary anytime if you want this sent somewhere else.
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.35, lineHeight: 1.45 }}>
              We'll send it to the Primary payout account you choose on your profile. Add a bank or QR and mark it as Primary so we know where to send this refund.
            </Typography>
          )}
        </Box>
        <Button
          component={RouterLink}
          to={BANK_DETAILS_HREF}
          size="small"
          variant="outlined"
          sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
        >
          {primary ? "Manage Primary account" : "Set Primary account"}
        </Button>
      </Stack>
    </Box>
  );
}
