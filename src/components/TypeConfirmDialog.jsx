import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";

/**
 * Destructive confirm: user must type a confirmation word before confirming.
 */
export default function TypeConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm",
  description,
  confirmLabel = "Confirm",
  confirmWord = "archive",
  surfaceBorderColor,
}) {
  const [typed, setTyped] = useState("");
  const word = String(confirmWord || "archive").toLowerCase();

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const canConfirm = typed.trim().toLowerCase() === word;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm?.();
    onClose?.();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {description ? (
            <Typography sx={{ color: "text.secondary", fontSize: "0.9rem", lineHeight: 1.5 }}>
              {description}
            </Typography>
          ) : null}
          <Typography sx={{ fontSize: "0.85rem" }}>
            Type <strong>{word}</strong> to confirm.
          </Typography>
          <TextField
            autoFocus
            size="small"
            fullWidth
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={word}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleConfirm();
              }
            }}
            inputProps={{ "aria-label": `Type ${word} to confirm` }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={!canConfirm}
          onClick={handleConfirm}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", fontSize: "0.75rem" }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
