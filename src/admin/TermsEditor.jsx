import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import AdminSectionTitle from "../components/AdminSectionTitle.jsx";

export default function TermsEditor({ title, subtitle, value, onSave, surfaceBorderColor }) {
  const [draft, setDraft] = useState(value.join("\n\n"));
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const lines = draft
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean);
    if (!lines.length) return;
    onSave(lines);
    setSaved(true);
  }

  useEffect(() => {
    setDraft(value.join("\n\n"));
    setSaved(false);
  }, [value]);

  return (
    <Box sx={{ p: 2, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
      <AdminSectionTitle sx={{ mb: 0.5 }}>{title}</AdminSectionTitle>
      {subtitle ? <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 1.5 }}>{subtitle}</Typography> : null}
      <TextField
        fullWidth
        multiline
        minRows={12}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        placeholder="One paragraph per block — separate blocks with a blank line…"
        sx={{ mb: 1.5 }}
      />
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Button variant="contained" onClick={handleSave} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Save terms
        </Button>
        <Typography sx={{ fontSize: "0.82rem", color: saved ? "success.main" : "text.secondary", fontWeight: 600 }}>
          {saved ? "Saved — live on product pages" : "Separate paragraphs with a blank line"}
        </Typography>
      </Stack>
    </Box>
  );
}
