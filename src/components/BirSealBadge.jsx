import { Box } from "@mui/material";
import { useCms } from "../lib/cmsContent.jsx";

function birImageForPlacement(bank, placement) {
  if (placement === "footer") return (bank?.birSealMarkImage || "").trim();
  if (placement === "payment") return (bank?.birQrImage || "").trim();
  return "";
}

/** Visible only when BIR is enabled and that placement has an uploaded image. */
export function useBirSealVisible(placement) {
  const { content } = useCms();
  const bank = content.bankDetails;
  return Boolean(bank?.showBirSeal === true && birImageForPlacement(bank, placement));
}

/**
 * Official BIR Registered seal.
 * - footer: compact shield mark upload
 * - payment: full badge upload
 * Empty uploads are not shown.
 */
export default function BirSealBadge({
  placement,
  maxWidth,
  sx,
}) {
  const { content } = useCms();
  const bank = content.bankDetails;
  const src = birImageForPlacement(bank, placement);
  const visible = Boolean(bank?.showBirSeal === true && src);

  if (!visible) return null;

  const isFooter = placement === "footer";
  const note = (bank?.birSealNote || "").trim();
  const resolvedMaxWidth = maxWidth ?? (isFooter ? 88 : 420);

  return (
    <Box
      component="a"
      href="https://www.bir.gov.ph"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Bureau of Internal Revenue — Registered"
      title={note || "Bureau of Internal Revenue — Registered"}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: resolvedMaxWidth,
        width: isFooter ? resolvedMaxWidth : "100%",
        lineHeight: 0,
        textDecoration: "none",
        ...sx,
      }}
    >
      <Box
        component="img"
        src={src}
        alt="Bureau of Internal Revenue Registered"
        loading="lazy"
        decoding="async"
        sx={{
          width: "100%",
          height: "auto",
          display: "block",
          objectFit: "contain",
        }}
      />
    </Box>
  );
}
