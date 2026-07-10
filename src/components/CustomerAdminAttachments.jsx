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
import { MONO_FONT } from "../theme.js";
import { adminTrailAttachmentsForLineItem } from "../data/orderWorkflow.js";
import { resolveProofAttachmentUrl } from "../lib/orderProofStorage.js";

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
          <Box component="img" src={url} alt={label || "Attachment"} sx={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor, display: "block", mx: "auto" }} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Shows admin-uploaded trail attachments for a line item in the customer account. */
export default function CustomerAdminAttachments({ order, item, surfaceBorderColor }) {
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

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", mb: 0.75, fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", color: "text.secondary" }}>
        From Hobby Arena
      </Typography>
      <Stack spacing={0.75}>
        {attachments.map((row) => (
          <Stack
            key={row.id}
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{
              p: 1,
              borderRadius: 1,
              border: "1px solid",
              borderColor: surfaceBorderColor,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.3 }}>
                {row.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.title ? `${row.title} · ` : ""}{formatAttachmentTime(row.at)}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setPreview(row)}
              sx={{ flexShrink: 0, fontFamily: MONO_FONT, fontSize: "0.68rem" }}
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
