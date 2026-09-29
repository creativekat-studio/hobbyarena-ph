import { useCallback, useEffect, useMemo, useState } from "react";
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
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useLocation, useOutletContext, useParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useCustomers } from "../lib/customersStore.jsx";
import { compareOrdersByOrderNo, displayConsolidatedOrderId } from "../lib/orderIds.js";
import { removeOrderFromMergedSet } from "../lib/orderMergeSimulation.js";
import { formatDateTime, formatOrderTimestamp } from "../lib/orderTimestamps.js";
import {
  getActiveStepForItem,
  getOrderLineItems,
  migrateOrderStatus,
  migratePaymentStatus,
  orderStatusLabel,
  resolveOrderStatusForPayment,
} from "../data/orderWorkflow.js";
import { ORDER_STATUS_EMAIL_LABELS } from "../lib/orderEmailTriggers.js";
import { ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import {
  ConsolidatedOrderView,
  countMergedEmailsSent,
  customerContactFromOrders,
  emailExtrasFromOrders,
  findConsolidatedSet,
} from "./MergeOrdersGrid.jsx";
import { ConsolidatedAccountTab, ConsolidatedTrailTab } from "./consolidatedMemberPanels.jsx";
import { useGoToOrdersList } from "./ordersListNavigation.js";

const TABS = [
  { id: "details", label: "Order details" },
  { id: "trail", label: "Transaction history" },
  { id: "account", label: "Customer account" },
];

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
}

function resolveBackNavigation(locationState) {
  return {
    path: "/admin/orders",
    label: "Back to orders",
    state: { ordersView: locationState?.backTo?.ordersView || "merged" },
  };
}

function findPreviousConsolidatedEmail(orders) {
  let latest = null;
  for (const order of orders || []) {
    for (const entry of order.trail || []) {
      if (entry.emailStatus !== "sent" || entry.emailType !== "consolidated_allocation") continue;
      if (!latest || (entry.at && latest.at && entry.at > latest.at) || (entry.at && !latest.at)) {
        latest = entry;
      }
    }
  }
  return latest;
}

export default function ConsolidatedOrderDetailPage() {
  const { setId } = useParams();
  const location = useLocation();
  const goToOrdersList = useGoToOrdersList();
  const backNav = resolveBackNavigation(location.state);

  function goBackToOrders() {
    goToOrdersList(backNav.state?.ordersView || "merged");
  }

  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { orders, ordersReady, sendConsolidatedAllocationEmail, saveConsolidatedEmailExtras, addTrailEntry, uploadTrailProof, setPaymentAndStatus, updateOrder } = useOrders();
  const { customers } = useCustomers();
  const [tab, setTab] = useState("details");
  const [trailOrderId, setTrailOrderId] = useState("");
  const [emailNotice, setEmailNotice] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [confirmResend, setConfirmResend] = useState(false);
  const [payload, setPayload] = useState(null);
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lineDrafts, setLineDrafts] = useState({});
  const [confirmTransition, setConfirmTransition] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  const set = useMemo(() => {
    const merged = findConsolidatedSet(orders, setId);
    if (merged) return merged;
    const order = (orders || []).find((row) => row.id === setId);
    if (!order) return null;
    return {
      id: order.id,
      displayId: order.id,
      orders: [order],
      mergedAt: order.createdAt || "",
      standalone: true,
    };
  }, [orders, setId]);
  const contact = customerContactFromOrders(set?.orders);
  const sentCount = set ? countMergedEmailsSent(set.orders) : 0;
  const consolidatedId = set ? displayConsolidatedOrderId(set) : setId;
  const handlePayloadChange = useCallback((next) => {
    setPayload((prev) => {
      const prevRemoved = prev?.removedOrderIds || [];
      const nextRemoved = next?.removedOrderIds || [];
      if (
        prev
        && prev.workbook === next.workbook
        && prev.selectedCount === next.selectedCount
        && prevRemoved.length === nextRemoved.length
        && prevRemoved.every((id, index) => id === nextRemoved[index])
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const customer = useMemo(() => {
    const email = String(contact.email || "").trim().toLowerCase();
    if (!email) return null;
    return (customers || []).find((row) => String(row.email || "").trim().toLowerCase() === email) || null;
  }, [customers, contact.email]);

  const memberOrders = useMemo(
    () => [...(set?.orders || [])].sort(compareOrdersByOrderNo),
    [set],
  );

  useEffect(() => {
    if (!set) return;
    const extras = emailExtrasFromOrders(set.orders);
    setNote(extras.note);
    setAttachment(extras.attachment);
    setAttachmentError("");
    setLineDrafts({});
    setConfirmTransition(null);
  }, [set?.id]);

  useEffect(() => {
    setTrailOrderId((current) => (
      memberOrders.some((order) => order.id === current) ? current : (memberOrders[0]?.id || "")
    ));
  }, [set?.id]);

  useEffect(() => {
    function onEmailSent(event) {
      setEmailNotice(event.detail || null);
    }
    window.addEventListener("hobbyarena:email-sent", onEmailSent);
    return () => window.removeEventListener("hobbyarena:email-sent", onEmailSent);
  }, []);

  async function performSend() {
    if (!set || !sendConsolidatedAllocationEmail || !payload?.workbook) return;
    setSendError("");
    setSending(true);
    try {
      await sendConsolidatedAllocationEmail(set.orders, {
        note,
        attachment,
        workbook: payload.workbook,
      });
    } catch (error) {
      setSendError(error?.message || "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if (!set || !payload?.workbook) return;
    const previous = findPreviousConsolidatedEmail(set.orders);
    if (previous) {
      setConfirmResend(true);
      return;
    }
    await performSend();
  }

  function liveItemFromRow(row) {
    const order = (set?.orders || []).find((entry) => entry.id === row.orderId);
    const item = getOrderLineItems(order || {}).find((line) => line.id === row.lineItemId);
    return item || { status: row.status, payment: row.payment, tag: row.tag };
  }

  function evaluateLineTransition(liveItem, nextPayment, nextStatus) {
    if (migrateOrderStatus(nextStatus) === "For Full Refund") return null;
    const fromStep = getActiveStepForItem(liveItem);
    const toStep = getActiveStepForItem({ ...liveItem, payment: nextPayment, status: nextStatus });
    const statusChanged = migrateOrderStatus(liveItem.status) !== migrateOrderStatus(nextStatus)
      || migratePaymentStatus(liveItem.payment) !== migratePaymentStatus(nextPayment);
    if (toStep < fromStep) return { kind: "back" };
    if (statusChanged && toStep <= fromStep) return { kind: "back" };
    if (toStep - fromStep >= 2) return { kind: "skip" };
    return null;
  }

  function applyLineDraft(row, payment, status) {
    setLineDrafts((prev) => {
      if (payment === row.payment && status === row.status) {
        if (!prev[row.key]) return prev;
        const next = { ...prev };
        delete next[row.key];
        return next;
      }
      return {
        ...prev,
        [row.key]: {
          payment,
          status,
          orderId: row.orderId,
          lineItemId: row.lineItemId,
        },
      };
    });
  }

  function requestLineChange(row, payment, status) {
    const live = liveItemFromRow(row);
    const transition = evaluateLineTransition(live, payment, status);
    if (transition) {
      setConfirmTransition({
        ...transition,
        row,
        orderId: row.orderId,
        fromStatus: live.status,
        nextPayment: payment,
        nextStatus: status,
      });
      return;
    }
    applyLineDraft(row, payment, status);
  }

  function handlePaymentChange(row, payment) {
    const kind = row.tag === "Pre-order" ? "Pre-order" : "In-stock";
    const currentStatus = lineDrafts[row.key]?.status ?? row.status;
    const status = resolveOrderStatusForPayment(payment, currentStatus, kind);
    requestLineChange(row, payment, status);
  }

  function handleStatusChange(row, status) {
    const payment = lineDrafts[row.key]?.payment ?? row.payment;
    requestLineChange(row, payment, status);
  }

  function handleConfirmTransition() {
    const pending = confirmTransition;
    setConfirmTransition(null);
    if (!pending) return;
    applyLineDraft(pending.row, pending.nextPayment, pending.nextStatus);
  }

  function attachmentSignature(value) {
    if (!value) return "";
    return [value.dataUrl || value.url || "", value.name || value.label || "", value.type || ""].join("|");
  }

  function handleReset() {
    if (!set) return;
    const extras = emailExtrasFromOrders(set.orders);
    setNote(extras.note);
    setAttachment(extras.attachment);
    setAttachmentError("");
    setLineDrafts({});
    setConfirmTransition(null);
    setConfirmRemove(null);
    setSaveError("");
    setSelectionResetKey((value) => value + 1);
  }

  async function performSave(removedIds = []) {
    if (!set) return;
    setSaveError("");
    setSaving(true);
    const removed = new Set(removedIds);
    try {
      for (const draft of Object.values(lineDrafts)) {
        if (!draft?.orderId || removed.has(draft.orderId)) continue;
        const simulated = (payload?.workbook?.orderDetails || []).find((row) => row.key === draft.key
          || (row.orderId === draft.orderId && row.lineItemId === draft.lineItemId));
        const product = (payload?.workbook?.consolidated || []).find((row) => row.productKey === simulated?.productKey);
        const enteredAllocation = Boolean(set.standalone)
          && product?.allocationMode === "entry"
          && (product?.qtyOverride || Number(product?.allocationPercent) > 0);
        await setPaymentAndStatus?.(
          draft.orderId,
          draft.payment,
          draft.status,
          draft.lineItemId,
          "",
          undefined,
          enteredAllocation ? simulated.finalAllocation : undefined,
        );
      }
      const remainingOrders = (set.orders || []).filter((order) => !removed.has(order.id));
      if (saveConsolidatedEmailExtras && remainingOrders.length) {
        const saved = await saveConsolidatedEmailExtras(remainingOrders, { note, attachment });
        setNote(saved.note || "");
        setAttachment(saved.attachment || null);
        setAttachmentError("");
      }
      for (const order of set.orders || []) {
        if (!removed.has(order.id)) continue;
        const next = removeOrderFromMergedSet(order, consolidatedId);
        updateOrder?.(order.id, {
          mergedSetId: next.mergedSetId,
          mergedAt: next.mergedAt,
          mergedAllocation: next.mergedAllocation,
          trail: next.trail,
        });
      }
      setLineDrafts({});
      if (removed.size && remainingOrders.length === 0) {
        goToOrdersList("merged");
      }
    } catch (error) {
      setSaveError(error?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!set) return;
    const removedIds = set.standalone
      ? []
      : [...(payload?.removedOrderIds || [])].sort(compareOrdersByOrderNo);
    if (removedIds.length) {
      setConfirmRemove({
        orderIds: removedIds,
        dissolve: removedIds.length === (set.orders || []).length,
      });
      return;
    }
    await performSave();
  }

  if (!ordersReady) {
    return (
      <Stack spacing={1.5} alignItems="center" sx={{ py: 6, color: "text.secondary" }}>
        <CircularProgress size={26} />
        <Typography variant="body2">Loading consolidated order…</Typography>
      </Stack>
    );
  }

  if (!set) {
    return (
      <Stack spacing={ADMIN_PAGE_SPACING}>
        <Button
          startIcon={<BackIcon />}
          onClick={goBackToOrders}
          sx={{ alignSelf: "flex-start", fontFamily: MONO_FONT, fontSize: "0.82rem" }}
        >
          {backNav.label}
        </Button>
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>Order not found</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            This order may have been removed or the link is invalid.
          </Typography>
          <Button variant="contained" onClick={() => goToOrdersList("merged")}>
            View consolidated orders
          </Button>
        </Box>
      </Stack>
    );
  }

  const selectedCount = payload?.selectedCount ?? 0;
  const canSend = Boolean(sendConsolidatedAllocationEmail) && selectedCount > 0 && !sending;
  const previousConsolidatedEmail = findPreviousConsolidatedEmail(set.orders);
  const savedExtras = emailExtrasFromOrders(set.orders);
  const savedAt = (set.orders || []).find((order) => order.mergedEmailSavedAt)?.mergedEmailSavedAt || "";
  const lineDirty = Object.keys(lineDrafts).length > 0;
  const removedOrderIds = payload?.removedOrderIds || [];
  const dirty = lineDirty
    || removedOrderIds.length > 0
    || note !== savedExtras.note
    || attachmentSignature(attachment) !== attachmentSignature(savedExtras.attachment);

  return (
    <Stack
      spacing={1.25}
      sx={{
        flex: 1,
        minHeight: 0,
        height: { xs: "auto", md: "100%" },
        overflow: "hidden",
      }}
    >
      <Snackbar
        open={Boolean(emailNotice)}
        autoHideDuration={8000}
        onClose={() => setEmailNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setEmailNotice(null)}
          severity={emailNotice?.ok && !emailNotice?.skipped ? "success" : emailNotice?.skipped ? "warning" : "error"}
          sx={{ width: "100%" }}
        >
          {emailNotice?.ok && !emailNotice?.skipped
            ? `Email sent to ${emailNotice.to} (${ORDER_STATUS_EMAIL_LABELS[emailNotice.emailType] || emailNotice.emailType}).`
            : emailNotice?.skipped
              ? `Email not delivered: ${emailNotice.skipReason || "Resend test mode."}`
              : `Email failed: ${emailNotice?.error || "Unknown error"}`}
        </Alert>
      </Snackbar>

      <Button
        startIcon={<BackIcon />}
        onClick={goBackToOrders}
        sx={{ alignSelf: "flex-start", flexShrink: 0, fontFamily: MONO_FONT, fontSize: "0.82rem", color: "text.secondary" }}
      >
        {backNav.label}
      </Button>

      <AdminPageHeader
        eyebrow={set.standalone ? "Order" : "Consolidated order"}
        title={consolidatedId}
        subtitle={`${formatOrderTimestamp({ createdAt: set.mergedAt })} · ${contact.customer}${contact.email ? ` · ${contact.email}` : ""}`}
        action={(
          <Chip
            label={sentCount > 0
              ? `Email sent (${sentCount} ${sentCount === 1 ? "time" : "times"})`
              : "Pending email"}
            color={sentCount > 0 ? "success" : "warning"}
            sx={{
              ...ADMIN_STATUS_CHIP_SX,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          />
        )}
      />

      <Tabs
        value={tab}
        onChange={(_, value) => { if (value) setTab(value); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          flexShrink: 0,
          borderBottom: "1px solid",
          borderColor: surfaceBorderColor,
          minHeight: 44,
          "& .MuiTab-root": {
            fontFamily: MONO_FONT,
            fontWeight: 800,
            fontSize: "0.7rem",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            minHeight: 44,
          },
        }}
      >
        {TABS.map((item) => (
          <Tab key={item.id} value={item.id} label={item.label} />
        ))}
      </Tabs>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: tab === "details" || tab === "trail" ? "hidden" : "auto",
          display: "flex",
          flexDirection: "column",
          ...panelSx,
          p: { xs: 2, md: 2.5 },
        }}
      >
        <Box
          sx={{
            display: tab === "details" ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
          aria-hidden={tab !== "details"}
        >
          <ConsolidatedOrderView
            set={set}
            showNote
            showSend={false}
            detailsMaxHeight={null}
            layout="split"
            note={note}
            attachment={attachment}
            attachmentError={attachmentError}
            onNoteChange={setNote}
            onAttachmentChange={(next, error) => {
              setAttachment(next);
              setAttachmentError(error || "");
            }}
            lineDrafts={lineDrafts}
            selectionResetKey={selectionResetKey}
            allocationEditing={Boolean(set.standalone)}
            onPaymentChange={handlePaymentChange}
            onStatusChange={handleStatusChange}
            onPayloadChange={handlePayloadChange}
          />
        </Box>

        {tab === "trail" ? (
          <ConsolidatedTrailTab
            memberOrders={memberOrders}
            trailOrderId={trailOrderId}
            onTrailOrderIdChange={setTrailOrderId}
            surfaceBorderColor={surfaceBorderColor}
            addTrailEntry={addTrailEntry}
            uploadTrailProof={uploadTrailProof}
          />
        ) : null}

        {tab === "account" ? (
          <ConsolidatedAccountTab
            memberOrders={memberOrders}
            contact={contact}
            customerRecord={customer}
            surfaceBorderColor={surfaceBorderColor}
            orderBackTo={{
              path: `/admin/orders/consolidated/${encodeURIComponent(consolidatedId)}`,
              label: "consolidated order",
              ordersView: "merged",
            }}
          />
        ) : null}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          position: "sticky",
          bottom: 0,
          zIndex: 4,
          mt: "auto",
          px: { xs: 2, md: 2.5 },
          py: 1.5,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          bgcolor: "background.paper",
          ...panelSx,
        }}
      >
        {sendError || saveError ? (
          <Alert severity="error" sx={{ mb: 1.25 }}>{sendError || saveError}</Alert>
        ) : null}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontSize: "0.72rem",
              letterSpacing: 0.3,
              color: dirty ? "warning.main" : "text.secondary",
              fontWeight: dirty ? 700 : 500,
            }}
          >
            {dirty
              ? removedOrderIds.length
                ? `Unsaved changes · remove ${removedOrderIds.length === 1 ? removedOrderIds[0] : `${removedOrderIds.length} orders`}`
                : "Unsaved changes"
              : savedAt
                ? `Saved ${formatDateTime(savedAt)}`
                : "No changes saved"}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              disabled={!canSend || dirty}
              onClick={handleSend}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
            >
              {sending ? "Sending…" : sentCount > 0 ? "Resend email" : "Send email"}
            </Button>
            <Button
              variant="outlined"
              disabled={!dirty || saving}
              onClick={handleReset}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={!dirty || saving}
              onClick={handleSave}
              sx={{
                fontFamily: MONO_FONT,
                fontSize: "0.72rem",
                letterSpacing: 0.4,
                fontWeight: 800,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Dialog open={Boolean(confirmTransition)} onClose={() => setConfirmTransition(null)} maxWidth="sm" fullWidth>
        {confirmTransition ? (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              {confirmTransition.kind === "back" ? "Move this item backward?" : "Skip ahead?"}
            </DialogTitle>
            <DialogContent>
              {confirmTransition.kind === "back" ? (
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  Order <strong>{confirmTransition.orderId}</strong> is already{" "}
                  <strong>{orderStatusLabel(confirmTransition.fromStatus)}</strong>.
                  {" "}Are you sure you want to return it to{" "}
                  <strong>{orderStatusLabel(confirmTransition.nextStatus)}</strong>?
                </Typography>
              ) : (
                <>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    Order <strong>{confirmTransition.orderId}</strong> — this change jumps past one or more stages.
                    Double-check before continuing.
                  </Typography>
                  <Typography sx={{ mt: 2.5, fontWeight: 700 }}>Do you wish to continue?</Typography>
                </>
              )}
              {confirmTransition.kind === "back" ? (
                <Typography sx={{ mt: 2.5, fontWeight: 700 }}>Do you wish to continue?</Typography>
              ) : null}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="inherit" onClick={() => setConfirmTransition(null)}>Cancel</Button>
              <Button
                variant="contained"
                color={confirmTransition.kind === "back" ? "warning" : "primary"}
                onClick={handleConfirmTransition}
                sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase" }}
              >
                Continue
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Dialog open={Boolean(confirmRemove)} onClose={() => setConfirmRemove(null)} maxWidth="sm" fullWidth>
        {confirmRemove ? (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              {confirmRemove.dissolve ? "Dissolve this consolidated order?" : "Remove from consolidated order?"}
            </DialogTitle>
            <DialogContent>
              {confirmRemove.dissolve ? (
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  Are you sure you want to remove all orders from consolidated order{" "}
                  <strong>{consolidatedId}</strong>? This set will be dissolved.
                </Typography>
              ) : confirmRemove.orderIds.length === 1 ? (
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  Are you sure you want to remove <strong>{confirmRemove.orderIds[0]}</strong> from
                  consolidated order <strong>{consolidatedId}</strong>?
                </Typography>
              ) : (
                <>
                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                    Are you sure you want to remove these orders from consolidated order{" "}
                    <strong>{consolidatedId}</strong>?
                  </Typography>
                  <Typography sx={{ mt: 1.5, fontFamily: MONO_FONT, fontWeight: 700, lineHeight: 1.6 }}>
                    {confirmRemove.orderIds.join(" · ")}
                  </Typography>
                </>
              )}
              <Typography sx={{ mt: 2.5, fontWeight: 700 }}>Do you wish to continue?</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="inherit" onClick={() => setConfirmRemove(null)}>Cancel</Button>
              <Button
                variant="contained"
                color="warning"
                onClick={async () => {
                  const ids = confirmRemove.orderIds;
                  setConfirmRemove(null);
                  await performSave(ids);
                }}
                sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase" }}
              >
                {confirmRemove.dissolve ? "Dissolve set" : confirmRemove.orderIds.length === 1 ? "Remove order" : "Remove orders"}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Dialog open={confirmResend} onClose={() => setConfirmResend(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Send email again?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
            You already sent this email ({ORDER_STATUS_EMAIL_LABELS.consolidated_allocation || "Consolidated Order"})
            {previousConsolidatedEmail?.at
              ? ` on ${formatDateTime(previousConsolidatedEmail.at)}`
              : ""}
            . Are you sure you want to resend?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={() => setConfirmResend(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              setConfirmResend(false);
              await performSend();
            }}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase" }}
          >
            Resend
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
