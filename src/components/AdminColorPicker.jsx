import { useState } from "react";
import { Box, Button, Popover, Stack } from "@mui/material";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { MONO_FONT } from "../theme.js";

export function normalizeHex(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return "";
}

/** Shared admin color picker — swatch button + react-colorful popover. */
export default function AdminColorPicker({
  value,
  onChange,
  ariaLabel = "Pick color",
  fallback = "#64748B",
  size = "default",
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const color = normalizeHex(value) || fallback;
  const open = Boolean(anchorEl);
  const swatch = size === "table" ? 18 : 20;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color="inherit"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={ariaLabel}
        sx={{
          minWidth: 0,
          px: 1,
          py: 0.5,
          gap: 0.75,
          borderColor: "divider",
          fontFamily: MONO_FONT,
          fontSize: "0.72rem",
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        <Box
          sx={{
            width: swatch,
            height: swatch,
            borderRadius: 0.5,
            bgcolor: color,
            border: "1px solid",
            borderColor: "divider",
            flexShrink: 0,
          }}
        />
        {color}
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              borderRadius: 1.5,
              overflow: "visible",
              "& .react-colorful": { width: 200, height: 160 },
              "& .react-colorful__saturation": { borderRadius: 1 },
              "& .react-colorful__hue": { borderRadius: 99, height: 12, marginTop: 10 },
              "& .react-colorful__pointer": { width: 16, height: 16 },
            },
          },
        }}
      >
        {open ? (
          <Stack spacing={1.25}>
            <HexColorPicker color={color} onChange={(next) => onChange(normalizeHex(next) || next)} />
            <HexColorInput
              color={color}
              prefixed
              onChange={(next) => onChange(normalizeHex(next) || next)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "inherit",
                fontSize: "0.85rem",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "transparent",
                color: "inherit",
              }}
            />
          </Stack>
        ) : null}
      </Popover>
    </>
  );
}
