import { useEffect, useState } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { formatCountdownLabel, formatCountdownUnit, getCountdownParts } from "../lib/preorder.js";
import { usePreorderDisplay } from "../lib/preorderDisplayLayout.jsx";

function CountdownSegment({ value, label, compact }) {
  return (
    <Stack alignItems="center" spacing={0.25} sx={{ minWidth: compact ? 36 : 44 }}>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontWeight: 800,
          fontSize: compact ? "0.82rem" : "1.05rem",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontSize: compact ? "0.52rem" : "0.58rem",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: "text.secondary",
          fontWeight: 700,
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function SegmentsCountdown({ parts, compact, accent, panelSx }) {
  const segments = [
    { value: String(parts.days), label: "days" },
    { value: formatCountdownUnit(parts.hours), label: "hrs" },
    { value: formatCountdownUnit(parts.minutes), label: "min" },
    { value: formatCountdownUnit(parts.seconds), label: "sec" },
  ];

  return (
    <Box
      sx={{
        ...(panelSx ?? {}),
        px: compact ? 1 : 1.5,
        py: compact ? 0.85 : 1.15,
        borderRadius: 1,
        bgcolor: alpha(accent, 0.1),
        border: "1px solid",
        borderColor: alpha(accent, 0.35),
      }}
    >
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: compact ? "0.58rem" : "0.62rem",
          fontWeight: 800,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: accent,
          mb: compact ? 0.5 : 0.75,
        }}
      >
        Pre-order closes in
      </Typography>
      <Stack direction="row" spacing={compact ? 0.75 : 1.25} alignItems="center" justifyContent={compact ? "flex-start" : "center"}>
        {segments.map((segment, index) => (
          <Stack key={segment.label} direction="row" spacing={compact ? 0.75 : 1.25} alignItems="center">
            <CountdownSegment value={segment.value} label={segment.label} compact={compact} />
            {index < segments.length - 1 ? (
              <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, color: "text.secondary", fontSize: compact ? "0.75rem" : "0.9rem", mb: compact ? 0 : 1.2 }}>
                :
              </Typography>
            ) : null}
          </Stack>
        ))}
      </Stack>
      {!compact ? (
        <Typography sx={{ mt: 1, textAlign: "center", fontSize: "0.72rem", color: "text.secondary", fontFamily: MONO_FONT }}>
          {formatCountdownLabel(parts)}
        </Typography>
      ) : null}
    </Box>
  );
}

function InlineCountdown({ parts, compact, accent, panelSx }) {
  const label = `${parts.days}d ${formatCountdownUnit(parts.hours)}:${formatCountdownUnit(parts.minutes)}:${formatCountdownUnit(parts.seconds)}`;

  return (
    <Box
      sx={{
        ...(panelSx ?? {}),
        px: compact ? 1 : 1.25,
        py: compact ? 0.65 : 0.85,
        borderRadius: 1,
        bgcolor: alpha(accent, 0.1),
        border: "1px solid",
        borderColor: alpha(accent, 0.35),
      }}
    >
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: compact ? "0.68rem" : "0.78rem", fontWeight: 800, color: accent, letterSpacing: 0.4 }}>
        <Box component="span" sx={{ color: "text.secondary", fontWeight: 700, mr: 0.75 }}>
          Closes in
        </Box>
        {label}
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

function ExpiredCountdown({ compact, accent, panelSx }) {
  return (
    <Box
      sx={{
        ...(panelSx ?? {}),
        px: compact ? 1 : 1.5,
        py: compact ? 0.75 : 1,
        borderRadius: 1,
        bgcolor: alpha(accent, 0.1),
        border: "1px solid",
        borderColor: alpha(accent, 0.35),
      }}
    >
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: compact ? "0.68rem" : "0.75rem", fontWeight: 800, color: accent, letterSpacing: 0.6 }}>
          CLOSED
        </Typography>
    </Box>
  );
}

export default function PreorderCountdown({ endsAt, compact = false, panelSx, variant: variantProp }) {
  const theme = useTheme();
  const { countdownVariant } = usePreorderDisplay();
  const variant = variantProp ?? countdownVariant;
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
    return <ExpiredCountdown compact={compact} accent={accent} panelSx={panelSx} />;
  }

  if (variant === "inline") {
    return <InlineCountdown parts={parts} compact={compact} accent={accent} panelSx={panelSx} />;
  }

  if (variant === "chip") {
    return <ChipCountdown parts={parts} compact={compact} accent={accent} />;
  }

  return <SegmentsCountdown parts={parts} compact={compact} accent={accent} panelSx={panelSx} />;
}
