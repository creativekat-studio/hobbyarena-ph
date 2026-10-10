import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { Link as RouterLink } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCustomers } from "../lib/customersStore.jsx";
import { formatPayoutMethodLabel, resolvePrimaryPayoutMethod } from "../lib/customerPayoutMethods.js";
import { itemNeedsRefundDetails, refundedAmountForLineItem } from "../data/orderWorkflow.js";

const BANK_DETAILS_HREF = "/account?tab=profile#bank-details";

const processingPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55); }
  70% { box-shadow: 0 0 0 7px rgba(245, 158, 11, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
`;

function StatusNotice({ title, detail, action, embedded = false }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        mb: embedded ? 0 : 1.5,
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: alpha(theme.palette.warning.main, 0.55),
        bgcolor: alpha(theme.palette.warning.main, 0.1),
      }}
    >
      <Stack spacing={action ? 1.25 : 0} alignItems="flex-start">
        <Box>
          <Stack direction="row" spacing={0.85} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "warning.main",
                flexShrink: 0,
                animation: `${processingPulse} 1.8s ease-out infinite`,
              }}
            />
            <Typography sx={{ fontWeight: 800, fontSize: "0.88rem", lineHeight: 1.3 }}>
              {title}
            </Typography>
          </Stack>
          {detail ? (
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.55, lineHeight: 1.4, pl: 2.1 }}>
              {detail}
            </Typography>
          ) : null}
        </Box>
        {action || null}
      </Stack>
    </Box>
  );
}

export default function CustomerRefundDetails({ order, item, amount, active = false, embedded = false }) {
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
  const amountLabel = refundAmount > 0 ? PESO.format(refundAmount) : "your payment";
  const actionSx = {
    fontFamily: MONO_FONT,
    fontSize: "0.72rem",
    fontWeight: 800,
    letterSpacing: 0.5,
    boxShadow: "none",
    "&:hover": { boxShadow: "none" },
  };

  return (
    <StatusNotice
      embedded={embedded}
      title={`Refund · ${amountLabel}`}
      detail={primary
        ? `We will refund on your primary${primaryLabel ? ` · ${primaryLabel}` : ""}.`
        : "Add the account we should refund."}
      action={primary ? (
        <Button
          component={RouterLink}
          to={BANK_DETAILS_HREF}
          size="small"
          variant="contained"
          color="warning"
          sx={actionSx}
        >
          Change it now
        </Button>
      ) : (
        <Stack direction="row" spacing={1}>
          <Button
            component={RouterLink}
            to={BANK_DETAILS_HREF}
            size="small"
            variant="contained"
            color="warning"
            sx={actionSx}
          >
            Upload now
          </Button>
          <Button
            component={RouterLink}
            to={BANK_DETAILS_HREF}
            size="small"
            variant="outlined"
            color="warning"
            sx={actionSx}
          >
            Set now
          </Button>
        </Stack>
      )}
    />
  );
}
