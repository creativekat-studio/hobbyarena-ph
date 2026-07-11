import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ORDER_STATUS_EMAIL_LABELS } from "../lib/orderEmailTriggers.js";
import { sendOrderStatusEmail } from "../lib/emailService.js";
import { buildOrderStatusEmail } from "../lib/email/orderStatusEmail.js";
import {
  DEFAULT_EMAIL_BODIES,
  DEFAULT_PREORDER_REMINDER,
  EMAIL_PLACEHOLDERS,
  EMAIL_TYPES,
  PREORDER_REMINDER_PLACEHOLDERS,
  getEditableEmailBody,
  getPreorderReminderConfig,
  setEmailBodyOverride,
  clearEmailBodyOverride,
  setPreorderReminderConfig,
  clearPreorderReminderConfig,
} from "../lib/emailTemplatesStore.js";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import EmailSimInbox from "./EmailSimInbox.jsx";

const PREVIEW_EMAIL = "preview@hobbyarena.ph";

const SAMPLE_STATES = {
  deposit_received: { payment: "DP Paid", status: "Awaiting Stock", balanceDue: 1050, refundAmount: 0, allocatedQty: 0 },
  balance_due_full: { payment: "DP Paid", status: "Allocation Fulfilled & Pay Balance", balanceDue: 1050, refundAmount: 0, allocatedQty: 5 },
  balance_due_partial: { payment: "DP Paid", status: "Partially Fulfilled & Pay Balance", balanceDue: 1050, refundAmount: 0, allocatedQty: 3 },
  partial_refund_pending: { payment: "DP Paid", status: "Partially Fulfilled & For Refund", balanceDue: 0, refundAmount: 525, allocatedQty: 3 },
  full_refund_pending: { payment: "DP Paid", status: "For Full Refund", balanceDue: 0, refundAmount: 450, allocatedQty: 0 },
  partial_refund_sent: { payment: "Partially Refunded", status: "Ready for Pickup", balanceDue: 0, refundAmount: 525, allocatedQty: 3 },
  ready_for_pickup: { payment: "Fully Paid", status: "Ready for Pickup", balanceDue: 0, refundAmount: 0, allocatedQty: 5 },
  order_fulfilled: { payment: "Fully Paid", status: "Fulfilled", balanceDue: 0, refundAmount: 0, allocatedQty: 5 },
  full_refund_sent: { payment: "Refunded", status: "Refunded", balanceDue: 0, refundAmount: 450, allocatedQty: 0 },
  payment_not_received: { payment: "Unpaid", status: "Awaiting Stock", balanceDue: 0, refundAmount: 0, allocatedQty: 0 },
};

function buildSampleOrder(recipientEmail, emailType) {
  const name = "One Piece Mini Tin Pack Set Vol. 4 [TS-04]";
  const state = SAMPLE_STATES[emailType] ?? SAMPLE_STATES.deposit_received;
  return {
    id: "HA-202607040003",
    customer: "Hobby Arena",
    email: recipientEmail,
    phone: "",
    type: "Pre-order",
    payment: state.payment,
    status: state.status,
    total: 450,
    balanceDue: state.balanceDue,
    refundAmount: state.refundAmount,
    allocatedQty: state.allocatedQty,
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
      payment: state.payment,
      status: state.status,
      balanceDue: state.balanceDue,
      refundAmount: state.refundAmount,
      allocatedQty: state.allocatedQty,
      depositPaid: 450,
    }],
    updatedLineItem: {
      id: "li-test",
      name,
      quantity: 5,
      tag: "Pre-order",
      payment: state.payment,
      status: state.status,
      balanceDue: state.balanceDue,
      refundAmount: state.refundAmount,
      allocatedQty: state.allocatedQty,
      depositPaid: 450,
      lineTotal: 1500,
    },
  };
}

function EmailPreview({ emailType, body, reminder, surfaceBorderColor }) {
  const [state, setState] = useState({ loading: true, html: "", subject: "", error: "" });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    const timer = setTimeout(() => {
      try {
        const result = buildOrderStatusEmail(
          buildSampleOrder(PREVIEW_EMAIL, emailType),
          emailType,
          { bodyOverride: body, reminder },
        );
        if (cancelled) return;
        if (!result) {
          setState({ loading: false, html: "", subject: "", error: "Unknown email type." });
          return;
        }
        setState({ loading: false, html: result.html || "", subject: result.subject || "", error: "" });
      } catch (error) {
        if (cancelled) return;
        setState({ loading: false, html: "", subject: "", error: error.message || "Preview failed." });
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [emailType, body, reminder]);

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

function EmailEditor({ emailType, draft, onDraftChange, surfaceBorderColor, testEmail, onTestResult, reminder }) {
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
        order: buildSampleOrder(testEmail, emailType),
        bodyOverride: draft,
        reminder,
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
    <Stack spacing={1.5} sx={{ height: "100%" }}>
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
        sx={{
          flex: 1,
          "& .MuiInputBase-root": { height: "100%", alignItems: "flex-start" },
          "& textarea": { height: "100% !important", overflow: "auto !important", resize: "none" },
        }}
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

function PreorderReminderEditor({ draft, onDraftChange, surfaceBorderColor }) {
  const theme = useTheme();
  const [saved, setSaved] = useState(false);
  const isCustom = draft.enabled !== DEFAULT_PREORDER_REMINDER.enabled
    || draft.title.trim() !== DEFAULT_PREORDER_REMINDER.title.trim()
    || draft.lines.join("\n") !== DEFAULT_PREORDER_REMINDER.lines.join("\n");

  function update(partial) {
    onDraftChange({ ...draft, ...partial });
    setSaved(false);
  }

  function handleSave() {
    const next = setPreorderReminderConfig(draft);
    onDraftChange(next);
    setSaved(true);
  }

  function handleReset() {
    const next = clearPreorderReminderConfig();
    onDraftChange(next);
    setSaved(false);
  }

  function insertPlaceholder(token) {
    const lines = [...draft.lines];
    const last = lines.length - 1;
    if (last < 0) {
      update({ lines: [token] });
      return;
    }
    const current = lines[last] || "";
    lines[last] = `${current}${current && !current.endsWith(" ") ? " " : ""}${token}`;
    update({ lines });
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Pre-order reminder footer</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", mt: 0.25 }}>
            Shown on Payment verified (DP paid &amp; awaiting stock) and balance-due emails when the customer is not fully paid.
          </Typography>
        </Box>
        {isCustom ? (
          <Chip label="Customized" size="small" color="primary" sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700 }} />
        ) : (
          <Chip label="Default" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700 }} />
        )}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Switch
          checked={draft.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
          color="primary"
          size="small"
        />
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
          {draft.enabled ? "Footer visible on unpaid pre-order emails" : "Footer hidden"}
        </Typography>
      </Stack>

      <TextField
        label="Footer title"
        fullWidth
        value={draft.title}
        disabled={!draft.enabled}
        onChange={(e) => update({ title: e.target.value })}
      />

      {draft.lines.map((line, index) => (
        <TextField
          key={`reminder-line-${index}`}
          label={`Message line ${index + 1}`}
          fullWidth
          multiline
          minRows={2}
          value={line}
          disabled={!draft.enabled}
          onChange={(e) => {
            const lines = [...draft.lines];
            lines[index] = e.target.value;
            update({ lines });
          }}
        />
      ))}

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {PREORDER_REMINDER_PLACEHOLDERS.map((placeholder) => (
          <Chip
            key={placeholder.token}
            label={placeholder.token}
            size="small"
            variant="outlined"
            disabled={!draft.enabled}
            onClick={() => insertPlaceholder(placeholder.token)}
            title={placeholder.description}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.66rem", borderColor: surfaceBorderColor, cursor: draft.enabled ? "pointer" : "default" }}
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
          Save footer
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
      </Stack>

      {saved ? (
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: theme.palette.success.main }}>
          Saved — applied to the next unpaid pre-order emails.
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
  const [reminderDraft, setReminderDraft] = useState(() => getPreorderReminderConfig());

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
        sx={{ ...panelSx, px: 1 }}
      >
        <Tab value="templates" label="Templates" />
        <Tab value="inbox" label="Simulated inbox" />
      </Tabs>

      {pageMode === "inbox" ? (
        <EmailSimInbox panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
      ) : (
        <>
      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Test recipient</Typography>
          <Tooltip
            title="With simulation on, test sends are captured in the Simulated inbox tab. With simulation off, Resend delivers to your account email in test mode."
            arrow
            placement="top"
            enterTouchDelay={0}
            slotProps={{
              tooltip: {
                sx: {
                  fontFamily: MONO_FONT,
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  letterSpacing: 0.2,
                  textTransform: "none",
                  lineHeight: 1.45,
                  maxWidth: 260,
                },
              },
            }}
          >
            <Box
              component="span"
              role="img"
              aria-label="Test recipient info"
              onMouseDown={(e) => e.preventDefault()}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                color: "text.secondary",
                cursor: "help",
                lineHeight: 0,
                "&:hover": { color: "primary.main" },
              }}
            >
              <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden style={{ fontSize: 13 }}>
                <path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </Box>
          </Tooltip>
        </Box>
        <TextField
          fullWidth
          type="email"
          label="Send test emails to"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value.trim())}
          placeholder="you@example.com"
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

      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <PreorderReminderEditor
          draft={reminderDraft}
          onDraftChange={setReminderDraft}
          surfaceBorderColor={surfaceBorderColor}
        />
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
            />
          ))}
        </Tabs>

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "grid",
            gap: { xs: 3, md: 3 },
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
            alignItems: "stretch",
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
            reminder={reminderDraft}
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
              reminder={reminderDraft}
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
