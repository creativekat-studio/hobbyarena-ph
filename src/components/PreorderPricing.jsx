import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { calcPreorderPricing, getDepositPercent, isPreorderProduct } from "../lib/preorder.js";
import { usePreorderDisplay } from "../lib/preorderDisplayLayout.jsx";

function PercentHighlight({ percent, timing, amount, pesoFormatter, compact, tone = "now" }) {
  const theme = useTheme();
  const isNow = tone === "now";
  const accent = isNow ? theme.palette.primary.main : (theme.palette.secondary?.main ?? theme.palette.warning.main);

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        px: compact ? 1 : 1.25,
        py: compact ? 0.75 : 0.85,
        borderRadius: 1,
        bgcolor: alpha(accent, isNow ? 0.14 : 0.1),
        border: "1px solid",
        borderColor: alpha(accent, isNow ? 0.45 : 0.35),
        boxShadow: isNow ? `0 0 0 1px ${alpha(accent, 0.08)} inset` : "none",
      }}
    >
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: compact ? "0.68rem" : "0.72rem",
          fontWeight: 800,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: accent,
          lineHeight: 1.2,
        }}
      >
        {percent}% {timing}
      </Typography>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: compact ? "1rem" : "1.05rem",
          color: isNow ? "primary.main" : "text.primary",
          lineHeight: 1.25,
          mt: 0.2,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {pesoFormatter.format(amount)}
      </Typography>
    </Box>
  );
}

function SplitPricing({ depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter }) {
  return (
    <Stack spacing={compact ? 0.75 : 1}>
      {showFullPrice ? (
        <Typography sx={{ fontSize: compact ? "0.72rem" : "0.82rem", color: "text.secondary" }}>
          Full price: <strong>{pesoFormatter.format(fullPrice)}</strong>
        </Typography>
      ) : null}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: compact ? 0.75 : 1,
        }}
      >
        <PercentHighlight percent={depositPercent} timing="now" amount={deposit} pesoFormatter={pesoFormatter} compact={compact} tone="now" />
        <PercentHighlight percent={balancePercent} timing="later" amount={balance} pesoFormatter={pesoFormatter} compact={compact} tone="later" />
      </Box>
    </Stack>
  );
}

function InlinePricing({ depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter }) {
  return (
    <Stack spacing={0.75}>
      {showFullPrice ? (
        <Typography sx={{ fontSize: compact ? "0.68rem" : "0.82rem", color: "text.secondary", fontFamily: MONO_FONT }}>
          Full {pesoFormatter.format(fullPrice)}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        <PercentHighlight percent={depositPercent} timing="now" amount={deposit} pesoFormatter={pesoFormatter} compact={compact} tone="now" />
        <PercentHighlight percent={balancePercent} timing="later" amount={balance} pesoFormatter={pesoFormatter} compact={compact} tone="later" />
      </Stack>
    </Stack>
  );
}

function BadgesPricing({ depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter }) {
  return (
    <Stack spacing={0.75}>
      {showFullPrice ? (
        <Typography sx={{ fontSize: compact ? "0.68rem" : "0.78rem", color: "text.secondary" }}>
          Full price <strong>{pesoFormatter.format(fullPrice)}</strong>
        </Typography>
      ) : null}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        <PercentHighlight percent={depositPercent} timing="now" amount={deposit} pesoFormatter={pesoFormatter} compact={compact} tone="now" />
        <PercentHighlight percent={balancePercent} timing="later" amount={balance} pesoFormatter={pesoFormatter} compact={compact} tone="later" />
      </Stack>
    </Stack>
  );
}

function DepositFirstPricing({ depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter }) {
  return (
    <Stack spacing={0.75}>
      <PercentHighlight percent={depositPercent} timing="now" amount={deposit} pesoFormatter={pesoFormatter} compact={compact} tone="now" />
      <PercentHighlight percent={balancePercent} timing="later" amount={balance} pesoFormatter={pesoFormatter} compact={compact} tone="later" />
      {showFullPrice ? (
        <Typography sx={{ fontSize: compact ? "0.68rem" : "0.78rem", color: "text.secondary", fontFamily: MONO_FONT }}>
          Full price {pesoFormatter.format(fullPrice)}
        </Typography>
      ) : null}
    </Stack>
  );
}

export default function PreorderPricing({
  product,
  compact = false,
  showFullPrice = true,
  pesoFormatter = PESO,
  variant: variantProp,
}) {
  const { pricingVariant } = usePreorderDisplay();
  const variant = variantProp ?? pricingVariant;

  if (!isPreorderProduct(product)) return null;

  const { depositPercent, balancePercent, deposit, balance, fullPrice } = calcPreorderPricing(
    product.price,
    getDepositPercent(product),
  );

  const props = { depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter };

  if (variant === "badges") return <BadgesPricing {...props} />;
  if (variant === "depositFirst") return <DepositFirstPricing {...props} />;
  if (variant === "inline") return <InlinePricing {...props} />;

  return <SplitPricing {...props} />;
}
