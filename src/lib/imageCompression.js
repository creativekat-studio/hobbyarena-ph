/** Resize and compress images before Firebase Storage upload (browser only). */

const PROOF_DEFAULTS = {
  maxWidth: 1400,
  maxHeight: 1400,
  quality: 0.8,
  minBytesToCompress: 0,
};

const PRODUCT_DEFAULTS = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  minBytesToCompress: 200_000,
};

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

function drawCompressedDataUrl(img, dataUrl, options) {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const scale = Math.min(1, options.maxWidth / width, options.maxHeight / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);

  const usePng = dataUrl.startsWith("data:image/png");
  const mime = usePng ? "image/png" : "image/jpeg";
  const quality = usePng ? undefined : options.quality;
  return canvas.toDataURL(mime, quality);
}

async function compressDataUrl(dataUrl, options) {
  if (typeof window === "undefined" || !dataUrl?.startsWith("data:image/")) return dataUrl;
  if (dataUrl.startsWith("data:image/gif") || dataUrl.startsWith("data:image/svg")) return dataUrl;
  if (estimateDataUrlBytes(dataUrl) < options.minBytesToCompress) return dataUrl;

  try {
    const img = await loadImage(dataUrl);
    const compressed = drawCompressedDataUrl(img, dataUrl, options);
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

/** Normalize any proof/attachment data URL (images compressed; PDFs unchanged). */
export async function normalizeProofDataUrl(dataUrl) {
  if (!dataUrl?.startsWith("data:")) return dataUrl;
  if (dataUrl.startsWith("data:application/pdf")) return dataUrl;
  return compressProofDataUrl(dataUrl);
}

/** Read a proof file from an upload control and compress images before storage. */
export async function compressProofFile(file) {
  if (!file) throw new Error("No file selected.");
  const dataUrl = await readFileAsDataUrl(file);
  return normalizeProofDataUrl(dataUrl);
}

export async function compressProductImageFile(file) {
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
  const ext = compressed.startsWith("data:image/png") ? "png" : "jpg";
  const baseName = String(file.name || "image").replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, { type: blob.type });
}
