import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
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
  Typography,
  Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
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
  allocationLabelForItem,
  buildTrailAttachment,
  getOrderLineItems,
  getPaymentOptionsForKind,
  getStatusOptionsForKind,
  isPreorderOrder,
  lineItemTrailLabel,
  migrateOrderStatus,
  optionsIncludingCurrent,
  refundedAmountForLineItem,
  refundedAmountForOrder,
  resolveOrderKind,
  resolveOrderKindForItem,
  validateAllocationForStatus,
} from "../data/orderWorkflow.js";
import { hydrateProofAttachment, resolveOrderProofUrl } from "../lib/orderProofStorage.js";

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
          <Box
            component="img"
            src={url}
            alt={label || "Attachment"}
            sx={{
              width: "100%",
              maxHeight: "70vh",
              objectFit: "contain",
              borderRadius: 1,
              border: "1px solid",
              borderColor: surfaceBorderColor,
              bgcolor: alpha("#000", 0.03),
              display: "block",
              mx: "auto",
            }}
          />
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

function orderTrailSuffix(selectedItemId, activeLineItem, lineItems) {
  if (lineItems.length <= 1 && lineItems[0]) {
    return shortLineItemLabel(lineItems[0]);
  }
  if (selectedItemId === "all" || !activeLineItem) {
    return undefined;
  }
  return shortLineItemLabel(activeLineItem);
}

function trailMetaLine(entry) {
  return [entry.payment, entry.status].filter(Boolean).join(" · ");
}

function TrailTimelineItem({ entry, isLast, surfaceBorderColor, onViewAttachment, lineItemLabel }) {
  const meta = trailMetaLine(entry);
  const at = new Date(entry.at);
  const timeLabel = at.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

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
          {entry.title}
          {meta ? (
            <Typography component="span" sx={{ fontWeight: 500, color: "text.secondary", fontFamily: MONO_FONT, fontSize: "0.72rem" }}>
              {" "}· {meta}
            </Typography>
          ) : null}
        </Typography>

        {lineItemLabel ? (
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontFamily: MONO_FONT, mt: 0.35, lineHeight: 1.35 }}>
            {lineItemLabel}
          </Typography>
        ) : null}

        {entry.note ? (
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mt: 0.5, lineHeight: 1.45 }}>
            {entry.note}
          </Typography>
        ) : null}

        {entry.attachment?.url ? (
          <Button
            size="small"
            variant="text"
            startIcon={<AttachmentIcon sx={{ fontSize: 14 }} />}
            onClick={() => onViewAttachment(entry.attachment)}
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
            {entry.attachment.label || "View attachment"}
          </Button>
        ) : null}
      </Box>
    </Stack>
  );
}

export function OrderStatusControls({ lineItem, onSave, orderId, setAllocation, depositPercent = 30 }) {
  const kind = resolveOrderKindForItem(lineItem);
  const isPreorder = kind === "Pre-order";
  const paymentOptions = optionsIncludingCurrent(getPaymentOptionsForKind(kind), lineItem.payment);
  const statusOptions = optionsIncludingCurrent(getStatusOptionsForKind(kind), lineItem.status);
  const maxQty = lineItem.quantity ?? 1;

  const [draftPayment, setDraftPayment] = useState(lineItem.payment);
  const [draftStatus, setDraftStatus] = useState(lineItem.status);
  const [draftQty, setDraftQty] = useState(String(lineItem.allocatedQty ?? 0));
  const [draftAttachment, setDraftAttachment] = useState(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setDraftPayment(lineItem.payment);
    setDraftStatus(lineItem.status);
    setDraftQty(String(lineItem.allocatedQty ?? 0));
    setDraftAttachment(null);
    setSaveError("");
  }, [lineItem.id, lineItem.payment, lineItem.status, lineItem.allocatedQty]);

  function handleAttachmentChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setSaveError("Attachment must be an image or PDF.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDraftAttachment({ name: file.name, dataUrl: reader.result });
      setSaveError("");
    };
    reader.readAsDataURL(file);
  }

  const parsedQty = Math.max(0, Math.min(maxQty, Number(draftQty) || 0));
  const allocationEditable = draftStatus === "Partially Fulfilled & Refunded";
  const showAllocationField = isPreorder && setAllocation && allocationEditable;
  const showRefundedAmount = draftStatus === "Refunded" || draftPayment === "Refunded";
  const refundedAmount = refundedAmountForLineItem(lineItem, depositPercent);
  const previewRefundedAmount = allocationEditable && parsedQty > 0 && parsedQty < maxQty
    ? refundedAmountForLineItem({ ...lineItem, allocatedQty: parsedQty, status: draftStatus }, depositPercent)
    : refundedAmount;
  const effectiveAllocated = allocationEditable ? parsedQty : (lineItem.allocatedQty ?? 0);
  const paymentStatusDirty = draftPayment !== lineItem.payment || draftStatus !== lineItem.status;
  const allocationDirty = showAllocationField && parsedQty !== (lineItem.allocatedQty ?? 0);
  const dirty = paymentStatusDirty || allocationDirty;

  const allocationHint = validateAllocationForStatus(
    isPreorder ? { ...lineItem, allocatedQty: effectiveAllocated } : lineItem,
    draftStatus,
  );
  const errorMessage = saveError || (!allocationHint.ok ? allocationHint.message : "");

  function handleSave() {
    if (!dirty) return;

    const savingPartialRefund = paymentStatusDirty
      && draftStatus === "Partially Fulfilled & Refunded"
      && isPreorder;

    if (savingPartialRefund && (parsedQty <= 0 || parsedQty >= maxQty)) {
      setSaveError(
        parsedQty >= maxQty
          ? `Full allocation (${maxQty}) should use Fulfilled status instead.`
          : "Enter allocated qty (minimum 1) for units being fulfilled.",
      );
      return;
    }

    const draftAllocatedForSave = savingPartialRefund || (allocationEditable && paymentStatusDirty)
      ? parsedQty
      : undefined;

    const itemForValidation = isPreorder
      ? {
          ...lineItem,
          allocatedQty: draftAllocatedForSave ?? (draftStatus === "Fulfilled" ? maxQty : effectiveAllocated),
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

    if (paymentStatusDirty && onSave) {
      const attachment = draftAttachment
        ? buildTrailAttachment(draftAttachment.dataUrl, draftAttachment.name)
        : undefined;
      onSave(orderId, draftPayment, draftStatus, lineItem.id, "", attachment, draftAllocatedForSave);
      setDraftAttachment(null);
    } else if (allocationDirty && setAllocation) {
      setAllocation(orderId, parsedQty, lineItem.id);
    }
  }

  function handleStatusChange(nextStatus) {
    setDraftStatus(nextStatus);
    setSaveError("");
    if (nextStatus === "Fulfilled" && isPreorder) {
      setDraftQty(String(maxQty));
    } else if (nextStatus !== "Partially Fulfilled & Refunded") {
      setDraftQty(String(lineItem.allocatedQty ?? 0));
    }
  }

  const thirdColumn = showAllocationField || showRefundedAmount;

  return (
    <Stack spacing={1.5}>
      <Grid container spacing={2} alignItems="flex-start">
        <Grid size={{ xs: 12, sm: thirdColumn ? 4 : 6 }}>
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
            onChange={(e) => setDraftPayment(e.target.value)}
            renderValue={(value) => <Chip label={value} size="small" color={PAYMENT_COLOR[value] || "default"} variant="outlined" />}
          >
            {paymentOptions.map((payment) => (
              <MenuItem key={payment} value={payment}>{payment}</MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid size={{ xs: 12, sm: thirdColumn ? 4 : 6 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>Order status</Typography>
          <Select
            fullWidth
            size="small"
            value={draftStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            renderValue={(value) => <Chip label={value} size="small" color={STATUS_COLOR[value] || "default"} variant="outlined" />}
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </Grid>
        {showAllocationField ? (
          <Grid size={{ xs: 12, sm: 4 }}>
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
              onChange={(e) => {
                setDraftQty(e.target.value);
                setSaveError("");
              }}
              inputProps={{ min: 1, max: maxQty }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", fontFamily: MONO_FONT }}>
              Current: {allocationLabelForItem(lineItem)}
              {previewRefundedAmount > 0 ? ` · Refunded ${PESO.format(previewRefundedAmount)}` : ""}
            </Typography>
          </Grid>
        ) : null}
        {showRefundedAmount && !showAllocationField ? (
          <Grid size={{ xs: 12, sm: 4 }}>
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
              <Button size="small" variant="text" onClick={() => setDraftAttachment(null)} sx={{ minWidth: 0, px: 0.5 }}>
                Remove
              </Button>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Image or PDF — saved with this status/payment update.
            </Typography>
          )}
        </Stack>
      </Box>
      {errorMessage ? (
        <Typography variant="caption" color="error.main" sx={{ lineHeight: 1.45 }}>
          {errorMessage}
        </Typography>
      ) : null}
      <Stack direction="row" justifyContent="flex-end">
        <Button
          size="small"
          variant="contained"
          disabled={!dirty || !allocationHint.ok}
          onClick={handleSave}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", minWidth: 120 }}
        >
          Save changes
        </Button>
      </Stack>
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
          label={status}
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
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
        {selectedId === "all"
          ? "Combined trail — pick an item to update."
          : "Updating this line item only."}
      </Typography>
    </Box>
  );
}

function OrderPipelineStepper({ steps, activeStep, surfaceBorderColor, title, showDivider = true }) {
  return (
    <Box sx={showDivider ? { mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: surfaceBorderColor } : undefined}>
      <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1.5 }}>{title}</Typography>
      <Box sx={{ overflowX: "auto", mx: -0.5, px: 0.5 }}>
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            minWidth: { xs: 320, sm: "100%" },
            "& .MuiStepLabel-label": {
              fontSize: { xs: "0.68rem", sm: "0.75rem" },
              fontWeight: 600,
              mt: 0.5,
            },
            "& .MuiStepLabel-label.Mui-active": { fontWeight: 800, color: "primary.main" },
            "& .MuiStepLabel-label.Mui-completed": { fontWeight: 700, color: "success.main" },
            "& .MuiStepIcon-root.Mui-completed": { color: "success.main" },
            "& .MuiStepIcon-root.Mui-active": { color: "primary.main" },
            "& .MuiStepConnector-line": { borderColor: surfaceBorderColor },
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
        title="Pre-order pipeline"
        steps={PREORDER_FLOW_STEPS}
        activeStep={activePreorderStep(subject)}
        surfaceBorderColor={surfaceBorderColor}
        showDivider={showDivider}
      />
    );
  }

  return (
    <OrderPipelineStepper
      title="In-stock pipeline"
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
  if (migrateOrderStatus(lineItem.status) !== "Partially Fulfilled & Refunded") return null;

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
      <AdminSectionTitle sx={{ mb: 0.25 }}>Status</AdminSectionTitle>
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
              {lineItems.length > 1 ? (
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1.5 }}>
                  Update: {lineItemTrailLabel(activeLineItem)}
                </Typography>
              ) : null}
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
        <Box sx={{ flex: 1, minHeight: { xs: 280, lg: 0 }, display: "flex", flexDirection: "column" }}>
          <OrderSummarySidebar order={order} panelSx={panelSx} scrollable />
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
        <OrderTrailPanel
          order={order}
          panelSx={panelSx}
          surfaceBorderColor={surfaceBorderColor}
          addTrailEntry={addTrailEntry}
          lineItems={lineItems}
          selectedItemId={selectedItemId}
          canEditItem={canEditItem}
          activeLineItem={activeLineItem}
          compact
          scrollable
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
  lineItems: lineItemsProp,
  selectedItemId: selectedItemIdProp,
  canEditItem: canEditItemProp,
  activeLineItem: activeLineItemProp,
  compact = false,
  scrollable = false,
}) {
  const [trailNote, setTrailNote] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState(null);
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
    () => [...(order.trail ?? [])]
      .filter((entry) => !trailFilterId || !entry.lineItemId || entry.lineItemId === trailFilterId)
      .sort((a, b) => new Date(b.at) - new Date(a.at)),
    [order.trail, trailFilterId],
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
        <Box sx={{ flexShrink: 0, mb: compact ? 1.5 : 2.5 }}>
          <AdminSectionTitle
            sx={{ lineHeight: 1.35 }}
            suffix={orderTrailSuffix(selectedItemId, activeLineItem, lineItems)}
          >
            Order trail
          </AdminSectionTitle>
        </Box>

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
                {lineItems.length > 1 ? (
                  <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1.5 }}>
                    Update: {lineItemTrailLabel(activeLineItem)}
                  </Typography>
                ) : null}
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
          {trail.length ? (
            <Stack spacing={0}>
              {trail.map((entry, index) => (
                <TrailTimelineItem
                  key={entry.id}
                  entry={entry}
                  isLast={index === trail.length - 1}
                  surfaceBorderColor={surfaceBorderColor}
                  onViewAttachment={(attachment) => {
                    const hydrated = hydrateProofAttachment(attachment, resolveOrderProofUrl(order));
                    if (hydrated?.url) setPreviewAttachment(hydrated);
                  }}
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
          )}
        </Box>
      </Box>

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

export function OrderSummarySidebar({ order, panelSx, scrollable = false }) {
  const hasPreorder = isPreorderOrder(order);
  const lineItems = getOrderLineItems(order);
  const depositPercent = order.depositPercent ?? 30;
  const address = order.address
    ? [order.address.street, order.address.city, order.address.province, order.address.postal].filter(Boolean).join(", ")
    : null;

  const summaryItems = lineItems.map((item) => {
    const isPreorder = resolveOrderKindForItem(item) === "Pre-order";
    const fullLine = item.lineTotal ?? (item.price ?? 0) * (item.quantity ?? 1);
    const amount = isPreorder
      ? (item.depositPaid ?? Math.round(fullLine * depositPercent / 100))
      : fullLine;

    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity ?? 1,
      tag: item.tag ?? (isPreorder ? "Pre-order" : "In-stock"),
      depositPercent,
      amount,
      payment: item.payment,
      status: item.status,
    };
  });

  const subtotal = hasPreorder ? (order.total ?? 0) : (order.fullSubtotal ?? order.total ?? 0);
  const total = order.total ?? subtotal;
  const balanceDue = order.balanceDue ?? 0;
  const refundedAmount = refundedAmountForOrder(order);

  return (
    <OrderSummaryPanel
      compact
      scrollable={scrollable}
      items={summaryItems}
      subtotal={subtotal}
      total={total}
      balanceDue={balanceDue}
      refundedAmount={refundedAmount}
      hasPreorder={hasPreorder}
      panelSx={panelSx}
      subtotalLabel={hasPreorder ? "Deposit paid" : "Subtotal"}
      totalLabel={hasPreorder ? "Paid at checkout" : "Total"}
      adminSectionTitle
      billTo={{
        name: order.customer,
        email: order.email,
        phone: order.phone,
        address,
        notes: order.notes,
      }}
      renderItemExtra={(item) => (
        <OrderSummaryItemMeta parts={[item.payment, item.status]} />
      )}
    />
  );
}
