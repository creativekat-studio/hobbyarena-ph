import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { STORAGE_PATHS } from "../../../data/firestoreSchema.js";
import { compressProductImageFile, compressProofDataUrl, normalizeProofDataUrl } from "../../imageCompression.js";
import { getFirebaseStorage } from "../app.js";

function sanitizeFileName(name) {
  const cleaned = String(name || "image").replace(/[^a-zA-Z0-9._-]/g, "-");
  return cleaned.slice(-80) || "image";
}

function extensionForDataUrl(dataUrl) {
  if (dataUrl.startsWith("data:application/pdf")) return "pdf";
  if (dataUrl.startsWith("data:image/png")) return "png";
  if (dataUrl.startsWith("data:image/webp")) return "webp";
  if (dataUrl.startsWith("data:image/gif")) return "gif";
  if (dataUrl.startsWith("data:image/jpeg")) return "jpg";
  return "jpg";
}

function contentTypeForDataUrl(dataUrl) {
  const match = /^data:([^;,]+)/.exec(dataUrl);
  return match?.[1] || "image/jpeg";
}

export function dataUrlToBlob(dataUrl) {
  const [header, encoded] = String(dataUrl).split(",");
  if (!encoded) throw new Error("Invalid file data.");
  const isBase64 = header.includes("base64");
  const binary = isBase64 ? atob(encoded) : decodeURIComponent(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentTypeForDataUrl(dataUrl) });
}

/**
 * Upload a payment proof (deposit, balance, refund, or admin attachment) to Storage.
 * Returns a long-lived HTTPS download URL stored on the order trail in Firestore.
 */
export async function uploadOrderProofFromDataUrl(orderId, dataUrl, fileLabel = "proof") {
  const storage = getFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage is not configured.");
  if (!orderId || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Invalid proof upload.");
  }

  const compressed = await normalizeProofDataUrl(dataUrl);
  const ext = extensionForDataUrl(compressed);
  const path = `${STORAGE_PATHS.orderProofs(orderId)}/${Date.now()}-${sanitizeFileName(fileLabel)}.${ext}`;
  const storageRef = ref(storage, path);
  const blob = dataUrlToBlob(compressed);
  await uploadBytes(storageRef, blob, { contentType: contentTypeForDataUrl(compressed) });
  return getDownloadURL(storageRef);
}

/**
 * Upload a product image to Firebase Storage and return its public download URL.
 * `productId` is used only to namespace the storage path (new products pass null).
 */
export async function uploadProductImage(productId, file) {
  const storage = getFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage is not configured.");

  const compressedFile = await compressProductImageFile(file);
  const id = productId || `new-${Date.now()}`;
  const path = `${STORAGE_PATHS.productImages(id)}/${Date.now()}-${sanitizeFileName(compressedFile.name)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressedFile, { contentType: compressedFile.type });
  return getDownloadURL(storageRef);
}
