import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { calcPreorderPricing, getDepositPercent, isPreorderProduct } from "../lib/preorder.js";
import { usePreorderDisplay } from "../lib/preorderDisplayLayout.jsx";

function SplitPricing({ depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter }) {
  return (
    <Stack spacing={compact ? 0.75 : 1}>
      {showFullPrice ? (
        <Typography sx={{ fontSize: compact ? "0.68rem" : "0.82rem", color: "text.secondary" }}>
          Full price: <strong>{pesoFormatter.format(fullPrice)}</strong>
        </Typography>
      ) : null}
      <Stack direction={compact ? "column" : { xs: "column", sm: "row" }} spacing={compact ? 0.75 : 1.5}>
        <Stack spacing={0.25} sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", fontWeight: 800, letterSpacing: 1, color: "primary.main", textTransform: "uppercase" }}>
            Due now — {depositPercent}%
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: compact ? "1rem" : "1.35rem", color: "primary.main" }}>
            {pesoFormatter.format(deposit)}
          </Typography>
        </Stack>
        <Stack spacing={0.25} sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", fontWeight: 800, letterSpacing: 1, color: "text.secondary", textTransform: "uppercase" }}>
            Balance — {balancePercent}%
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: compact ? "0.92rem" : "1.15rem", color: "text.secondary" }}>
            {pesoFormatter.format(balance)}
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}

function InlinePricing({ depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter }) {
  return (
    <Stack spacing={0.35}>
      {showFullPrice ? (
        <Typography sx={{ fontSize: compact ? "0.68rem" : "0.82rem", color: "text.secondary", fontFamily: MONO_FONT }}>
          Full {pesoFormatter.format(fullPrice)}
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontSize: compact ? "0.72rem" : "0.85rem", fontWeight: 800, color: "primary.main", fontFamily: MONO_FONT }}>
          {depositPercent}% now {pesoFormatter.format(deposit)}
        </Typography>
        <Typography sx={{ fontSize: compact ? "0.72rem" : "0.85rem", fontWeight: 700, color: "text.secondary", fontFamily: MONO_FONT }}>
          · {balancePercent}% later {pesoFormatter.format(balance)}
        </Typography>
      </Stack>
    </Stack>
  );
}

function BadgesPricing({ depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter }) {
  const theme = useTheme();

  return (
    <Stack spacing={0.75}>
      {showFullPrice ? (
        <Typography sx={{ fontSize: compact ? "0.68rem" : "0.78rem", color: "text.secondary" }}>
          Full price <strong>{pesoFormatter.format(fullPrice)}</strong>
        </Typography>
      ) : null}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        <Chip
          label={`${depositPercent}% now · ${pesoFormatter.format(deposit)}`}
          size="small"
          sx={{
            fontFamily: MONO_FONT,
            fontWeight: 800,
            fontSize: compact ? "0.65rem" : "0.72rem",
            bgcolor: alpha(theme.palette.primary.main, 0.14),
            color: "primary.main",
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.35),
          }}
        />
        <Chip
          label={`${balancePercent}% later · ${pesoFormatter.format(balance)}`}
          size="small"
          variant="outlined"
          sx={{
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: compact ? "0.65rem" : "0.72rem",
            color: "text.secondary",
          }}
        />
      </Stack>
    </Stack>
  );
}

function DepositFirstPricing({ depositPercent, balancePercent, deposit, balance, fullPrice, showFullPrice, compact, pesoFormatter }) {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: compact ? "0.58rem" : "0.62rem", fontWeight: 800, letterSpacing: 1, color: "primary.main", textTransform: "uppercase" }}>
        {depositPercent}% deposit due now
      </Typography>
      <Typography sx={{ fontWeight: 900, fontSize: compact ? "1.15rem" : "1.75rem", color: "primary.main", lineHeight: 1.1 }}>
        {pesoFormatter.format(deposit)}
      </Typography>
      <Typography sx={{ fontSize: compact ? "0.72rem" : "0.82rem", color: "text.secondary" }}>
        {balancePercent}% balance ({pesoFormatter.format(balance)}) due before release
        {showFullPrice ? ` · Full ${pesoFormatter.format(fullPrice)}` : ""}
      </Typography>
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
