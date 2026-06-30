import { Box, Divider, Stack, Typography } from "@mui/material";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import AdminSectionTitle from "./AdminSectionTitle.jsx";

function BillToSection({ billTo, compact, inline = false }) {
  if (!billTo) return null;

  const lines = [
    billTo.name,
    [billTo.email, billTo.phone].filter(Boolean).join(" · "),
    billTo.address,
    billTo.notes ? `Note: ${billTo.notes}` : null,
  ].filter(Boolean);

  if (!lines.length) return null;

  return (
    <Box sx={inline ? { minWidth: 0 } : { mb: 2, pb: 2, borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
      <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT, mb: 0.75, letterSpacing: 0.4 }}>
        DELIVER TO
      </Typography>
      <Stack spacing={0.35}>
        {lines.map((line, index) => (
          <Typography
            key={line}
            sx={{
              fontWeight: index === 0 ? 600 : 400,
              fontSize: compact ? "0.88rem" : "0.92rem",
              lineHeight: 1.45,
              color: line.startsWith("Note:") ? "text.secondary" : "text.primary",
              fontStyle: line.startsWith("Note:") ? "italic" : undefined,
            }}
          >
            {line}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

function TotalsSection({
  subtotal,
  shippingFee,
  total,
  balanceDue,
  refundedAmount = 0,
  hasPreorder,
  showShipping,
  shippingLabel,
  subtotalLabel,
  totalLabel,
}) {
  const resolvedSubtotalLabel = subtotalLabel ?? (hasPreorder ? "Deposit due now" : "Subtotal");
  const resolvedTotalLabel = totalLabel ?? (hasPreorder ? "Pay now" : "Total");

  return (
    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Typography color="text.secondary">{resolvedSubtotalLabel}</Typography>
        <Typography sx={{ flexShrink: 0 }}>{PESO.format(subtotal)}</Typography>
      </Stack>
      {hasPreorder && balanceDue > 0 ? (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography color="text.secondary">Balance before release</Typography>
          <Typography sx={{ color: "text.secondary", flexShrink: 0 }}>{PESO.format(balanceDue)}</Typography>
        </Stack>
      ) : null}
      {refundedAmount > 0 ? (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography color="text.secondary">Refunded amount</Typography>
          <Typography sx={{ color: "error.main", fontWeight: 700, flexShrink: 0 }}>{PESO.format(refundedAmount)}</Typography>
        </Stack>
      ) : null}
      {showShipping ? (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography color="text.secondary">Shipping</Typography>
          <Typography sx={{ textAlign: "right", maxWidth: "55%", flexShrink: 0 }}>
            {shippingFee > 0 ? PESO.format(shippingFee) : shippingLabel}
          </Typography>
        </Stack>
      ) : null}
      <Divider sx={{ my: 0.25 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2}>
        <Typography sx={{ fontWeight: 800 }}>{resolvedTotalLabel}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: "primary.main", flexShrink: 0 }}>
          {PESO.format(total)}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function OrderSummaryPanel({
  items,
  subtotal,
  shippingFee = 0,
  total,
  balanceDue = 0,
  refundedAmount = 0,
  hasPreorder = false,
  panelSx,
  compact = false,
  showShipping = true,
  shippingLabel = "At buyer\u2019s expense",
  subtotalLabel,
  totalLabel,
  renderItemExtra,
  billTo = null,
  scrollable = false,
  adminSectionTitle = false,
}) {
  const billToLines = billTo
    ? [billTo.name, billTo.email, billTo.phone, billTo.address, billTo.notes].filter(Boolean)
    : [];
  const showBillTo = billToLines.length > 0;
  const sideBySideFooter = showBillTo;

  const itemsList = (
    <Stack spacing={compact ? 1 : 1.25} divider={<Divider flexItem />}>
      {items.map((item) => (
        <Stack key={item.id} direction="row" justifyContent="space-between" spacing={1.5} alignItems="flex-start">
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: compact ? "0.82rem" : "0.88rem", lineHeight: 1.35 }}>
              {item.name}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>
              Qty {item.quantity}
              {item.tag === "Pre-order" ? ` · ${item.depositPercent ?? 30}% dep.` : ""}
            </Typography>
            {renderItemExtra ? renderItemExtra(item) : null}
          </Box>
          <Typography sx={{ fontWeight: 700, flexShrink: 0, fontSize: compact ? "0.85rem" : undefined }}>
            {PESO.format(item.amount ?? item.dueNow ?? 0)}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );

  const totalsProps = {
    subtotal,
    shippingFee,
    total,
    balanceDue,
    refundedAmount,
    hasPreorder,
    showShipping,
    shippingLabel,
    subtotalLabel,
    totalLabel,
  };

  const footer = sideBySideFooter ? (
    <Box
      sx={{
        flexShrink: 0,
        pt: 2,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        gap: { xs: 2, sm: 3 },
        alignItems: "start",
      }}
    >
      <BillToSection billTo={billTo} compact={compact} inline />
      <TotalsSection {...totalsProps} />
    </Box>
  ) : (
    <Box sx={{ flexShrink: 0, pt: 2, ...(scrollable ? { borderTop: "1px solid", borderColor: "divider" } : {}) }}>
      <TotalsSection {...totalsProps} />
    </Box>
  );

  return (
    <Box
      sx={{
        ...panelSx,
        p: compact ? 2 : 2.5,
        width: "100%",
        minWidth: 0,
        ...(scrollable ? {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        } : {}),
      }}
    >
      {adminSectionTitle ? (
        <AdminSectionTitle sx={{ mb: 1.5, flexShrink: 0 }}>Order summary</AdminSectionTitle>
      ) : (
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, mb: 1.5, fontSize: compact ? "1rem" : undefined, flexShrink: 0 }}
        >
          Order summary
        </Typography>
      )}

      {!sideBySideFooter && showBillTo ? (
        <BillToSection billTo={billTo} compact={compact} />
      ) : null}

      {scrollable ? (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", pr: 0.5, mr: -0.5 }}>
          {itemsList}
        </Box>
      ) : (
        itemsList
      )}

      {footer}
    </Box>
  );
}

/** @deprecated Use billTo on OrderSummaryPanel */
export function OrderContactPanel({ order, panelSx, compact = false }) {
  const address = order.address
    ? [order.address.street, order.address.city, order.address.province, order.address.postal].filter(Boolean).join(", ")
    : null;

  return (
    <OrderSummaryPanel
      compact={compact}
      panelSx={panelSx}
      items={[]}
      subtotal={0}
      total={0}
      showShipping={false}
      billTo={{
        name: order.customer,
        email: order.email,
        phone: order.phone,
        address,
        notes: order.notes,
      }}
    />
  );
}

export function OrderSummaryItemMeta({ parts = [] }) {
  const line = parts.filter(Boolean).join(" · ");
  if (!line) return null;
  return (
    <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT, mt: 0.25, lineHeight: 1.4 }}>
      {line}
    </Typography>
  );
}
