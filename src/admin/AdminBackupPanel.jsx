import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Stack,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import {
  downloadBackupJson,
  fetchPlatformBackupStatus,
  runAdminBackup,
} from "../lib/adminBackupApi.js";

/**
 * Admin manual backup: Auth users + customers + orders.
 * Asks local download and/or Storage upload before running.
 */
export default function AdminBackupPanel({ panelSx, surfaceBorderColor }) {
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloadLocal, setDownloadLocal] = useState(true);
  const [uploadStorage, setUploadStorage] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPlatformBackupStatus();
        if (!cancelled) {
          setStatus(data.platformBackupStatus || null);
          setStatusError("");
        }
      } catch (err) {
        if (!cancelled) {
          setStatusError(err?.message || "Could not load backup status.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const firestore = status?.firestore;
  const storage = status?.storage;
  const auth = status?.auth;

  function openConfirm() {
    setError("");
    setResult(null);
    setDownloadLocal(true);
    setUploadStorage(true);
    setConfirmOpen(true);
  }

  async function confirmBackup() {
    if (!downloadLocal && !uploadStorage) {
      setError("Choose at least one destination.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await runAdminBackup({ downloadLocal, uploadStorage });
      if (downloadLocal && data.payload) {
        downloadBackupJson(data.payload, data.stamp);
      }
      setResult({
        counts: data.counts,
        stamp: data.stamp,
        storage: data.storage,
        downloaded: Boolean(downloadLocal && data.payload),
        uploaded: Boolean(data.storage),
        omittedStorageFiles: Boolean(data.omittedStorageFiles),
      });
      setConfirmOpen(false);
    } catch (err) {
      setError(err?.message || "Backup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        ...panelSx,
        p: { xs: 2, md: 2.5 },
        border: "1px solid",
        borderColor: surfaceBorderColor,
      }}
    >
      <Stack spacing={1.75}>
        <Box>
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontWeight: 800,
              fontSize: "0.72rem",
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "primary.main",
            }}
          >
            Data backup
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", mt: 0.35 }}>
            Manual export
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mt: 0.5, lineHeight: 1.5 }}>
            Export Auth users, customers, orders, inventory, products, and Storage images (as bytes).
            Choose a local download and/or upload to Storage.
          </Typography>
        </Box>

        <Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
          <Stack spacing={0.75}>
            <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.45 }}>
              {firestore?.summary
                || `Firestore orders/inventory are already covered by Firebase scheduled ${firestore?.frequency || "daily"} backups (${firestore?.retentionDays ?? 98}-day retention).`}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.45 }}>
              {storage?.summary
                || "Storage soft-delete is separate. This export can embed image bytes (base64) for restore; very large libraries may omit images from the local download — use Storage upload for the full copy."}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.45, fontWeight: 700 }}>
              {auth?.summary
                || "Firebase Auth has no scheduled backup plan — Auth export here is manual."}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", lineHeight: 1.45 }}>
              Restore tip: image entries keep download tokens when possible so existing product/proof URLs keep working after writing bytes back to the same Storage path.
            </Typography>
          </Stack>
        </Alert>

        {statusError ? (
          <Alert severity="warning">{statusError}</Alert>
        ) : null}

        {error ? (
          <Alert severity="error" onClose={() => setError("")}>{error}</Alert>
        ) : null}

        {result ? (
          <Alert severity="success" onClose={() => setResult(null)}>
            Backup ready
            {result.counts
              ? ` — ${result.counts.authUsers} Auth, ${result.counts.customers} customers, ${result.counts.orders} orders, ${result.counts.inventory} inventory, ${result.counts.products} products, ${result.counts.storageFiles} images`
              : ""}
            .
            {result.downloaded ? " Downloaded to this device." : ""}
            {result.uploaded && result.storage?.gsUri
              ? ` Uploaded to ${result.storage.gsUri}.`
              : result.uploaded
                ? " Uploaded to Storage."
                : ""}
            {result.omittedStorageFiles
              ? " Local download omitted image bytes (too large for API) — use the Storage copy for full image restore."
              : ""}
            {result.counts?.storageSkipped
              ? ` ${result.counts.storageSkipped} Storage file(s) skipped (size/error).`
              : ""}
          </Alert>
        ) : null}

        <Box>
          <Button
            variant="contained"
            color="primary"
            disabled={busy}
            onClick={openConfirm}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", fontSize: "0.72rem" }}
          >
            {busy ? "Backing up…" : "Create backup"}
          </Button>
        </Box>
      </Stack>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Where should this backup go?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "text.secondary", fontSize: "0.88rem", lineHeight: 1.5, mb: 1.5 }}>
            Includes Auth users (manual), customers, orders, inventory, products, and Storage images as bytes (base64).
            Prefer Storage upload when you have many images. Treat the file as secret.
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={downloadLocal}
                  onChange={(event) => setDownloadLocal(event.target.checked)}
                  disabled={busy}
                />
              )}
              label="Download to this device (local)"
            />
            <FormControlLabel
              control={(
                <Checkbox
                  checked={uploadStorage}
                  onChange={(event) => setUploadStorage(event.target.checked)}
                  disabled={busy}
                />
              )}
              label="Upload to Storage (admin-backups/…)"
            />
          </FormGroup>
          {!downloadLocal && !uploadStorage ? (
            <Typography sx={{ color: "error.main", fontSize: "0.82rem", mt: 1 }}>
              Choose at least one destination.
            </Typography>
          ) : null}
          {error && confirmOpen ? (
            <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" disabled={busy} onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={busy || (!downloadLocal && !uploadStorage)}
            onClick={confirmBackup}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase" }}
          >
            {busy ? "Working…" : "Run backup"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
