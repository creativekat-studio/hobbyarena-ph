import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import { TrashIcon } from "../components/icons.jsx";
import ProofImage from "../components/ProofImage.jsx";
import { useCustomers } from "../lib/customersStore.jsx";
import { useFirebaseData } from "../lib/firebase/config.js";
import { uploadCustomerPayoutFile } from "../lib/firebase/repositories/uploads.js";
import { compressProofFile } from "../lib/imageCompression.js";
import { UPLOAD_PROOF_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
import {
  formatPayoutMethodCopy,
  methodFromOrderPayout,
  normalizePayoutMethods,
  orderPayoutMethodId,
  payoutMethodHasBank,
  resolvePrimaryPayoutMethodId,
} from "../lib/customerPayoutMethods.js";

const EMPTY_DRAFT = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  note: "",
  qrUrl: "",
  qrName: "",
  isPdf: false,
};

function CopyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  );
}

function FieldLabel({ children }) {
  return (
    <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", fontWeight: 800, letterSpacing: 1, color: "text.secondary", textTransform: "uppercase" }}>
      {children}
    </Typography>
  );
}

function copyValue(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    if (ok) {
      navigator.clipboard?.writeText?.(value).catch(() => {});
      return true;
    }
  } catch {
    // fall through
  }
  navigator.clipboard?.writeText?.(value).catch(() => {});
  return Boolean(value);
}

function QrThumb({ method, surfaceBorderColor, onOpen }) {
  if (!method?.qrUrl) return null;
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen?.(method)}
      aria-label="View QR code"
      sx={{
        width: 88,
        height: 88,
        p: 0,
        flexShrink: 0,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        overflow: "hidden",
        cursor: "zoom-in",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
      }}
    >
      {method.isPdf ? (
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 800 }}>
          PDF
        </Typography>
      ) : (
        <Box
          component="img"
          src={method.qrUrl}
          alt="Customer QR code"
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      )}
    </Box>
  );
}

export default function CustomerPayoutMethodsEditor({
  email,
  customerName = "",
  customerRecord = null,
  orderPayouts = [],
  surfaceBorderColor,
  ownerUid = "",
  variant = "admin",
}) {
  const firebaseEnabled = useFirebaseData();
  const { customers, getCustomerProfile, saveCustomerPayoutMethods } = useCustomers();
  const qrInputRef = useRef(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [qrPreview, setQrPreview] = useState(null);
  const [adding, setAdding] = useState(false);

  const profile = useMemo(() => {
    const key = String(email || "").trim().toLowerCase();
    if (!key) return customerRecord;
    return getCustomerProfile(key)
      || (customers || []).find((row) => String(row.email || "").trim().toLowerCase() === key)
      || customerRecord;
  }, [customers, customerRecord, email, getCustomerProfile]);

  const methods = useMemo(
    () => normalizePayoutMethods(profile?.payoutMethods),
    [profile],
  );
  const primaryId = resolvePrimaryPayoutMethodId(methods, profile?.primaryPayoutMethodId);
  const savedIds = useMemo(() => new Set(methods.map((method) => method.id)), [methods]);
  const importable = useMemo(
    () => (orderPayouts || []).filter((payout) => !savedIds.has(orderPayoutMethodId(payout))),
    [orderPayouts, savedIds],
  );
  const emailKey = String(email || "").trim();
  const canSave = Boolean(emailKey);

  function patchDraft(patch) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setError("");
  }

  async function persist(nextMethods, nextPrimaryId, successMessage) {
    if (!canSave) {
      setError("A customer email is required to save payout details.");
      return false;
    }
    setBusy(true);
    setError("");
    try {
      await saveCustomerPayoutMethods(emailKey, {
        methods: nextMethods,
        primaryPayoutMethodId: nextPrimaryId,
        name: customerName || profile?.name,
        uid: ownerUid || profile?.uid,
      });
      setNotice(successMessage);
      return true;
    } catch (err) {
      setError(err?.message || "Could not save payout details.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleQrFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Upload an image or PDF of the QR code.");
      return;
    }
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    setUploading(true);
    setError("");
    try {
      let qrUrl;
      if (firebaseEnabled) {
        try {
          qrUrl = await uploadCustomerPayoutFile(file, ownerUid || profile?.uid);
        } catch {
          qrUrl = await compressProofFile(file);
        }
      } else {
        qrUrl = await compressProofFile(file);
      }
      patchDraft({
        qrUrl,
        qrName: file.name,
        isPdf: file.type === "application/pdf" || /\.pdf$/i.test(file.name),
      });
    } catch (err) {
      setError(err?.message || "Could not upload the QR code.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAdd() {
    if (!draft.bankName.trim() && !draft.accountName.trim() && !draft.accountNumber.trim() && !draft.qrUrl) {
      setError("Add bank details or a QR code first.");
      return;
    }
    const method = {
      id: `payout_${Date.now()}`,
      bankName: draft.bankName,
      accountName: draft.accountName,
      accountNumber: draft.accountNumber,
      note: draft.note,
      qrUrl: draft.qrUrl,
      qrName: draft.qrName,
      isPdf: draft.isPdf,
      source: variant === "storefront" ? "account" : "admin",
    };
    const next = [...methods, method];
    const nextPrimary = !primaryId || methods.length === 0 ? method.id : primaryId;
    const ok = await persist(next, nextPrimary, "Payout method saved.");
    if (ok) {
      setDraft({ ...EMPTY_DRAFT });
      setAdding(false);
    }
  }

  function handleCancelAdd() {
    setDraft({ ...EMPTY_DRAFT });
    setAdding(false);
    setError("");
  }

  async function handleImport(payout) {
    const method = methodFromOrderPayout(payout);
    const next = [...methods, method];
    await persist(next, primaryId || method.id, "Order payout added to this account.");
  }

  async function handlePrimary(methodId) {
    await persist(methods, methodId, "Primary payout method updated.");
  }

  async function handleDelete(methodId) {
    const next = methods.filter((method) => method.id !== methodId);
    await persist(next, primaryId === methodId ? next[0]?.id || "" : primaryId, "Payout method removed.");
  }

  return (
    <>
      <Stack spacing={2}>
        {!canSave ? (
          <Alert severity="info" sx={{ fontSize: "0.82rem" }}>
            {variant === "storefront"
              ? "Sign in with an email to save bank or QR details."
              : "Add a customer email before saving bank or QR details to this account."}
          </Alert>
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ fontSize: "0.82rem" }} onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}

        {!adding ? (
          <Button
            variant="outlined"
            disabled={!canSave}
            onClick={() => setAdding(true)}
            sx={{
              alignSelf: "flex-start",
              fontFamily: MONO_FONT,
              fontSize: "0.68rem",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            Add {variant === "storefront" ? "bank details" : "payout method"}
          </Button>
        ) : null}

        {methods.length ? (
          <Stack spacing={1.25}>
            {methods.map((method) => {
              const isPrimary = method.id === primaryId;
              return (
                <Box
                  key={method.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: isPrimary ? "primary.main" : surfaceBorderColor,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    alignItems={{ xs: "flex-start", sm: "flex-start" }}
                    justifyContent="space-between"
                  >
                    <Stack direction="row" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                      <QrThumb method={method} surfaceBorderColor={surfaceBorderColor} onOpen={setQrPreview} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
                          {isPrimary ? (
                            <Chip
                              size="small"
                              color="primary"
                              label="Primary"
                              sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.62rem", letterSpacing: 0.5 }}
                            />
                          ) : null}
                          {method.source === "order" ? (
                            <Chip
                              size="small"
                              variant="outlined"
                              label="From order"
                              sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.62rem", letterSpacing: 0.5 }}
                            />
                          ) : null}
                        </Stack>
                        {payoutMethodHasBank(method) ? (
                          <Stack spacing={0.35}>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>
                              {method.bankName || "Bank / e-wallet"}
                            </Typography>
                            {method.accountName ? (
                              <Typography sx={{ fontSize: "0.82rem" }}>{method.accountName}</Typography>
                            ) : null}
                            {method.accountNumber ? (
                              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.82rem" }}>
                                {method.accountNumber}
                              </Typography>
                            ) : null}
                          </Stack>
                        ) : (
                          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>QR code</Typography>
                        )}
                        {method.note ? (
                          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mt: 0.5 }}>
                            {method.note}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={busy || !canSave || isPrimary || methods.length <= 1}
                        onClick={() => handlePrimary(method.id)}
                        sx={{ fontFamily: MONO_FONT, fontSize: "0.66rem", letterSpacing: 0.4 }}
                      >
                        Set as Primary
                      </Button>
                      <Tooltip title="Copy details">
                        <IconButton
                          size="small"
                          aria-label="Copy payout details"
                          onClick={() => {
                            if (copyValue(formatPayoutMethodCopy(method, { name: customerName || profile?.name, email: emailKey }))) {
                              setNotice("Payout details copied");
                            }
                          }}
                        >
                          <CopyIcon style={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label="Remove payout method"
                          disabled={busy || !canSave}
                          onClick={() => handleDelete(method.id)}
                        >
                          <TrashIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : null}

        {importable.length ? (
          <Box>
            <FieldLabel>{variant === "storefront" ? "Submitted on an order" : "Submitted on orders"}</FieldLabel>
            <Stack spacing={1} sx={{ mt: 0.75 }}>
              {importable.map((payout) => (
                <Box
                  key={payout.key}
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    border: "1px dashed",
                    borderColor: surfaceBorderColor,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                        {payout.orderId}
                        {payout.lineLabel ? ` · ${payout.lineLabel}` : ""}
                      </Typography>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.86rem", mt: 0.25 }}>
                        {payout.bankName || (payout.qrUrl ? "QR code" : "Payout details")}
                        {payout.accountNumber ? ` · ${payout.accountNumber}` : ""}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={busy || !canSave}
                      onClick={() => handleImport(payout)}
                      sx={{ fontFamily: MONO_FONT, fontSize: "0.66rem", letterSpacing: 0.4, flexShrink: 0 }}
                    >
                      Add to account
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : null}

        {adding ? (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            border: "1px solid",
            borderColor: surfaceBorderColor,
          }}
        >
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                size="small"
                fullWidth
                label="Bank / e-wallet"
                value={draft.bankName}
                onChange={(event) => patchDraft({ bankName: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                size="small"
                fullWidth
                label="Account name"
                value={draft.accountName}
                onChange={(event) => patchDraft({ accountName: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                size="small"
                fullWidth
                label="Account number"
                value={draft.accountNumber}
                onChange={(event) => patchDraft({ accountNumber: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                size="small"
                fullWidth
                label="Note"
                value={draft.note}
                onChange={(event) => patchDraft({ note: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*,application/pdf"
                hidden
                onChange={handleQrFile}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "flex-start", sm: "center" }}>
                <QrThumb method={draft} surfaceBorderColor={surfaceBorderColor} onOpen={setQrPreview} />
                <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={uploading || busy}
                      onClick={() => qrInputRef.current?.click()}
                      sx={{ fontFamily: MONO_FONT, fontSize: "0.66rem", letterSpacing: 0.4 }}
                    >
                      {uploading ? "Uploading…" : draft.qrUrl ? "Replace QR" : "Upload QR"}
                    </Button>
                    {draft.qrUrl ? (
                      <Button
                        size="small"
                        color="inherit"
                        disabled={uploading || busy}
                        onClick={() => patchDraft({ qrUrl: "", qrName: "", isPdf: false })}
                        sx={{ fontFamily: MONO_FONT, fontSize: "0.66rem", letterSpacing: 0.4 }}
                      >
                        Remove QR
                      </Button>
                    ) : null}
                  </Stack>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                    {draft.qrName || UPLOAD_PROOF_DISCLAIMER}
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="flex-end"
            sx={{ mt: 1.5 }}
          >
            <Button
              size="small"
              color="inherit"
              disabled={busy || uploading}
              onClick={handleCancelAdd}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={busy || uploading || !canSave}
              onClick={handleAdd}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4 }}
            >
              {busy ? "Saving…" : "Save method"}
            </Button>
          </Stack>
        </Box>
        ) : null}
      </Stack>

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2200}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          setNotice("");
        }}
        message={notice}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <Dialog
        fullWidth
        maxWidth="md"
        open={Boolean(qrPreview?.qrUrl)}
        onClose={() => setQrPreview(null)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          Customer QR code
          <Button color="inherit" onClick={() => setQrPreview(null)} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4 }}>
            Close
          </Button>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", p: { xs: 1.5, md: 3 } }}>
          {qrPreview?.isPdf ? (
            <Box
              component="iframe"
              title="Customer QR code"
              src={qrPreview.qrUrl}
              sx={{ width: "100%", minHeight: "70vh", border: 0, bgcolor: "background.paper" }}
            />
          ) : qrPreview?.qrUrl ? (
            <ProofImage src={qrPreview.qrUrl} alt="Customer QR code" surfaceBorderColor={surfaceBorderColor} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
