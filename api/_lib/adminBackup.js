import {
  ensureFirebaseAdminApp,
  getAdminFirestore,
  getAdminStorageBucket,
  getServiceAccountAccessToken,
  isFirebaseAdminConfigured,
} from "./firebaseAdmin.js";
import { loadLocalEnv } from "./loadLocalEnv.js";

/** Matches current Firebase Console Disaster Recovery settings. */
export const PLATFORM_BACKUP_STATUS = {
  firestore: {
    scheduled: true,
    frequency: "daily",
    retentionDays: 98,
    summary: "Firestore is already covered by Firebase scheduled daily backups (98-day retention). Orders and inventory docs are included there.",
  },
  storage: {
    softDeleteDays: 7,
    objectVersioningDefault: false,
    summary: "Storage files use soft delete (7 days). This export can also embed image bytes for restore — prefer Storage upload for large libraries.",
  },
  auth: {
    scheduled: false,
    summary: "Firebase Auth has no scheduled backup plan — Auth export here is manual.",
  },
};

/** Skip nesting backups inside backups. */
const STORAGE_SKIP_PREFIXES = ["admin-backups/", "bak/"];
/** Live asset folders to embed. */
const STORAGE_INCLUDE_PREFIXES = ["products/", "cms/", "order-proofs/"];
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_EMBED_BYTES = 20 * 1024 * 1024;
/** Keep serverless local-download responses under platform body limits. */
const MAX_LOCAL_RESPONSE_CHARS = 3_000_000;

function readServiceAccount() {
  loadLocalEnv();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function serializeValue(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return String(value);
    }
  }
  if (typeof value === "object" && typeof value._seconds === "number") {
    return new Date(value._seconds * 1000).toISOString();
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = serializeValue(entry);
    }
    return out;
  }
  return value;
}

async function exportCollection(db, name) {
  const snap = await db.collection(name).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...serializeValue(doc.data()),
  }));
}

function mapAuthUser(user) {
  const providerIds = (user.providerUserInfo || [])
    .map((entry) => String(entry?.providerId || "").trim())
    .filter(Boolean);
  return {
    uid: user.localId || null,
    email: user.email || null,
    emailVerified: Boolean(user.emailVerified),
    displayName: user.displayName || null,
    photoUrl: user.photoUrl || null,
    disabled: Boolean(user.disabled),
    providers: providerIds,
    createdAt: user.createdAt ? new Date(Number(user.createdAt)).toISOString() : null,
    lastLoginAt: user.lastLoginAt ? new Date(Number(user.lastLoginAt)).toISOString() : null,
    // Included when Identity Toolkit returns them — treat backup file as secret.
    passwordHash: user.passwordHash || null,
    salt: user.salt || null,
  };
}

/** List Auth users via Identity Toolkit REST (avoids firebase-admin/auth on Vercel). */
export async function listAuthUsersForBackup() {
  const serviceAccount = readServiceAccount();
  if (!serviceAccount?.project_id) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  }

  const accessToken = await getServiceAccountAccessToken(serviceAccount);
  const users = [];
  let nextPageToken;

  do {
    const body = { maxResults: 1000 };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${serviceAccount.project_id}/accounts:batchGet`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || data.error || "Failed to list Auth users");
    }
    for (const user of data.users || []) {
      users.push(mapAuthUser(user));
    }
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);

  return users;
}

function shouldIncludeStoragePath(path) {
  const normalized = String(path || "").replace(/^\/+/, "");
  if (!normalized || normalized.endsWith("/")) return false;
  if (STORAGE_SKIP_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return false;
  return STORAGE_INCLUDE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Embed Storage objects as base64 for restore.
 * Keeps firebaseStorageDownloadTokens so existing HTTPS URLs in Firestore can keep working.
 */
export async function exportStorageFilesAsBytes() {
  const bucket = getAdminStorageBucket();
  if (!bucket) throw new Error("Storage bucket is not available.");

  const [files] = await bucket.getFiles({ autoPaginate: true });
  const storageFiles = [];
  const storageSkipped = [];
  let totalBytes = 0;

  for (const file of files) {
    const path = file.name;
    if (!shouldIncludeStoragePath(path)) continue;

    const size = Number(file.metadata?.size || 0);
    if (size <= 0) {
      storageSkipped.push({ path, reason: "empty", size });
      continue;
    }
    if (size > MAX_FILE_BYTES) {
      storageSkipped.push({ path, reason: "file_too_large", size, maxFileBytes: MAX_FILE_BYTES });
      continue;
    }
    if (totalBytes + size > MAX_TOTAL_EMBED_BYTES) {
      storageSkipped.push({ path, reason: "total_budget_exceeded", size, maxTotalBytes: MAX_TOTAL_EMBED_BYTES });
      continue;
    }

    try {
      const [buffer] = await file.download();
      const [metadata] = await file.getMetadata();
      const downloadToken = String(
        metadata?.metadata?.firebaseStorageDownloadTokens
        || metadata?.metadata?.downloadTokens
        || "",
      )
        .split(",")
        .map((part) => part.trim())
        .find(Boolean) || null;

      storageFiles.push({
        path,
        contentType: metadata?.contentType || "application/octet-stream",
        size: buffer.length,
        downloadToken,
        encoding: "base64",
        base64: buffer.toString("base64"),
      });
      totalBytes += buffer.length;
    } catch (error) {
      storageSkipped.push({
        path,
        reason: "download_failed",
        size,
        error: error?.message || "download_failed",
      });
    }
  }

  return {
    storageFiles,
    storageSkipped,
    storageEmbedBytes: totalBytes,
  };
}

export async function buildAdminBackupPayload({ createdBy = "" } = {}) {
  if (!isFirebaseAdminConfigured() || !ensureFirebaseAdminApp()) {
    throw new Error("Firebase Admin is not configured.");
  }

  const db = getAdminFirestore();
  if (!db) throw new Error("Firestore is not available.");

  const [authUsers, customers, orders, inventory, products, storageExport] = await Promise.all([
    listAuthUsersForBackup(),
    exportCollection(db, "customers"),
    exportCollection(db, "orders"),
    exportCollection(db, "inventory"),
    exportCollection(db, "products"),
    exportStorageFilesAsBytes(),
  ]);

  const createdAt = new Date().toISOString();
  const stamp = createdAt.replace(/[:.]/g, "-");
  const { storageFiles, storageSkipped, storageEmbedBytes } = storageExport;

  return {
    meta: {
      app: "hobbyarena",
      kind: "admin-manual-backup",
      createdAt,
      stamp,
      createdBy: createdBy || null,
      platformBackupStatus: PLATFORM_BACKUP_STATUS,
      counts: {
        authUsers: authUsers.length,
        customers: customers.length,
        orders: orders.length,
        inventory: inventory.length,
        products: products.length,
        storageFiles: storageFiles.length,
        storageSkipped: storageSkipped.length,
        storageEmbedBytes,
      },
      restoreNotes: [
        "Restore Firestore docs (customers, orders, inventory, products) by writing documents back by id.",
        "Restore storageFiles by writing base64 → bytes to the same Storage path and setting firebaseStorageDownloadTokens to downloadToken when present (keeps existing image URLs working).",
        "Auth restore is limited — password hashes may be present but re-import needs Admin tooling; Google users usually re-link via sign-in.",
        "Skipped Storage objects are listed in storageSkipped (size limits or errors).",
      ],
      warning: "This file may include Auth password hashes and image bytes. Store it privately.",
    },
    authUsers,
    customers,
    orders,
    inventory,
    products,
    storageFiles,
    storageSkipped,
  };
}

/** Shrink payload for browser download when the full JSON would exceed serverless limits. */
export function payloadForLocalDownload(payload) {
  const full = JSON.stringify(payload);
  if (full.length <= MAX_LOCAL_RESPONSE_CHARS) {
    return { payload, omittedStorageFiles: false };
  }

  const slim = {
    ...payload,
    storageFiles: [],
    meta: {
      ...payload.meta,
      storageFilesOmittedFromDownload: true,
      storageFilesOmittedNote:
        "Image bytes were omitted from the local download because the file was too large for the API response. Use the Storage upload copy (admin-backups/…) for full image restore, or run backup with Storage upload only.",
      counts: {
        ...payload.meta.counts,
        storageFilesInDownload: 0,
        storageFilesInFullBackup: payload.meta?.counts?.storageFiles ?? 0,
      },
    },
  };
  return { payload: slim, omittedStorageFiles: true };
}

export async function uploadBackupToStorage(payload) {
  const bucket = getAdminStorageBucket();
  if (!bucket) throw new Error("Storage bucket is not available.");

  const stamp = payload?.meta?.stamp || new Date().toISOString().replace(/[:.]/g, "-");
  const objectPath = `admin-backups/${stamp}/hobbyarena-backup-${stamp}.json`;
  const file = bucket.file(objectPath);
  const body = JSON.stringify(payload, null, 2);

  await file.save(body, {
    contentType: "application/json; charset=utf-8",
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=0",
      metadata: {
        kind: "admin-manual-backup",
        createdAt: payload?.meta?.createdAt || "",
      },
    },
  });

  return {
    bucket: bucket.name,
    path: objectPath,
    gsUri: `gs://${bucket.name}/${objectPath}`,
  };
}
