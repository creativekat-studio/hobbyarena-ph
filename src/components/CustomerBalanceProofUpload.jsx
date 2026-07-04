import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { itemNeedsBalanceProof } from "../data/orderWorkflow.js";
import { resolveProofAttachmentUrl } from "../lib/orderProofStorage.js";
import { BANK_ACCOUNTS } from "../data/checkoutSettings.js";

function formatProofTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function ProofPreviewModal({ open, attachment, onClose, surfaceBorderColor }) {
  if (!attachment?.url) return null;
  const { url, label, type } = attachment;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, pr: 1 }}>
        <Typography component="span" sx={{ fontWeight: 800, fontSize: "1rem" }}>
          {label || "Proof of payment"}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close preview">✕</IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        {type === "pdf" ? (
          <Stack spacing={1.5}>
            <Button component="a" href={url} download="proof-of-payment.pdf" variant="outlined" size="small" sx={{ alignSelf: "flex-start" }}>
              Download PDF
            </Button>
            <Box component="iframe" src={url} title={label || "Proof"} sx={{ width: "100%", minHeight: { xs: 360, sm: 480 }, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }} />
          </Stack>
        ) : (
          <Box component="img" src={url} alt={label || "Proof"} sx={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor, display: "block", mx: "auto" }} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerBalanceProofUpload({ order, item, surfaceBorderColor }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { submitBalanceProof } = useOrders();
  const inputRef = useRef(null);
  const [proofFile, setProofFile] = useState(null);
  const [showBanks, setShowBanks] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(null);
  const banks = useMemo(() => BANK_ACCOUNTS.filter((bank) => bank.active !== false), []);
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id ?? "");
  const selectedBank = banks.find((bank) => bank.id === selectedBankId) ?? banks[0];

  const uploadedProofs = useMemo(
    () => (order.trail ?? [])
      .filter((entry) => entry.lineItemId === item.id && entry.attachment?.kind === "balance")
      .map((entry) => ({
        id: entry.id,
        at: entry.at,
        label: entry.attachment.label || "Balance payment proof",
        attachment: entry.attachment,
      }))
      .sort((a, b) => new Date(a.at) - new Date(b.at)),
    [order.trail, item.id],
  );

  const needsProof = itemNeedsBalanceProof(item);
  if (!needsProof && uploadedProofs.length === 0) return null;

  const balanceDue = item.balanceDue ?? 0;

  function uploadButtonLabel() {
    if (proofFile) return "Change file";
    return uploadedProofs.length ? "Upload another proof" : "Upload receipt";
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Upload an image or PDF receipt.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProofFile({ name: file.name, dataUrl: reader.result });
      setError("");
      setSuccess("");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!proofFile?.dataUrl) {
      setError("Please upload your payment receipt.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await submitBalanceProof(order.id, item.id, proofFile.dataUrl, user?.email);
      setSuccess("Proof submitted. We'll verify your balance payment shortly.");
      setProofFile(null);
    } catch (err) {
      setError(err.message || "Could not submit proof.");
    } finally {
      setBusy(false);
    }
  }

  function handleViewProof(entry) {
    const url = resolveProofAttachmentUrl(order, entry);
    if (!url) return;
    setPreview({
      url,
      label: entry.label,
      type: url.startsWith("data:application/pdf") ? "pdf" : "image",
    });
  }

  return (
    <Box
      sx={{
        mb: 1.5,
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: alpha(theme.palette.warning.main, 0.35),
        bgcolor: alpha(theme.palette.warning.main, 0.06),
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: "0.82rem" }}>
        Pay remaining balance
      </Typography>
      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.35, lineHeight: 1.45 }}>
        Transfer <strong>{PESO.format(balanceDue)}</strong> to one of our accounts, then upload your receipt below.
      </Typography>

      <Button
        size="small"
        variant="text"
        onClick={() => setShowBanks((value) => !value)}
        sx={{ mt: 0.75, px: 0, minWidth: 0, fontWeight: 700, fontSize: "0.75rem" }}
      >
        {showBanks ? "Hide payment accounts" : "View payment accounts"}
      </Button>

      <Collapse in={showBanks}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1, mb: 1 }}>
          {banks.map((bank) => (
            <Chip
              key={bank.id}
              label={bank.label}
              size="small"
              onClick={() => setSelectedBankId(bank.id)}
              color={selectedBank?.id === bank.id ? "primary" : "default"}
              variant={selectedBank?.id === bank.id ? "filled" : "outlined"}
              sx={{ fontWeight: 700 }}
            />
          ))}
        </Stack>
        {selectedBank ? (
          <Box sx={{ p: 1.25, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor, bgcolor: "background.paper" }}>
            <Typography sx={{ fontWeight: 800, fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.8, color: "primary.main" }}>
              {selectedBank.label.toUpperCase()}
            </Typography>
            <Typography sx={{ fontWeight: 700, mt: 0.5, fontSize: "0.85rem" }}>{selectedBank.accountName}</Typography>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.95rem", fontWeight: 800, mt: 0.25 }}>
              {selectedBank.accountNumber}
            </Typography>
            {selectedBank.note ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                {selectedBank.note}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Collapse>

      {uploadedProofs.length ? (
        <Box sx={{ mt: 1.25 }}>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "text.secondary", mb: 0.75 }}>
            Uploaded proofs ({uploadedProofs.length})
          </Typography>
          <Stack spacing={0.75}>
            {uploadedProofs.map((entry, index) => (
              <Stack
                key={entry.id}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  p: 0.75,
                  pl: 1,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: surfaceBorderColor,
                  bgcolor: "background.paper",
                }}
              >
                <Chip label={`#${index + 1}`} size="small" color="success" sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.label}
                  </Typography>
                  <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", fontFamily: MONO_FONT }}>
                    {formatProofTime(entry.at)}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => handleViewProof(entry)}
                  sx={{ minWidth: 0, fontFamily: MONO_FONT, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}
                >
                  View
                </Button>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : null}

      {error ? <Alert severity="error" sx={{ mt: 1.25 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mt: 1.25 }}>{success}</Alert> : null}

      {needsProof ? (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mt: 1.25 }}>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={handleFileChange} />
          <Button
            size="small"
            variant="outlined"
            onClick={() => inputRef.current?.click()}
            sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem" }}
          >
            {uploadButtonLabel()}
          </Button>
          {proofFile ? (
            <>
              <Chip label={proofFile.name} size="small" color="success" sx={{ maxWidth: "100%" }} />
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                onClick={handleSubmit}
                sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem" }}
              >
                {busy ? "Submitting…" : "Submit proof"}
              </Button>
            </>
          ) : null}
        </Stack>
      ) : null}

      <ProofPreviewModal
        open={Boolean(preview)}
        attachment={preview}
        onClose={() => setPreview(null)}
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}
