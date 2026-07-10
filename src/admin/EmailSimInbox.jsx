import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import {
  clearEmailOutbox,
  fetchEmailOutbox,
  fetchEmailOutboxEntry,
  fetchEmailOutboxStatus,
} from "../lib/emailService.js";

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function kindLabel(kind) {
  const labels = {
    order_status: "Order update",
    order_ack_customer: "Order confirmation",
    order_ack_admin: "Admin: new order",
    inquiry_admin: "Admin: inquiry",
    inquiry_auto_reply: "Inquiry auto-reply",
  };
  return labels[kind] || kind || "Email";
}

export default function EmailSimInbox({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const [status, setStatus] = useState({ simulate: false, count: 0 });
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState({ loading: false, html: "", subject: "", error: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [outboxStatus, outbox] = await Promise.all([
        fetchEmailOutboxStatus(),
        fetchEmailOutbox(),
      ]);
      setStatus(outboxStatus);
      setEntries(outbox.entries || []);
    } catch (err) {
      setError(err.message || "Could not load outbox.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setPreview({ loading: false, html: "", subject: "", error: "" });
      return undefined;
    }
    let cancelled = false;
    setPreview({ loading: true, html: "", subject: "", error: "" });
    fetchEmailOutboxEntry(selectedId)
      .then((data) => {
        if (cancelled) return;
        setPreview({
          loading: false,
          html: data.entry?.html || "",
          subject: data.entry?.subject || "",
          error: "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setPreview({ loading: false, html: "", subject: "", error: err.message || "Failed to load." });
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  async function handleClear() {
    await clearEmailOutbox();
    setSelectedId(null);
    await refresh();
  }

  return (
    <Stack spacing={2}>
      <Alert severity={status.simulate ? "info" : "warning"}>
        {status.simulate
          ? "Simulation is on — outgoing emails are captured here instead of being sent through Resend. Place an order, change a status, or submit an inquiry to generate entries."
          : "Simulation is off — emails go through Resend. Set EMAIL_SIMULATE=true in .env.local, or use onboarding@resend.dev as the sender to enable local capture."}
      </Alert>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 800, flex: 1 }}>Simulated inbox ({status.count})</Typography>
          <Button size="small" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
          <Button size="small" color="inherit" onClick={handleClear} disabled={!entries.length}>
            Clear all
          </Button>
        </Stack>

        {loading ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : entries.length === 0 ? (
          <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
            No simulated emails yet. Trigger one from checkout, order status changes, or the contact form.
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 280px) minmax(0, 1fr)" },
              alignItems: "stretch",
              minHeight: "calc(100vh - 340px)",
            }}
          >
            <Stack spacing={0.75}>
              {entries.map((entry) => {
                const active = entry.id === selectedId;
                return (
                  <Box
                    key={entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    sx={{
                      p: 1.25,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: active ? "primary.main" : surfaceBorderColor,
                      bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip label={kindLabel(entry.kind)} size="small" sx={{ height: 20, fontSize: "0.6rem" }} />
                      {entry.emailType ? (
                        <Chip label={entry.emailType} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.58rem" }} />
                      ) : null}
                    </Stack>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.3 }}>
                      {entry.subject}
                    </Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.25 }}>
                      To: {Array.isArray(entry.to) ? entry.to.join(", ") : entry.to}
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", fontFamily: MONO_FONT, mt: 0.25 }}>
                      {formatWhen(entry.at)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            <Box
              sx={{
                height: "100%",
                minHeight: 360,
                borderRadius: 1,
                border: "1px dashed",
                borderColor: alpha(surfaceBorderColor, 0.9),
                bgcolor: alpha(theme.palette.text.primary, 0.015),
                overflow: "hidden",
              }}
            >
              {!selectedId ? (
                <Box sx={{ p: 3, color: "text.secondary", fontSize: "0.85rem" }}>
                  Select an email to preview.
                </Box>
              ) : preview.loading ? (
                <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : preview.error ? (
                <Alert severity="error" sx={{ m: 2 }}>{preview.error}</Alert>
              ) : (
                <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <Typography sx={{ px: 2, py: 1.25, fontWeight: 700, fontSize: "0.85rem", borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
                    {preview.subject}
                  </Typography>
                  <Box
                    component="iframe"
                    title="Email preview"
                    srcDoc={preview.html}
                    sx={{ flex: 1, width: "100%", minHeight: 320, border: 0, bgcolor: "#fff" }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Stack>
  );
}
