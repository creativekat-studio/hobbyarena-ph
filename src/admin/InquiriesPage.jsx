import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useLocation, useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { MailIcon, SearchIcon, SparkleIcon } from "../components/icons.jsx";
import { INQUIRY_STATUS, useInquiries } from "../lib/inquiriesStore.jsx";

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

function InquiryPreview({ inquiry, surfaceBorderColor, onStatus, onDelete }) {
  const theme = useTheme();

  return (
    <Stack sx={{ height: "100%", minHeight: { xs: 320, md: 0 } }}>
      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ p: { xs: 2.5, md: 3 }, pb: 2 }}>
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
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
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

      <Box sx={{ flex: 1, overflow: "auto", p: { xs: 2.5, md: 3 } }}>
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

      <Stack direction="row" spacing={1.5} sx={{ p: { xs: 2, md: 2.5 }, flexWrap: "wrap", gap: 1 }}>
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
  const location = useLocation();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { inquiries, unreadCount, setStatus, remove } = useInquiries();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(inquiries[0]?.id || null);

  useEffect(() => {
    const openInquiryId = location.state?.openInquiryId;
    if (openInquiryId) {
      setSelectedId(openInquiryId);
      setStatus(openInquiryId, INQUIRY_STATUS.READ);
    }
  }, [location.state?.openInquiryId, setStatus]);

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
    if (!rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const selected = inquiries.find((q) => q.id === selectedId) || null;

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
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>
          Messages
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h3">Inquiries</Typography>
          {unreadCount > 0 ? <Chip label={`${unreadCount} new`} color="primary" sx={{ fontWeight: 800 }} /> : null}
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Messages from the storefront contact form.
        </Typography>
      </Box>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {FILTERS.map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                onClick={() => setFilter(item.id)}
                color={filter === item.id ? "primary" : "default"}
                variant={filter === item.id ? "filled" : "outlined"}
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>
          <TextField
            size="small"
            placeholder="Search messages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: { xs: "100%", md: 260 } }}
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

      <Box
        sx={{
          ...panelSx,
          overflow: "hidden",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          minHeight: { md: 560 },
        }}
      >
        <Box
          sx={{
            width: { md: 340 },
            flexShrink: 0,
            borderRight: { md: "1px solid" },
            borderBottom: { xs: "1px solid", md: "none" },
            borderColor: surfaceBorderColor,
            display: "flex",
            flexDirection: "column",
            maxHeight: { xs: 360, md: "70vh" },
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.82rem" }}>
              Inbox
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>
              {rows.length} conversation{rows.length === 1 ? "" : "s"}
            </Typography>
          </Box>

          <Box sx={{ flex: 1, overflow: "auto" }}>
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

        <Box sx={{ flex: 1, minWidth: 0, bgcolor: alpha(theme.palette.text.primary, 0.015) }}>
          {selected ? (
            <InquiryPreview
              inquiry={selected}
              surfaceBorderColor={surfaceBorderColor}
              onStatus={setStatus}
              onDelete={handleDelete}
            />
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ height: "100%", minHeight: 280, p: 6, textAlign: "center", color: "text.secondary" }}>
              <SparkleIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
              <Typography>Select a conversation to read it.</Typography>
            </Stack>
          )}
        </Box>
      </Box>
    </Stack>
  );
}
