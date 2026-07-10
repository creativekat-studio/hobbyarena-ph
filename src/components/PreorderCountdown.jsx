import { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography, useMediaQuery } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { formatCountdownUnit, getCountdownParts } from "../lib/preorder.js";
import { usePreorderDisplay } from "../lib/preorderDisplayLayout.jsx";

function CountdownSegment({ value, label, compact, accent, muted, featured }) {
  const valueSize = featured
    ? { xs: "0.95rem", md: "1.15rem" }
    : compact ? "0.85rem" : "1rem";
  const labelSize = featured
    ? { xs: "0.48rem", md: "0.56rem" }
    : compact ? "0.48rem" : "0.54rem";
  return (
    <Stack alignItems="center" spacing={0.15} sx={{ minWidth: featured ? { xs: 28, md: 34 } : compact ? 26 : 32 }}>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontWeight: 800,
          fontSize: valueSize,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: accent,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: labelSize,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: muted,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function panelStyles(accent, compact, panelSx, dark, featured) {
  const cardPad = compact || featured;
  return {
    ...(panelSx ?? {}),
    px: cardPad ? 1 : 1.25,
    py: cardPad ? 0.7 : 0.9,
    borderRadius: 1,
    bgcolor: dark ? "rgba(8, 14, 36, 0.92)" : alpha(accent, 0.16),
    border: "1.5px solid",
    borderColor: dark ? alpha(accent, 0.65) : alpha(accent, 0.55),
    boxShadow: "none",
    backdropFilter: dark ? "blur(10px)" : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: featured ? { xs: 0.75, md: 1 } : compact ? 1 : 1.5,
  };
}

function buildSegments(parts) {
  return [
    { value: formatCountdownUnit(parts.days), label: "days" },
    { value: formatCountdownUnit(parts.hours), label: "hrs" },
    { value: formatCountdownUnit(parts.minutes), label: "mins" },
    { value: formatCountdownUnit(parts.seconds), label: "secs" },
  ];
}

function SegmentsCountdown({ parts, compact, accent, panelSx, dark, wrapLabel, featured }) {
  const segments = buildSegments(parts);
  const muted = dark ? "rgba(255,255,255,0.55)" : "text.secondary";
  const segmentGap = featured ? { xs: 0.45, md: 0.65 } : compact ? 0.5 : 0.75;

  return (
    <Box sx={panelStyles(accent, compact, panelSx, dark, featured)}>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: featured ? { xs: "0.62rem", md: "0.78rem" } : compact ? "0.58rem" : "0.68rem",
          fontWeight: 800,
          letterSpacing: featured ? { xs: 0.5, md: 0.8 } : 0.8,
          textTransform: "uppercase",
          color: accent,
          lineHeight: 1.25,
          ...(wrapLabel
            ? { maxWidth: compact ? 72 : 96, flexShrink: 1, minWidth: 0 }
            : { flexShrink: 0, whiteSpace: "nowrap" }),
        }}
      >
        {wrapLabel ? (
          <>
            Pre-order{" "}
            <Box component="span" sx={{ display: "block" }}>closes in</Box>
          </>
        ) : (
          "Pre-order closes in"
        )}
      </Typography>
      <Stack direction="row" spacing={segmentGap} alignItems="center" justifyContent="flex-end" sx={{ flexShrink: 0 }}>
        {segments.map((segment) => (
          <CountdownSegment
            key={segment.label}
            value={segment.value}
            label={segment.label}
            compact={compact}
            accent={accent}
            muted={muted}
            featured={featured}
          />
        ))}
      </Stack>
    </Box>
  );
}

function InlineCountdown({ parts, compact, accent, panelSx, dark, wrapLabel, featured }) {
  const timer = `${formatCountdownUnit(parts.days)}d ${formatCountdownUnit(parts.hours)}:${formatCountdownUnit(parts.minutes)}:${formatCountdownUnit(parts.seconds)}`;

  return (
    <Box sx={{ ...panelStyles(accent, compact, panelSx, dark, featured), py: compact || featured ? 0.55 : 0.7 }}>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: featured ? { xs: "0.62rem", md: "0.78rem" } : compact ? "0.58rem" : "0.7rem",
          fontWeight: 800,
          color: accent,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          lineHeight: 1.25,
          ...(wrapLabel
            ? { maxWidth: compact ? 72 : 96, flexShrink: 1, minWidth: 0 }
            : { flexShrink: 0, whiteSpace: "nowrap" }),
        }}
      >
        {wrapLabel ? (
          <>
            Pre-order{" "}
            <Box component="span" sx={{ display: "block" }}>closes in</Box>
          </>
        ) : (
          "Pre-order closes in"
        )}
      </Typography>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: featured ? { xs: "0.95rem", md: "1.15rem" } : compact ? "0.78rem" : "0.9rem",
          fontWeight: 800,
          color: accent,
          letterSpacing: 0.4,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {timer}
      </Typography>
    </Box>
  );
}

function ChipCountdown({ parts, compact, accent }) {
  const short = parts.days > 0
    ? `${parts.days}d ${parts.hours}h`
    : `${parts.hours}h ${parts.minutes}m`;

  return (
    <Chip
      label={`⏱ ${short} left`}
      size="small"
      sx={{
        height: compact ? 24 : 28,
        fontFamily: MONO_FONT,
        fontWeight: 800,
        fontSize: compact ? "0.62rem" : "0.68rem",
        letterSpacing: 0.4,
        bgcolor: alpha(accent, 0.14),
        color: accent,
        border: "1px solid",
        borderColor: alpha(accent, 0.35),
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

function ExpiredCountdown({ compact, accent, panelSx, dark }) {
  return (
    <Box
      sx={{
        ...panelStyles(accent, compact, panelSx, dark),
        justifyContent: "center",
      }}
    >
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: compact ? "0.68rem" : "0.75rem", fontWeight: 800, color: accent, letterSpacing: 0.6 }}>
        CLOSED
      </Typography>
    </Box>
  );
}

export default function PreorderCountdown({
  endsAt,
  compact = false,
  panelSx,
  variant: variantProp,
  tone = "light",
  wrapLabel = true,
  featured = false,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  // Mobile product cards: one-line label. Desktop: allow wrapped label.
  const effectiveWrapLabel = isMobile ? false : wrapLabel;
  const { countdownVariant } = usePreorderDisplay();
  const variant = variantProp ?? countdownVariant;
  const dark = tone === "dark";
  const [parts, setParts] = useState(() => getCountdownParts(endsAt));

  useEffect(() => {
    setParts(getCountdownParts(endsAt));
    const id = window.setInterval(() => {
      setParts(getCountdownParts(endsAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt || !parts) return null;

  const accent = parts.expired ? theme.palette.error.main : theme.palette.warning.main;

  if (parts.expired) {
    return <ExpiredCountdown compact={compact} accent={accent} panelSx={panelSx} dark={dark} />;
  }

  if (variant === "inline") {
    return <InlineCountdown parts={parts} compact={compact} accent={accent} panelSx={panelSx} dark={dark} wrapLabel={effectiveWrapLabel} featured={featured} />;
  }

  if (variant === "chip") {
    return <ChipCountdown parts={parts} compact={compact} accent={accent} />;
  }

  return <SegmentsCountdown parts={parts} compact={compact} accent={accent} panelSx={panelSx} dark={dark} wrapLabel={effectiveWrapLabel} featured={featured} />;
}
