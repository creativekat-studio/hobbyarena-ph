import { assertUploadFileSize } from "./uploadLimits.js";

/** Resize and compress images before Firebase Storage upload (browser only). */

const PROOF_DEFAULTS = {
  maxWidth: 1400,
  maxHeight: 1400,
  quality: 0.7,
  minBytesToCompress: 0,
  /** Stay under Firebase Storage 5MB rule with headroom. */
  maxBytes: 4_000_000,
};

const PRODUCT_DEFAULTS = {
  // Storefront renders these into ~300-450px cards; 900px keeps the product
  // detail view crisp while cutting payloads ~5-10x vs the old 1920px assets.
  maxWidth: 900,
  maxHeight: 900,
  quality: 0.8,
  minBytesToCompress: 0,
  maxBytes: 4_000_000,
};

const PDF_MAX_BYTES = 4_000_000;

function estimateDataUrlBytes(dataUrl) {
  const encoded = String(dataUrl).split(",")[1] || "";
  const isBase64 = dataUrl.includes("base64");
  return isBase64 ? Math.round((encoded.length * 3) / 4) : encoded.length;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image."));
    img.src = dataUrl;
  });
}

function drawCompressedDataUrl(img, options, quality = options.quality) {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const scale = Math.min(1, options.maxWidth / width, options.maxHeight / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fill white so JPEG doesn't turn transparent PNG areas black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

async function compressDataUrl(dataUrl, options) {
  if (typeof window === "undefined" || !dataUrl?.startsWith("data:image/")) return dataUrl;
  if (dataUrl.startsWith("data:image/gif") || dataUrl.startsWith("data:image/svg")) return dataUrl;
  if (estimateDataUrlBytes(dataUrl) < options.minBytesToCompress) return dataUrl;

  try {
    const img = await loadImage(dataUrl);
    let quality = options.quality;
    let compressed = drawCompressedDataUrl(img, options, quality);
    if (!compressed) return dataUrl;

    // Iteratively lower quality if still over the size budget.
    while (
      options.maxBytes
      && estimateDataUrlBytes(compressed) > options.maxBytes
      && quality > 0.45
    ) {
      quality = Math.max(0.45, quality - 0.1);
      compressed = drawCompressedDataUrl(img, options, quality);
      if (!compressed) break;
    }

    if (!compressed) return dataUrl;
    return estimateDataUrlBytes(compressed) < estimateDataUrlBytes(dataUrl) ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
}

export async function compressProofDataUrl(dataUrl) {
  return compressDataUrl(dataUrl, PROOF_DEFAULTS);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function assertUnderMaxBytes(dataUrl, maxBytes, label = "File") {
  if (!maxBytes || !dataUrl?.startsWith("data:")) return dataUrl;
  if (estimateDataUrlBytes(dataUrl) > maxBytes) {
    throw new Error(`${label} is still too large after compression. Try a smaller file.`);
  }
  return dataUrl;
}

/** Normalize any proof/attachment data URL (images compressed; PDFs size-checked). */
export async function normalizeProofDataUrl(dataUrl) {
  if (!dataUrl?.startsWith("data:")) return dataUrl;
  if (dataUrl.startsWith("data:application/pdf")) {
    return assertUnderMaxBytes(dataUrl, PDF_MAX_BYTES, "PDF");
  }
  const compressed = await compressProofDataUrl(dataUrl);
  return assertUnderMaxBytes(compressed, PROOF_DEFAULTS.maxBytes, "Image");
}

/** Read a proof file from an upload control and compress images before storage. */
export async function compressProofFile(file) {
  if (!file) throw new Error("No file selected.");
  assertUploadFileSize(file);
  const dataUrl = await readFileAsDataUrl(file);
  return normalizeProofDataUrl(dataUrl);
}

export async function compressProductImageFile(file) {
  if (!file) throw new Error("No file selected.");
  assertUploadFileSize(file);
  if (typeof window === "undefined" || !file?.type?.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (file.size < PRODUCT_DEFAULTS.minBytesToCompress) return file;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const compressed = await compressDataUrl(dataUrl, PRODUCT_DEFAULTS);
  if (compressed === dataUrl) return file;

  const response = await fetch(compressed);
  const blob = await response.blob();
  const baseName = String(file.name || "image").replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
