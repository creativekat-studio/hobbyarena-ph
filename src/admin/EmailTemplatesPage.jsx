import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { TrashIcon } from "../components/icons.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { ORDER_STATUS_EMAIL_LABELS } from "../lib/orderEmailTriggers.js";
import { sendOrderStatusEmail, previewPasswordResetEmail, requestPasswordReset } from "../lib/emailService.js";
import { buildOrderStatusEmail } from "../lib/email/orderStatusEmail.js";
import {
  DEFAULT_EMAIL_BODIES,
  EMAIL_PLACEHOLDERS,
  EMAIL_TYPES,
  PASSWORD_RESET_EMAIL_TYPE,
  PASSWORD_RESET_PLACEHOLDERS,
  PREORDER_REMINDER_PLACEHOLDERS,
  addEmailFooter,
  getEditableEmailBody,
  getPreorderReminderConfig,
  removeEmailFooter,
  setEmailBodyOverride,
  setEmailFooterAssignment,
  setPreorderReminderConfig,
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

function EmailEditor({
  emailType,
  draft,
  onDraftChange,
  surfaceBorderColor,
  testEmail,
  onTestResult,
  reminder,
  onReminderChange,
}) {
  const theme = useTheme();
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  const defaultBody = DEFAULT_EMAIL_BODIES[emailType] || "";
  const isCustom = draft.trim() !== defaultBody.trim();
  const selectedFooterId = reminder?.assignmentByType?.[emailType] || "";

  function handleSave() {
    setEmailBodyOverride(emailType, draft);
    onDraftChange(getEditableEmailBody(emailType));
    setSaved(true);
  }

  function handleReset() {
    // Restore the last saved body (custom override or built-in default) — do not wipe saved customizations.
    onDraftChange(getEditableEmailBody(emailType));
    setSaved(false);
  }

  function insertPlaceholder(token) {
    onDraftChange(`${draft}${draft && !draft.endsWith(" ") ? " " : ""}${token}`);
    setSaved(false);
  }

  function handleFooterSelect(footerId) {
    const next = setEmailFooterAssignment(emailType, footerId);
    onReminderChange(next);
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

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
        >
          Save
        </Button>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id={`footer-select-${emailType}`}>Footer</InputLabel>
          <Select
            labelId={`footer-select-${emailType}`}
            label="Footer"
            value={selectedFooterId}
            onChange={(e) => handleFooterSelect(e.target.value)}
          >
            <MenuItem value="">
              <em>No footer</em>
            </MenuItem>
            {(reminder?.footers || []).map((footer) => (
              <MenuItem key={footer.id} value={footer.id}>
                {footer.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="text"
          color="inherit"
          disabled={!isCustom}
          onClick={handleReset}
          sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem" }}
        >
          Reset
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

function blankFooterDraft(index = 1) {
  return {
    id: "",
    name: `Footer ${index}`,
    title: "Email footer",
    lines: ["Add your footer message here.", "", "", "", "", ""],
  };
}

const MAX_FOOTER_LINES = 10;

function padFooterLines(lines, minRows = 6) {
  const next = Array.isArray(lines) ? lines.map((line) => String(line ?? "")) : [];
  while (next.length < minRows) next.push("");
  return next.slice(0, MAX_FOOTER_LINES);
}

function FooterEditModal({
  open,
  mode,
  footer,
  canDelete,
  surfaceBorderColor,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(() => blankFooterDraft());

  useEffect(() => {
    if (!open || !footer) return;
    setForm({
      id: footer.id || "",
      name: footer.name || "",
      title: footer.title || "",
      lines: padFooterLines(footer.lines),
    });
  }, [open, footer]);

  function update(partial) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function insertPlaceholder(token) {
    setForm((prev) => {
      const lines = [...prev.lines];
      const last = Math.max(0, lines.length - 1);
      const current = lines[last] || "";
      lines[last] = `${current}${current && !current.endsWith(" ") ? " " : ""}${token}`;
      return { ...prev, lines };
    });
  }

  function addLine() {
    setForm((prev) => {
      if (prev.lines.length >= MAX_FOOTER_LINES) return prev;
      return { ...prev, lines: [...prev.lines, ""] };
    });
  }

  function removeLine(index) {
    setForm((prev) => {
      if (prev.lines.length <= 1) return prev;
      return { ...prev, lines: prev.lines.filter((_, i) => i !== index) };
    });
  }

  function handleSave() {
    onSave({
      ...form,
      name: form.name.trim() || "Footer",
      title: form.title.trim() || form.name.trim() || "Footer",
      lines: form.lines.map((line) => String(line ?? "").trim()).filter(Boolean),
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {mode === "create" ? "Add footer" : "Edit footer"}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <TextField
            label="Footer name / type"
            fullWidth
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            helperText="Shown in the template footer dropdown."
          />
          <TextField
            label="Footer title"
            fullWidth
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
          />
          {form.lines.map((line, index) => (
            <Stack key={`modal-line-${index}`} direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label={`Message line ${index + 1}`}
                fullWidth
                multiline
                minRows={2}
                value={line}
                onChange={(e) => {
                  const lines = [...form.lines];
                  lines[index] = e.target.value;
                  update({ lines });
                }}
              />
              <IconButton
                color="error"
                disabled={form.lines.length <= 1}
                aria-label="Remove line"
                onClick={() => removeLine(index)}
                sx={{ mt: 1 }}
              >
                <TrashIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          ))}
          <Button
            variant="outlined"
            disabled={form.lines.length >= MAX_FOOTER_LINES}
            onClick={addLine}
            sx={{ alignSelf: "flex-start", borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem" }}
          >
            Add message line
          </Button>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {PREORDER_REMINDER_PLACEHOLDERS.map((placeholder) => (
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
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, justifyContent: "space-between" }}>
        {mode === "edit" ? (
          <Button
            color="inherit"
            disabled={!canDelete}
            onClick={onDelete}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem" }}
          >
            Delete
          </Button>
        ) : <Box />}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} color="inherit" sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
          >
            Save
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

function FooterTemplateEditor({ draft, onDraftChange, surfaceBorderColor }) {
  const [modal, setModal] = useState(null);

  function assignedCount(footerId) {
    return Object.values(draft.assignmentByType || {}).filter((id) => id === footerId).length;
  }

  function openCreate() {
    setModal({ mode: "create", footer: blankFooterDraft(draft.footers.length + 1) });
  }

  function openEdit(footer) {
    setModal({
      mode: "edit",
      footer: {
        ...footer,
        lines: padFooterLines(footer.lines),
      },
    });
  }

  function closeModal() {
    setModal(null);
  }

  function handleSave(form) {
    if (modal?.mode === "create") {
      const next = addEmailFooter({
        name: form.name,
        title: form.title,
        lines: form.lines.length ? form.lines : ["Add your footer message here."],
      });
      onDraftChange(next);
    } else if (modal?.mode === "edit" && form.id) {
      const footers = draft.footers.map((footer) => (
        footer.id === form.id
          ? { ...footer, name: form.name, title: form.title, lines: form.lines.length ? form.lines : footer.lines }
          : footer
      ));
      onDraftChange(setPreorderReminderConfig({ ...draft, footers }));
    }
    closeModal();
  }

  function handleDelete() {
    if (!modal?.footer?.id || draft.footers.length <= 1) return;
    onDraftChange(removeEmailFooter(modal.footer.id));
    closeModal();
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "flex-start" }} justifyContent="space-between">
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Footer templates</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.8rem", mt: 0.25 }}>
            Click a footer to edit it. Assign one on each email template, or leave blank for none.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={openCreate}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem", flexShrink: 0 }}
        >
          Add footer
        </Button>
      </Stack>

      <TableContainer sx={{ border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Name / type</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Preview</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="center">Used</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {draft.footers.map((footer) => (
              <TableRow
                key={footer.id}
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => openEdit(footer)}
              >
                <TableCell sx={{ fontWeight: 700 }}>{footer.name}</TableCell>
                <TableCell>{footer.title}</TableCell>
                <TableCell sx={{ color: "text.secondary", maxWidth: 360 }}>
                  <Typography noWrap sx={{ fontSize: "0.8rem" }}>
                    {(footer.lines || [])[0] || "—"}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={assignedCount(footer.id)}
                    sx={{ height: 22, fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 700 }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!draft.footers.length ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                    No footers yet. Click Add footer to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>

      <FooterEditModal
        open={Boolean(modal)}
        mode={modal?.mode || "edit"}
        footer={modal?.footer || null}
        canDelete={draft.footers.length > 1}
        surfaceBorderColor={surfaceBorderColor}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </Stack>
  );
}

function TestRecipientCard({ panelSx, testEmail, setTestEmail, feedback, onClearFeedback, feedbackSeverity }) {
  return (
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
          onClose={onClearFeedback}
        >
          {feedback.error || feedback.warning || feedback.message}
        </Alert>
      ) : null}
    </Box>
  );
}

function PasswordResetPreview({ body, surfaceBorderColor }) {
  const [state, setState] = useState({ loading: true, html: "", subject: "", error: "" });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    previewPasswordResetEmail({
      email: PREVIEW_EMAIL,
      bodyOverride: body,
    })
      .then((result) => {
        if (cancelled) return;
        setState({
          loading: false,
          html: result.html || "",
          subject: result.subject || "",
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          loading: false,
          html: "",
          subject: "",
          error: error.message || "Preview failed.",
        });
      });
    return () => { cancelled = true; };
  }, [body]);

  if (state.loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 280 }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  if (state.error) {
    return <Alert severity="error">{state.error}</Alert>;
  }

  return (
    <Stack spacing={1.25} sx={{ height: "100%" }}>
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", color: "text.secondary" }}>
        Subject: <strong style={{ color: "inherit" }}>{state.subject}</strong>
      </Typography>
      <Box
        sx={{
          flex: 1,
          minHeight: 320,
          borderRadius: 1,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          overflow: "hidden",
          bgcolor: "#F7F7F5",
        }}
      >
        <Box
          component="iframe"
          title="Password reset preview"
          srcDoc={state.html}
          sx={{ width: "100%", height: "100%", minHeight: 360, border: 0 }}
        />
      </Box>
    </Stack>
  );
}

function PasswordResetTemplateEditor({
  draft,
  onDraftChange,
  surfaceBorderColor,
  testEmail,
  onTestResult,
}) {
  const theme = useTheme();
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const defaultBody = DEFAULT_EMAIL_BODIES[PASSWORD_RESET_EMAIL_TYPE] || "";
  const isCustom = draft.trim() !== defaultBody.trim();

  function insertPlaceholder(token) {
    onDraftChange(`${draft}${draft && !draft.endsWith(" ") && !draft.endsWith("\n") ? " " : ""}${token}`);
    setSaved(false);
  }

  function handleSave() {
    setEmailBodyOverride(PASSWORD_RESET_EMAIL_TYPE, draft);
    setSaved(true);
  }

  function handleReset() {
    onDraftChange(defaultBody);
    setEmailBodyOverride(PASSWORD_RESET_EMAIL_TYPE, "");
    setSaved(false);
  }

  async function handleSendTest() {
    if (!testEmail?.trim()) {
      onTestResult({ ok: false, error: "Enter a test recipient email above." });
      return;
    }
    setSending(true);
    try {
      setEmailBodyOverride(PASSWORD_RESET_EMAIL_TYPE, draft);
      const result = await requestPasswordReset({
        email: testEmail.trim(),
        bodyOverride: draft,
        test: true,
      });
      if (result.skipped) {
        onTestResult({
          ok: true,
          warning: result.skipReason || result.warning || "Sent to simulated outbox.",
          message: `Password reset email captured for ${testEmail}.`,
        });
      } else if (result.simulated) {
        onTestResult({
          ok: true,
          warning: result.warning || undefined,
          message: `Password reset email simulated for ${testEmail} (check Simulated inbox).`,
        });
      } else if (result.usedPlaceholderLink || result.warning) {
        onTestResult({
          ok: true,
          warning: result.warning || "Sent with a placeholder reset link.",
          message: result.message || `Password reset template sent to ${testEmail}.`,
        });
      } else if (result.sent || result.messageId) {
        onTestResult({ ok: true, message: result.message || `Password reset email sent to ${testEmail}.` });
      } else {
        onTestResult({
          ok: true,
          warning: "API returned success but no Resend message id — check that a Firebase Auth user exists for this email.",
          message: result.message || `Password reset requested for ${testEmail}.`,
        });
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
          Password reset body
        </Typography>
        {isCustom ? (
          <Chip label="Customized" size="small" color="primary" sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700 }} />
        ) : (
          <Chip label="Default" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700 }} />
        )}
      </Stack>

      <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.55 }}>
        Branded email with a Firebase reset link. Google-only accounts have no password — they should use Continue with Google.
      </Typography>

      <TextField
        fullWidth
        multiline
        minRows={8}
        value={draft}
        onChange={(e) => { onDraftChange(e.target.value); setSaved(false); }}
        placeholder={defaultBody}
      />

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {PASSWORD_RESET_PLACEHOLDERS.map((placeholder) => (
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

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} flexWrap="wrap" useFlexGap>
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
          Reset
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
          Saved — used on the next password reset email from this browser.
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
  const [passwordResetDraft, setPasswordResetDraft] = useState(() => getEditableEmailBody(PASSWORD_RESET_EMAIL_TYPE));

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
        subtitle="Edit order-status and account copy, preview layouts, and review simulated emails captured during local development."
      />

      <Tabs
        value={pageMode}
        onChange={(_, value) => setPageMode(value)}
        sx={{ ...panelSx, px: 1 }}
      >
        <Tab value="templates" label="Order templates" />
        <Tab value="account" label="Password reset" />
        <Tab value="footer" label="Footer template" />
        <Tab value="inbox" label="Simulated inbox" />
      </Tabs>

      {pageMode === "inbox" ? (
        <EmailSimInbox panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
      ) : null}

      {pageMode === "footer" ? (
        <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
          <FooterTemplateEditor
            draft={reminderDraft}
            onDraftChange={setReminderDraft}
            surfaceBorderColor={surfaceBorderColor}
          />
        </Box>
      ) : null}

      {pageMode === "account" ? (
        <>
          <TestRecipientCard
            panelSx={panelSx}
            testEmail={testEmail}
            setTestEmail={setTestEmail}
            feedback={feedback}
            onClearFeedback={() => setFeedback(null)}
            feedbackSeverity={feedbackSeverity}
          />
          <Box sx={{ ...panelSx, overflow: "hidden" }}>
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                display: "grid",
                gap: { xs: 3, md: 3 },
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
                alignItems: "stretch",
              }}
            >
              <PasswordResetTemplateEditor
                draft={passwordResetDraft}
                onDraftChange={setPasswordResetDraft}
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
                <PasswordResetPreview
                  body={passwordResetDraft}
                  surfaceBorderColor={surfaceBorderColor}
                />
              </Box>
            </Box>
          </Box>
        </>
      ) : null}

      {pageMode === "templates" ? (
        <>
          <TestRecipientCard
            panelSx={panelSx}
            testEmail={testEmail}
            setTestEmail={setTestEmail}
            feedback={feedback}
            onClearFeedback={() => setFeedback(null)}
            feedbackSeverity={feedbackSeverity}
          />

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
                onReminderChange={setReminderDraft}
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
      ) : null}
    </Stack>
  );
}
