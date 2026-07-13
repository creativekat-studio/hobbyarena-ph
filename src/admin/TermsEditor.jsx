import { useEffect, useRef, useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import { MONO_FONT } from "../theme.js";
import AdminSectionTitle from "../components/AdminSectionTitle.jsx";

export const TERMS_MAX_LENGTH = 5000;

function draftFromValue(value, maxLength, mode = "paragraphs") {
  const text = Array.isArray(value)
    ? value.join(mode === "lines" ? "\n" : "\n\n")
    : String(value ?? "");
  return text.slice(0, maxLength);
}

function linesFromDraft(draft, mode) {
  if (mode === "lines") {
    return draft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return draft
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function valueAsText(value, mode) {
  return Array.isArray(value)
    ? value.join(mode === "lines" ? "\n" : "\n\n")
    : String(value ?? "");
}

export default function TermsEditor({
  title,
  subtitle,
  value,
  onChange,
  surfaceBorderColor,
  maxLength = TERMS_MAX_LENGTH,
  /** "paragraphs" = blank-line separated (pre-order). "lines" = one term per line (in-stock). */
  mode = "paragraphs",
}) {
  const valueText = valueAsText(value, mode);
  const [draft, setDraft] = useState(() => draftFromValue(value, maxLength, mode));
  const lastPushedRef = useRef(valueText);
  const length = draft.length;
  const atLimit = length >= maxLength;

  // Sync when parent resets / reloads (not from our own onChange pushes).
  useEffect(() => {
    if (valueText === lastPushedRef.current) return;
    setDraft(draftFromValue(valueText, maxLength, mode));
    lastPushedRef.current = valueText;
  }, [valueText, maxLength, mode]);

  function handleChange(next) {
    const clipped = next.slice(0, maxLength);
    setDraft(clipped);
    const lines = linesFromDraft(clipped, mode);
    if (!lines.length) return;
    lastPushedRef.current = lines.join(mode === "lines" ? "\n" : "\n\n");
    onChange?.(lines);
  }

  const hint =
    mode === "lines"
      ? "One term per line — edits stay local until you save"
      : "Separate paragraphs with a blank line — edits stay local until you save";

  return (
    <Box sx={{ p: 2, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
      <AdminSectionTitle sx={{ mb: 0.5 }}>{title}</AdminSectionTitle>
      {subtitle ? (
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 1.5 }}>{subtitle}</Typography>
      ) : null}
      <Box sx={{ position: "relative" }}>
        <TextField
          fullWidth
          multiline
          minRows={12}
          value={draft}
          onChange={(e) => handleChange(e.target.value)}
          slotProps={{ htmlInput: { maxLength } }}
          placeholder={
            mode === "lines"
              ? "One term per line…"
              : "One paragraph per block — separate blocks with a blank line…"
          }
          sx={{
            "& .MuiInputBase-root": { pb: 3.5 },
          }}
        />
        <Typography
          sx={{
            position: "absolute",
            right: 12,
            bottom: 10,
            fontSize: "0.7rem",
            fontFamily: MONO_FONT,
            color: atLimit ? "error.main" : "text.secondary",
            fontWeight: atLimit ? 700 : 500,
            letterSpacing: 0.3,
            pointerEvents: "none",
            bgcolor: "background.paper",
            px: 0.5,
            borderRadius: 0.5,
            zIndex: 1,
          }}
        >
          {length.toLocaleString()} / {maxLength.toLocaleString()}
        </Typography>
      </Box>
      <Typography sx={{ mt: 1, fontSize: "0.78rem", color: "text.secondary" }}>{hint}</Typography>
    </Box>
  );
}
