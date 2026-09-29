import { useEffect, useMemo } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Navigate, useOutletContext, useParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { TruckIcon } from "../components/icons.jsx";
import {
  getOrderLineItems,
  itemNeedsRefundDetails,
  orderNeedsBalancePayment,
  orderOutstandingBalance,
  pendingRefundAmountForOrder,
} from "../data/orderWorkflow.js";
import { orderOpenCredit } from "../lib/orderCredit.js";
import { compareOrdersByOrderNo, findCustomerConsolidatedSet, parseConsolidatedOrderId } from "../lib/orderIds.js";
import { orderCustomerDisplayTotal } from "../lib/orderRevenue.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useOrders, getOrdersForEmail } from "../lib/ordersStore.jsx";
import { setAuthSurface } from "../auth/authSurface.js";
import CustomerRefundDetails, { CustomerBalanceDueNotice } from "../components/CustomerRefundDetails.jsx";
import {
  CustomerBackToOrders,
  formatDeliverTo,
  OrderLineItem,
} from "../components/customerOrderStatus.jsx";

function summarizeSet(orders) {
  return {
    total: orders.reduce((sum, order) => sum + (orderCustomerDisplayTotal(order) || 0), 0),
    outstanding: orders.reduce((sum, order) => sum + (orderOutstandingBalance(order) || 0), 0),
    needsPay: orders.some((order) => orderNeedsBalancePayment(order)),
    credit: orders.reduce((sum, order) => sum + (orderOpenCredit(order) || 0), 0),
    refund: orders.reduce((sum, order) => sum + (pendingRefundAmountForOrder(order) || 0), 0),
    needsRefund: orders.some((order) => getOrderLineItems(order).some((item) => itemNeedsRefundDetails(item))),
    productCount: orders.reduce((sum, order) => sum + (getOrderLineItems(order).length || 1), 0),
  };
}

export default function CustomerConsolidatedOrderPage() {
  const { orderId, setId: setIdParam } = useParams();
  const setId = setIdParam || orderId;
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { user, isCustomer, loading } = useAuth();
  const { orders: allOrders, ordersReady } = useOrders();

  useEffect(() => {
    setAuthSurface("customer");
  }, []);

  const mine = useMemo(() => getOrdersForEmail(allOrders, user?.email), [allOrders, user?.email]);
  const set = useMemo(() => findCustomerConsolidatedSet(mine, setId), [mine, setId]);
  const memberOrders = useMemo(
    () => [...(set?.orders || [])].sort(compareOrdersByOrderNo),
    [set],
  );
  const summary = useMemo(() => summarizeSet(memberOrders), [memberOrders]);

  useEffect(() => {
    if (window.location.hash !== "#balance-proof") return;
    const el = document.querySelector("[data-balance-proof]");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ordersReady, set]);
  const groupedAt = useMemo(() => {
    let latest = "";
    for (const order of memberOrders) {
      const stamp = String(order.mergedAt || order.createdAt || "");
      if (stamp && stamp > latest) latest = stamp;
    }
    return latest;
  }, [memberOrders]);
  const fulfillmentOrder = memberOrders[0];
  const items = useMemo(
    () => memberOrders.flatMap((order) => (
      getOrderLineItems(order).map((item) => ({ order, item }))
    )),
    [memberOrders],
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 }, width: "100%" }}>
      <CustomerBackToOrders />

      {!isCustomer && !loading ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>Please sign in to view this order.</Typography>
        </Box>
      ) : !ordersReady && !set ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center", color: "text.secondary" }}>
          <Typography>Loading order…</Typography>
        </Box>
      ) : !set ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>Consolidated order not found.</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5, fontSize: "0.88rem" }}>
            It may belong to a different account, or the link is out of date.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ ...panelSx, overflow: "hidden" }}>
          <Box sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "flex-start" }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "1.15rem" }}>
                    {set.displayId || set.id}
                  </Typography>
                  <Chip
                    label="Consolidated"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 800, fontSize: "0.62rem", height: 22, letterSpacing: 0.4 }}
                  />
                </Stack>
                <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 0.25 }}>
                  {memberOrders.length} {memberOrders.length === 1 ? "order" : "orders"} · {summary.productCount} {summary.productCount === 1 ? "product" : "products"}
                  {groupedAt ? ` · Grouped ${formatOrderTimestamp({ createdAt: groupedAt })}` : ""}
                </Typography>
              </Box>
              <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.35rem" }}>
                  {PESO.format(summary.total)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>Combined total</Typography>
              </Box>
            </Stack>

            {fulfillmentOrder ? (
              <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 0.85 }}>
                <TruckIcon sx={{ fontSize: 16, color: "text.secondary", mt: 0.15, flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                  {fulfillmentOrder.fulfillment === "pickup" ? "Pickup" : "Deliver to"} · {formatDeliverTo(fulfillmentOrder)}
                  {summary.credit > 0 ? ` · Credit ${PESO.format(summary.credit)}` : ""}
                </Typography>
              </Stack>
            ) : null}

            {summary.needsRefund || (summary.outstanding > 0 && summary.needsPay) ? (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {summary.needsRefund ? (
                  <CustomerRefundDetails amount={summary.refund} active embedded />
                ) : null}
                {summary.outstanding > 0 && summary.needsPay ? (
                  <CustomerBalanceDueNotice amount={summary.outstanding} embedded />
                ) : null}
              </Stack>
            ) : null}
          </Box>

          <Divider sx={{ borderColor: surfaceBorderColor }} />

          <Box sx={{ p: { xs: 2, md: 2.5 } }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.72rem", fontFamily: MONO_FONT, letterSpacing: 0.6, textTransform: "none", color: "text.secondary", mb: 0.5 }}>
              Order details
            </Typography>
            {items.length ? items.map(({ order, item }, index) => (
              <Box
                key={`${order.id}-${item.id}`}
                sx={{
                  borderTop: index === 0 ? "none" : "1px solid",
                  borderColor: surfaceBorderColor,
                }}
              >
                <OrderLineItem
                  order={order}
                  item={item}
                  surfaceBorderColor={surfaceBorderColor}
                  sourceOrderId={order.id}
                  hideRefund
                  flush
                />
              </Box>
            )) : (
              <Typography sx={{ fontSize: "0.9rem" }}>No items in this set.</Typography>
            )}
          </Box>
        </Box>
      )}
    </Container>
  );
}

export function ConsolidatedOrderRedirect({ order }) {
  const setId = String(order?.mergedSetId || "").trim();
  if (!setId || parseConsolidatedOrderId(order?.id)) return null;
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  return <Navigate to={`/account/orders/${encodeURIComponent(setId)}${hash}`} replace />;
}
