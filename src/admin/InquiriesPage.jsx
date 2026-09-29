import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useLocation, useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import AdminSectionTitle from "../components/AdminSectionTitle.jsx";
import { ChevronLeftIcon, MailIcon, SearchIcon, SparkleIcon } from "../components/icons.jsx";
import { INQUIRY_STATUS, isUnseenInquiry, useInquiries } from "../lib/inquiriesStore.jsx";
import { isMobileMdViewport, useIsMobileMd } from "../lib/mobileUi.js";
import { ADMIN_ACTION_BUTTON_SX, ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import {
  AdminListFilterTabs,
  ADMIN_LIST_FILTER_BAR_SX,
  ADMIN_LIST_PAGE_SX,
  ADMIN_LIST_PANEL_SX,
  ADMIN_LIST_SEARCH_FIELD_SX,
} from "./adminTableHeader.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: INQUIRY_STATUS.NEW, label: "New" },
  { id: INQUIRY_STATUS.READ, label: "Read" },
  { id: INQUIRY_STATUS.HANDLED, label: "Handled" },
];

const STATUS_COLOR = {
  New: "primary",
  Read: "default",
  Handled: "success",
};

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatListTime(iso) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function InquiryListItem({ inquiry, selected, onSelect, surfaceBorderColor }) {
  const theme = useTheme();
  const isNew = inquiry.status === INQUIRY_STATUS.NEW;
  const unseen = isUnseenInquiry(inquiry);

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onSelect(inquiry)}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        px: 2,
        py: 1.75,
        border: "none",
        borderBottom: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: selected ? alpha(theme.palette.primary.main, isNew ? 0.12 : 0.07) : "transparent",
        color: "inherit",
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
        transition: "background-color 150ms ease",
        "&:hover": {
          bgcolor: selected
            ? alpha(theme.palette.primary.main, isNew ? 0.12 : 0.07)
            : alpha(theme.palette.text.primary, 0.04),
        },
      }}
    >
      <Avatar
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          fontSize: "0.82rem",
          fontWeight: 800,
          bgcolor: isNew ? "primary.main" : alpha(theme.palette.text.primary, 0.1),
          color: isNew ? "primary.contrastText" : "text.primary",
        }}
      >
        {initials(inquiry.name)}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
            {unseen ? (
              <Box
                sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }}
                title="New inquiry"
              />
            ) : null}
            <Typography
              sx={{
                fontWeight: unseen ? 800 : 600,
                fontSize: "0.88rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {inquiry.name}
            </Typography>
          </Stack>
          <Typography sx={{ color: "text.secondary", fontSize: "0.68rem", fontFamily: MONO_FONT, flexShrink: 0 }}>
            {formatListTime(inquiry.date)}
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontWeight: unseen ? 700 : 500,
            fontSize: "0.8rem",
            mt: 0.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {inquiry.subject || "(no subject)"}
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: "0.76rem",
            mt: 0.35,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {inquiry.message}
        </Typography>
      </Box>

    </Box>
  );
}

function InquiryStatusChip({ status }) {
  return (
    <Chip
      label={status}
      variant="outlined"
      color={STATUS_COLOR[status] || "default"}
      sx={ADMIN_STATUS_CHIP_SX}
    />
  );
}

function DetailRow({ label, children, borderColor, last = false }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
      sx={{
        px: 1.5,
        py: 1.15,
        borderBottom: last ? "none" : "1px solid",
        borderColor,
      }}
    >
      <Typography
        sx={{
          color: "text.secondary",
          fontSize: "0.68rem",
          fontFamily: MONO_FONT,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ minWidth: 0, textAlign: "right" }}>{children}</Box>
    </Stack>
  );
}

const DESTRUCTIVE_BUTTON_SX = {
  ...ADMIN_ACTION_BUTTON_SX,
  bgcolor: "error.main",
  color: "error.contrastText",
  "&:hover": { bgcolor: "error.dark", border: "none" },
};

function InquiryPreview({ inquiry, surfaceBorderColor, onStatus, onDelete, onBack }) {
  const theme = useTheme();
  const sectionFrame = {
    border: "1px solid",
    borderColor: surfaceBorderColor,
    borderRadius: 1,
    overflow: "hidden",
    bgcolor: alpha(theme.palette.background.paper, 0.35),
  };

  return (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="flex-start"
        sx={{ px: { xs: 2, md: 2.5 }, py: 1.75, flexShrink: 0 }}
      >
        {onBack ? (
          <IconButton
            size="small"
            aria-label="Back to inbox"
            onClick={onBack}
            sx={{
              mt: 0.25,
              flexShrink: 0,
              border: "1px solid",
              borderColor: surfaceBorderColor,
              borderRadius: 1,
              display: { xs: "inline-flex", md: "none" },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 20 }} />
          </IconButton>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.25, fontSize: { xs: "1.05rem", md: "1.2rem" } }}>
              {inquiry.subject || "(no subject)"}
            </Typography>
            <InquiryStatusChip status={inquiry.status} />
          </Stack>
          <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", mt: 0.5 }}>
            {inquiry.name}
            {inquiry.email ? ` · ${inquiry.email}` : ""}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          px: { xs: 2, md: 2.5 },
          pb: 2,
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.7fr) minmax(240px, 0.8fr)" },
          gridTemplateRows: { xs: "auto auto", md: "minmax(0, 1fr)" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <Box sx={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <AdminSectionTitle sx={{ fontSize: "0.82rem", mb: 1 }}>Message</AdminSectionTitle>
          <Box sx={{ ...sectionFrame, flex: 1, minHeight: 160, overflow: "auto", p: { xs: 1.75, md: 2.25 } }}>
            <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.92rem" }}>
              {inquiry.message}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <AdminSectionTitle sx={{ fontSize: "0.82rem", mb: 1 }}>From</AdminSectionTitle>
          <Box sx={sectionFrame}>
            <DetailRow label="Name" borderColor={surfaceBorderColor}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>{inquiry.name}</Typography>
            </DetailRow>
            <DetailRow label="Email" borderColor={surfaceBorderColor}>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.75rem", wordBreak: "break-all" }}>
                {inquiry.email || "—"}
              </Typography>
            </DetailRow>
            <DetailRow label="Received" borderColor={surfaceBorderColor}>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.75rem" }}>{formatDate(inquiry.date)}</Typography>
            </DetailRow>
            <DetailRow label="Status" borderColor={surfaceBorderColor} last>
              <InquiryStatusChip status={inquiry.status} />
            </DetailRow>
          </Box>
        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{
          px: { xs: 2, md: 2.5 },
          py: 1.5,
          flexShrink: 0,
          borderTop: "1px solid",
          borderColor: surfaceBorderColor,
        }}
      >
        <Button
          size="small"
          variant="contained"
          color="primary"
          component="a"
          href={`mailto:${inquiry.email}?subject=Re: ${encodeURIComponent(inquiry.subject || "Your inquiry")}`}
          startIcon={<MailIcon sx={{ fontSize: 16 }} />}
          sx={ADMIN_ACTION_BUTTON_SX}
        >
          Reply by email
        </Button>
        {inquiry.status !== INQUIRY_STATUS.HANDLED ? (
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => onStatus(inquiry.id, INQUIRY_STATUS.HANDLED)}
            sx={ADMIN_ACTION_BUTTON_SX}
          >
            Mark handled
          </Button>
        ) : (
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => onStatus(inquiry.id, INQUIRY_STATUS.READ)}
            sx={ADMIN_ACTION_BUTTON_SX}
          >
            Reopen
          </Button>
        )}
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={() => onDelete(inquiry.id)}
          sx={DESTRUCTIVE_BUTTON_SX}
        >
          Delete
        </Button>
      </Stack>
    </Stack>
  );
}

export default function InquiriesPage() {
  const theme = useTheme();
  const isMobile = useIsMobileMd();
  const location = useLocation();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { inquiries, unreadCount, setStatus, remove, markInquirySeen } = useInquiries();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  // Mobile: start on inbox. Desktop: open first conversation when available.
  const [selectedId, setSelectedId] = useState(() => (
    isMobileMdViewport() ? null : (inquiries[0]?.id || null)
  ));

  useEffect(() => {
    const openInquiryId = location.state?.openInquiryId;
    if (!openInquiryId) return;
    setSelectedId(openInquiryId);
    const inquiry = inquiries.find((q) => q.id === openInquiryId);
    if (isUnseenInquiry(inquiry)) {
      markInquirySeen(openInquiryId);
    }
  }, [location.state?.openInquiryId, markInquirySeen, inquiries]);

  const rows = useMemo(() => {
    return inquiries.filter((q) => {
      const matchesQuery =
        !query.trim()
        || q.name.toLowerCase().includes(query.toLowerCase())
        || q.email.toLowerCase().includes(query.toLowerCase())
        || q.subject.toLowerCase().includes(query.toLowerCase())
        || q.message.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (filter === "all") return true;
      return q.status === filter;
    });
  }, [inquiries, filter, query]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId && !rows.some((row) => row.id === selectedId)) {
      setSelectedId(isMobile ? null : rows[0].id);
      return;
    }
    if (!selectedId && !isMobile) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId, isMobile]);

  const selected = inquiries.find((q) => q.id === selectedId) || null;
  const showInbox = !isMobile || !selectedId;
  const showPreview = !isMobile || Boolean(selectedId);

  function handleSelect(inquiry) {
    setSelectedId(inquiry.id);
    if (isUnseenInquiry(inquiry)) {
      markInquirySeen(inquiry.id);
    }
  }

  function handleDelete(id) {
    remove(id);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <Box sx={{ ...ADMIN_LIST_PAGE_SX, gap: { xs: 1, md: ADMIN_PAGE_SPACING } }}>
      <Stack spacing={{ xs: 1, md: ADMIN_PAGE_SPACING }} sx={{ flexShrink: 0 }}>
        <AdminPageHeader
          eyebrow="Messages"
          title={(
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <span>Inquiries</span>
              {unreadCount > 0 ? (
                <Chip
                  label={`${unreadCount} new`}
                  color="primary"
                  variant="outlined"
                  sx={ADMIN_STATUS_CHIP_SX}
                />
              ) : null}
            </Stack>
          )}
          subtitle="Messages from the storefront contact form."
        />

        <Box sx={{ ...panelSx, ...ADMIN_LIST_FILTER_BAR_SX }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.25}
            alignItems={{ xs: "stretch", md: "center" }}
            sx={{ width: "100%", minWidth: 0 }}
          >
            <AdminListFilterTabs
              label="Status"
              labelId="inquiries-filter"
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />

            <Box sx={{ flex: 1, display: { xs: "none", md: "block" } }} />

            <TextField
              size="small"
              placeholder="Search messages…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
              sx={ADMIN_LIST_SEARCH_FIELD_SX}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Box>
      </Stack>

      <Box
        sx={{
          ...ADMIN_LIST_PANEL_SX,
          ...panelSx,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box
          sx={{
            width: { md: 340 },
            flexShrink: 0,
            borderRight: { md: "1px solid" },
            borderColor: surfaceBorderColor,
            display: showInbox ? "flex" : "none",
            flexDirection: "column",
            minHeight: 0,
            flex: { xs: "1 1 0%", md: "0 0 340px" },
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: surfaceBorderColor, flexShrink: 0 }}>
            <AdminSectionTitle sx={{ fontSize: "0.82rem" }}>Inbox</AdminSectionTitle>
            <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>
              {rows.length} conversation{rows.length === 1 ? "" : "s"}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: "1 1 0%",
              minHeight: 0,
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {rows.length ? (
              rows.map((inquiry) => (
                <InquiryListItem
                  key={inquiry.id}
                  inquiry={inquiry}
                  selected={inquiry.id === selectedId}
                  onSelect={handleSelect}
                  surfaceBorderColor={surfaceBorderColor}
                />
              ))
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ p: 5, textAlign: "center", color: "text.secondary", height: "100%" }}>
                <Typography>No messages match your filters.</Typography>
              </Stack>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            flex: "1 1 0%",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            display: showPreview ? "flex" : "none",
            flexDirection: "column",
            bgcolor: alpha(theme.palette.text.primary, 0.015),
          }}
        >
          {selected ? (
            <InquiryPreview
              inquiry={selected}
              surfaceBorderColor={surfaceBorderColor}
              onStatus={setStatus}
              onDelete={handleDelete}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, minHeight: 280, p: 6, textAlign: "center", color: "text.secondary" }}>
              <SparkleIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
              <Typography>Select a conversation to read it.</Typography>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
}