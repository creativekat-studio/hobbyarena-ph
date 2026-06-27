import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";

const PESO_FILTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden>
      <path d="M19 13H5v-2h14v2z" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden>
      <path d="M19 13h-6v6h-2v-6H5v-2h14v2z" />
    </svg>
  );
}

export default function ShopFilters({
  panelSx,
  surfaceBorderColor,
  lines,
  activeLine,
  onLineChange,
  priceBounds,
  priceRange,
  onPriceChange,
  onReset,
  hasActiveFilters,
}) {
  const theme = useTheme();
  const [priceOpen, setPriceOpen] = useState(true);
  const [lineOpen, setLineOpen] = useState(true);

  const sliderSx = {
    mt: 1,
    px: 0.5,
    color: theme.palette.text.primary,
    "& .MuiSlider-rail": {
      opacity: 1,
      height: 3,
      bgcolor: alpha(theme.palette.text.primary, 0.12),
    },
    "& .MuiSlider-track": {
      height: 3,
      border: "none",
      bgcolor: theme.palette.text.primary,
    },
    "& .MuiSlider-thumb": {
      width: 16,
      height: 16,
      bgcolor: theme.palette.text.primary,
      border: `2px solid ${theme.palette.background.paper}`,
      boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.2)}`,
      "&:hover, &.Mui-focusVisible": {
        boxShadow: `0 0 0 6px ${alpha(theme.palette.text.primary, 0.12)}`,
      },
    },
  };

  return (
    <Box
      sx={{
        ...panelSx,
        p: { xs: 2.5, md: 3 },
        position: { md: "sticky" },
        top: { md: 96 },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Filter by
        </Typography>
        {hasActiveFilters ? (
          <Button size="small" onClick={onReset} sx={{ fontWeight: 700, textTransform: "none", minWidth: 0 }}>
            Clear
          </Button>
        ) : null}
      </Stack>

      <Accordion
        expanded={priceOpen}
        onChange={() => setPriceOpen((open) => !open)}
        disableGutters
        elevation={0}
        sx={{
          bgcolor: "transparent",
          "&::before": { display: "none" },
          borderBottom: "1px solid",
          borderColor: surfaceBorderColor,
        }}
      >
        <AccordionSummary
          expandIcon={priceOpen ? <CollapseIcon /> : <ExpandIcon />}
          sx={{
            px: 0,
            minHeight: 48,
            "& .MuiAccordionSummary-content": { my: 1 },
            "& .MuiAccordionSummary-expandIconWrapper": { transform: "none" },
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>Price</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pt: 0, pb: 2.5 }}>
          <Slider
            value={priceRange}
            min={priceBounds[0]}
            max={priceBounds[1]}
            step={100}
            onChange={(_, value) => onPriceChange(value)}
            valueLabelDisplay="off"
            sx={sliderSx}
            disabled={priceBounds[0] === priceBounds[1]}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.88rem" }}>
              {PESO_FILTER.format(priceRange[0])}
            </Typography>
            <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.88rem" }}>
              {PESO_FILTER.format(priceRange[1])}
            </Typography>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={lineOpen}
        onChange={() => setLineOpen((open) => !open)}
        disableGutters
        elevation={0}
        sx={{
          bgcolor: "transparent",
          "&::before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={lineOpen ? <CollapseIcon /> : <ExpandIcon />}
          sx={{
            px: 0,
            minHeight: 48,
            "& .MuiAccordionSummary-content": { my: 1 },
            "& .MuiAccordionSummary-expandIconWrapper": { transform: "none" },
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>Product line</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0, pt: 0, pb: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {lines.map((item) => {
              const selected = activeLine === item.value;
              return (
                <Chip
                  key={item.value}
                  label={item.label}
                  size="small"
                  clickable
                  onClick={() => onLineChange(item.value)}
                  variant={selected ? "filled" : "outlined"}
                  sx={{
                    fontFamily: MONO_FONT,
                    fontWeight: 600,
                    ...(selected
                      ? {
                          bgcolor: "text.primary",
                          color: "background.paper",
                          borderColor: "text.primary",
                        }
                      : {
                          bgcolor: "background.paper",
                          borderColor: surfaceBorderColor,
                        }),
                  }}
                />
              );
            })}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
