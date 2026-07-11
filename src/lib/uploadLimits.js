/** Client-side upload size limits (applies to the original file before compression). */

export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
export const MAX_UPLOAD_MB = 3;

export const UPLOAD_SIZE_ERROR = "File is too large. Maximum size is 3 MB.";
export const UPLOAD_SIZE_DISCLAIMER = "Maximum file size: 3 MB.";
export const UPLOAD_PROOF_DISCLAIMER = "Maximum file size: 3 MB (images or PDF).";

/** @returns {string|null} Error message if over limit, otherwise null. */
export function validateUploadFileSize(file) {
  if (!file) return null;
  if (file.size > MAX_UPLOAD_BYTES) return UPLOAD_SIZE_ERROR;
  return null;
}

/** @throws {Error} If the file exceeds the upload limit. */
export function assertUploadFileSize(file) {
  const message = validateUploadFileSize(file);
  if (message) throw new Error(message);
}
