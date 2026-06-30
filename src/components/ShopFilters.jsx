import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { resolveLineLogo, shortLineLabel } from "../lib/shopFilterUi.js";

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden>
      <path d="M19 13h-6v6h-2v-6H5v-2h14v2z" />
    </svg>
  );
}

function LineLogo({ line, size = 28 }) {
  const logo = resolveLineLogo(line);
  if (logo) {
    return (
      <Box
        component="img"
        src={logo}
        alt=""
        sx={{ width: size, height: size, objectFit: "contain", display: "block" }}
      />
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        border: "1px dashed",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.62rem",
        fontWeight: 800,
        fontFamily: MONO_FONT,
        color: "text.secondary",
      }}
    >
      ALL
    </Box>
  );
}

function LineChip({ item, selected, onClick, surfaceBorderColor }) {
  return (
    <Chip
      key={item.value}
      label={item.label}
      size="small"
      clickable
      onClick={() => onClick(item.value)}
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
}

export function ShopFiltersSidebar({
  panelSx,
  surfaceBorderColor,
  lines,
  activeLine,
  onLineChange,
  onReset,
  hasActiveFilters,
}) {
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
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Filter by</Typography>
        {hasActiveFilters ? (
          <Button size="small" onClick={onReset} sx={{ fontWeight: 700, textTransform: "none", minWidth: 0 }}>
            Clear
          </Button>
        ) : null}
      </Stack>

      <Accordion
        defaultExpanded
        disableGutters
        elevation={0}
        sx={{ bgcolor: "transparent", "&::before": { display: "none" } }}
      >
        <AccordionSummary
          expandIcon={<CollapseIcon />}
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
            {lines.map((item) => (
              <LineChip
                key={item.value}
                item={item}
                selected={activeLine === item.value}
                onClick={onLineChange}
                surfaceBorderColor={surfaceBorderColor}
              />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export function ShopFilterFranchiseRail({
  panelSx,
  surfaceBorderColor,
  lines,
  activeLine,
  onLineChange,
}) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  return (
    <Stack
      spacing={1}
      sx={{
        position: { md: "sticky" },
        top: { md: 96 },
        width: { xs: "100%", md: 88 },
        flexShrink: 0,
      }}
    >
      {lines.map((line) => {
        const selected = activeLine === line.value;
        return (
          <Box
            key={line.value}
            component="button"
            type="button"
            onClick={() => onLineChange(line.value)}
            sx={{
              ...panelSx,
              width: "100%",
              p: 1.25,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.75,
              cursor: "pointer",
              border: "1px solid",
              borderColor: selected ? alpha(primary, 0.55) : surfaceBorderColor,
              boxShadow: selected ? `inset 3px 0 0 ${primary}` : "none",
              bgcolor: selected ? alpha(primary, 0.08) : "background.paper",
              transition: "border-color 0.15s ease, background-color 0.15s ease",
              "&:hover": {
                borderColor: selected ? alpha(primary, 0.55) : alpha(theme.palette.text.primary, 0.22),
              },
            }}
          >
            <LineLogo line={line} size={line.value === "all" ? 24 : 32} />
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: selected ? 800 : 600,
                fontFamily: MONO_FONT,
                textAlign: "center",
                lineHeight: 1.2,
                color: selected ? "primary.main" : "text.secondary",
              }}
            >
              {shortLineLabel(line.label)}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

export function ShopFilterCommandBar({
  surfaceBorderColor,
  lines,
  activeLine,
  onLineChange,
  tabs,
  activeTab,
  onTabChange,
  itemCount,
}) {
  const theme = useTheme();
  const activeLineLabel = lines.find((line) => line.value === activeLine)?.label ?? "All lines";

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      alignItems={{ xs: "stretch", md: "center" }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{
        mb: 2,
        px: { xs: 2, md: 2.5 },
        py: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: alpha(theme.palette.background.paper, 0.92),
      }}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
        {tabs.map((tab) => (
          <Chip
            key={tab.value}
            label={tab.label}
            size="small"
            clickable
            onClick={() => onTabChange(tab.value)}
            variant={activeTab === tab.value ? "filled" : "outlined"}
            sx={{
              fontFamily: MONO_FONT,
              fontWeight: 700,
              height: 32,
              ...(activeTab === tab.value
                ? { bgcolor: "primary.main", color: "primary.contrastText", borderColor: "primary.main" }
                : { borderColor: surfaceBorderColor }),
            }}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
        <Select
          size="small"
          value={activeLine}
          onChange={(e) => onLineChange(e.target.value)}
          sx={{ minWidth: { xs: "100%", md: 180 }, fontFamily: MONO_FONT, fontSize: "0.82rem" }}
        >
          {lines.map((line) => (
            <MenuItem key={line.value} value={line.value}>{line.label}</MenuItem>
          ))}
        </Select>
        <Typography sx={{ fontSize: "0.78rem", fontFamily: MONO_FONT, color: "text.secondary", whiteSpace: "nowrap", display: { xs: "none", sm: "block" } }}>
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function ShopFilterFranchiseTiles({
  panelSx,
  surfaceBorderColor,
  lines,
  activeLine,
  onLineChange,
}) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        mb: 2.5,
        overflowX: "auto",
        flexWrap: "nowrap",
        pb: 0.5,
        mx: -0.5,
        px: 0.5,
      }}
    >
      {lines.map((line) => {
        const selected = activeLine === line.value;
        return (
          <Box
            key={line.value}
            component="button"
            type="button"
            onClick={() => onLineChange(line.value)}
            sx={{
              ...panelSx,
              flexShrink: 0,
              width: 96,
              p: 1.25,
              textAlign: "center",
              cursor: "pointer",
              border: "1px solid",
              borderColor: selected ? alpha(primary, 0.55) : surfaceBorderColor,
              bgcolor: selected ? alpha(primary, 0.06) : "background.paper",
              transition: "border-color 0.15s ease, background-color 0.15s ease",
              "&:hover": {
                borderColor: selected ? alpha(primary, 0.55) : alpha(theme.palette.text.primary, 0.22),
              },
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center", mb: 0.75 }}>
              <LineLogo line={line} size={36} />
            </Box>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: selected ? 800 : 600, lineHeight: 1.2 }}>
              {shortLineLabel(line.label)}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

export function ShopFilterBreadcrumb({
  sectionLabel,
  lines,
  activeLine,
  onLineChange,
  itemCount,
}) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const activeLineItem = lines.find((line) => line.value === activeLine);
  const activeLabel = activeLineItem?.label ?? "All lines";

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "text.secondary" }}>
        {sectionLabel}
      </Typography>
      <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>›</Typography>
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: primary }}>
        {activeLabel}
      </Typography>
      <Typography sx={{ fontSize: "0.78rem", fontFamily: MONO_FONT, color: "text.secondary" }}>
        · {itemCount} {itemCount === 1 ? "item" : "items"}
      </Typography>
      {activeLine !== "all" ? (
        <Chip
          label={`${activeLabel} ×`}
          size="small"
          clickable
          onClick={() => onLineChange("all")}
          sx={{
            height: 24,
            fontSize: "0.72rem",
            fontFamily: MONO_FONT,
            fontWeight: 700,
            bgcolor: alpha(primary, 0.12),
            color: primary,
          }}
        />
      ) : null}
    </Stack>
  );
}

/** @deprecated Use ShopFiltersSidebar */
export default ShopFiltersSidebar;

export {
  getFilterLayoutMode,
  getTopFilterVariant,
  embedsCategoryTabs,
} from "../lib/shopFilterUi.js";
