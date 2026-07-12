import { useEffect, useMemo, useRef, useState } from "react";
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
import { itemNeedsBalanceProof, itemOutstandingBalance } from "../data/orderWorkflow.js";
import { resolveProofAttachmentUrl } from "../lib/orderProofStorage.js";
import { compressProofFile } from "../lib/imageCompression.js";
import { UPLOAD_PROOF_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
import { useCms } from "../lib/cmsContent.jsx";
import ProofImage from "./ProofImage.jsx";
import QrCodeTile from "./QrCodeTile.jsx";

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
          <ProofImage src={url} alt={label || "Proof"} surfaceBorderColor={surfaceBorderColor} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CustomerBalanceProofUpload({ order, item, surfaceBorderColor }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { content } = useCms();
  const { submitBalanceProof } = useOrders();
  const inputRef = useRef(null);
  const [proofFile, setProofFile] = useState(null);
  const [showBanks, setShowBanks] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(null);
  const banks = useMemo(
    () => (content.bankDetails?.accounts ?? []).filter((bank) => bank.active !== false),
    [content.bankDetails?.accounts],
  );
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id ?? "");
  const selectedBank = banks.find((bank) => bank.id === selectedBankId) ?? banks[0];

  useEffect(() => {
    if (banks.length && !banks.some((bank) => bank.id === selectedBankId)) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  useEffect(() => {
    if (!showBanks) return;
    banks.forEach((bank) => {
      [bank.logo, bank.qrImage].forEach((src) => {
        if (!src) return;
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      });
    });
  }, [banks, showBanks]);

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

  const balanceDue = itemOutstandingBalance(item);

  function uploadButtonLabel() {
    if (proofFile) return "Change file";
    return uploadedProofs.length ? "Upload another proof" : "Upload receipt";
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Upload an image or PDF receipt.");
      return;
    }
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    try {
      const dataUrl = await compressProofFile(file);
      setProofFile({ name: file.name, dataUrl });
      setError("");
      setSuccess("");
    } catch (err) {
      setError(err.message || "Could not read file. Try a smaller image or PDF.");
    }
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
        borderColor: needsProof ? alpha(theme.palette.warning.main, 0.5) : surfaceBorderColor,
        bgcolor: needsProof ? alpha(theme.palette.warning.main, 0.08) : "transparent",
      }}
    >
      {needsProof ? (
        <>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }} />
            <Typography sx={{ fontWeight: 800, fontSize: "0.82rem" }}>
              Balance due — pay {PESO.format(balanceDue)}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.35, lineHeight: 1.45 }}>
            Transfer <strong>{PESO.format(balanceDue)}</strong> to one of our accounts, then upload your receipt below to complete your pre-order.
          </Typography>

          <Button
            size="small"
            variant="text"
            onClick={() => setShowBanks((value) => !value)}
            sx={{ mt: 0.75, px: 0, minWidth: 0, fontWeight: 700, fontSize: "0.75rem" }}
          >
            {showBanks ? "Hide payment accounts" : "View payment accounts"}
          </Button>
        </>
      ) : (
        <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", letterSpacing: 0.3, color: "text.secondary" }}>
          Balance payment
        </Typography>
      )}

      <Collapse in={showBanks && needsProof}>
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
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              borderRadius: 1,
              border: "1px solid",
              borderColor: surfaceBorderColor,
              bgcolor: "background.paper",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "stretch", sm: "center" },
              gap: { xs: 1.5, sm: 2.5 },
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                {selectedBank.logo ? (
                  <Box
                    component="img"
                    src={selectedBank.logo}
                    alt={selectedBank.label}
                    decoding="async"
                    sx={{
                      height: selectedBank.id === "chinabank" ? 44 : 28,
                      width: "auto",
                      maxWidth: selectedBank.id === "chinabank" ? 180 : 120,
                      objectFit: "contain",
                      objectPosition: "left center",
                      display: "block",
                    }}
                  />
                ) : (
                  <Typography sx={{ fontWeight: 800, fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.8, color: "primary.main" }}>
                    {selectedBank.label.toUpperCase()}
                  </Typography>
                )}
              </Stack>
              <Typography sx={{ fontWeight: 700, mt: 0.75, fontSize: "0.9rem" }}>{selectedBank.accountName}</Typography>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "1.05rem", fontWeight: 800, mt: 0.35, letterSpacing: 0.3 }}>
                {selectedBank.accountNumber}
              </Typography>
              {selectedBank.note ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, lineHeight: 1.45, textTransform: "none" }}>
                  {selectedBank.note}
                </Typography>
              ) : null}
            </Box>
            <Box sx={{ flexShrink: 0, alignSelf: { xs: "center", sm: "center" } }}>
              <QrCodeTile
                label={selectedBank.label}
                imageUrl={selectedBank.qrImage}
                surfaceBorderColor={surfaceBorderColor}
                size="compact"
              />
            </Box>
          </Box>
        ) : null}
      </Collapse>

      {uploadedProofs.length ? (
        <Box sx={{ mt: 1.25 }}>
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: 0.5, textTransform: "none", color: "text.secondary", mb: 0.75 }}>
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
        <Stack spacing={1} sx={{ mt: 1.25 }}>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={handleFileChange} />
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => inputRef.current?.click()}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}
            >
              {uploadButtonLabel()}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, textTransform: "none", flexShrink: 0 }}>
              {UPLOAD_PROOF_DISCLAIMER}
            </Typography>
          </Stack>
          {proofFile ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, maxWidth: "100%" }}>
              <Chip
                label={proofFile.name}
                size="small"
                color="success"
                title={proofFile.name}
                sx={{
                  minWidth: 0,
                  maxWidth: "100%",
                  flex: "1 1 auto",
                  "& .MuiChip-label": {
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
              <Button
                size="small"
                variant="contained"
                disabled={busy}
                onClick={handleSubmit}
                sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", flexShrink: 0 }}
              >
                {busy ? "Submitting…" : "Submit proof"}
              </Button>
            </Stack>
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
