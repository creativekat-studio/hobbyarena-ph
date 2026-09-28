import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCustomers } from "../lib/customersStore.jsx";
import { resolvePrimaryPayoutMethod } from "../lib/customerPayoutMethods.js";
import { itemNeedsRefundDetails, refundedAmountForLineItem } from "../data/orderWorkflow.js";

const BANK_DETAILS_HREF = "/account?tab=profile#bank-details";

export default function CustomerRefundDetails({ order, item }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { getCustomerProfile } = useCustomers();

  if (!itemNeedsRefundDetails(item)) return null;

  const refundAmount = item.refundAmount ?? refundedAmountForLineItem(item, order.depositPercent ?? 30);
  const profile = getCustomerProfile(user?.email);
  const saved = resolvePrimaryPayoutMethod(profile);

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
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.35, lineHeight: 1.45 }}>
            {saved
              ? "We'll send it using the bank or QR details saved on your profile. Update them anytime if you want it sent somewhere else."
              : "Add your bank account or QR code on your profile so we can send it."}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to={BANK_DETAILS_HREF}
          size="small"
          variant="outlined"
          sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
        >
          {saved ? "View bank details" : "Add bank details"}
        </Button>
      </Stack>
    </Box>
  );
}
