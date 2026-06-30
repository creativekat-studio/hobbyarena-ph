import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import ProductTermsSection from "./ProductTermsSection.jsx";
import { MONO_FONT } from "../theme.js";

export default function PreorderTermsDialog({
  open,
  onClose,
  onConfirm,
  productName,
  panelSx,
  surfaceBorderColor,
}) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (open) setAccepted(false);
  }, [open, productName]);

  function handleConfirm() {
    if (!accepted) return;
    onConfirm();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      aria-labelledby="preorder-terms-title"
    >
      <DialogTitle id="preorder-terms-title" sx={{ fontWeight: 800, pb: 1 }}>
        Pre-order terms
        {productName ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500, lineHeight: 1.45 }}>
            {productName}
          </Typography>
        ) : null}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <ProductTermsSection
          isPreorder
          compact
          showHeading={false}
          panelSx={{
            ...(panelSx ?? {}),
            border: "none",
            boxShadow: "none",
            backdropFilter: "none",
            mt: 0,
            minHeight: "auto",
          }}
          surfaceBorderColor={surfaceBorderColor}
          showAcceptance
          accepted={accepted}
          onAcceptChange={setAccepted}
        />
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 2, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!accepted}
          onClick={handleConfirm}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
        >
          Accept & pre-order
        </Button>
      </DialogActions>
    </Dialog>
  );
}
