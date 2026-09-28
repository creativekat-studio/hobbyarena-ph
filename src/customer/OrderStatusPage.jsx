import { useEffect, useMemo } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { Link as RouterLink, useOutletContext, useParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { CardIcon, TruckIcon } from "../components/icons.jsx";
import {
  PAYMENT_COLOR,
  STATUS_COLOR,
  getMilestoneProgress,
  itemNeedsBalanceProof,
  itemOutstandingBalance,
  lineItemTrailLabel,
  migrateOrderStatus,
  migratePaymentStatus,
  orderNeedsBalancePayment,
  orderOutstandingBalance,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { lineItemAmount, orderCustomerDisplayTotal } from "../lib/orderRevenue.js";
import { orderOpenCredit } from "../lib/orderCredit.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useOrders, getOrdersForEmail } from "../lib/ordersStore.jsx";
import { setAuthSurface } from "../auth/authSurface.js";
import CustomerBalanceProofUpload from "../components/CustomerBalanceProofUpload.jsx";
import CustomerRefundDetails from "../components/CustomerRefundDetails.jsx";
import CustomerAdminAttachments from "../components/CustomerAdminAttachments.jsx";

const balancePulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55); }
  70% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
`;

/** Shows an outstanding balance — urgent (pay-now) or a muted "remaining" note. */
function BalanceDueBadge({ amount, urgent, sx }) {
  if (urgent) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.6,
          borderRadius: 99,
          bgcolor: "warning.main",
          color: "warning.contrastText",
          fontWeight: 800,
          fontSize: "0.72rem",
          letterSpacing: 0.2,
          animation: `${balancePulse} 1.8s ease-out infinite`,
          ...sx,
        }}
      >
        <Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "warning.contrastText" }} />
        Balance due · Pay {PESO.format(amount)}
      </Box>
    );
  }
  return (
    <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", fontWeight: 600, ...sx }}>
      {PESO.format(amount)} balance remaining
    </Typography>
  );
}

function formatDeliverTo(order) {
  if (order.fulfillment === "pickup") return "Store pickup";
  const address = order.address;
  if (!address) return "Delivery";
  if (typeof address === "string") return address;
  const parts = [address.street, address.city, address.province, address.postal].filter(Boolean);
  return parts.length ? parts.join(", ") : "Delivery";
}

/** Horizontal customer-facing status tracker for a single line item. */
function MilestoneTracker({ item }) {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const { steps, activeStep, done } = getMilestoneProgress(item);

  return (
    <Stack direction="row" alignItems="flex-start" sx={{ mt: 2.5, mb: 1, overflowX: "auto", pb: 1.5, pt: 0.5 }}>
      {steps.map((step, index) => {
        const isComplete = done || index < activeStep;
        const isCurrent = !done && index === activeStep;
        const dotColor = isComplete || isCurrent ? accent : alpha(theme.palette.text.primary, 0.22);
        const isLast = index === steps.length - 1;
        return (
          <Box key={step.key} sx={{ flex: 1, minWidth: { xs: 110, sm: 128 }, position: "relative", textAlign: "center", px: { xs: 1, sm: 1.25 } }}>
            {!isLast ? (
              <Box
                sx={{
                  position: "absolute",
                  top: 9,
                  left: "50%",
                  right: `-50%`,
                  height: 2,
                  bgcolor: index < activeStep || done ? accent : alpha(theme.palette.text.primary, 0.16),
                }}
              />
            ) : null}
            <Box
              sx={{
                position: "relative",
                zIndex: 1,
                width: 18,
                height: 18,
                mx: "auto",
                borderRadius: "50%",
                bgcolor: isComplete ? accent : "background.paper",
                border: "2px solid",
                borderColor: dotColor,
                boxShadow: isCurrent ? `0 0 0 4px ${alpha(accent, 0.18)}` : "none",
              }}
            />
            <Typography
              sx={{
                mt: 1.25,
                fontSize: "0.7rem",
                lineHeight: 1.4,
                fontWeight: isCurrent ? 800 : 600,
                color: isComplete || isCurrent ? "text.primary" : "text.secondary",
                textTransform: "none",
                px: 0.5,
              }}
            >
              {step.label}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

function SummaryRow({ label, children }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography sx={{ width: 120, flexShrink: 0, color: "text.secondary", fontSize: "0.82rem", fontFamily: MONO_FONT, letterSpacing: 0.3 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}

function OrderLineItem({ order, item, surfaceBorderColor }) {
  const theme = useTheme();
  const payment = migratePaymentStatus(item.payment);
  const status = migrateOrderStatus(item.status);
  const lineTotal = lineItemAmount(item);

  return (
    <Box sx={{ border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1.5, p: { xs: 2, md: 2.5 } }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 72,
            height: 72,
            flexShrink: 0,
            borderRadius: 1.5,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: alpha(theme.palette.text.primary, 0.04),
            border: "1px solid",
            borderColor: surfaceBorderColor,
          }}
        >
          {item.image ? (
            <Box component="img" src={item.image} alt={item.name} loading="lazy" decoding="async" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <CardIcon sx={{ fontSize: 30, color: "text.disabled" }} />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.35 }}>{lineItemTrailLabel(item)}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", fontFamily: MONO_FONT, mt: 0.25 }}>
            Qty {item.quantity ?? 1} · {PESO.format(lineTotal)}
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25, mb: 0 }}>
            {item.tag ? <Chip label={item.tag} size="small" variant="outlined" sx={{ fontSize: "0.62rem", height: 22 }} /> : null}
            {status ? (
              <Chip label={orderStatusLabel(status)} size="small" color={STATUS_COLOR[status] || "default"} sx={{ fontWeight: 700, fontSize: "0.62rem", height: 22 }} />
            ) : null}
            <Chip label={payment} size="small" color={PAYMENT_COLOR[payment] || "default"} variant="outlined" sx={{ fontSize: "0.62rem", height: 22 }} />
          </Stack>
        </Box>

        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          {itemOutstandingBalance(item) > 0 ? (
            <Typography sx={{ fontSize: "0.72rem", color: itemNeedsBalanceProof(item) ? "warning.main" : "text.secondary", fontWeight: 700 }}>
              {PESO.format(itemOutstandingBalance(item))} {itemNeedsBalanceProof(item) ? "due" : "remaining"}
            </Typography>
          ) : null}
          {(item.allocatedQty ?? 0) > 0 ? (
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", fontFamily: MONO_FONT, mt: 0.25 }}>
              Allocated {item.allocatedQty}/{item.quantity ?? 1}
            </Typography>
          ) : null}
        </Box>
      </Stack>

      <MilestoneTracker item={item} />

      <Box sx={{ mt: 2.25 }}>
        <CustomerAdminAttachments order={order} item={item} surfaceBorderColor={surfaceBorderColor} />
        <CustomerBalanceProofUpload order={order} item={item} surfaceBorderColor={surfaceBorderColor} />
        <CustomerRefundDetails order={order} item={item} surfaceBorderColor={surfaceBorderColor} />
      </Box>
    </Box>
  );
}

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { user, isCustomer, loading } = useAuth();
  const { orders: allOrders, ordersReady } = useOrders();

  useEffect(() => {
    setAuthSurface("customer");
  }, []);

  const order = useMemo(() => {
    const mine = getOrdersForEmail(allOrders, user?.email);
    return mine.find((o) => o.id === orderId) || null;
  }, [allOrders, user?.email, orderId]);

  const lineItems = order?.lineItems ?? [];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 }, width: "100%" }}>
      <Box
        component={RouterLink}
        to="/account"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, mb: 2, color: "text.secondary", textDecoration: "none", fontFamily: MONO_FONT, fontSize: "0.75rem", letterSpacing: 0.6, textTransform: "none", "&:hover": { color: "primary.main" } }}
      >
        ← Back to my orders
      </Box>

      {!isCustomer && !loading ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>Please sign in to view this order.</Typography>
        </Box>
      ) : !ordersReady && !order ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center", color: "text.secondary" }}>
          <Typography>Loading order…</Typography>
        </Box>
      ) : !order ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>Order not found.</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5, fontSize: "0.88rem" }}>
            It may belong to a different account, or the link is out of date.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {/* Header */}
          <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "flex-start" }}>
              <Box>
                <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "1.15rem" }}>{order.id}</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 0.25 }}>
                  {lineItems.length || 1} {(lineItems.length || 1) === 1 ? "product" : "products"} · Placed {formatOrderTimestamp(order)}
                </Typography>
                {order.type ? (
                  <Chip label={order.type} size="small" variant="outlined" color={order.type === "Pre-order" ? "secondary" : "default"} sx={{ mt: 1, fontFamily: MONO_FONT, fontSize: "0.65rem" }} />
                ) : null}
              </Box>
              <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.35rem" }}>
                  {PESO.format(orderCustomerDisplayTotal(order))}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>Final price</Typography>
                {orderOutstandingBalance(order) > 0 ? (
                  <BalanceDueBadge
                    amount={orderOutstandingBalance(order)}
                    urgent={orderNeedsBalancePayment(order)}
                    sx={{ mt: 0.75 }}
                  />
                ) : null}
              </Box>
            </Stack>

            <Divider sx={{ my: 2, borderColor: surfaceBorderColor }} />

            <SummaryRow label="Status">
              <Chip
                label={orderStatusLabel(migrateOrderStatus(order.status))}
                size="small"
                color={STATUS_COLOR[migrateOrderStatus(order.status)] || "default"}
                sx={{ fontWeight: 700, fontSize: "0.68rem" }}
              />
            </SummaryRow>
            <SummaryRow label="Placed on">
              <Typography sx={{ fontSize: "0.88rem", fontFamily: MONO_FONT }}>{formatOrderTimestamp(order)}</Typography>
            </SummaryRow>
            <SummaryRow label={order.fulfillment === "pickup" ? "Collection" : "Deliver to"}>
              <Stack direction="row" spacing={0.75} alignItems="flex-start">
                <TruckIcon sx={{ fontSize: 18, color: "text.secondary", mt: 0.15, flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.88rem" }}>{formatDeliverTo(order)}</Typography>
              </Stack>
            </SummaryRow>
            <SummaryRow label="Final price">
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 800 }}>{PESO.format(orderCustomerDisplayTotal(order))}</Typography>
            </SummaryRow>
            {orderOpenCredit(order) > 0 ? (
              <SummaryRow label="Order credit">
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "warning.main" }}>
                  {PESO.format(orderOpenCredit(order))}
                </Typography>
              </SummaryRow>
            ) : null}
          </Box>

          {/* Line items with status trackers */}
          <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.72rem", fontFamily: MONO_FONT, letterSpacing: 0.6, textTransform: "none", color: "text.secondary", mb: 1.5 }}>
              Items &amp; progress
            </Typography>
            <Stack spacing={2}>
              {lineItems.length ? lineItems.map((item) => (
                <OrderLineItem key={item.id} order={order} item={item} surfaceBorderColor={surfaceBorderColor} />
              )) : (
                <Typography sx={{ fontSize: "0.9rem" }}>{order.items}</Typography>
              )}
            </Stack>
          </Box>
        </Stack>
      )}
    </Container>
  );
}
