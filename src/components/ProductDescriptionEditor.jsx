import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
    </svg>
  );
}

function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

const EMPTY_SECTION = {
  title: "",
  intro: "",
  specs: [],
  bullets: [],
  note: "",
};

export function normalizeDescriptionSections(sections) {
  if (!Array.isArray(sections) || !sections.length) return [];
  return sections.map((section) => ({
    title: section.title ?? "",
    intro: section.intro ?? "",
    specs: Array.isArray(section.specs) ? section.specs.map((row) => ({ label: row.label ?? "", value: row.value ?? "" })) : [],
    bullets: Array.isArray(section.bullets) ? [...section.bullets] : [],
    note: section.note ?? "",
  }));
}

export function serializeDescriptionSections(sections) {
  const normalized = normalizeDescriptionSections(sections);
  return normalized
    .filter((section) => section.title.trim())
    .map((section) => ({
      title: section.title.trim(),
      ...(section.intro.trim() ? { intro: section.intro.trim() } : {}),
      ...(section.specs.filter((row) => row.label.trim() || row.value.trim()).length
        ? {
            specs: section.specs
              .filter((row) => row.label.trim() || row.value.trim())
              .map((row) => ({ label: row.label.trim(), value: row.value.trim() })),
          }
        : {}),
      ...(section.bullets.filter(Boolean).length ? { bullets: section.bullets.filter(Boolean) } : {}),
      ...(section.note.trim() ? { note: section.note.trim() } : {}),
    }));
}

export default function ProductDescriptionEditor({ sections, onChange, surfaceBorderColor }) {
  const theme = useTheme();
  const border = surfaceBorderColor || alpha(theme.palette.text.primary, 0.12);

  function updateSection(index, patch) {
    onChange(sections.map((section, i) => (i === index ? { ...section, ...patch } : section)));
  }

  function removeSection(index) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function addSection() {
    onChange([...sections, { ...EMPTY_SECTION }]);
  }

  function updateSpec(sectionIndex, specIndex, field, value) {
    const section = sections[sectionIndex];
    const specs = section.specs.map((row, i) => (i === specIndex ? { ...row, [field]: value } : row));
    updateSection(sectionIndex, { specs });
  }

  function addSpec(sectionIndex) {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, { specs: [...section.specs, { label: "", value: "" }] });
  }

  function removeSpec(sectionIndex, specIndex) {
    const section = sections[sectionIndex];
    updateSection(sectionIndex, { specs: section.specs.filter((_, i) => i !== specIndex) });
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Product description</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
            Add custom sections — not every product needs Color, SKU, etc.
          </Typography>
        </Box>
        <Button size="small" startIcon={<PlusIcon />} onClick={addSection} variant="outlined" color="inherit" sx={{ borderColor: border }}>
          Add section
        </Button>
      </Stack>

      {sections.length === 0 ? (
        <Box sx={{ p: 2, borderRadius: 1, border: "1px dashed", borderColor: border, textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            No custom description yet. Add a section or leave blank to use defaults on the storefront.
          </Typography>
        </Box>
      ) : null}

      {sections.map((section, sectionIndex) => (
        <Box key={sectionIndex} sx={{ p: 2, borderRadius: 1, border: "1px solid", borderColor: border }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "text.secondary" }}>
              Section {sectionIndex + 1}
            </Typography>
            <IconButton size="small" color="error" onClick={() => removeSection(sectionIndex)} aria-label="Remove section">
              <TrashIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>

          <Stack spacing={1.5}>
            <TextField
              label="Section title"
              size="small"
              fullWidth
              value={section.title}
              onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
              placeholder="e.g. Set details, What's included"
            />
            <TextField
              label="Intro paragraph (optional)"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={section.intro}
              onChange={(e) => updateSection(sectionIndex, { intro: e.target.value })}
            />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.8rem" }}>Spec rows</Typography>
                <Button size="small" onClick={() => addSpec(sectionIndex)} startIcon={<PlusIcon sx={{ fontSize: 16 }} />}>
                  Add row
                </Button>
              </Stack>
              {section.specs.length === 0 ? (
                <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>No spec rows — add label/value pairs as needed.</Typography>
              ) : (
                <Stack spacing={1}>
                  {section.specs.map((row, specIndex) => (
                    <Stack key={specIndex} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        label="Label"
                        value={row.label}
                        onChange={(e) => updateSpec(sectionIndex, specIndex, "label", e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="Value"
                        value={row.value}
                        onChange={(e) => updateSpec(sectionIndex, specIndex, "value", e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <IconButton size="small" onClick={() => removeSpec(sectionIndex, specIndex)} aria-label="Remove row">
                        <TrashIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>

            <TextField
              label="Bullet points (one per line, optional)"
              size="small"
              fullWidth
              multiline
              minRows={3}
              value={section.bullets.join("\n")}
              onChange={(e) => updateSection(sectionIndex, { bullets: e.target.value.split("\n") })}
            />
            <TextField
              label="Footnote (optional)"
              size="small"
              fullWidth
              value={section.note}
              onChange={(e) => updateSection(sectionIndex, { note: e.target.value })}
            />
          </Stack>

          {sectionIndex < sections.length - 1 ? <Divider sx={{ mt: 2, borderColor: border }} /> : null}
        </Box>
      ))}
    </Stack>
  );
}
