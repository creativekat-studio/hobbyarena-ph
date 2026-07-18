import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { mapFirebaseUserError } from "../lib/firebase/auth.js";
import { useOrders } from "../lib/ordersStore.jsx";
import { itemNeedsRefundDetails, refundedAmountForLineItem } from "../data/orderWorkflow.js";
import { compressProofFile } from "../lib/imageCompression.js";
import { UPLOAD_PROOF_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";

export default function CustomerRefundDetails({ order, item, surfaceBorderColor }) {
  const theme = useTheme();
  const { user } = useAuth();
  const { submitRefundDetails } = useOrders();
  const inputRef = useRef(null);
  const [method, setMethod] = useState("bank");
  const [qrFile, setQrFile] = useState(null);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!itemNeedsRefundDetails(item)) return null;

  const submitted = Boolean(order.refundDetails?.[item.id]);
  const refundAmount = item.refundAmount ?? refundedAmountForLineItem(item, order.depositPercent ?? 30);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Upload an image or PDF of your QR code.");
      return;
    }
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    try {
      const dataUrl = await compressProofFile(file);
      setQrFile({ name: file.name, dataUrl });
      setError("");
      setSuccess("");
    } catch (err) {
      setError(err.message || "Could not read file. Try a smaller image.");
    }
  }

  async function handleSubmit() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await submitRefundDetails(
        order.id,
        item.id,
        method === "qr"
          ? { method: "qr", qrDataUrl: qrFile?.dataUrl, note }
          : { method: "bank", bankName, accountName, accountNumber, note },
        user?.email,
      );
      setSuccess("Refund details sent. We'll process your refund shortly.");
      setQrFile(null);
    } catch (err) {
      setError(mapFirebaseUserError(err) || "Could not submit refund details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        mb: 1.5,
        p: 1.5,
        borderRadius: 1,
        border: "1px solid",
        borderColor: alpha(theme.palette.info.main, 0.35),
        bgcolor: alpha(theme.palette.info.main, 0.06),
      }}
    >
      <Stack spacing={1.5}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "0.82rem" }}>
            Where should we send your refund?
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.35, lineHeight: 1.45 }}>
            {refundAmount > 0 ? (
              <>A refund of <strong>{PESO.format(refundAmount)}</strong> is being processed. </>
            ) : (
              <>Your refund is being processed. </>
            )}
            Share a payment QR code or your bank details so we can send it.
          </Typography>
        </Box>

        {submitted ? (
          <Chip
            label="Refund details submitted — awaiting processing"
            size="small"
            color="success"
            sx={{
              alignSelf: "flex-start",
              maxWidth: "100%",
              height: "auto",
              py: 0.5,
              fontWeight: 700,
              fontSize: "0.68rem",
              "& .MuiChip-label": { whiteSpace: "normal", lineHeight: 1.35 },
            }}
          />
        ) : null}

        <ToggleButtonGroup
          value={method}
          exclusive
          size="small"
          onChange={(_, value) => value && setMethod(value)}
          sx={{ alignSelf: "flex-start" }}
        >
          <ToggleButton value="bank" sx={{ fontFamily: MONO_FONT, fontSize: "0.7rem", px: 1.5 }}>
            Bank details
          </ToggleButton>
          <ToggleButton value="qr" sx={{ fontFamily: MONO_FONT, fontSize: "0.7rem", px: 1.5 }}>
            QR code
          </ToggleButton>
        </ToggleButtonGroup>

        {method === "bank" ? (
          <Stack spacing={1}>
            <TextField
              size="small"
              label="Bank / e-wallet"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. BPI, GCash"
            />
            <TextField
              size="small"
              label="Account name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
            <TextField
              size="small"
              label="Account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </Stack>
        ) : (
          <Stack spacing={0.75}>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={handleFileChange}
            />
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                onClick={() => inputRef.current?.click()}
                sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem" }}
              >
                {qrFile ? "Change QR image" : "Upload QR code"}
              </Button>
              {qrFile ? (
                <Chip
                  label={qrFile.name}
                  size="small"
                  color="success"
                  sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
                />
              ) : null}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, textTransform: "none" }}>
              {UPLOAD_PROOF_DISCLAIMER}
            </Typography>
          </Stack>
        )}

        <TextField
          size="small"
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          multiline
          minRows={1}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Button
          size="small"
          variant="contained"
          disabled={busy || (method === "qr" && !qrFile)}
          onClick={handleSubmit}
          sx={{ alignSelf: "flex-start", fontFamily: MONO_FONT, fontSize: "0.72rem" }}
        >
          {busy ? "Sending…" : submitted ? "Update refund details" : "Submit refund details"}
        </Button>
      </Stack>
    </Box>
  );
}
