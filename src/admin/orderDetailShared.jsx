import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  ORDER_STATUS_EMAIL_LABELS,
  resolveOrderStatusEmailTypeForCurrentState,
} from "../lib/orderEmailTriggers.js";
import { MONO_FONT } from "../theme.js";
import { ExpandCornersIcon, TrashIcon } from "../components/icons.jsx";
import { PESO } from "../components/ProductCard.jsx";
import AdminSectionTitle from "../components/AdminSectionTitle.jsx";
import {
  OrderSummaryItemMeta,
  OrderSummaryPanel,
} from "../components/OrderSummaryPanel.jsx";
import {
  PAYMENT_COLOR,
  STATUS_COLOR,
  PAYMENT_OPTIONS,
  STATUS_OPTIONS,
  PREORDER_FLOW_STEPS,
  INSTOCK_FLOW_STEPS,
  activePreorderStep,
  activeInstockStep,
  getFlowStepsForItem,
  getActiveStepForItem,
  allocationLabelForItem,
  buildTrailAttachment,
  getOrderLineItems,
  getPaymentOptionsForKind,
  getStatusOptionsForKind,
  getOrderStatusOptionsForPayment,
  resolveOrderStatusForPayment,
  isPreorderOrder,
  lineItemTrailLabel,
  itemNeedsBalanceProof,
  itemOutstandingBalance,
  migrateOrderStatus,
  migratePaymentStatus,
  optionsIncludingCurrent,
  orderStatusLabel,
  refundedAmountForLineItem,
  refundedAmountForOrder,
  resolveOrderKind,
  resolveOrderKindForItem,
  validateAllocationForStatus,
  statusNeedsAllocation,
  statusNeedsRefundAmount,
  ALLOCATION_FULFILLED_PAY_BALANCE,
  trailEntryShowsAttachment,
} from "../data/orderWorkflow.js";
import { hydrateProofAttachment, resolveProofAttachmentUrl, prepareTrailForDisplay } from "../lib/orderProofStorage.js";
import { compressProofFile } from "../lib/imageCompression.js";
import { UPLOAD_PROOF_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
import {
  lineItemAmount,
  lineItemDepositPaid,
  lineItemFinalPrice,
  lineItemGrossRevenue,
  orderCustomerTotal,
} from "../lib/orderRevenue.js";
import ProofImage from "../components/ProofImage.jsx";

/** Pre-order balance portion (allocated final − DP, or expected 70% before allocation). */
function linePreorderBalancePortion(item, depositPercent) {
  if (resolveOrderKindForItem(item) !== "Pre-order") return 0;
  const payment = migratePaymentStatus(item.payment);
  const status = migrateOrderStatus(item.status);
  if (
    payment === "Refunded"
    || payment === "For Full Refund"
    || status === "Refunded"
    || status === "For Full Refund"
  ) {
    return 0;
  }
  const deposit = lineItemDepositPaid(item, depositPercent);
  const allocated = Math.max(0, Number(item.allocatedQty) || 0);
  if (allocated > 0) return Math.max(0, lineItemFinalPrice(item) - deposit);
  return Math.max(0, lineItemAmount(item) - deposit);
}

function lineBalanceIsAwaiting(item) {
  if (resolveOrderKindForItem(item) !== "Pre-order") return false;
  if (itemOutstandingBalance(item) > 0 || itemNeedsBalanceProof(item)) return true;
  const payment = migratePaymentStatus(item.payment);
  return payment === "DP Paid"
    || payment === "Awaiting Balance Payment"
    || payment === "Pending Verification";
}

function lineIsFullySettled(item) {
  const payment = migratePaymentStatus(item.payment);
  return payment === "Fully Paid"
    || payment === "Refunded"
    || payment === "Partially Refunded";
}

export { PAYMENT_COLOR, STATUS_COLOR, PAYMENT_OPTIONS, STATUS_OPTIONS };

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

function AttachmentIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
    </svg>
  );
}

export function ProofPreview({ proof, surfaceBorderColor, panelSx, large = false }) {
  const minHeight = large ? 420 : 280;

  if (!proof) {
    return (
      <Box
        sx={{
          ...(panelSx ?? {}),
          p: 4,
          minHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          borderStyle: "dashed",
        }}
      >
        <Typography color="text.secondary">No proof of payment uploaded for this order.</Typography>
      </Box>
    );
  }

  if (proof.startsWith("data:application/pdf")) {
    return (
      <Stack spacing={1.5} sx={{ ...(panelSx ?? {}), p: 2, minHeight }}>
        <Chip label="PDF receipt" size="small" color="primary" variant="outlined" sx={{ alignSelf: "flex-start" }} />
        <Button component="a" href={proof} download="proof-of-payment.pdf" variant="outlined" size="small" sx={{ alignSelf: "flex-start" }}>
          Download proof
        </Button>
        <Box component="iframe" src={proof} title="Proof of payment" sx={{ width: "100%", flex: 1, minHeight: large ? 480 : 360, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }} />
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        ...(panelSx ?? {}),
        p: 2,
        minHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        component="img"
        src={proof}
        alt="Proof of payment"
        decoding="async"
        sx={{
          width: "100%",
          maxHeight: large ? 560 : 420,
          objectFit: "contain",
          borderRadius: 1,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          bgcolor: alpha("#000", 0.03),
        }}
      />
    </Box>
  );
}

function AttachmentPreviewModal({ open, attachment, onClose, surfaceBorderColor }) {
  if (!attachment?.url) return null;

  const { url, label, type } = attachment;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, pr: 1 }}>
        <Typography component="span" sx={{ fontWeight: 800, fontSize: "1rem" }}>
          {label || "Attachment"}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close preview">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        {type === "pdf" ? (
          <Stack spacing={1.5}>
            <Button component="a" href={url} download="attachment.pdf" variant="outlined" size="small" sx={{ alignSelf: "flex-start" }}>
              Download PDF
            </Button>
            <Box
              component="iframe"
              src={url}
              title={label || "Attachment"}
              sx={{
                width: "100%",
                minHeight: { xs: 360, sm: 480 },
                border: "1px solid",
                borderColor: surfaceBorderColor,
                borderRadius: 1,
              }}
            />
          </Stack>
        ) : (
          <ProofImage src={url} alt={label || "Attachment"} surfaceBorderColor={surfaceBorderColor} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function shortLineItemName(name, maxLen = 40) {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trim()}…`;
}

function shortLineItemLabel(item) {
  if (!item) return "";
  const name = shortLineItemName(item.name);
  const qty = item.quantity ?? 1;
  return qty > 1 ? `${name} ×${qty}` : name;
}

function shortTrailEntryItemName(lineItemName) {
  if (!lineItemName) return "";
  const parts = lineItemName.match(/^(.+?)( ×\d+)?$/);
  const base = parts?.[1] ?? lineItemName;
  const qtySuffix = parts?.[2] ?? "";
  return shortLineItemName(base) + qtySuffix;
}

function trailEntryLineItemLabel(entry, lineItems) {
  if (!entry.lineItemName) return "";
  const short = shortTrailEntryItemName(entry.lineItemName);
  const index = lineItems.findIndex((item) => item.id === entry.lineItemId);
  if (index >= 0) return `Item ${index + 1} · ${short}`;
  return short;
}

function isEmailTrailEntry(entry) {
  if (entry.emailType || entry.emailTo || entry.emailStatus) return true;
  if ((entry.emailLineItems ?? []).length > 0) return true;
  return /^Email (Sent|Failed|Skipped) to /i.test(entry.title || "");
}

function parseEmailLineItemsFromNote(note) {
  if (!note) return [];
  const rows = [];
  for (const line of note.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || /^To /i.test(trimmed)) continue;
    const dashIdx = trimmed.indexOf(" — ");
    const namePart = (dashIdx >= 0 ? trimmed.slice(0, dashIdx) : trimmed).trim();
    if (!namePart) continue;
    const qtyMatch = namePart.match(/^(.+?) ×(\d+)$/);
    rows.push({
      lineItemId: `legacy-${rows.length}`,
      lineItemName: qtyMatch ? qtyMatch[1].trim() : namePart,
      quantity: qtyMatch ? Number(qtyMatch[2]) : 1,
      allocatedQty: 0,
    });
  }
  return rows;
}

/** Latest partial allocation recorded on an older trail email for this line. */
function priorPartialAllocation(trail, entry, lineItemId, qty) {
  const entryAt = entry?.at ? new Date(entry.at).getTime() : NaN;
  let latest = null;

  for (const other of trail || []) {
    if (other?.id && entry?.id && other.id === entry.id) continue;
    const otherAt = other?.at ? new Date(other.at).getTime() : NaN;
    if (Number.isFinite(entryAt) && Number.isFinite(otherAt) && otherAt >= entryAt) continue;

    for (const row of other?.emailLineItems || []) {
      if (lineItemId && row.lineItemId && row.lineItemId !== lineItemId) continue;
      const rowAlloc = Math.max(0, Number(row.allocatedQty) || 0);
      const rowQty = Math.max(1, Number(row.quantity) || qty);
      if (rowAlloc > 0 && rowAlloc < rowQty) {
        if (!latest || otherAt > latest.at) {
          latest = { allocated: rowAlloc, at: otherAt };
        }
      }
    }
  }

  return latest?.allocated ?? null;
}

function resolveEmailTrailLineItems(entry, orderLineItems, trail = []) {
  const stored = entry.emailLineItems ?? [];
  const rows = stored.length
    ? stored
    : (() => {
      const fromNote = parseEmailLineItemsFromNote(entry.note);
      if (fromNote.length) return fromNote;
      if (orderLineItems.length === 1) {
        const item = orderLineItems[0];
        return [{
          lineItemId: item.id,
          lineItemName: item.name,
          quantity: item.quantity ?? 1,
          allocatedQty: Number(item.allocatedQty) || 0,
          payment: item.payment,
          status: item.status,
        }];
      }
      return [];
    })();

  return rows.map((row) => {
    const qty = Math.max(1, Number(row.quantity) || 1);
    let allocated = Math.max(0, Number(row.allocatedQty) || 0);
    const status = migrateOrderStatus(row.status || entry.status);

    // Fulfilled email wrongly snapshotted as 10 of 10 after a wipe — prefer earlier 7 of 10.
    if (
      (status === "Fulfilled" || status === "Ready for Pickup")
      && (allocated <= 0 || allocated >= qty)
    ) {
      const prior = priorPartialAllocation(trail, entry, row.lineItemId, qty);
      if (prior != null) allocated = prior;
    } else if (allocated <= 0) {
      const live = orderLineItems.find((item) => item.id === row.lineItemId);
      const liveAlloc = Math.max(0, Number(live?.allocatedQty) || 0);
      if (liveAlloc > 0 && liveAlloc < qty) allocated = liveAlloc;
    }

    return {
      ...row,
      quantity: qty,
      allocatedQty: allocated,
      status: row.status || entry.status,
      payment: row.payment || entry.payment,
    };
  });
}

function emailTrailHeadline(entry) {
  if (/^Email (Sent|Failed|Skipped) to /i.test(entry.title || "")) {
    return entry.title;
  }

  const verb = entry.emailStatus === "failed"
    ? "Failed"
    : entry.emailStatus === "skipped"
      ? "Skipped"
      : "Sent";
  const email = entry.emailTo || "";
  return email ? `Email ${verb} to ${email}` : `Email ${verb}`;
}

function emailTrailStatusLine(entry, emailLineItems) {
  const payment = migratePaymentStatus(entry.payment || emailLineItems[0]?.payment);
  const status = orderStatusLabel(migrateOrderStatus(entry.status || emailLineItems[0]?.status));
  return [payment, status].filter(Boolean).join(" · ");
}

function emailTrailLineItemText(row) {
  const baseName = shortLineItemName(row.lineItemName || "");
  if (!baseName) return "";

  const legacyQtyMatch = String(row.lineItemName || "").match(/ ×(\d+)$/);
  const qty = Math.max(1, Number(row.quantity) || (legacyQtyMatch ? Number(legacyQtyMatch[1]) : 1));
  const allocated = Math.max(0, Number(row.allocatedQty) || 0);
  const status = migrateOrderStatus(row.status);
  const showAllocatedOfOrdered = [
    "Fulfilled",
    "Ready for Pickup",
    ALLOCATION_FULFILLED_PAY_BALANCE,
    "Partially Fulfilled & Pay Balance",
    "Partially Fulfilled & For Refund",
  ].includes(status);

  // Before allocation: just ordered qty — never a confusing bare "/ 0".
  if (allocated <= 0) {
    if (status === "For Full Refund" || status === "Refunded") {
      return `- ${baseName} · 0 of ${qty}`;
    }
    return `- ${baseName} ×${qty}`;
  }

  // Fulfilled / ready / partial — always show allocated of ordered (e.g. 8 of 10, 10 of 10).
  if (showAllocatedOfOrdered || allocated < qty) {
    return `- ${baseName} · ${allocated} of ${qty}`;
  }

  return `- ${baseName} ×${qty}`;
}

function orderTrailSuffix(selectedItemId, activeLineItem, lineItems) {
  if (lineItems.length <= 1 && lineItems[0]) {
    return shortLineItemLabel(lineItems[0]);
  }
  if (selectedItemId === "all" || !activeLineItem) {
    return undefined;
  }
  return shortLineItemLabel(activeLineItem);
}

function trailEntryAppliesToLineItem(entry, lineItemId) {
  if (!lineItemId) return true;
  if (entry.lineItemId) return entry.lineItemId === lineItemId;
  if (isEmailTrailEntry(entry)) {
    const rows = entry.emailLineItems?.length
      ? entry.emailLineItems
      : parseEmailLineItemsFromNote(entry.note);
    if (rows.length) {
      return rows.some((row) => row.lineItemId === lineItemId);
    }
  }
  return true;
}

function trailMetaLine(entry) {
  return [entry.payment, migrateOrderStatus(entry.status)].filter(Boolean).join(" · ");
}

function TrailTimelineItem({ entry, isLast, surfaceBorderColor, onViewAttachment, onUploadProof, order, lineItemLabel, lineItems = [], trail = [], uploading }) {
  const meta = trailMetaLine(entry);
  const isEmailEntry = isEmailTrailEntry(entry);
  const emailLineItems = isEmailEntry ? resolveEmailTrailLineItems(entry, lineItems, trail) : [];
  const emailStatusLine = isEmailEntry ? emailTrailStatusLine(entry, emailLineItems) : "";
  const at = new Date(entry.at);
  const timeLabel = at.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const showAttachment = trailEntryShowsAttachment(entry);
  const proofPurged = Boolean(entry.attachment?.purged);
  const canView = showAttachment && !proofPurged && Boolean(resolveProofAttachmentUrl(order, entry));

  return (
    <Stack direction="row" spacing={1.25} sx={{ position: "relative", pb: isLast ? 0 : 1.25 }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flexShrink: 0, width: 118, pt: 0.35 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "primary.main",
              flexShrink: 0,
              boxShadow: (theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.16)}`,
            }}
          />
          <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", fontFamily: MONO_FONT, lineHeight: 1.25, whiteSpace: "nowrap" }}>
            {timeLabel}
          </Typography>
        </Stack>
        {!isLast ? (
          <Box sx={{ width: 2, flex: 1, bgcolor: "divider", minHeight: 20, mt: 0.75, ml: "3px" }} />
        ) : null}
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          borderRadius: 1,
          bgcolor: "background.paper",
          p: 1.5,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.84rem", lineHeight: 1.35 }}>
          {isEmailEntry ? emailTrailHeadline(entry) : entry.title}
          {meta && !isEmailEntry ? (
            <Typography component="span" sx={{ fontWeight: 500, color: "text.secondary", fontFamily: MONO_FONT, fontSize: "0.72rem" }}>
              {" "}· {meta}
            </Typography>
          ) : null}
        </Typography>

        {isEmailEntry ? (
          <Stack spacing={0.35} sx={{ mt: 0.5 }}>
            {emailStatusLine ? (
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: MONO_FONT, lineHeight: 1.35 }}>
                {emailStatusLine}
              </Typography>
            ) : null}
            {emailLineItems.map((row) => (
              <Typography
                key={row.lineItemId}
                sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: MONO_FONT, lineHeight: 1.35 }}
              >
                {emailTrailLineItemText(row)}
              </Typography>
            ))}
          </Stack>
        ) : lineItemLabel ? (
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: MONO_FONT, mt: 0.35, lineHeight: 1.35 }}>
            {lineItemLabel}
          </Typography>
        ) : null}

        {entry.note && !isEmailEntry ? (
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mt: 0.5, lineHeight: 1.45 }}>
            {entry.note}
          </Typography>
        ) : null}

        {isEmailEntry && entry.emailStatus !== "sent" ? (() => {
          const detail = entry.note?.trim();
          if (!detail) return null;
          return (
            <Typography
              sx={{
                fontSize: "0.82rem",
                color: entry.emailStatus === "failed" ? "error.main" : "text.secondary",
                mt: 0.5,
                lineHeight: 1.45,
              }}
            >
              {detail}
            </Typography>
          );
        })() : null}

        {canView ? (
          <Button
            size="small"
            variant="text"
            startIcon={<AttachmentIcon sx={{ fontSize: 14 }} />}
            onClick={() => onViewAttachment(entry.attachment, entry)}
            sx={{
              mt: 0.5,
              px: 0,
              minWidth: 0,
              fontFamily: MONO_FONT,
              fontSize: "0.68rem",
              letterSpacing: 0.3,
              textTransform: "uppercase",
              justifyContent: "flex-start",
            }}
          >
            {entry.attachment?.label || "View proof of payment"}
          </Button>
        ) : null}

        {proofPurged ? (
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.5, lineHeight: 1.4 }}>
            Proof file removed after retention period.
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

function MilestoneNode({ caption, label, accent, active }) {
  const color = accent ?? "text.secondary";
  return (
    <Box
      sx={{
        flex: "1 1 0",
        minWidth: 0,
        textAlign: "center",
        px: 1.5,
        py: 1.5,
        borderRadius: 2,
        border: "1.5px solid",
        borderColor: active ? `${accent}.main` : "divider",
        bgcolor: active
          ? (theme) => alpha(theme.palette[accent].main, 0.1)
          : "background.paper",
      }}
    >
      <Typography
        sx={{
          fontSize: "0.58rem",
          fontFamily: MONO_FONT,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: active ? `${color}.main` : "text.disabled",
          mb: 0.5,
        }}
      >
        {caption}
      </Typography>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: "0.9rem",
          lineHeight: 1.2,
          color: active ? `${accent}.main` : "text.primary",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function StepJourney({ fromLabel, toLabel, accent = "primary" }) {
  return (
    <Box
      sx={{
        mt: 2,
        p: 1.75,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: (theme) => alpha(theme.palette[accent].main, 0.35),
        bgcolor: (theme) => alpha(theme.palette[accent].main, 0.04),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <MilestoneNode caption="Now" label={fromLabel} accent="info" />
        <Typography
          sx={{
            flex: "0 0 auto",
            color: `${accent}.main`,
            fontWeight: 900,
            fontSize: "1.5rem",
            lineHeight: 1,
          }}
        >
          →
        </Typography>
        <MilestoneNode caption="New status" label={toLabel} accent={accent} active />
      </Box>
    </Box>
  );
}

export function OrderStatusControls({ lineItem, onSave, orderId, setAllocation, depositPercent = 30 }) {
  const kind = resolveOrderKindForItem(lineItem);
  const isPreorder = kind === "Pre-order";
  const paymentOptions = optionsIncludingCurrent(getPaymentOptionsForKind(kind), lineItem.payment);
  const maxQty = lineItem.quantity ?? 1;

  const [draftPayment, setDraftPayment] = useState(lineItem.payment);
  const [draftStatus, setDraftStatus] = useState(
    () => resolveOrderStatusForPayment(lineItem.payment, lineItem.status, kind),
  );
  const [draftQty, setDraftQty] = useState(String(lineItem.allocatedQty ?? 0));
  const [draftRefund, setDraftRefund] = useState(String(lineItem.refundAmount ?? ""));
  const [draftAttachment, setDraftAttachment] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [confirmTransition, setConfirmTransition] = useState(null);

  const statusOptions = getOrderStatusOptionsForPayment(draftPayment, kind);

  useEffect(() => {
    // Don't reset drafts while the backward/skip confirm dialog is open —
    // a live order snapshot would clear dirty state and make Continue a no-op.
    if (confirmTransition) return;
    setDraftPayment(lineItem.payment);
    setDraftStatus(resolveOrderStatusForPayment(lineItem.payment, lineItem.status, kind));
    setDraftQty(String(lineItem.allocatedQty ?? 0));
    setDraftRefund(lineItem.refundAmount != null ? String(lineItem.refundAmount) : "");
    setDraftAttachment(null);
    setSaveError("");
  }, [lineItem.id, lineItem.payment, lineItem.status, lineItem.allocatedQty, kind, confirmTransition]);

  async function handleAttachmentChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setSaveError("Attachment must be an image or PDF.");
      return;
    }
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setSaveError(sizeError);
      return;
    }
    try {
      const dataUrl = await compressProofFile(file);
      setDraftAttachment({ name: file.name, dataUrl });
      setSaveError("");
    } catch (err) {
      setSaveError(err.message || "Could not read attachment. Try a smaller image or PDF.");
    }
  }

  const parsedQty = Math.max(0, Math.min(maxQty, Number(draftQty) || 0));
  const allocationEditable = statusNeedsAllocation(draftStatus);
  const showAllocationField = isPreorder && setAllocation && allocationEditable;
  const showRefundField = isPreorder && statusNeedsRefundAmount(draftStatus);
  const showRefundedAmount = draftStatus === "Refunded" || draftPayment === "Refunded" || draftPayment === "Partially Refunded";
  const refundedAmount = refundedAmountForLineItem(lineItem, depositPercent);
  const previewRefundedAmount = showRefundField && parsedQty >= 0
    ? refundedAmountForLineItem(
      { ...lineItem, allocatedQty: draftStatus === "For Full Refund" ? 0 : parsedQty, status: draftStatus, refundAmount: draftRefund !== "" ? Number(draftRefund) : undefined },
      depositPercent,
    )
    : refundedAmount;
  const effectiveAllocated = allocationEditable
    ? parsedQty
    : draftStatus === ALLOCATION_FULFILLED_PAY_BALANCE && !(lineItem.allocatedQty > 0)
      ? maxQty
      : (lineItem.allocatedQty ?? 0);
  const parsedRefund = draftRefund === "" ? undefined : Math.max(0, Number(draftRefund) || 0);

  // Pre-fill the auto-calculated refund when the field first appears empty (stays editable).
  useEffect(() => {
    if (showRefundField && draftRefund === "") {
      setDraftRefund(String(computeAutoRefund(parsedQty, draftStatus)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRefundField, draftStatus]);

  const paymentStatusDirty = draftPayment !== lineItem.payment || draftStatus !== lineItem.status;
  const allocationDirty = showAllocationField && parsedQty !== (lineItem.allocatedQty ?? 0);
  const refundDirty = showRefundField && parsedRefund !== undefined && parsedRefund !== (lineItem.refundAmount ?? previewRefundedAmount);
  const dirty = paymentStatusDirty || allocationDirty || refundDirty;

  const allocationHint = validateAllocationForStatus(
    isPreorder ? { ...lineItem, allocatedQty: effectiveAllocated } : lineItem,
    draftStatus,
  );
  // Live allocation guidance sits under the stock field; other save errors stay at the bottom.
  const allocationFieldError = !allocationHint.ok
    ? allocationHint.message
    : (showAllocationField && saveError && /allocat|Full allocation|allocated qty/i.test(saveError) ? saveError : "");
  const footerError = saveError && saveError !== allocationFieldError ? saveError : "";

  function handleSave() {
    if (!dirty) return;

    const savingPartialAllocation = paymentStatusDirty && isPreorder && statusNeedsAllocation(draftStatus);
    const savingFullRefund = paymentStatusDirty && draftStatus === "For Full Refund";

    if (savingPartialAllocation && !savingFullRefund && (parsedQty <= 0 || parsedQty >= maxQty)) {
      setSaveError(
        parsedQty >= maxQty
          ? `Full allocation (${maxQty}) should use ${ALLOCATION_FULFILLED_PAY_BALANCE} instead.`
          : "Enter allocated qty (minimum 1) for units being fulfilled.",
      );
      return;
    }

    if (savingFullRefund && parsedQty !== 0) {
      setSaveError("Full refund requires 0 allocated units.");
      return;
    }

    const draftAllocatedForSave = savingPartialAllocation || (allocationEditable && paymentStatusDirty)
      ? (savingFullRefund ? 0 : parsedQty)
      : draftStatus === ALLOCATION_FULFILLED_PAY_BALANCE && !(lineItem.allocatedQty > 0)
        ? maxQty
        // Pin current partial/full allocation when moving to Fulfilled / Ready — never drop it.
        : (
          (draftStatus === "Fulfilled" || draftStatus === "Ready for Pickup")
          && (lineItem.allocatedQty > 0)
        )
          ? lineItem.allocatedQty
          : undefined;

    const draftRefundForSave = showRefundField && (refundDirty || paymentStatusDirty)
      ? (parsedRefund ?? previewRefundedAmount)
      : undefined;

    const itemForValidation = isPreorder
      ? {
          ...lineItem,
          allocatedQty: draftAllocatedForSave ?? effectiveAllocated,
        }
      : lineItem;

    if (paymentStatusDirty) {
      const check = validateAllocationForStatus(itemForValidation, draftStatus);
      if (!check.ok) {
        setSaveError(check.message);
        return;
      }
    }

    if (allocationDirty && !paymentStatusDirty && parsedQty <= 0) {
      setSaveError("Allocation qty is required (minimum 1).");
      return;
    }

    setSaveError("");

    // Warn when a payment/status change moves the order backward or skips ≥2 steps.
    if (paymentStatusDirty) {
      const transition = evaluateStepTransition(draftAllocatedForSave);
      if (transition) {
        setConfirmTransition({
          ...transition,
          draftPayment,
          draftStatus,
          draftAttachment,
          draftAllocatedForSave,
          draftRefundForSave,
        });
        return;
      }
    }

    commitSave({
      draftPayment,
      draftStatus,
      draftAttachment,
      draftAllocatedForSave,
      draftRefundForSave,
      paymentStatusDirty,
      allocationDirty,
    });
  }

  function commitSave(pending) {
    const {
      draftPayment: nextPayment,
      draftStatus: nextStatus,
      draftAttachment: nextAttachment,
      draftAllocatedForSave,
      draftRefundForSave,
      paymentStatusDirty: savePaymentStatus,
      allocationDirty: saveAllocation,
    } = pending;

    if (savePaymentStatus && onSave) {
      const attachment = nextAttachment
        ? buildTrailAttachment(nextAttachment.dataUrl, nextAttachment.name || "Attachment", "admin")
        : undefined;
      onSave(orderId, nextPayment, nextStatus, lineItem.id, "", attachment, draftAllocatedForSave, draftRefundForSave);
      setDraftAttachment(null);
    } else if (saveAllocation && setAllocation) {
      setAllocation(orderId, parsedQty, lineItem.id);
    }
  }

  function evaluateStepTransition(draftAllocatedForSave) {
    // Full refund is a legitimate refund decision at the allocation/balance
    // stage, not a workflow regression — never warn on it.
    if (migrateOrderStatus(draftStatus) === "For Full Refund") return null;

    const steps = getFlowStepsForItem(lineItem);
    const fromStep = getActiveStepForItem(lineItem);
    const nextItem = {
      ...lineItem,
      payment: draftPayment,
      status: draftStatus,
      allocatedQty: draftAllocatedForSave ?? lineItem.allocatedQty ?? 0,
    };
    const toStep = getActiveStepForItem(nextItem);

    if (toStep < fromStep) return { kind: "back", fromStep, toStep, steps };
    if (toStep - fromStep >= 2) return { kind: "skip", fromStep, toStep, steps };
    return null;
  }

  function handleConfirmTransition() {
    const pending = confirmTransition;
    setConfirmTransition(null);
    if (!pending) return;
    // Commit the snapshot captured when the dialog opened — don't re-check live dirty flags.
    commitSave({
      draftPayment: pending.draftPayment,
      draftStatus: pending.draftStatus,
      draftAttachment: pending.draftAttachment,
      draftAllocatedForSave: pending.draftAllocatedForSave,
      draftRefundForSave: pending.draftRefundForSave,
      paymentStatusDirty: true,
      allocationDirty: false,
    });
  }

  function computeAutoRefund(qty, status) {
    return refundedAmountForLineItem(
      { ...lineItem, allocatedQty: status === "For Full Refund" ? 0 : qty, status, refundAmount: undefined },
      depositPercent,
    );
  }

  function handleAllocationChange(value) {
    setDraftQty(value);
    setSaveError("");
    if (statusNeedsRefundAmount(draftStatus)) {
      const qty = Math.max(0, Math.min(maxQty, Number(value) || 0));
      setDraftRefund(String(computeAutoRefund(qty, draftStatus)));
    }
  }

  function handlePaymentChange(nextPayment) {
    setDraftPayment(nextPayment);
    setSaveError("");
    handleStatusChange(resolveOrderStatusForPayment(nextPayment, draftStatus, kind));
  }

  function handleStatusChange(nextStatus) {
    setDraftStatus(nextStatus);
    setSaveError("");
    const existingAlloc = lineItem.allocatedQty ?? 0;
    let nextQty = Number(draftQty) || existingAlloc || 0;
    if (nextStatus === "For Full Refund") {
      nextQty = 0;
      setDraftQty("0");
    } else if (
      (nextStatus === ALLOCATION_FULFILLED_PAY_BALANCE || nextStatus === "Fulfilled")
      && isPreorder
      && existingAlloc <= 0
    ) {
      // Only default to full qty when nothing has been allocated yet.
      nextQty = maxQty;
      setDraftQty(String(maxQty));
    } else if (!statusNeedsAllocation(nextStatus)) {
      nextQty = existingAlloc;
      setDraftQty(String(nextQty));
    } else if (existingAlloc > 0) {
      nextQty = existingAlloc;
      setDraftQty(String(nextQty));
    }
    if (statusNeedsRefundAmount(nextStatus)) {
      setDraftRefund(String(computeAutoRefund(nextQty, nextStatus)));
    }
  }

  const showRefundedOnly = showRefundedAmount && !showAllocationField && !showRefundField;
  const secondRowCount = [showAllocationField, showRefundField, showRefundedOnly].filter(Boolean).length;
  const secondRowSize = secondRowCount <= 1 ? 12 : 12 / secondRowCount;

  return (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="flex-start">
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>
            Payment status
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              ({isPreorder ? "Pre-order" : "In-stock"})
            </Typography>
          </Typography>
          <Select
            fullWidth
            size="small"
            value={draftPayment}
            onChange={(e) => handlePaymentChange(e.target.value)}
            renderValue={(value) => <Chip label={value} size="small" color={PAYMENT_COLOR[value] || "default"} variant="outlined" />}
          >
            {paymentOptions.map((payment) => (
              <MenuItem key={payment} value={payment}>{payment}</MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>Order status</Typography>
          <Select
            fullWidth
            size="small"
            value={draftStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            renderValue={(value) => <Chip label={orderStatusLabel(value)} size="small" color={STATUS_COLOR[value] || "default"} variant="outlined" />}
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>{orderStatusLabel(status)}</MenuItem>
            ))}
          </Select>
        </Grid>
        {showAllocationField ? (
          <Grid size={{ xs: 12, sm: secondRowSize }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>
              Stock allocation
              <Box component="span" sx={{ color: "error.main", ml: 0.25 }}>*</Box>
            </Typography>
            <TextField
              size="small"
              type="number"
              fullWidth
              label={`Allocated (max ${maxQty})`}
              value={draftQty}
              onChange={(e) => handleAllocationChange(e.target.value)}
              inputProps={{ min: 1, max: maxQty }}
              error={Boolean(allocationFieldError)}
            />
            {allocationFieldError ? (
              <Typography variant="caption" color="error.main" sx={{ display: "block", mt: 0.75, lineHeight: 1.45 }}>
                {allocationFieldError}
              </Typography>
            ) : null}
          </Grid>
        ) : null}
        {showRefundField ? (
          <Grid size={{ xs: 12, sm: secondRowSize }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>
              Refund amount
            </Typography>
            <TextField
              size="small"
              type="number"
              fullWidth
              label="Refund (PHP)"
              value={draftRefund}
              onChange={(e) => {
                setDraftRefund(e.target.value);
                setSaveError("");
              }}
              inputProps={{ min: 0 }}
            />
          </Grid>
        ) : null}
        {showRefundedOnly ? (
          <Grid size={{ xs: 12, sm: secondRowSize }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>
              Refunded amount
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 1.1,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.06),
              }}
            >
              <Typography sx={{ fontWeight: 800, fontFamily: MONO_FONT, fontSize: "0.95rem", color: "error.main" }}>
                {PESO.format(refundedAmount)}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
              Deposit or payment returned to the customer.
            </Typography>
          </Grid>
        ) : null}
      </Grid>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>
          Attachment
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            (optional)
          </Typography>
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            component="label"
            size="small"
            variant="outlined"
            startIcon={<AttachmentIcon sx={{ fontSize: 16 }} />}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.3, textTransform: "uppercase" }}
          >
            {draftAttachment ? "Replace file" : "Attach file"}
            <input type="file" hidden accept="image/*,application/pdf" onChange={handleAttachmentChange} />
          </Button>
          {draftAttachment ? (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: MONO_FONT, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {draftAttachment.name}
              </Typography>
              <IconButton size="small" color="error" aria-label="Remove attachment" onClick={() => setDraftAttachment(null)}>
                <TrashIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Image or PDF — saved with this status/payment update.
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ width: "100%", lineHeight: 1.4 }}>
            {UPLOAD_PROOF_DISCLAIMER}
          </Typography>
          <Button
            size="small"
            variant="contained"
            disabled={!dirty || !allocationHint.ok}
            onClick={handleSave}
            sx={{
              ml: "auto",
              fontFamily: MONO_FONT,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              minWidth: 120,
            }}
          >
            Save changes
          </Button>
        </Stack>
      </Box>
      {footerError ? (
        <Typography variant="caption" color="error.main" sx={{ lineHeight: 1.45 }}>
          {footerError}
        </Typography>
      ) : null}

      <Dialog open={Boolean(confirmTransition)} onClose={() => setConfirmTransition(null)} maxWidth="sm" fullWidth>
        {confirmTransition ? (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              {confirmTransition.kind === "back" ? "Move this item backward?" : "Skip ahead?"}
            </DialogTitle>
            <DialogContent>
              {confirmTransition.kind === "back" ? (
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  Order <strong>{orderId}</strong> is already{" "}
                  <strong>{orderStatusLabel(lineItem.status)}</strong>.
                  {" "}Are you sure you want to return it to{" "}
                  <strong>{orderStatusLabel(confirmTransition.draftStatus ?? draftStatus)}</strong>?
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Order <strong>{orderId}</strong> — this change jumps past one or more stages. Double-check before continuing.
                  </Typography>
                  <StepJourney
                    fromLabel={orderStatusLabel(lineItem.status)}
                    toLabel={orderStatusLabel(confirmTransition.draftStatus ?? draftStatus)}
                    accent="primary"
                  />
                  <Typography sx={{ mt: 2.5, fontWeight: 700 }}>Do you wish to continue?</Typography>
                </>
              )}
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
    </Stack>
  );
}

function lineItemTypeLabel(item) {
  return resolveOrderKindForItem(item) === "Pre-order" ? "Pre-order" : "Stock";
}

function LineItemSelectorOption({ item, index }) {
  const status = item.status ?? "—";

  return (
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5} sx={{ width: "100%" }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.35 }}>
          {lineItemTrailLabel(item)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: MONO_FONT, display: "block", mt: 0.25 }}>
          Item {index + 1}
        </Typography>
      </Box>
      <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0} sx={{ pt: 0.1 }}>
        <Chip
          label={lineItemTypeLabel(item)}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }}
        />
        <Chip
          label={orderStatusLabel(status)}
          size="small"
          color={STATUS_COLOR[status] || "default"}
          variant="outlined"
          sx={{ height: 22, fontSize: "0.68rem", fontWeight: 700 }}
        />
      </Stack>
    </Stack>
  );
}

function OrderItemSelector({ lineItems, selectedId, onSelect, surfaceBorderColor, showDivider = true }) {
  if (lineItems.length <= 1) return null;

  const selectedIndex = lineItems.findIndex((item) => item.id === selectedId);
  const selectedItem = selectedIndex >= 0 ? lineItems[selectedIndex] : null;
  const selectedLabel = selectedId === "all"
    ? `All items (${lineItems.length})`
    : (selectedItem ? shortLineItemLabel(selectedItem) : "Select line item");

  return (
    <Box sx={showDivider ? { mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: surfaceBorderColor } : { mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>Line item</Typography>
        {selectedId !== "all" && selectedIndex >= 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: MONO_FONT, flexShrink: 0 }}>
            {selectedIndex + 1} of {lineItems.length}
          </Typography>
        ) : null}
      </Stack>

      <Select
        fullWidth
        size="small"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        displayEmpty
        renderValue={() => (
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedLabel}
          </Typography>
        )}
        MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
      >
        <MenuItem value="all">
          <Typography sx={{ fontWeight: 700 }}>All items ({lineItems.length})</Typography>
        </MenuItem>
        <Divider component="li" sx={{ my: 0.5 }} />
        {lineItems.map((item, index) => (
          <MenuItem key={item.id} value={item.id} sx={{ alignItems: "flex-start", py: 1.25, whiteSpace: "normal" }}>
            <LineItemSelectorOption item={item} index={index} />
          </MenuItem>
        ))}
      </Select>
      {selectedId === "all" ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
          Combined trail — pick an item to update.
        </Typography>
      ) : null}
    </Box>
  );
}

function OrderPipelineStepper({ steps, activeStep, surfaceBorderColor, showDivider = true }) {
  return (
    <Box sx={showDivider ? { mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: surfaceBorderColor } : undefined}>
      <Box sx={{ overflowX: "auto" }}>
        <Stepper
            activeStep={activeStep}
            sx={{
              py: 0,
              "& .MuiStep-root": { px: 0.25 },
              "& .MuiStepLabel-root": { py: 0 },
              "& .MuiStepLabel-iconContainer": { pr: 0.5 },
              "& .MuiStepIcon-root": { width: 18, height: 18, fontSize: "0.65rem" },
              "& .MuiStepLabel-label": {
                fontSize: "0.68rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
              },
              "& .MuiStepLabel-label.Mui-active": { fontWeight: 800, color: "primary.main" },
              "& .MuiStepLabel-label.Mui-completed": { fontWeight: 700, color: "success.main" },
              "& .MuiStepIcon-root.Mui-completed": { color: "success.main" },
              "& .MuiStepIcon-root.Mui-active": { color: "primary.main" },
              "& .MuiStepConnector-root": { flex: "1 1 12px", minWidth: 8 },
              "& .MuiStepConnector-line": { borderColor: surfaceBorderColor, borderTopWidth: 2 },
              "& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line": { borderColor: "success.main" },
            }}
          >
            {steps.map((item) => (
              <Step key={item.key}>
                <StepLabel>{item.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
      </Box>
    </Box>
  );
}

export function OrderFlowBar({ subject, surfaceBorderColor, showDivider = true }) {
  const kind = resolveOrderKindForItem(subject);

  if (kind === "Pre-order") {
    return (
      <OrderPipelineStepper
        steps={PREORDER_FLOW_STEPS}
        activeStep={activePreorderStep(subject)}
        surfaceBorderColor={surfaceBorderColor}
        showDivider={showDivider}
      />
    );
  }

  return (
    <OrderPipelineStepper
      steps={INSTOCK_FLOW_STEPS}
      activeStep={activeInstockStep(subject)}
      surfaceBorderColor={surfaceBorderColor}
      showDivider={showDivider}
    />
  );
}

/** @deprecated Use OrderFlowBar */
export function PreorderFlowBar(props) {
  return <OrderFlowBar {...props} />;
}

export function OrderAllocationControls({ lineItem, orderId, setAllocation, surfaceBorderColor, showDivider = true }) {
  const [qty, setQty] = useState(String(lineItem.allocatedQty ?? 0));
  const [allocError, setAllocError] = useState("");

  useEffect(() => {
    setQty(String(lineItem.allocatedQty ?? 0));
    setAllocError("");
  }, [lineItem.id, lineItem.allocatedQty]);

  if (resolveOrderKindForItem(lineItem) !== "Pre-order" || !setAllocation) return null;
  if (migrateOrderStatus(lineItem.status) !== "Partially Fulfilled & For Refund") return null;

  const maxQty = lineItem.quantity ?? 1;

  return (
    <Box sx={showDivider ? { mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: surfaceBorderColor } : undefined}>
      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 0.5 }}>
        Stock allocation
        <Box component="span" sx={{ color: "error.main", ml: 0.25 }}>*</Box>
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.25 }}>
        For <strong>{lineItemTrailLabel(lineItem)}</strong>. Set fulfilled qty after an allocation cut — unallocated units are refunded.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          type="number"
          required
          label={`Allocated (max ${maxQty})`}
          value={qty}
          onChange={(e) => {
            setQty(e.target.value);
            setAllocError("");
          }}
          error={Boolean(allocError)}
          helperText={allocError || " "}
          inputProps={{ min: 1, max: maxQty }}
          sx={{ width: { xs: "100%", sm: 180 } }}
        />
        <Button
          size="small"
          variant="contained"
          onClick={() => {
            const parsed = Math.max(0, Math.min(maxQty, Number(qty) || 0));
            if (parsed <= 0) {
              setAllocError("Allocation qty is required (minimum 1).");
              return;
            }
            setAllocError("");
            setAllocation(orderId, parsed, lineItem.id);
            setQty(String(parsed));
          }}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase" }}
        >
          Update allocation
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: MONO_FONT }}>
          Current: {allocationLabelForItem(lineItem)}
        </Typography>
      </Stack>
    </Box>
  );
}

function useOrderLineItemSelection(order) {
  const lineItems = useMemo(() => getOrderLineItems(order), [order]);
  const lineItemIds = useMemo(() => lineItems.map((item) => item.id).join("|"), [lineItems]);
  const [selectedItemId, setSelectedItemId] = useState(lineItems[0]?.id ?? "all");

  useEffect(() => {
    const items = getOrderLineItems(order);
    setSelectedItemId(items.length === 1 ? items[0].id : (items[0]?.id ?? "all"));
  }, [order.id]);

  useEffect(() => {
    setSelectedItemId((prev) => {
      if (lineItems.length === 1) return lineItems[0].id;
      if (prev === "all") return "all";
      if (lineItems.some((item) => item.id === prev)) return prev;
      return lineItems[0]?.id ?? "all";
    });
  }, [lineItemIds, lineItems.length]);

  const canEditItem = lineItems.length === 1 || selectedItemId !== "all";
  const activeLineItem = lineItems.length === 1
    ? lineItems[0] ?? null
    : lineItems.find((item) => item.id === selectedItemId) ?? null;

  return { lineItems, selectedItemId, setSelectedItemId, canEditItem, activeLineItem };
}

export function OrderStatusPanel({
  order,
  lineItems,
  selectedItemId,
  onSelectItemId,
  panelSx,
  surfaceBorderColor,
  setPaymentAndStatus,
  setAllocation,
}) {
  const canEditItem = lineItems.length === 1 || selectedItemId !== "all";
  const activeLineItem = lineItems.length === 1
    ? lineItems[0] ?? null
    : lineItems.find((item) => item.id === selectedItemId) ?? null;

  if (!setPaymentAndStatus && !setAllocation) return null;

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <AdminSectionTitle suffix={order.id} sx={{ mb: 0.25 }}>Status</AdminSectionTitle>
      <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mt: 0.25, mb: 2 }}>
        Payment, order status{isPreorderOrder(order) ? ", allocation (partial refund only)" : ""}, and refunds.
      </Typography>

      <OrderItemSelector
        lineItems={lineItems}
        selectedId={selectedItemId}
        onSelect={onSelectItemId}
        surfaceBorderColor={surfaceBorderColor}
        showDivider={false}
      />

      {canEditItem && activeLineItem ? (
        <Stack spacing={2.5} divider={<Divider flexItem sx={{ borderColor: surfaceBorderColor }} />}>
          <OrderFlowBar subject={activeLineItem} surfaceBorderColor={surfaceBorderColor} showDivider={false} />

          {setPaymentAndStatus ? (
            <Box>
              <OrderStatusControls
                lineItem={activeLineItem}
                orderId={order.id}
                onSave={setPaymentAndStatus}
                setAllocation={setAllocation}
                depositPercent={order.depositPercent ?? 30}
              />
            </Box>
          ) : null}
        </Stack>
      ) : lineItems.length > 1 ? (
        <Typography variant="body2" color="text.secondary">
          Select a line item to update payment, status, or allocation.
        </Typography>
      ) : null}
    </Box>
  );
}

export function OrderDetailLayout({
  order,
  panelSx,
  surfaceBorderColor,
  addTrailEntry,
  setPaymentAndStatus,
  setAllocation,
  uploadTrailProof,
  sendOrderStatusEmail,
}) {
  const { lineItems, selectedItemId, setSelectedItemId, canEditItem, activeLineItem } = useOrderLineItemSelection(order);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 60%) minmax(0, 40%)" },
        gap: 2,
        alignItems: { xs: "start", lg: "stretch" },
        height: { xs: "auto", lg: "100%" },
        minHeight: 0,
      }}
    >
      <Stack
        spacing={2}
        sx={{
          minWidth: 0,
          minHeight: 0,
          height: { xs: "auto", lg: "100%" },
          display: "flex",
        }}
      >
        <Box sx={{ flexShrink: 0 }}>
          <OrderStatusPanel
            order={order}
            lineItems={lineItems}
            selectedItemId={selectedItemId}
            onSelectItemId={setSelectedItemId}
            panelSx={panelSx}
            surfaceBorderColor={surfaceBorderColor}
            setPaymentAndStatus={setPaymentAndStatus}
            setAllocation={setAllocation}
          />
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: { xs: 280, lg: 0 },
            display: "flex",
            flexDirection: "column",
            overflow: { lg: "hidden" },
          }}
        >
          <OrderTrailPanel
            order={order}
            panelSx={panelSx}
            surfaceBorderColor={surfaceBorderColor}
            addTrailEntry={addTrailEntry}
            uploadTrailProof={uploadTrailProof}
            lineItems={lineItems}
            selectedItemId={selectedItemId}
            canEditItem={canEditItem}
            activeLineItem={activeLineItem}
            compact
            scrollable
          />
        </Box>
      </Stack>

      <Box
        sx={{
          minWidth: 0,
          minHeight: { xs: 320, lg: 0 },
          height: { xs: "auto", lg: "100%" },
          maxHeight: { lg: "100%" },
          display: "flex",
          flexDirection: "column",
          overflow: { lg: "hidden" },
        }}
      >
        <OrderSummarySidebar
          order={order}
          panelSx={panelSx}
          scrollable
          sendOrderStatusEmail={sendOrderStatusEmail}
        />
      </Box>
    </Box>
  );
}

/** @deprecated Use OrderDetailLayout */
export function OrderDetailMainColumn(props) {
  return <OrderDetailLayout {...props} />;
}

export function OrderTrailPanel({
  order,
  panelSx,
  surfaceBorderColor,
  addTrailEntry,
  setPaymentAndStatus,
  setAllocation,
  uploadTrailProof,
  lineItems: lineItemsProp,
  selectedItemId: selectedItemIdProp,
  canEditItem: canEditItemProp,
  activeLineItem: activeLineItemProp,
  compact = false,
  scrollable = false,
}) {
  const [trailNote, setTrailNote] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [uploadingEntryId, setUploadingEntryId] = useState("");
  const [trailExpanded, setTrailExpanded] = useState(false);
  const internalSelection = useOrderLineItemSelection(order);
  const embedded = Boolean(lineItemsProp);
  const lineItems = lineItemsProp ?? internalSelection.lineItems;
  const selectedItemId = selectedItemIdProp ?? internalSelection.selectedItemId;
  const setSelectedItemId = internalSelection.setSelectedItemId;
  const canEditItem = canEditItemProp ?? internalSelection.canEditItem;
  const activeLineItem = activeLineItemProp ?? internalSelection.activeLineItem;
  const trailFilterId = selectedItemId === "all" ? null : selectedItemId;
  const allItemsView = lineItems.length > 1 && selectedItemId === "all";
  const showLegacyControls = !embedded && (setPaymentAndStatus || setAllocation);

  const trail = useMemo(
    () => prepareTrailForDisplay(
      [...(order.trail ?? [])].filter((entry) => trailEntryAppliesToLineItem(entry, trailFilterId)),
      order,
    ).sort((a, b) => new Date(b.at) - new Date(a.at)),
    [order, order.trail, trailFilterId],
  );

  const handleAddNote = () => {
    if (!trailNote.trim() || !addTrailEntry || !canEditItem || !activeLineItem) return;
    addTrailEntry(order.id, {
      title: "Staff note",
      note: trailNote.trim(),
      lineItemId: activeLineItem.id,
      lineItemName: lineItemTrailLabel(activeLineItem),
    });
    setTrailNote("");
  };

  const handleUploadTrailProof = async (entry, dataUrl) => {
    if (!uploadTrailProof || !entry?.id) return;
    setAttachmentError("");
    setUploadingEntryId(entry.id);
    try {
      await uploadTrailProof(order.id, entry.id, dataUrl);
      setAttachmentError("");
    } catch (error) {
      setAttachmentError(error.message || "Could not upload proof file.");
    } finally {
      setUploadingEntryId("");
    }
  };

  const handleViewAttachment = (attachment, trailEntry) => {
    if (!trailEntryShowsAttachment(trailEntry)) return;
    setAttachmentError("");
    const hydrated = hydrateProofAttachment(
      attachment,
      resolveProofAttachmentUrl(order, trailEntry),
    );
    if (hydrated?.url) {
      setPreviewAttachment(hydrated);
      return;
    }
    setAttachmentError(
      trailEntry.attachment?.purged
        ? "This proof was removed after the retention period. Upload a new file below if you need it on record."
        : "Proof file is not on the server yet. Use Upload proof file below, or ask the customer to open their order once.",
    );
  };

  const trailSuffix = orderTrailSuffix(selectedItemId, activeLineItem, lineItems);

  const trailItems = trail.length ? (
    <Stack spacing={0}>
      {trail.map((entry, index) => (
        <TrailTimelineItem
          key={entry.id}
          entry={entry}
          trail={trail}
          order={order}
          isLast={index === trail.length - 1}
          surfaceBorderColor={surfaceBorderColor}
          onViewAttachment={handleViewAttachment}
          onUploadProof={uploadTrailProof ? handleUploadTrailProof : null}
          uploading={uploadingEntryId === entry.id}
          lineItems={lineItems}
          lineItemLabel={
            allItemsView && entry.lineItemName
              ? trailEntryLineItemLabel(entry, lineItems)
              : undefined
          }
        />
      ))}
    </Stack>
  ) : (
    <Box sx={{ py: 4, textAlign: "center", color: "text.secondary", border: "1px dashed", borderColor: surfaceBorderColor, borderRadius: 1 }}>
      No trail entries yet.
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          ...panelSx,
          p: compact ? { xs: 1.75, md: 2 } : { xs: 2, md: 2.5 },
          ...(scrollable ? {
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            height: "100%",
            maxHeight: "100%",
            overflow: "hidden",
          } : {}),
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1}
          sx={{ flexShrink: 0, mb: compact ? 1.5 : 2.5 }}
        >
          <AdminSectionTitle
            sx={{ lineHeight: 1.35, minWidth: 0 }}
            suffix={trailSuffix}
          >
            Order trail
          </AdminSectionTitle>
          <Tooltip title="Expand trail">
            <IconButton
              size="small"
              color="inherit"
              onClick={() => setTrailExpanded(true)}
              aria-label="Expand order trail"
              sx={{ flexShrink: 0, mt: -0.25 }}
            >
              <ExpandCornersIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        {!embedded ? (
          <Box sx={{ flexShrink: 0 }}>
            <OrderItemSelector
              lineItems={lineItems}
              selectedId={selectedItemId}
              onSelect={setSelectedItemId}
              surfaceBorderColor={surfaceBorderColor}
            />
          </Box>
        ) : null}

        {showLegacyControls && canEditItem && activeLineItem ? (
          <>
            <OrderFlowBar subject={activeLineItem} surfaceBorderColor={surfaceBorderColor} />

            {setPaymentAndStatus ? (
              <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
                <OrderStatusControls lineItem={activeLineItem} orderId={order.id} onSave={setPaymentAndStatus} />
              </Box>
            ) : null}

            <OrderAllocationControls
              lineItem={activeLineItem}
              orderId={order.id}
              setAllocation={setAllocation}
              surfaceBorderColor={surfaceBorderColor}
            />
          </>
        ) : null}

        {showLegacyControls && !canEditItem && lineItems.length > 1 ? (
          <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
            <Typography variant="body2" color="text.secondary">
              Select a line item to update payment, status, or allocation.
            </Typography>
          </Box>
        ) : null}

        {addTrailEntry ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: scrollable ? 1.5 : 2.5, flexShrink: 0 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={!canEditItem ? "Select a line item to add a note…" : "Add a note to the trail…"}
              value={trailNote}
              onChange={(e) => setTrailNote(e.target.value)}
              disabled={!canEditItem}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddNote();
              }}
            />
            <Button
              size="small"
              variant="contained"
              disabled={!trailNote.trim() || !canEditItem}
              onClick={handleAddNote}
              sx={{ flexShrink: 0, fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", minWidth: { sm: 88 } }}
            >
              Add
            </Button>
          </Stack>
        ) : null}

        <Box
          sx={scrollable ? {
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
            pr: 0.5,
            mr: -0.5,
          } : undefined}
        >
          {trailItems}
        </Box>
      </Box>

      {attachmentError ? (
        <Alert severity="warning" onClose={() => setAttachmentError("")} sx={{ mt: 1.5 }}>
          {attachmentError}
        </Alert>
      ) : null}

      <Dialog
        open={trailExpanded}
        onClose={() => setTrailExpanded(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            ...panelSx,
            bgcolor: "background.paper",
            backgroundImage: "none",
            height: "min(820px, 90dvh)",
            maxHeight: "90dvh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pr: 1.5, flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <AdminSectionTitle sx={{ mb: 0, fontSize: "0.95rem" }} suffix={trailSuffix}>
              Order trail
            </AdminSectionTitle>
            <IconButton
              size="small"
              onClick={() => setTrailExpanded(false)}
              aria-label="Close expanded trail"
            >
              <Typography component="span" sx={{ fontSize: "1.25rem", lineHeight: 1, px: 0.5 }}>×</Typography>
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            py: 2.5,
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overscrollBehavior: "contain",
          }}
        >
          {trailItems}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, flexShrink: 0 }}>
          <Button onClick={() => setTrailExpanded(false)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <AttachmentPreviewModal
        open={Boolean(previewAttachment)}
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        surfaceBorderColor={surfaceBorderColor}
      />
    </>
  );
}

/** @deprecated Use OrderTrailPanel */
export function OrderTrailGrid(props) {
  return <OrderTrailPanel {...props} />;
}

function isItemEmailDisabled(item) {
  return migratePaymentStatus(item.payment) === "Pending Verification"
    || migrateOrderStatus(item.status) === "Pending Verification";
}

function defaultEmailItemSelection(lineItems) {
  return new Set(lineItems.filter((item) => !isItemEmailDisabled(item)).map((item) => item.id));
}

function findPreviousSentEmailEntry(order, emailType) {
  if (!emailType) return null;
  return (order.trail ?? []).find(
    (entry) => entry.emailStatus === "sent" && entry.emailType === emailType,
  ) ?? null;
}

function formatTrailTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function OrderSummarySidebar({ order, panelSx, scrollable = false, sendOrderStatusEmail }) {
  const lineItems = getOrderLineItems(order);
  const depositPercent = order.depositPercent ?? 30;
  const [selectedItemIds, setSelectedItemIds] = useState(() => defaultEmailItemSelection(lineItems));
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendError, setSendError] = useState("");
  const [confirmResendEmail, setConfirmResendEmail] = useState(null);

  useEffect(() => {
    setSelectedItemIds(defaultEmailItemSelection(lineItems));
    setSendError("");
  }, [order.id, order.lineItems]);

  const address = order.address
    ? [order.address.street, order.address.city, order.address.province, order.address.postal].filter(Boolean).join(", ")
    : null;

  const summaryItems = lineItems.map((item) => {
    const isPreorder = resolveOrderKindForItem(item) === "Pre-order";
    const fullLine = item.lineTotal ?? (item.price ?? 0) * (item.quantity ?? 1);
    const allocatedQty = Math.max(0, Number(item.allocatedQty) || 0);

    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? 1,
      allocatedQty,
      tag: item.tag ?? (isPreorder ? "Pre-order" : "In-stock"),
      depositPercent,
      price: item.price ?? (item.quantity ? fullLine / item.quantity : fullLine),
      // Final = DP + balance (= allocated × price), not checkout deposit alone.
      amount: lineItemGrossRevenue(item, depositPercent),
      image: item.image || null,
      payment: item.payment,
      status: item.status,
      emailDisabled: isItemEmailDisabled(item),
    };
  });

  const hasInstock = lineItems.some((item) => resolveOrderKindForItem(item) !== "Pre-order");
  const hasPreorderLine = lineItems.some((item) => resolveOrderKindForItem(item) === "Pre-order");
  const isMixedOrder = hasPreorderLine && hasInstock;

  // Gross / final (= allocated × price once allocated; DP-only before).
  const paidSoFar = lineItems.length
    ? lineItems.reduce((sum, item) => sum + lineItemGrossRevenue(item, depositPercent), 0)
    : (order.total ?? 0);

  let balanceAwaiting = 0;
  let balancePaidAmount = 0;
  let depositCollected = 0;
  let preorderAllocatedUnits = 0;
  let preorderRefundPath = false;

  lineItems.forEach((item) => {
    if (resolveOrderKindForItem(item) !== "Pre-order") return;
    const portion = linePreorderBalancePortion(item, depositPercent);
    const payment = migratePaymentStatus(item.payment);
    const status = migrateOrderStatus(item.status);
    const allocated = Math.max(0, Number(item.allocatedQty) || 0);
    preorderAllocatedUnits += allocated;
    if (payment === "Refunded" || payment === "For Full Refund" || status === "Refunded" || status === "For Full Refund") {
      preorderRefundPath = true;
      return;
    }
    if (payment === "Unpaid" || payment === "Rejected") return;
    // Deposit line must stay true DP (e.g. 30%), never the full allocated total.
    depositCollected += lineItemDepositPaid(item, depositPercent);
    if (portion <= 0) return;
    if (lineBalanceIsAwaiting(item)) balanceAwaiting += portion;
    else balancePaidAmount += portion;
  });

  const refundedAmount = refundedAmountForOrder(order);
  // Full refund / 0 keep on pre-order lines → ₱0; else final / collected gross.
  const total = (hasPreorderLine && preorderAllocatedUnits <= 0 && (preorderRefundPath || refundedAmount > 0) && !hasInstock)
    ? 0
    : (hasPreorderLine || isMixedOrder)
      ? paidSoFar
      : orderCustomerTotal(order);

  const preorderLines = lineItems.filter((item) => resolveOrderKindForItem(item) === "Pre-order");
  const instockLines = lineItems.filter((item) => resolveOrderKindForItem(item) !== "Pre-order");
  const preorderGross = preorderLines.reduce((sum, item) => sum + lineItemGrossRevenue(item, depositPercent), 0);
  const instockPaid = instockLines.reduce((sum, item) => sum + lineItemGrossRevenue(item, depositPercent), 0);
  // "Deposit paid" / mixed "Paid so far" = DP (+ in-stock), not final price.
  const subtotal = isMixedOrder
    ? depositCollected + instockPaid
    : hasPreorderLine
      ? depositCollected
      : (order.fullSubtotal ?? order.total ?? 0);
  const balanceSettled = balancePaidAmount > 0 && balanceAwaiting <= 0;
  const allLinesSettled = lineItems.length > 0 && lineItems.every(lineIsFullySettled);
  // Mixed + still awaiting / not all paid → split Pre-order vs In-stock. Both fully paid → merge.
  const showSplitTotals = isMixedOrder && !allLinesSettled;

  const preorderRefunded = preorderLines.reduce(
    (sum, item) => sum + (refundedAmountForLineItem(item, depositPercent) || 0),
    0,
  );
  const instockRefunded = instockLines.reduce(
    (sum, item) => sum + (refundedAmountForLineItem(item, depositPercent) || 0),
    0,
  );

  const totalsGroups = showSplitTotals
    ? [
      {
        id: "preorder",
        title: "Pre-order",
        hasPreorder: true,
        subtotalLabel: "Deposit paid",
        subtotal: depositCollected,
        balanceDue: balanceAwaiting,
        balancePaid: balancePaidAmount,
        balanceSettled: balanceSettled,
        refundedAmount: preorderRefunded,
        total: preorderGross,
        totalLabel: "Total",
      },
      {
        id: "instock",
        title: "In-stock",
        hasPreorder: false,
        subtotalLabel: "Paid",
        subtotal: instockPaid,
        balanceDue: 0,
        balancePaid: 0,
        refundedAmount: instockRefunded,
        total: instockPaid,
        totalLabel: "Total",
      },
    ]
    : null;

  const subtotalLabel = isMixedOrder
    ? "Paid so far"
    : hasPreorderLine
      ? "Deposit paid"
      : "Subtotal";
  const footerNote = showSplitTotals
    ? "Merges when every line is fully paid."
    : null;

  const selectedItems = lineItems.filter((item) => selectedItemIds.has(item.id));
  const selectedItemsShareStatus = useMemo(() => {
    if (selectedItems.length <= 1) return true;
    const firstPayment = migratePaymentStatus(selectedItems[0].payment);
    const firstStatus = migrateOrderStatus(selectedItems[0].status);
    return selectedItems.every(
      (item) =>
        migratePaymentStatus(item.payment) === firstPayment
        && migrateOrderStatus(item.status) === firstStatus,
    );
  }, [selectedItems]);
  const previewEmailType = selectedItems.length && selectedItemsShareStatus
    ? resolveOrderStatusEmailTypeForCurrentState(selectedItems[0])
    : null;

  function toggleEmailItem(itemId) {
    const item = lineItems.find((row) => row.id === itemId);
    if (!item || isItemEmailDisabled(item)) return;
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    setSendError("");
  }

  async function performSendEmail() {
    setSendingEmail(true);
    setSendError("");
    try {
      await sendOrderStatusEmail(order.id, [...selectedItemIds]);
    } catch (error) {
      setSendError(error?.message || "Could not send email.");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleSendEmail() {
    if (!sendOrderStatusEmail) return;
    if (!selectedItemIds.size) {
      setSendError("Select at least one line item to include in the email.");
      return;
    }
    if (!selectedItemsShareStatus) {
      setSendError("Selected items must share the same payment and order status.");
      return;
    }

    const previousSend = findPreviousSentEmailEntry(order, previewEmailType);
    if (previousSend) {
      setConfirmResendEmail({ emailType: previewEmailType, previousSend });
      return;
    }

    await performSendEmail();
  }

  async function handleConfirmResendEmail() {
    setConfirmResendEmail(null);
    await performSendEmail();
  }

  return (
    <>
    <OrderSummaryPanel
      compact
      scrollable={scrollable}
      items={summaryItems}
      subtotal={subtotal}
      total={total}
      balanceDue={balanceAwaiting}
      balancePaid={balancePaidAmount}
      balanceSettled={balanceSettled}
      refundedAmount={refundedAmount}
      hasPreorder={hasPreorderLine}
      panelSx={panelSx}
      subtotalLabel={subtotalLabel}
      totalLabel="Total"
      footerNote={footerNote}
      totalsGroups={totalsGroups}
      adminSectionTitle
      selectedItemIds={sendOrderStatusEmail ? selectedItemIds : undefined}
      onToggleItemId={sendOrderStatusEmail ? toggleEmailItem : undefined}
      billTo={{
        name: order.customer,
        email: order.email,
        phone: order.phone,
        address,
        notes: order.notes,
      }}
      renderItemExtra={(item) => (
        <OrderSummaryItemMeta
          parts={[
            item.payment,
            item.status,
            item.allocatedQty > 0 ? `${item.allocatedQty} of ${item.quantity} allocated` : null,
          ].filter(Boolean)}
        />
      )}
      headerActions={sendOrderStatusEmail ? (
        <Button
          size="small"
          variant="contained"
          disabled={sendingEmail || !selectedItemIds.size || !previewEmailType || !selectedItemsShareStatus}
          onClick={handleSendEmail}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", flexShrink: 0 }}
        >
          {sendingEmail ? "Sending…" : "Send email"}
        </Button>
      ) : null}
      headerNotice={sendOrderStatusEmail && sendError ? (
        <Alert severity="error">{sendError}</Alert>
      ) : sendOrderStatusEmail && !previewEmailType && selectedItems.length && selectedItemsShareStatus ? (
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
          No email template matches the selected items&apos; status yet.
        </Typography>
      ) : null}
    />
    <Dialog open={Boolean(confirmResendEmail)} onClose={() => setConfirmResendEmail(null)} maxWidth="sm" fullWidth>
      {confirmResendEmail ? (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>Send email again?</DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
              This order already received a{" "}
              <strong>{ORDER_STATUS_EMAIL_LABELS[confirmResendEmail.emailType] || confirmResendEmail.emailType}</strong>{" "}
              email
              {confirmResendEmail.previousSend?.at
                ? ` on ${formatTrailTimestamp(confirmResendEmail.previousSend.at)}`
                : ""}
              . Do you wish to continue?
            </Typography>
            {confirmResendEmail.previousSend?.emailLineItems?.length ? (
              <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", fontWeight: 600 }}>
                  Previously included:
                </Typography>
                {confirmResendEmail.previousSend.emailLineItems.map((row) => (
                  <Typography
                    key={row.lineItemId}
                    sx={{ fontSize: "0.88rem", lineHeight: 1.45 }}
                  >
                    {row.lineItemName || "Line item"}
                  </Typography>
                ))}
              </Stack>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={() => setConfirmResendEmail(null)}>Cancel</Button>
            <Button
              variant="contained"
              color="warning"
              onClick={handleConfirmResendEmail}
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase" }}
            >
              Continue
            </Button>
          </DialogActions>
        </>
      ) : null}
    </Dialog>
    </>
  );
}
