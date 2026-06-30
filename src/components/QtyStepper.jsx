import { IconButton, Stack } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

export default function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = "medium",
  clearAtZero = true,
}) {
  const theme = useTheme();
  const compact = size === "small";
  const btnSize = compact ? 36 : 44;

  function dec() {
    if (value > min) {
      onChange(value - 1);
      return;
    }
    if (clearAtZero && value === min) {
      onChange(0);
    }
  }

  function inc() {
    if (value < max) onChange(value + 1);
  }

  const canDecrease = value > min || (clearAtZero && value === min);

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      sx={{
        width: "100%",
        border: "1px solid",
        borderColor: alpha(theme.palette.text.primary, 0.18),
        borderRadius: 1,
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        height: compact ? 36 : 44,
      }}
    >
      <IconButton
        size="small"
        onClick={dec}
        disabled={disabled || !canDecrease}
        aria-label="Decrease quantity"
        sx={{ borderRadius: 0, width: btnSize, height: "100%", flexShrink: 0 }}
      >
        −
      </IconButton>
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          minWidth: compact ? 32 : 40,
          px: 0.5,
          fontWeight: 800,
          fontSize: compact ? "0.85rem" : "0.95rem",
          fontVariantNumeric: "tabular-nums",
          userSelect: "none",
        }}
      >
        {value}
      </Stack>
      <IconButton
        size="small"
        onClick={inc}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
        sx={{ borderRadius: 0, width: btnSize, height: "100%", flexShrink: 0 }}
      >
        +
      </IconButton>
    </Stack>
  );
}
