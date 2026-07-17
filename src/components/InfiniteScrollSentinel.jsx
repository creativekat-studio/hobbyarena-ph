import { Box, TableCell, TableRow, Typography } from "@mui/material";
import { MONO_FONT } from "../theme.js";

function StatusText({ hasMore, visibleCount, totalCount }) {
  if (!totalCount) return null;
  return (
    <Typography
      component="span"
      sx={{
        fontFamily: MONO_FONT,
        fontSize: "0.68rem",
        letterSpacing: 0.4,
        color: "text.secondary",
        textTransform: "uppercase",
      }}
    >
      {hasMore ? `Showing ${visibleCount} of ${totalCount} · scroll for more` : `${totalCount} total`}
    </Typography>
  );
}

/** Footer / observer target for overflow grids (cards, custom rows). */
export function InfiniteScrollSentinel({
  sentinelRef,
  hasMore,
  visibleCount,
  totalCount,
  sx,
}) {
  if (!totalCount) return null;
  return (
    <Box
      ref={sentinelRef}
      sx={{ py: 1.5, textAlign: "center", ...sx }}
      aria-hidden={!hasMore}
    >
      <StatusText hasMore={hasMore} visibleCount={visibleCount} totalCount={totalCount} />
    </Box>
  );
}

/** Table-friendly observer target spanning all columns. */
export function InfiniteScrollTableSentinel({
  sentinelRef,
  hasMore,
  visibleCount,
  totalCount,
  colSpan = 12,
}) {
  if (!totalCount) return null;
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        align="center"
        sx={{ borderBottom: "none", py: 1.5 }}
      >
        <Box ref={sentinelRef}>
          <StatusText hasMore={hasMore} visibleCount={visibleCount} totalCount={totalCount} />
        </Box>
      </TableCell>
    </TableRow>
  );
}
