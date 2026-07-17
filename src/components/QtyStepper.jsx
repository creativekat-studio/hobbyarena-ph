import { useEffect, useState } from "react";
import { IconButton, InputBase, Stack, Tooltip } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

function clampQty(raw, min, max) {
  const parsed = Number.parseInt(String(raw).replace(/\D/g, ""), 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
}

export default function QtyStepper({
  value,
  onChange,
  min = 1,
  max = Number.MAX_SAFE_INTEGER,
  disabled = false,
  size = "medium",
  clearAtZero = true,
}) {
  const theme = useTheme();
  const compact = size === "small";
  const btnSize = compact ? 36 : 44;
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const safeMax = Number.isFinite(Number(max)) ? Math.max(0, Number(max)) : Number.MAX_SAFE_INTEGER;
  // Cap typed digits so huge uncapped maxes (pre-order) stay usable; 7 digits → up to 9,999,999.
  const digitCap = Math.min(7, Math.max(1, String(Math.trunc(Math.min(safeMax, 9_999_999)) || 0).length));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(nextRaw) {
    const next = clampQty(nextRaw, min, safeMax);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

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
    if (value < safeMax) onChange(value + 1);
  }

  const canDecrease = value > min || (clearAtZero && value === min);
  const inputDisabled = disabled || safeMax < min;

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      sx={{
        width: "100%",
        border: "1px solid",
        borderColor: focused
          ? alpha(theme.palette.primary.main, 0.7)
          : alpha(theme.palette.text.primary, 0.22),
        borderRadius: 1,
        bgcolor: alpha(theme.palette.background.paper, 0.55),
        height: compact ? 36 : 44,
        transition: "border-color 160ms ease",
      }}
    >
      <IconButton
        size="small"
        onClick={dec}
        disabled={inputDisabled || !canDecrease}
        aria-label="Decrease quantity"
        sx={{ borderRadius: 0, width: btnSize, height: "100%", flexShrink: 0 }}
      >
        −
      </IconButton>
      <Tooltip title={inputDisabled ? "" : "Click and type a quantity"} enterDelay={400}>
        <InputBase
          value={draft}
          disabled={inputDisabled}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, digitCap);
            setDraft(digits);
          }}
          onBlur={() => {
            setFocused(false);
            commit(draft || min);
          }}
          onFocus={(event) => {
            setFocused(true);
            event.target.select();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(draft || min);
              event.currentTarget.blur();
            }
          }}
          inputProps={{
            inputMode: "numeric",
            pattern: "[0-9]*",
            "aria-label": "Quantity — type a number",
            title: "Type a quantity",
            style: {
              textAlign: "center",
              fontWeight: 800,
              fontSize: compact ? "0.85rem" : "0.95rem",
              fontVariantNumeric: "tabular-nums",
              padding: 0,
              cursor: inputDisabled ? "default" : "text",
              caretColor: theme.palette.primary.main,
            },
          }}
          sx={{
            flex: 1,
            minWidth: compact ? 40 : 48,
            mx: 0.25,
            px: 0.5,
            height: compact ? 28 : 32,
            borderRadius: 0.75,
            bgcolor: focused
              ? alpha(theme.palette.primary.main, 0.12)
              : alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.08 : 0.55),
            border: "1px solid",
            borderColor: focused
              ? alpha(theme.palette.primary.main, 0.55)
              : alpha(theme.palette.text.primary, 0.2),
            boxShadow: focused ? `inset 0 -2px 0 ${theme.palette.primary.main}` : "inset 0 -1px 0 rgba(255,255,255,0.08)",
            transition: "background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
            "& .MuiInputBase-input": {
              py: 0,
              height: compact ? 26 : 30,
            },
            "&.Mui-disabled": {
              opacity: 0.55,
            },
          }}
        />
      </Tooltip>
      <IconButton
        size="small"
        onClick={inc}
        disabled={inputDisabled || value >= safeMax}
        aria-label="Increase quantity"
        sx={{ borderRadius: 0, width: btnSize, height: "100%", flexShrink: 0 }}
      >
        +
      </IconButton>
    </Stack>
  );
}
