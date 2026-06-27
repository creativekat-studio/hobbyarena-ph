import { Box, Divider, Stack, Typography } from "@mui/material";
import { MONO_FONT } from "../theme.js";

export default function ProductDescription({ sections, panelSx, surfaceBorderColor, embedded = false }) {
  if (!sections?.length) return null;

  const content = (
    <>
      <Typography
        variant="overline"
        sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, display: "block", mb: 2.5 }}
      >
        Product details
      </Typography>

      <Stack
        spacing={3}
        divider={<Divider flexItem sx={{ borderColor: surfaceBorderColor, opacity: 0.7 }} />}
      >
        {sections.map((section) => (
          <Box key={section.title}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.25, mb: section.intro ? 0.75 : 1.5 }}>
              {section.title}
            </Typography>
            {section.intro ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.65 }}>
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
                    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {row.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, textAlign: "right", lineHeight: 1.45, maxWidth: "58%" }}
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
        ))}
      </Stack>
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        {content}
      </Box>
    );
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
      {content}
    </Box>
  );
}
