import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "../app.js";
import { STORAGE_PATHS } from "../../../data/firestoreSchema.js";

function sanitizeFileName(name) {
  const cleaned = String(name || "image").replace(/[^a-zA-Z0-9._-]/g, "-");
  return cleaned.slice(-80) || "image";
}

/**
 * Upload a product image to Firebase Storage and return its public download URL.
 * `productId` is used only to namespace the storage path (new products pass null).
 */
export async function uploadProductImage(productId, file) {
  const storage = getFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage is not configured.");

  const id = productId || `new-${Date.now()}`;
  const path = `${STORAGE_PATHS.productImages(id)}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}
