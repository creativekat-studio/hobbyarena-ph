import { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import {
  PAYMENT_COLOR,
  STATUS_COLOR,
  lineItemTrailLabel,
  migrateOrderStatus,
  orderStatusLabel,
  migratePaymentStatus,
} from "../data/orderWorkflow.js";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import CustomerBalanceProofUpload from "./CustomerBalanceProofUpload.jsx";
import CustomerRefundDetails from "./CustomerRefundDetails.jsx";
import CustomerAdminAttachments from "./CustomerAdminAttachments.jsx";

export function CustomerOrderItemRow({ item, order, surfaceBorderColor }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const payment = migratePaymentStatus(item.payment);
  const status = migrateOrderStatus(item.status);
  const lineTotal = item.lineTotal ?? (item.price ?? 0) * (item.quantity ?? 1);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: surfaceBorderColor,
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: open ? alpha(theme.palette.primary.main, 0.03) : "transparent",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={() => setOpen((value) => !value)}
        sx={{ px: 1.5, py: 1.25, cursor: "pointer", userSelect: "none" }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", lineHeight: 1.35 }}>
            {lineItemTrailLabel(item)}
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
            {item.tag ? (
              <Chip label={item.tag} size="small" variant="outlined" sx={{ fontSize: "0.62rem", height: 22 }} />
            ) : null}
            {status ? (
              <Chip
                label={orderStatusLabel(status)}
                size="small"
                color={STATUS_COLOR[status] || "default"}
                sx={{ fontWeight: 700, fontSize: "0.62rem", height: 22 }}
              />
            ) : null}
            <Chip
              label={payment}
              size="small"
              color={PAYMENT_COLOR[payment] || "default"}
              variant="outlined"
              sx={{ fontSize: "0.62rem", height: 22 }}
            />
          </Stack>
        </Box>

        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{PESO.format(lineTotal)}</Typography>
          <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", fontFamily: MONO_FONT }}>
            Qty {item.quantity ?? 1}
          </Typography>
        </Box>

        <IconButton
          size="small"
          aria-label={open ? "Hide item details" : "Show item details"}
          sx={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s ease",
            fontSize: "1rem",
            color: "text.secondary",
          }}
        >
          ▾
        </IconButton>
      </Stack>

      <Collapse in={open}>
        <Box sx={{ px: 1.5, pb: 1.5, pt: 1, borderTop: "1px dashed", borderColor: surfaceBorderColor }}>
          {(item.balanceDue ?? 0) > 0 || (item.refundAmount ?? 0) > 0 || (item.allocatedQty ?? 0) > 0 ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              {(item.balanceDue ?? 0) > 0 ? (
                <Chip
                  label={`Balance due: ${PESO.format(item.balanceDue)}`}
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 700, fontSize: "0.68rem" }}
                />
              ) : null}
              {(item.refundAmount ?? 0) > 0 ? (
                <Chip
                  label={`Refund: ${PESO.format(item.refundAmount)}`}
                  size="small"
                  color="info"
                  sx={{ fontWeight: 700, fontSize: "0.68rem" }}
                />
              ) : null}
              {(item.allocatedQty ?? 0) > 0 ? (
                <Chip
                  label={`Allocated ${item.allocatedQty} / ${item.quantity ?? 1}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: "0.68rem" }}
                />
              ) : null}
            </Stack>
          ) : null}

          <CustomerAdminAttachments
            order={order}
            item={item}
            surfaceBorderColor={surfaceBorderColor}
          />

          <CustomerBalanceProofUpload
            order={order}
            item={item}
            surfaceBorderColor={surfaceBorderColor}
          />

          <CustomerRefundDetails
            order={order}
            item={item}
            surfaceBorderColor={surfaceBorderColor}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

export function CustomerOrderCard({ order, surfaceBorderColor }) {
  const lineItems = order.lineItems ?? [];
  const multiItem = lineItems.length > 1;

  return (
    <Box sx={{ p: 2.5, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }}>
        <Box>
          <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.9rem" }}>{order.id}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mt: 0.25 }}>{order.date}</Typography>
          {order.type ? (
            <Chip
              label={order.type}
              size="small"
              variant="outlined"
              color={order.type === "Pre-order" ? "secondary" : "default"}
              sx={{ mt: 1, fontFamily: MONO_FONT, fontSize: "0.65rem" }}
            />
          ) : null}
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1rem" }}>
            {PESO.format(order.total)}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>Paid so far</Typography>
          {(order.balanceDue ?? 0) > 0 ? (
            <Typography sx={{ fontSize: "0.72rem", color: "warning.main", fontWeight: 700, mt: 0.5 }}>
              {PESO.format(order.balanceDue)} balance due
            </Typography>
          ) : null}
        </Box>
      </Stack>

      {multiItem ? (
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 1.25 }}>
          {lineItems.length} items — tap an item to see details.
        </Typography>
      ) : null}

      <Stack spacing={1}>
        {lineItems.length ? lineItems.map((item) => (
          <CustomerOrderItemRow
            key={item.id}
            item={item}
            order={order}
            surfaceBorderColor={surfaceBorderColor}
          />
        )) : (
          <Typography sx={{ fontSize: "0.88rem" }}>{order.items}</Typography>
        )}
      </Stack>
    </Box>
  );
}
