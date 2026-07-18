import { useState } from "react";
import {
  Box,
  Checkbox,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import AdminSectionTitle from "./AdminSectionTitle.jsx";
import { SearchIcon } from "./icons.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import { OFF_WHITE } from "../lib/colors.js";

const MIXED_KIND_TOGGLE_SX = {
  fontFamily: MONO_FONT,
  fontSize: "0.68rem",
  letterSpacing: 0.4,
  textTransform: "uppercase",
  fontWeight: 700,
  px: 1.5,
};

function SummaryItemThumb({ item, compact }) {
  const theme = useTheme();
  const { getProduct } = useInventory();
  const size = compact ? 44 : 52;
  const src = item.image || getProduct?.(item.id)?.image || "";

  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: alpha(theme.palette.text.primary, 0.04),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          alt=""
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <Typography sx={{ fontSize: "0.62rem", fontFamily: MONO_FONT, color: OFF_WHITE.glyph, fontWeight: 700 }}>
          HA
        </Typography>
      )}
    </Box>
  );
}

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
  title = null,
  subtotal,
  shippingFee = 0,
  total,
  balanceDue = 0,
  balancePaid = 0,
  balanceSettled = false,
  refundedAmount = 0,
  hasPreorder,
  showShipping = true,
  shippingLabel = "At buyer\u2019s expense",
  subtotalLabel,
  totalLabel,
  footerNote = null,
  emphasizeTotal = true,
}) {
  const resolvedSubtotalLabel = subtotalLabel ?? (hasPreorder ? "Deposit due now" : "Subtotal");
  const resolvedTotalLabel = totalLabel ?? (hasPreorder ? "Pay now" : "Total");
  const awaitingAmount = balanceDue > 0 && !balanceSettled ? balanceDue : 0;
  const paidAmount = balancePaid > 0
    ? balancePaid
    : (balanceSettled && balanceDue > 0 ? balanceDue : 0);

  return (
    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
      {title ? (
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: "0.68rem",
            fontWeight: 800,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: "text.secondary",
            mb: 0.25,
          }}
        >
          {title}
        </Typography>
      ) : null}
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Typography color="text.secondary">{resolvedSubtotalLabel}</Typography>
        <Typography sx={{ flexShrink: 0 }}>{PESO.format(subtotal)}</Typography>
      </Stack>
      {awaitingAmount > 0 ? (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: "error.main", fontWeight: 600 }}>Balance due</Typography>
          <Typography sx={{ color: "error.main", fontWeight: 700, flexShrink: 0 }}>
            −{PESO.format(awaitingAmount)}
          </Typography>
        </Stack>
      ) : null}
      {paidAmount > 0 ? (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: "success.main", fontWeight: 600 }}>Balance paid</Typography>
          <Typography sx={{ color: "success.main", fontWeight: 700, flexShrink: 0 }}>
            +{PESO.format(paidAmount)}
          </Typography>
        </Stack>
      ) : null}
      {refundedAmount > 0 ? (
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: "error.main", fontWeight: 600 }}>Refunded</Typography>
          <Typography sx={{ color: "error.main", fontWeight: 700, flexShrink: 0 }}>
            −{PESO.format(refundedAmount)}
          </Typography>
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
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: emphasizeTotal ? "1.25rem" : "1rem",
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {PESO.format(total)}
        </Typography>
      </Stack>
      {footerNote ? (
        <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", lineHeight: 1.4 }}>
          {footerNote}
        </Typography>
      ) : null}
    </Stack>
  );
}

const MIXED_KIND_OPTIONS = [
  { id: "all", title: "All" },
  { id: "preorder", title: "Pre-order" },
  { id: "instock", title: "In-stock" },
];

function itemMatchesMixedKind(item, kind) {
  if (kind === "all") return true;
  const isPreorder = item.tag === "Pre-order";
  return kind === "preorder" ? isPreorder : !isPreorder;
}

function itemMatchesSearch(item, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.payment, item.status]
    .filter(Boolean)
    .some((part) => String(part).toLowerCase().includes(q));
}

function MixedKindToggle({ value, onChange }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next) => { if (next) onChange(next); }}
      sx={{ flexShrink: 0 }}
    >
      {MIXED_KIND_OPTIONS.map((option) => (
        <ToggleButton key={option.id} value={option.id} sx={MIXED_KIND_TOGGLE_SX}>
          {option.title}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function SummaryItemRow({
  item,
  compact,
  renderItemExtra,
  selectedItemIds,
  onToggleItemId,
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      {onToggleItemId ? (
        <Checkbox
          size="small"
          checked={!item.emailDisabled && (selectedItemIds?.has(item.id) ?? false)}
          disabled={Boolean(item.emailDisabled)}
          onChange={() => onToggleItemId(item.id)}
          sx={{ mt: -0.25, flexShrink: 0 }}
          inputProps={{ "aria-label": `Include ${item.name} in email` }}
        />
      ) : null}
      <SummaryItemThumb item={item} compact={compact} />
      <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: compact ? "0.82rem" : "0.88rem", lineHeight: 1.35 }}>
            {item.name}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>
            Qty {item.quantity}
            {item.allocatedQty > 0 && item.allocatedQty !== item.quantity
              ? ` · ${item.allocatedQty} allocated`
              : item.allocatedQty > 0 && item.allocatedQty === item.quantity
                ? " · fully allocated"
                : ""}
            {(item.unitPrice ?? item.price) != null
              ? ` · ${PESO.format(item.unitPrice ?? item.price)} ea`
              : ""}
            {item.tag === "Pre-order" ? ` · ${item.depositPercent ?? 30}% dep.` : ""}
          </Typography>
          {renderItemExtra ? (
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mt: 0.25, gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>{renderItemExtra(item)}</Box>
              <Typography sx={{ fontWeight: 700, flexShrink: 0, fontSize: compact ? "0.85rem" : undefined, color: "primary.main" }}>
                {PESO.format(item.amount ?? item.dueNow ?? 0)}
              </Typography>
            </Stack>
          ) : null}
        </Box>
        {!renderItemExtra ? (
          <Typography sx={{ fontWeight: 700, flexShrink: 0, fontSize: compact ? "0.85rem" : undefined, color: "primary.main" }}>
            {PESO.format(item.amount ?? item.dueNow ?? 0)}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

function ItemsStack({
  items,
  compact,
  renderItemExtra,
  selectedItemIds,
  onToggleItemId,
}) {
  return (
    <Stack spacing={compact ? 1 : 1.25} divider={<Divider flexItem />}>
      {items.map((item) => (
        <SummaryItemRow
          key={item.id}
          item={item}
          compact={compact}
          renderItemExtra={renderItemExtra}
          selectedItemIds={selectedItemIds}
          onToggleItemId={onToggleItemId}
        />
      ))}
    </Stack>
  );
}

export function OrderSummaryPanel({
  items,
  subtotal,
  shippingFee = 0,
  total,
  balanceDue = 0,
  balancePaid = 0,
  balanceSettled = false,
  refundedAmount = 0,
  hasPreorder = false,
  panelSx,
  compact = false,
  showShipping = true,
  shippingLabel = "At buyer\u2019s expense",
  subtotalLabel,
  totalLabel,
  balanceLabel,
  footerNote = null,
  /** When set (mixed unsettled orders), toggle All / Pre-order / In-stock. */
  totalsGroups = null,
  renderItemExtra,
  billTo = null,
  scrollable = false,
  adminSectionTitle = false,
  selectedItemIds,
  onToggleItemId,
  headerActions = null,
  headerNotice = null,
}) {
  const billToLines = billTo
    ? [billTo.name, billTo.email, billTo.phone, billTo.address, billTo.notes].filter(Boolean)
    : [];
  const showBillTo = billToLines.length > 0;
  const sideBySideFooter = showBillTo;
  const useMixedKind = Array.isArray(totalsGroups) && totalsGroups.length > 1;
  const [mixedKind, setMixedKind] = useState("all");
  const [itemQuery, setItemQuery] = useState("");
  const activeMixedKind = MIXED_KIND_OPTIONS.some((option) => option.id === mixedKind)
    ? mixedKind
    : "all";
  const showAllKinds = !useMixedKind || activeMixedKind === "all";
  const activeTotalsGroup = useMixedKind && !showAllKinds
    ? (totalsGroups.find((group) => (group.id || group.title) === activeMixedKind) || totalsGroups[0])
    : null;

  const searchedItems = useMixedKind
    ? items.filter((item) => itemMatchesSearch(item, itemQuery))
    : items;

  const visibleItems = useMixedKind
    ? searchedItems.filter((item) => itemMatchesMixedKind(item, activeMixedKind))
    : searchedItems;

  const itemRowProps = {
    compact,
    renderItemExtra,
    selectedItemIds,
    onToggleItemId,
  };

  const itemsList = <ItemsStack items={visibleItems} {...itemRowProps} />;

  const totalsNode = useMixedKind && activeTotalsGroup ? (
    <TotalsSection
      {...activeTotalsGroup}
      title={null}
      shippingFee={shippingFee}
      showShipping={showShipping}
      shippingLabel={shippingLabel}
      emphasizeTotal
      footerNote={footerNote}
    />
  ) : (
    <TotalsSection
      subtotal={subtotal}
      shippingFee={shippingFee}
      total={total}
      balanceDue={balanceDue}
      balancePaid={balancePaid}
      balanceSettled={balanceSettled}
      refundedAmount={refundedAmount}
      hasPreorder={hasPreorder}
      showShipping={showShipping}
      shippingLabel={shippingLabel}
      subtotalLabel={subtotalLabel}
      totalLabel={totalLabel}
      footerNote={showAllKinds ? null : footerNote}
    />
  );

  const titleNode = adminSectionTitle ? (
    <AdminSectionTitle sx={{ mb: 0 }}>Order summary</AdminSectionTitle>
  ) : (
    <Typography
      variant="h6"
      sx={{ fontWeight: 800, mb: 0, fontSize: compact ? "1rem" : undefined }}
    >
      Order summary
    </Typography>
  );

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
      {totalsNode}
    </Box>
  ) : (
    <Box sx={{ flexShrink: 0, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
      {totalsNode}
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
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        sx={{ mb: useMixedKind || headerNotice ? 1 : 1.5, flexShrink: 0 }}
      >
        {titleNode}
        {headerActions}
      </Stack>

      {useMixedKind ? (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{
            mb: headerNotice ? 1 : 1.5,
            flexShrink: 0,
            flexWrap: "wrap",
            rowGap: 1,
            width: "100%",
          }}
        >
          <TextField
            size="small"
            placeholder="Search items…"
            value={itemQuery}
            onChange={(event) => setItemQuery(event.target.value)}
            sx={{ width: { xs: "100%", sm: 220 }, maxWidth: { xs: "100%", sm: 280 }, flexShrink: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ ml: { xs: 0, sm: "auto" }, flexShrink: 0 }}>
            <MixedKindToggle value={activeMixedKind} onChange={setMixedKind} />
          </Box>
        </Stack>
      ) : null}

      {headerNotice ? (
        <Box sx={{ mb: 1.5, flexShrink: 0 }}>
          {headerNotice}
        </Box>
      ) : null}

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

      <Box sx={{ flexShrink: 0, ...(scrollable ? { mt: "auto" } : {}) }}>
        {footer}
      </Box>
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
    <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT, lineHeight: 1.4 }}>
      {line}
    </Typography>
  );
}
