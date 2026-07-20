import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
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
import { INQUIRY_STATUS, useInquiries } from "../lib/inquiriesStore.jsx";
import { isMobileMdViewport, useIsMobileMd } from "../lib/mobileUi.js";
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
          <Typography
            sx={{
              fontWeight: isNew ? 800 : 600,
              fontSize: "0.88rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {inquiry.name}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.68rem", fontFamily: MONO_FONT, flexShrink: 0 }}>
            {formatListTime(inquiry.date)}
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontWeight: isNew ? 700 : 500,
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

      {isNew ? (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: "primary.main",
            flexShrink: 0,
            mt: 0.75,
          }}
        />
      ) : null}
    </Box>
  );
}

function InquiryPreview({ inquiry, surfaceBorderColor, onStatus, onDelete, onBack }) {
  const theme = useTheme();

  return (
    <Stack
      sx={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: { xs: 2, md: 3 }, pb: 2, flexShrink: 0 }}>
        {onBack ? (
          <IconButton
            size="small"
            aria-label="Back to inbox"
            onClick={onBack}
            sx={{
              mt: 0.5,
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
        <Avatar
          sx={{
            width: 48,
            height: 48,
            fontSize: "0.95rem",
            fontWeight: 800,
            bgcolor: alpha(theme.palette.text.primary, 0.1),
          }}
        >
          {initials(inquiry.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: { xs: "1.05rem", md: "1.25rem" } }}>
              {inquiry.subject || "(no subject)"}
            </Typography>
            <Chip label={inquiry.status} size="small" color={STATUS_COLOR[inquiry.status]} variant="outlined" />
          </Stack>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mt: 0.5 }}>
            {inquiry.name} · {inquiry.email}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT, mt: 0.25 }}>
            {formatDate(inquiry.date)}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ borderColor: surfaceBorderColor }} />

      <Box
        sx={{
          flex: "1 1 0%",
          minHeight: 0,
          overflow: "auto",
          p: { xs: 2, md: 3 },
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        <Box
          sx={{
            maxWidth: 640,
            p: 2.5,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.text.primary, 0.03),
            border: "1px solid",
            borderColor: surfaceBorderColor,
          }}
        >
          <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: "0.92rem" }}>
            {inquiry.message}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: surfaceBorderColor }} />

      <Stack direction="row" spacing={1.5} sx={{ p: { xs: 2, md: 2.5 }, flexWrap: "wrap", gap: 1, flexShrink: 0 }}>
        <Button
          variant="contained"
          color="primary"
          component="a"
          href={`mailto:${inquiry.email}?subject=Re: ${encodeURIComponent(inquiry.subject || "Your inquiry")}`}
          startIcon={<MailIcon sx={{ fontSize: 18 }} />}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
        >
          Reply by email
        </Button>
        {inquiry.status !== INQUIRY_STATUS.HANDLED ? (
          <Button variant="outlined" color="success" onClick={() => onStatus(inquiry.id, INQUIRY_STATUS.HANDLED)}>
            Mark handled
          </Button>
        ) : (
          <Button variant="outlined" color="inherit" onClick={() => onStatus(inquiry.id, INQUIRY_STATUS.READ)} sx={{ borderColor: surfaceBorderColor }}>
            Reopen
          </Button>
        )}
        <Button variant="outlined" color="error" onClick={() => onDelete(inquiry.id)}>
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
  const { inquiries, unreadCount, setStatus, remove } = useInquiries();
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
    if (inquiry?.status === INQUIRY_STATUS.NEW) {
      setStatus(openInquiryId, INQUIRY_STATUS.READ);
    }
  }, [location.state?.openInquiryId, setStatus, inquiries]);

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
    if (inquiry.status === INQUIRY_STATUS.NEW) {
      setStatus(inquiry.id, INQUIRY_STATUS.READ);
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
              {unreadCount > 0 ? <Chip label={`${unreadCount} new`} color="primary" size="small" sx={{ fontWeight: 800 }} /> : null}
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