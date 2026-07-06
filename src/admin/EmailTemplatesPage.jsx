import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ORDER_STATUS_EMAIL_LABELS } from "../lib/orderEmailTriggers.js";
import { previewOrderStatusEmail, sendOrderStatusEmail } from "../lib/emailService.js";
import {
  DEFAULT_EMAIL_BODIES,
  EMAIL_PLACEHOLDERS,
  EMAIL_TYPES,
  getEditableEmailBody,
  setEmailBodyOverride,
  clearEmailBodyOverride,
} from "../lib/emailTemplatesStore.js";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import EmailSimInbox from "./EmailSimInbox.jsx";

const PREVIEW_EMAIL = "preview@hobbyarena.ph";

function buildSampleOrder(recipientEmail) {
  const name = "One Piece Mini Tin Pack Set Vol. 4 [TS-04]";
  return {
    id: "HA-202607040003",
    customer: "Hobby Arena",
    email: recipientEmail,
    phone: "",
    type: "Pre-order",
    payment: "DP Paid",
    status: "Awaiting Stock",
    total: 450,
    balanceDue: 1050,
    refundAmount: 525,
    allocatedQty: 3,
    qty: 5,
    date: new Date().toISOString(),
    items: `${name} ×5`,
    lineItems: [{
      id: "li-test",
      name,
      quantity: 5,
      price: 300,
      lineTotal: 1500,
      tag: "Pre-order",
      payment: "DP Paid",
      status: "Awaiting Stock",
    }],
    updatedLineItem: {
      id: "li-test",
      name,
      quantity: 5,
      tag: "Pre-order",
      payment: "DP Paid",
      status: "Awaiting Stock",
      balanceDue: 1050,
      refundAmount: 525,
      allocatedQty: 3,
      depositPaid: 450,
      lineTotal: 1500,
    },
  };
}

function EmailPreview({ emailType, body, surfaceBorderColor }) {
  const [state, setState] = useState({ loading: true, html: "", subject: "", error: "" });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    const timer = setTimeout(() => {
      previewOrderStatusEmail({
        emailType,
        order: buildSampleOrder(PREVIEW_EMAIL),
        bodyOverride: body,
      })
        .then((result) => {
          if (cancelled) return;
          setState({ loading: false, html: result?.html || "", subject: result?.subject || "", error: "" });
        })
        .catch((error) => {
          if (cancelled) return;
          setState({ loading: false, html: "", subject: "", error: error.message || "Preview failed." });
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [emailType, body]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "text.secondary" }}>
          Live preview
        </Typography>
        {state.loading ? <CircularProgress size={14} /> : null}
      </Stack>

      {state.subject ? (
        <Box sx={{ mb: 1, p: 1, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor, bgcolor: "background.paper" }}>
          <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "text.secondary" }}>
            Subject
          </Typography>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.4, wordBreak: "break-word" }}>
            {state.subject}
          </Typography>
        </Box>
      ) : null}

      {state.error ? (
        <Alert severity="error">{state.error}</Alert>
      ) : (
        <Box
          component="iframe"
          title="Email preview"
          srcDoc={state.html}
          sx={{
            width: "100%",
            minHeight: 620,
            border: "1px solid",
            borderColor: surfaceBorderColor,
            borderRadius: 1,
            bgcolor: "#F7F7F5",
            opacity: state.loading ? 0.5 : 1,
            transition: "opacity 0.15s ease",
          }}
        />
      )}
    </Box>
  );
}

function EmailEditor({ emailType, draft, onDraftChange, surfaceBorderColor, testEmail, onTestResult }) {
  const theme = useTheme();
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  const defaultBody = DEFAULT_EMAIL_BODIES[emailType] || "";
  const isCustom = draft.trim() !== defaultBody.trim();

  function handleSave() {
    setEmailBodyOverride(emailType, draft);
    onDraftChange(getEditableEmailBody(emailType));
    setSaved(true);
  }

  function handleReset() {
    clearEmailBodyOverride(emailType);
    onDraftChange(getEditableEmailBody(emailType));
    setSaved(false);
  }

  function insertPlaceholder(token) {
    onDraftChange(`${draft}${draft && !draft.endsWith(" ") ? " " : ""}${token}`);
    setSaved(false);
  }

  async function handleSendTest() {
    if (!testEmail) {
      onTestResult({ ok: false, error: "Enter a test recipient email above." });
      return;
    }
    setSending(true);
    try {
      const result = await sendOrderStatusEmail({
        emailType,
        order: buildSampleOrder(testEmail),
        bodyOverride: draft,
      });
      if (result?.simulated) {
        onTestResult({
          ok: true,
          message: `Test "${ORDER_STATUS_EMAIL_LABELS[emailType]}" captured in Simulated inbox (to ${testEmail}).`,
        });
      } else if (result?.skipped) {
        onTestResult({ ok: true, warning: result.skipReason || "Sent, but Resend test mode limits delivery." });
      } else {
        onTestResult({ ok: true, message: `Test "${ORDER_STATUS_EMAIL_LABELS[emailType]}" email sent to ${testEmail}.` });
      }
    } catch (error) {
      onTestResult({ ok: false, error: error.message || "Could not send test email." });
    } finally {
      setSending(false);
    }
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: "text.secondary" }}>
          Message body
        </Typography>
        {isCustom ? (
          <Chip label="Customized" size="small" color="primary" sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700 }} />
        ) : (
          <Chip label="Default" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700 }} />
        )}
      </Stack>

      <TextField
        fullWidth
        multiline
        minRows={6}
        value={draft}
        onChange={(e) => { onDraftChange(e.target.value); setSaved(false); }}
        placeholder={defaultBody}
      />

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {EMAIL_PLACEHOLDERS.map((placeholder) => (
          <Chip
            key={placeholder.token}
            label={placeholder.token}
            size="small"
            variant="outlined"
            onClick={() => insertPlaceholder(placeholder.token)}
            title={placeholder.description}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.66rem", borderColor: surfaceBorderColor, cursor: "pointer" }}
          />
        ))}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
        >
          Save
        </Button>
        <Button
          variant="text"
          color="inherit"
          disabled={!isCustom}
          onClick={handleReset}
          sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem" }}
        >
          Reset to default
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          disabled={sending}
          onClick={handleSendTest}
          sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem" }}
        >
          {sending ? "Sending…" : "Send test to me"}
        </Button>
      </Stack>

      {saved ? (
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: theme.palette.success.main }}>
          Saved — used on the next {ORDER_STATUS_EMAIL_LABELS[emailType].toLowerCase()} email.
        </Typography>
      ) : null}
    </Stack>
  );
}

export default function EmailTemplatesPage() {
  const theme = useTheme();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { admin } = useAuth();
  const [testEmail, setTestEmail] = useState(admin?.email || "");
  const [feedback, setFeedback] = useState(null);
  const [activeType, setActiveType] = useState(EMAIL_TYPES[0]);
  const [pageMode, setPageMode] = useState("templates");
  const draftsRef = useRef(null);
  if (draftsRef.current === null) {
    draftsRef.current = Object.fromEntries(EMAIL_TYPES.map((type) => [type, getEditableEmailBody(type)]));
  }
  const [drafts, setDrafts] = useState(() => draftsRef.current);

  const draft = drafts[activeType] ?? "";

  const emailTypes = useMemo(() => EMAIL_TYPES, []);

  function setDraftForActive(value) {
    setDrafts((prev) => ({ ...prev, [activeType]: value }));
  }

  function feedbackSeverity() {
    if (!feedback?.ok) return "error";
    return feedback.warning ? "warning" : "success";
  }

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      <AdminPageHeader
        eyebrow="Settings"
        title="Email templates"
        subtitle="Edit order-status copy, preview layouts, and review simulated emails captured during local development."
      />

      <Tabs
        value={pageMode}
        onChange={(_, value) => setPageMode(value)}
        sx={{ ...panelSx, minHeight: 48, px: 1 }}
      >
        <Tab value="templates" label="Templates" sx={{ fontWeight: 700, textTransform: "none" }} />
        <Tab value="inbox" label="Simulated inbox" sx={{ fontWeight: 700, textTransform: "none" }} />
      </Tabs>

      {pageMode === "inbox" ? (
        <EmailSimInbox panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
      ) : (
        <>
      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.9rem", mb: 1 }}>Test recipient</Typography>
        <TextField
          fullWidth
          type="email"
          label="Send test emails to"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value.trim())}
          placeholder="you@example.com"
          helperText="With simulation on, test sends are captured in the Simulated inbox tab. With simulation off, Resend delivers to your account email in test mode."
        />
        {feedback ? (
          <Alert
            severity={feedbackSeverity()}
            sx={{ mt: 1.5 }}
            onClose={() => setFeedback(null)}
          >
            {feedback.error || feedback.warning || feedback.message}
          </Alert>
        ) : null}
      </Box>

      <Box sx={{ ...panelSx, overflow: "hidden" }}>
        <Tabs
          value={activeType}
          onChange={(_, value) => setActiveType(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ px: 1.5, borderBottom: "1px solid", borderColor: surfaceBorderColor }}
        >
          {emailTypes.map((type) => (
            <Tab
              key={type}
              value={type}
              label={ORDER_STATUS_EMAIL_LABELS[type]}
              sx={{ fontWeight: 700, textTransform: "none", fontSize: "0.8rem", minHeight: 48 }}
            />
          ))}
        </Tabs>

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "grid",
            gap: { xs: 3, md: 3 },
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
            alignItems: "start",
          }}
        >
          <EmailEditor
            key={`${activeType}-editor`}
            emailType={activeType}
            draft={draft}
            onDraftChange={setDraftForActive}
            surfaceBorderColor={surfaceBorderColor}
            testEmail={testEmail}
            onTestResult={setFeedback}
          />

          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              border: "1px dashed",
              borderColor: alpha(surfaceBorderColor, 0.9),
              bgcolor: alpha(theme.palette.text.primary, 0.015),
            }}
          >
            <EmailPreview
              emailType={activeType}
              body={draft}
              surfaceBorderColor={surfaceBorderColor}
            />
          </Box>
        </Box>
      </Box>
        </>
      )}
    </Stack>
  );
}
