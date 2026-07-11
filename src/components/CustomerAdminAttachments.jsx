import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { adminTrailAttachmentsForLineItem } from "../data/orderWorkflow.js";
import { resolveProofAttachmentUrl } from "../lib/orderProofStorage.js";
import { EyeIcon } from "./icons.jsx";
import ProofImage from "./ProofImage.jsx";

function FileGlyph({ type, sx }) {
  return (
    <Box component="svg" viewBox="0 0 24 24" fill="none" sx={sx} aria-hidden>
      <path
        d="M6 2.75h7.5L19.25 8.5V20a1.25 1.25 0 0 1-1.25 1.25H6A1.25 1.25 0 0 1 4.75 20V4A1.25 1.25 0 0 1 6 2.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M13 3v5.5h5.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {type === "pdf" ? null : (
        <path d="M8 13.5h8M8 16.5h5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </Box>
  );
}

function formatAttachmentTime(iso) {
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

function AttachmentPreviewModal({ open, attachment, onClose, surfaceBorderColor }) {
  if (!attachment?.url) return null;
  const { url, label, type } = attachment;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, pr: 1 }}>
        <Typography component="span" sx={{ fontWeight: 800, fontSize: "1rem" }}>
          {label || "Attachment"}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close preview">✕</IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, sm: 2.5 } }}>
        {type === "pdf" ? (
          <Stack spacing={1.5}>
            <Button component="a" href={url} target="_blank" rel="noopener noreferrer" variant="outlined" size="small" sx={{ alignSelf: "flex-start" }}>
              Open PDF
            </Button>
            <Box component="iframe" src={url} title={label || "Attachment"} sx={{ width: "100%", minHeight: { xs: 360, sm: 480 }, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }} />
          </Stack>
        ) : (
          <ProofImage src={url} alt={label || "Attachment"} surfaceBorderColor={surfaceBorderColor} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Shows admin-uploaded trail attachments for a line item in the customer account. */
export default function CustomerAdminAttachments({ order, item, surfaceBorderColor }) {
  const theme = useTheme();
  const [preview, setPreview] = useState(null);

  const attachments = useMemo(
    () => adminTrailAttachmentsForLineItem(order, item.id).map((entry) => {
      const url = resolveProofAttachmentUrl(order, entry);
      return {
        id: entry.id,
        at: entry.at,
        title: entry.title,
        label: entry.attachment?.label || "Attachment",
        type: entry.attachment?.type || "image",
        url,
      };
    }).filter((row) => Boolean(row.url)),
    [order, item.id],
  );

  if (!attachments.length) return null;

  const accent = theme.palette.primary.main;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", mb: 1.25, color: "text.primary" }}>
        Shared files
      </Typography>
      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 1.5, lineHeight: 1.45, textTransform: "none" }}>
        Documents Hobby Arena sent with this order — tap View to open.
      </Typography>

      <Stack spacing={1.25}>
        {attachments.map((row) => (
          <Stack
            key={row.id}
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{
              p: 1.5,
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: surfaceBorderColor,
              bgcolor: alpha(theme.palette.text.primary, 0.02),
              transition: "border-color 160ms ease, background-color 160ms ease",
              "&:hover": { borderColor: alpha(accent, 0.4), bgcolor: alpha(accent, 0.05) },
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.25,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: accent,
                bgcolor: alpha(accent, 0.12),
                overflow: "hidden",
              }}
            >
              {row.type === "image" && row.url ? (
                <Box
                  component="img"
                  src={row.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <FileGlyph type={row.type} sx={{ width: 22, height: 22 }} />
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", lineHeight: 1.35 }}>
                {row.label || "Attachment"}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, textTransform: "none" }}>
                {formatAttachmentTime(row.at)}
                {row.title ? ` · ${row.title}` : ""}
              </Typography>
            </Box>

            <Button
              size="small"
              variant="outlined"
              onClick={() => setPreview(row)}
              startIcon={<EyeIcon sx={{ fontSize: 16 }} />}
              sx={{ flexShrink: 0, fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 700, letterSpacing: 0.4, textTransform: "none" }}
            >
              View
            </Button>
          </Stack>
        ))}
      </Stack>

      <AttachmentPreviewModal
        open={Boolean(preview)}
        attachment={preview}
        onClose={() => setPreview(null)}
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}
