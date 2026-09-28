import { useEffect, useMemo } from "react";
import {
  Box,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useOutletContext, useParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { TruckIcon } from "../components/icons.jsx";
import {
  STATUS_COLOR,
  getOrderLineItems,
  migrateOrderStatus,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { orderOpenCredit } from "../lib/orderCredit.js";
import { compareOrdersByOrderNo } from "../lib/orderIds.js";
import { customerConsolidatedCard, findCustomerConsolidatedSet } from "../lib/customerOrderGroups.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useOrders, getOrdersForEmail } from "../lib/ordersStore.jsx";
import { setAuthSurface } from "../auth/authSurface.js";
import {
  BalanceDueBadge,
  formatDeliverTo,
  OrderLineItem,
  SummaryRow,
} from "./OrderStatusPage.jsx";

export default function CustomerConsolidatedOrderPage() {
  const { setId } = useParams();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { user, isCustomer, loading } = useAuth();
  const { orders: allOrders, ordersReady } = useOrders();

  useEffect(() => {
    setAuthSurface("customer");
  }, []);

  const mine = useMemo(() => getOrdersForEmail(allOrders, user?.email), [allOrders, user?.email]);
  const set = useMemo(() => findCustomerConsolidatedSet(mine, setId), [mine, setId]);
  const card = useMemo(() => (set ? customerConsolidatedCard(set) : null), [set]);
  const memberOrders = useMemo(
    () => [...(set?.orders || [])].sort(compareOrdersByOrderNo),
    [set],
  );
  const credit = useMemo(
    () => memberOrders.reduce((sum, order) => sum + (orderOpenCredit(order) || 0), 0),
    [memberOrders],
  );
  const fulfillmentOrder = memberOrders[0];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 4 }, width: "100%" }}>
      <Box
        component={RouterLink}
        to="/account"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          mb: 2,
          color: "text.secondary",
          textDecoration: "none",
          fontFamily: MONO_FONT,
          fontSize: "0.75rem",
          letterSpacing: 0.6,
          textTransform: "none",
          "&:hover": { color: "primary.main" },
        }}
      >
        ← Back to my orders
      </Box>

      {!isCustomer && !loading ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>Please sign in to view this order.</Typography>
        </Box>
      ) : !ordersReady && !card ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center", color: "text.secondary" }}>
          <Typography>Loading order…</Typography>
        </Box>
      ) : !card ? (
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 700 }}>Consolidated order not found.</Typography>
          <Typography sx={{ color: "text.secondary", mt: 0.5, fontSize: "0.88rem" }}>
            It may belong to a different account, or the link is out of date.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2.5}>
          <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "flex-start" }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.75 }}>
                  <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "1.15rem" }}>
                    {card.id}
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
                  {memberOrders.length} {memberOrders.length === 1 ? "order" : "orders"} · {card.lineItems.length || 1} {(card.lineItems.length || 1) === 1 ? "product" : "products"} · Merged {formatOrderTimestamp({ createdAt: card.mergedAt })}
                </Typography>
              </Box>
              <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.35rem" }}>
                  {PESO.format(card.total)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>Combined final price</Typography>
                {card.outstanding > 0 ? (
                  <BalanceDueBadge
                    amount={card.outstanding}
                    urgent={card.needsPay}
                    sx={{ mt: 0.75 }}
                  />
                ) : null}
              </Box>
            </Stack>

            <Divider sx={{ my: 2, borderColor: surfaceBorderColor }} />

            <SummaryRow label="Status">
              <Chip
                label={orderStatusLabel(migrateOrderStatus(card.status))}
                size="small"
                color={STATUS_COLOR[migrateOrderStatus(card.status)] || "default"}
                sx={{ fontWeight: 700, fontSize: "0.68rem" }}
              />
            </SummaryRow>
            <SummaryRow label="Includes">
              <Typography sx={{ fontSize: "0.88rem", fontFamily: MONO_FONT }}>
                {memberOrders.map((order) => order.id).join(" · ")}
              </Typography>
            </SummaryRow>
            {fulfillmentOrder ? (
              <SummaryRow label={fulfillmentOrder.fulfillment === "pickup" ? "Collection" : "Deliver to"}>
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <TruckIcon sx={{ fontSize: 18, color: "text.secondary", mt: 0.15, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.88rem" }}>{formatDeliverTo(fulfillmentOrder)}</Typography>
                </Stack>
              </SummaryRow>
            ) : null}
            <SummaryRow label="Final price">
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 800 }}>{PESO.format(card.total)}</Typography>
            </SummaryRow>
            {credit > 0 ? (
              <SummaryRow label="Order credit">
                <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "warning.main" }}>
                  {PESO.format(credit)}
                </Typography>
              </SummaryRow>
            ) : null}
          </Box>

          <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.72rem", fontFamily: MONO_FONT, letterSpacing: 0.6, textTransform: "none", color: "text.secondary", mb: 1.5 }}>
              Items &amp; progress
            </Typography>
            <Stack spacing={2.5}>
              {memberOrders.map((order) => {
                const items = getOrderLineItems(order);
                return (
                  <Box key={order.id}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.82rem" }}>
                        {order.id}
                      </Typography>
                      <Chip
                        label={orderStatusLabel(migrateOrderStatus(order.status))}
                        size="small"
                        color={STATUS_COLOR[migrateOrderStatus(order.status)] || "default"}
                        sx={{ fontWeight: 700, fontSize: "0.6rem", height: 22 }}
                      />
                    </Stack>
                    <Stack spacing={2}>
                      {items.length ? items.map((item) => (
                        <OrderLineItem
                          key={`${order.id}-${item.id}`}
                          order={order}
                          item={item}
                          surfaceBorderColor={surfaceBorderColor}
                        />
                      )) : (
                        <Typography sx={{ fontSize: "0.9rem" }}>{order.items}</Typography>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Stack>
      )}
    </Container>
  );
}
