import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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

export default function TermsEditor({
  title,
  subtitle,
  value,
  onSave,
  surfaceBorderColor,
  maxLength = TERMS_MAX_LENGTH,
  /** "paragraphs" = blank-line separated (pre-order). "lines" = one term per line (in-stock). */
  mode = "paragraphs",
}) {
  const valueText = Array.isArray(value)
    ? value.join(mode === "lines" ? "\n" : "\n\n")
    : String(value ?? "");
  const [draft, setDraft] = useState(() => draftFromValue(value, maxLength, mode));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const length = draft.length;
  const atLimit = length >= maxLength;
  const canSave = dirty && linesFromDraft(draft, mode).length > 0;

  // Sync from props only while clean so remote identity churn / post-save updates don't fight typing.
  useEffect(() => {
    if (dirty) return;
    setDraft(draftFromValue(valueText, maxLength, mode));
  }, [valueText, maxLength, dirty, mode]);

  function handleSave() {
    const lines = linesFromDraft(draft, mode);
    if (!lines.length) return;
    onSave(lines);
    setDirty(false);
    setSaved(true);
  }

  const statusColor = dirty ? "warning.main" : saved ? "success.main" : "text.secondary";
  const statusText = dirty
    ? "Unsaved changes"
    : saved
      ? "Saved"
      : mode === "lines"
        ? "One term per line — edits stay local until you save"
        : "Separate paragraphs with a blank line — edits stay local until you save";

  return (
    <Stack spacing={1.5}>
        <Box sx={{ p: 2, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
        <AdminSectionTitle sx={{ mb: 0.5 }}>{title}</AdminSectionTitle>
        {subtitle ? <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 1.5 }}>{subtitle}</Typography> : null}
        <Box sx={{ position: "relative" }}>
          <TextField
            fullWidth
            multiline
            minRows={12}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.slice(0, maxLength));
              setDirty(true);
              setSaved(false);
            }}
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
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          px: 1.75,
          py: 1.25,
          borderRadius: 1,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.02),
        }}
      >
        <Typography
          sx={{
            color: statusColor,
            fontSize: "0.78rem",
            fontWeight: dirty || saved ? 600 : 500,
            lineHeight: 1.4,
          }}
        >
          {statusText}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          disabled={!canSave}
          onClick={handleSave}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem", ml: "auto" }}
        >
          Save
        </Button>
      </Box>
    </Stack>
  );
}
