import { TableCell, TableSortLabel, Typography } from "@mui/material";
import { MONO_FONT } from "../theme.js";

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

/** Compact filter panel shell. */
export const ADMIN_LIST_FILTER_BAR_SX = {
  p: { xs: 1, md: 2.5 },
};

/** One dense filter row; horizontal swipe on mobile instead of wrapping tall. */
export const ADMIN_LIST_FILTER_ROW_SX = {
  flexWrap: { xs: "nowrap", md: "wrap" },
  overflowX: { xs: "auto", md: "visible" },
  WebkitOverflowScrolling: "touch",
  pb: { xs: 0.25, md: 0 },
  gap: { xs: 1, md: 1.5 },
  "& > *": { flexShrink: 0 },
};

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
