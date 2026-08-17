import { useEffect, useState } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";

function SectionBody({ section }) {
  return (
    <Box sx={{ pt: 0.25, pb: 0.5 }}>
      {section.intro ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: section.specs?.length || section.bullets?.length ? 1.5 : 0, lineHeight: 1.65 }}>
          {section.intro}
        </Typography>
      ) : null}

      {section.specs?.length ? (
        <Stack spacing={1.1}>
          {section.specs.map((row) => (
            <Stack
              key={row.label}
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
              sx={{ py: 0.15 }}
            >
              <Typography variant="body2" sx={{ flexShrink: 0, color: "text.secondary" }}>
                {row.label}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, textAlign: "right", lineHeight: 1.45, maxWidth: "58%", color: "text.primary" }}
              >
                {row.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : null}

      {section.bullets?.length ? (
        <Box component="ul" sx={{ m: 0, pl: 2.1, color: "text.secondary", lineHeight: 1.7 }}>
          {section.bullets.map((item) => (
            <Typography component="li" key={item} variant="body2" sx={{ mb: 0.75 }}>
              {item}
            </Typography>
          ))}
        </Box>
      ) : null}

      {section.note ? (
        <Typography
          sx={{
            mt: 1.5,
            fontFamily: MONO_FONT,
            fontSize: "0.68rem",
            letterSpacing: 0.4,
            color: "text.secondary",
            lineHeight: 1.55,
          }}
        >
          {section.note}
        </Typography>
      ) : null}
    </Box>
  );
}

function AccordionSection({ section, open, onToggle, surfaceBorderColor, isLast }) {
  const theme = useTheme();

  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        sx={{
          all: "unset",
          boxSizing: "border-box",
          width: "100%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          py: 1.15,
          borderRadius: 0.5,
          "&:hover .section-title": { color: "primary.main" },
          "&:focus-visible": {
            outline: `2px solid ${alpha(theme.palette.primary.main, 0.55)}`,
            outlineOffset: 2,
          },
        }}
      >
        <Typography
          className="section-title"
          variant="subtitle1"
          sx={{
            fontWeight: 800,
            lineHeight: 1.25,
            color: open ? "text.primary" : "text.secondary",
            transition: "color 160ms ease",
          }}
        >
          {section.title}
        </Typography>
        <Typography
          aria-hidden
          sx={{
            fontFamily: MONO_FONT,
            fontSize: "0.85rem",
            fontWeight: 800,
            color: "primary.main",
            lineHeight: 1,
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 180ms ease",
          }}
        >
          ▾
        </Typography>
      </Box>

      {open ? <SectionBody section={section} /> : null}

      {!isLast ? (
        <Divider flexItem sx={{ borderColor: surfaceBorderColor, opacity: 0.7, mt: open ? 1.5 : 0 }} />
      ) : null}
    </Box>
  );
}

export default function ProductDescription({ sections, panelSx, surfaceBorderColor, embedded = false }) {
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    setOpenIndex(0);
  }, [sections]);

  const emptyMessage = (
    <Box
      sx={{
        p: { xs: 2.5, md: 3 },
        flex: 1,
        minHeight: { md: 160 },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        opacity: 0.72,
      }}
    >
      <Box sx={{ maxWidth: 300 }}>
        <Typography
          variant="overline"
          sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, display: "block", mb: 1 }}
        >
          Product details
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          Details for this item will be posted soon. Check back for what&apos;s included in the set.
        </Typography>
      </Box>
    </Box>
  );

  if (!sections?.length) {
    if (embedded) return emptyMessage;
    return (
      <Box sx={{ ...panelSx }}>
        {emptyMessage}
      </Box>
    );
  }

  const content = (
    <>
      <Typography
        variant="overline"
        sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, display: "block", mb: 1.5 }}
      >
        Product details
      </Typography>

      <Stack>
        {sections.map((section, index) => (
          <AccordionSection
            key={section.title}
            section={section}
            open={openIndex === index}
            onToggle={() => setOpenIndex((current) => (current === index ? -1 : index))}
            surfaceBorderColor={surfaceBorderColor}
            isLast={index === sections.length - 1}
          />
        ))}
      </Stack>
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ p: { xs: 2.5, md: 3 }, flex: 1, display: "flex", flexDirection: "column" }}>
        {content}
      </Box>
    );
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column" }}>
      {content}
    </Box>
  );
}
