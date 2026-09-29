import { useEffect, useMemo } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useOutletContext, useParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { TruckIcon } from "../components/icons.jsx";
import {
  STATUS_COLOR,
  migrateOrderStatus,
  orderNeedsBalancePayment,
  orderOutstandingBalance,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { orderCustomerDisplayTotal } from "../lib/orderRevenue.js";
import { orderOpenCredit } from "../lib/orderCredit.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useOrders, getOrdersForEmail } from "../lib/ordersStore.jsx";
import { parseConsolidatedOrderId } from "../lib/orderIds.js";
import { setAuthSurface } from "../auth/authSurface.js";
import CustomerConsolidatedOrderPage, { ConsolidatedOrderRedirect } from "./CustomerConsolidatedOrderPage.jsx";
import {
  BalanceDueBadge,
  CustomerBackToOrders,
  formatDeliverTo,
  OrderLineItem,
  SummaryRow,
} from "../components/customerOrderStatus.jsx";

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { user, isCustomer, loading } = useAuth();
  const { orders: allOrders, ordersReady } = useOrders();

  useEffect(() => {
    setAuthSurface("customer");
  }, []);

  const customerOrders = useMemo(
    () => getOrdersForEmail(allOrders, user?.email),
    [allOrders, user?.email],
  );
  const order = useMemo(
    () => customerOrders.find((entry) => entry.id === orderId) || null,
    [customerOrders, orderId],
  );
  const lineItems = order?.lineItems ?? [];

  useEffect(() => {
    if (window.location.hash !== "#balance-proof") return;
    const el = document.querySelector("[data-balance-proof]");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ordersReady, order]);

  if (parseConsolidatedOrderId(orderId)) {
    return <CustomerConsolidatedOrderPage />;
  }

  if (order?.mergedSetId) {
    return <ConsolidatedOrderRedirect order={order} />;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 }, width: "100%" }}>
      <CustomerBackToOrders />

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
                variant="outlined"
                color={STATUS_COLOR[migrateOrderStatus(order.status)] || "default"}
                sx={{ height: 22, fontWeight: 700, fontSize: "0.62rem", borderRadius: 999 }}
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
            {orderOpenCredit(order) > 0 ? (
              <SummaryRow label="Order credit">
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "warning.main" }}>
                  {PESO.format(orderOpenCredit(order))}
                </Typography>
              </SummaryRow>
            ) : null}
          </Box>

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
