import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TableCell,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import { useIsMobileMd } from "../lib/mobileUi.js";

/** Shared admin grid header look — mono, uppercase, muted. */
export const ADMIN_TABLE_HEADER_SX = {
  fontFamily: MONO_FONT,
  fontWeight: 800,
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
  whiteSpace: "nowrap",
};

export const ADMIN_TABLE_SORT_LABEL_SX = {
  ...ADMIN_TABLE_HEADER_SX,
  "&.MuiTableSortLabel-root": { color: "text.secondary" },
  "&.MuiTableSortLabel-root:hover": { color: "text.primary" },
  "&.Mui-active": { color: "text.primary" },
  "& .MuiTableSortLabel-icon": { fontSize: "0.95rem", color: "inherit !important" },
};

/** Sticky header row fill for CSS-grid tables (Orders). */
export function adminStickyHeaderRowSx(surfaceBackground, surfaceBorderColor) {
  return {
    backgroundColor: surfaceBackground || "#12204A",
    borderBottom: "1px solid",
    borderColor: surfaceBorderColor,
    position: "sticky",
    top: 0,
    zIndex: 2,
  };
}

/** List-page shell: fill AdminLayout pane; chrome stays put; grid scrolls inside. */
export const ADMIN_LIST_PAGE_SX = {
  display: "flex",
  flexDirection: "column",
  flex: "1 1 0%",
  minHeight: 0,
};

/** Grid/table panel around the internal scroller. */
export const ADMIN_LIST_PANEL_SX = {
  flex: "1 1 0%",
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

/** Inner scroll root — attach infinite-scroll rootRef here. Direct flex child of the panel. */
export const ADMIN_LIST_SCROLL_SX = {
  flex: "1 1 0%",
  minHeight: 0,
  overflow: "auto",
  WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain",
};

/** KPI cards — desktop only so the grid keeps mobile viewport height. */
export const ADMIN_LIST_STATS_SX = {
  display: { xs: "none", md: "flex" },
};

/**
 * Compact filter panel shell.
 * Override panel overflow so outlined Select InputLabels are not clipped.
 */
export const ADMIN_LIST_FILTER_BAR_SX = {
  overflow: "visible",
  px: { xs: 1, md: 2.5 },
  pt: { xs: 2.25, md: 2.5 },
  pb: { xs: 1.25, md: 2.5 },
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

/** Filter controls row (dropdowns / toggles). Wraps; children may shrink. */
export const ADMIN_LIST_FILTER_ROW_SX = {
  flexWrap: "wrap",
  overflow: "visible",
  width: "100%",
  minWidth: 0,
  gap: { xs: 1, md: 1.5 },
};

/** Secondary selects — grow equally on mobile without crushing labels. */
export const ADMIN_LIST_FILTER_SELECT_SX = {
  flex: { xs: "1 1 0%", md: "0 0 auto" },
  minWidth: { xs: 0, md: 120 },
  width: { xs: "100%", md: "auto" },
};

/** Full-width select (e.g. Status/Queue on its own mobile row). */
export const ADMIN_LIST_FILTER_SELECT_FULL_SX = {
  width: "100%",
  minWidth: 0,
};

/** Search field — full width under filters on mobile, inline on desktop. */
export const ADMIN_LIST_SEARCH_FIELD_SX = {
  width: { xs: "100%", md: "auto" },
  minWidth: { xs: 0, md: 220 },
  flex: { xs: "1 1 100%", md: "0 0 auto" },
  maxWidth: "100%",
};

/** Selection chip + Actions strip — own row so it never crowds filters. */
export const ADMIN_LIST_BULK_BAR_SX = {
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 1,
  width: "100%",
};

export const ADMIN_LIST_FILTER_TOGGLE_SX = {
  px: 1.5,
  fontFamily: MONO_FONT,
  fontSize: "0.68rem",
  letterSpacing: 0.4,
  textTransform: "uppercase",
  fontWeight: 700,
};

/**
 * Queue/status filter tabs — Select dropdown on mobile, toggle group on desktop.
 * `options`: [{ id, label }]
 */
export function AdminListFilterTabs({
  label = "Filter",
  labelId,
  options,
  value,
  onChange,
  minWidth = 120,
  sx,
}) {
  const isMobile = useIsMobileMd();
  const id = labelId || `admin-list-filter-${label}`.toLowerCase().replace(/\s+/g, "-");

  if (isMobile) {
    return (
      <FormControl
        size="small"
        fullWidth
        sx={{
          ...ADMIN_LIST_FILTER_SELECT_FULL_SX,
          ...sx,
        }}
      >
        <InputLabel id={id}>{label}</InputLabel>
        <Select
          labelId={id}
          label={label}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        >
          {(options || []).map((item) => (
            <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next) => { if (next != null) onChange?.(next); }}
      sx={{ flexWrap: "nowrap" }}
    >
      {(options || []).map((item) => (
        <ToggleButton key={item.id} value={item.id} sx={ADMIN_LIST_FILTER_TOGGLE_SX}>
          {item.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** Non-sortable header cell for MUI Table. */
export function AdminTableHeaderCell({ children, sx, ...props }) {
  return (
    <TableCell sx={{ ...ADMIN_TABLE_HEADER_SX, ...sx }} {...props}>
      {children}
    </TableCell>
  );
}

/** Sortable header cell for MUI Table. */
export function AdminTableSortHeader({
  id,
  label,
  sort,
  onSort,
  align = "left",
  sx,
  labelSx,
}) {
  const active = sort?.key === id;
  return (
    <TableCell align={align} sortDirection={active ? sort.dir : false} sx={sx}>
      <TableSortLabel
        active={active}
        direction={active ? sort.dir : "asc"}
        onClick={() => onSort?.(id)}
        sx={{ ...ADMIN_TABLE_SORT_LABEL_SX, ...labelSx }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
}

/** Plain header label for CSS-grid tables (Orders). */
export function AdminGridHeaderLabel({ children, sx }) {
  return (
    <Typography component="span" sx={{ ...ADMIN_TABLE_HEADER_SX, ...sx }}>
      {children}
    </Typography>
  );
}

/** Sortable header label for CSS-grid tables (Orders). */
export function AdminGridSortHeader({ label, sortKey, sort, onSort, sx }) {
  const active = sort?.key === sortKey;
  return (
    <TableSortLabel
      active={active}
      direction={active ? sort.dir : "asc"}
      onClick={() => onSort?.(sortKey)}
      sx={{ ...ADMIN_TABLE_SORT_LABEL_SX, ...sx }}
    >
      {label}
    </TableSortLabel>
  );
}
