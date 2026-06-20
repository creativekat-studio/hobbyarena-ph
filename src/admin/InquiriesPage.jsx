import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useLocation, useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { SearchIcon, SparkleIcon } from "../components/icons.jsx";
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
        !query.trim() ||
        q.name.toLowerCase().includes(query.toLowerCase()) ||
        q.email.toLowerCase().includes(query.toLowerCase()) ||
        q.subject.toLowerCase().includes(query.toLowerCase()) ||
        q.message.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (filter === "all") return true;
      return q.status === filter;
    });
  }, [inquiries, filter, query]);

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
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Messages</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h3">Inquiries</Typography>
          {unreadCount > 0 ? <Chip label={`${unreadCount} new`} color="primary" sx={{ fontWeight: 800 }} /> : null}
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Messages from the storefront contact form.</Typography>
      </Box>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {FILTERS.map((item) => (
              <Chip key={item.id} label={item.label} onClick={() => setFilter(item.id)} color={filter === item.id ? "primary" : "default"} variant={filter === item.id ? "filled" : "outlined"} sx={{ fontWeight: 700 }} />
            ))}
          </Stack>
          <TextField
            size="small"
            placeholder="Search messages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: { xs: "100%", md: 260 } }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
          />
        </Stack>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={1.5}>
            {rows.map((inquiry) => {
              const isSelected = inquiry.id === selectedId;
              return (
                <Box
                  key={inquiry.id}
                  onClick={() => handleSelect(inquiry)}
                  sx={{
                    ...panelSx,
                    p: 2,
                    cursor: "pointer",
                    borderColor: isSelected ? "primary.main" : surfaceBorderColor,
                    borderLeft: "4px solid",
                    borderLeftColor: inquiry.status === "New" ? "primary.main" : "transparent",
                    transition: "border-color 150ms ease",
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: inquiry.status === "New" ? 800 : 600, fontSize: "0.92rem" }}>{inquiry.subject || "(no subject)"}</Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{inquiry.name} · {inquiry.email}</Typography>
                    </Box>
                    <Chip label={inquiry.status} size="small" color={STATUS_COLOR[inquiry.status]} variant="outlined" />
                  </Stack>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inquiry.message}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.7rem", fontFamily: MONO_FONT, mt: 0.5 }}>{formatDate(inquiry.date)}</Typography>
                </Box>
              );
            })}
            {rows.length === 0 ? (
              <Box sx={{ ...panelSx, p: 5, textAlign: "center", color: "text.secondary" }}>No messages match your filters.</Box>
            ) : null}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          {selected ? (
            <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, position: "sticky", top: 88 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{selected.subject || "(no subject)"}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mt: 0.5 }}>
                    From <strong>{selected.name}</strong> · {selected.email}
                  </Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT, mt: 0.25 }}>{formatDate(selected.date)}</Typography>
                </Box>
                <Chip label={selected.status} size="small" color={STATUS_COLOR[selected.status]} variant="outlined" />
              </Stack>

              <Box sx={{ mt: 2.5, p: 2.5, borderRadius: 1, bgcolor: alpha(theme.palette.text.primary, 0.03), border: "1px solid", borderColor: surfaceBorderColor }}>
                <Typography sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{selected.message}</Typography>
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  component="a"
                  href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || "Your inquiry")}`}
                  sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
                >
                  Reply by email
                </Button>
                {selected.status !== INQUIRY_STATUS.HANDLED ? (
                  <Button variant="outlined" color="success" onClick={() => setStatus(selected.id, INQUIRY_STATUS.HANDLED)}>Mark handled</Button>
                ) : (
                  <Button variant="outlined" color="inherit" onClick={() => setStatus(selected.id, INQUIRY_STATUS.READ)} sx={{ borderColor: surfaceBorderColor }}>Reopen</Button>
                )}
                <Button variant="outlined" color="error" onClick={() => handleDelete(selected.id)}>Delete</Button>
              </Stack>
            </Box>
          ) : (
            <Box sx={{ ...panelSx, p: 6, textAlign: "center", color: "text.secondary" }}>
              <SparkleIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
              <Typography>Select a message to read it.</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Stack>
  );
}
