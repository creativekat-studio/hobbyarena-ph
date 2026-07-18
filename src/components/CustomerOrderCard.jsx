import { Box, Chip, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { alpha, useTheme } from "@mui/material/styles";
import {
  STATUS_COLOR,
  lineItemTrailLabel,
  migrateOrderStatus,
  orderNeedsBalancePayment,
  orderOutstandingBalance,
  orderStatusLabel,
} from "../data/orderWorkflow.js";
import { orderCustomerTotal } from "../lib/orderRevenue.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { CardIcon } from "./icons.jsx";

const MAX_THUMBS = 4;

function OrderThumb({ item, surfaceBorderColor }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 1.25,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: alpha(theme.palette.text.primary, 0.05),
        border: "1px solid",
        borderColor: surfaceBorderColor,
      }}
    >
      {item?.image ? (
        <Box component="img" src={item.image} alt={item.name || ""} loading="lazy" decoding="async" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <CardIcon sx={{ fontSize: 24, color: "text.disabled" }} />
      )}
    </Box>
  );
}

export function CustomerOrderCard({ order, surfaceBorderColor }) {
  const theme = useTheme();
  const lineItems = order.lineItems ?? [];
  const status = migrateOrderStatus(order.status);
  const thumbs = lineItems.slice(0, MAX_THUMBS);
  const extra = Math.max(0, lineItems.length - MAX_THUMBS);
  const outstanding = orderOutstandingBalance(order);
  const needsPay = orderNeedsBalancePayment(order);
  const primaryLabel = lineItems.length
    ? lineItemTrailLabel(lineItems[0])
    : order.items || "Order";
  const summaryText = lineItems.length > 1
    ? `${primaryLabel} + ${lineItems.length - 1} more`
    : primaryLabel;

  return (
    <Box
      component={RouterLink}
      to={`/account/orders/${order.id}`}
      sx={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        p: 2.5,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        transition: "border-color 160ms ease, background-color 160ms ease, transform 160ms ease",
        "&:hover": {
          borderColor: alpha(theme.palette.primary.main, 0.5),
          bgcolor: alpha(theme.palette.primary.main, 0.03),
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.75 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.95rem" }}>{order.id}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mt: 0.25 }}>
            {(lineItems.length || 1)} {(lineItems.length || 1) === 1 ? "product" : "products"} · {formatOrderTimestamp(order)}
          </Typography>
        </Box>
        <Chip
          label={orderStatusLabel(status)}
          size="small"
          color={STATUS_COLOR[status] || "default"}
          sx={{ fontWeight: 700, fontSize: "0.66rem", flexShrink: 0 }}
        />
      </Stack>

      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.75 }}>
        {thumbs.map((item, index) => (
          <OrderThumb key={item.id || index} item={item} surfaceBorderColor={surfaceBorderColor} />
        ))}
        {extra > 0 ? (
          <Box
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              borderRadius: 1.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.text.primary, 0.06),
              border: "1px solid",
              borderColor: surfaceBorderColor,
              fontFamily: MONO_FONT,
              fontWeight: 800,
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            +{extra}
          </Box>
        ) : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: "0.85rem",
              fontWeight: 600,
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {summaryText}
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Box>
          <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1rem" }}>
            {PESO.format(orderCustomerTotal(order))}
          </Typography>
          {outstanding > 0 ? (
            needsPay ? (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.6,
                  mt: 0.5,
                  px: 1,
                  py: 0.4,
                  borderRadius: 99,
                  bgcolor: "warning.main",
                  color: "warning.contrastText",
                  fontWeight: 800,
                  fontSize: "0.68rem",
                }}
              >
                <Box component="span" sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "warning.contrastText" }} />
                Pay {PESO.format(outstanding)} now
              </Box>
            ) : (
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontWeight: 600 }}>
                {PESO.format(outstanding)} balance remaining
              </Typography>
            )
          ) : null}
        </Box>
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "none",
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          View status →
        </Typography>
      </Stack>
    </Box>
  );
}
