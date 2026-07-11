import { useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";

const QR_TILE_SIZE = 180;
const QR_TILE_SIZE_COMPACT = 140;

function ZoomInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      <path d="M12 10h-2v1.5H9V10H7.5V8.5H9V7h1.5v1.5H12z" />
    </svg>
  );
}

/** Bank/e-wallet QR tile with optional zoom dialog. */
export default function QrCodeTile({ label, imageUrl, surfaceBorderColor, size = "default" }) {
  const theme = useTheme();
  const [zoomOpen, setZoomOpen] = useState(false);
  const tileSize = size === "compact" ? QR_TILE_SIZE_COMPACT : QR_TILE_SIZE;

  const tileSx = {
    width: tileSize,
    height: tileSize,
    maxWidth: "100%",
    mx: "auto",
    position: "relative",
    borderRadius: 1,
    border: "1px solid",
    borderColor: surfaceBorderColor,
    bgcolor: "#fff",
    overflow: "hidden",
  };

  if (!imageUrl) {
    return (
      <Box
        sx={{
          ...tileSx,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          fontFamily: MONO_FONT,
          fontSize: "0.72rem",
          color: "text.secondary",
          textAlign: "center",
          px: 1,
        }}
      >
        QR code coming soon
      </Box>
    );
  }

  return (
    <>
      <Box sx={tileSx}>
        <Box
          component="img"
          src={imageUrl}
          alt={`${label} QR code`}
          decoding="async"
          sx={{ width: "100%", height: "100%", objectFit: "contain", p: 0.75, display: "block" }}
        />
        <IconButton
          size="small"
          onClick={() => setZoomOpen(true)}
          aria-label={`Zoom ${label} QR code`}
          sx={{
            position: "absolute",
            right: 6,
            bottom: 6,
            bgcolor: alpha(theme.palette.background.paper, 0.94),
            border: "1px solid",
            borderColor: surfaceBorderColor,
            boxShadow: "none",
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <ZoomInIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Dialog open={zoomOpen} onClose={() => setZoomOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{label} QR code</DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center", pb: 3 }}>
          <Box
            component="img"
            src={imageUrl}
            alt={`${label} QR code`}
            sx={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 1 }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
