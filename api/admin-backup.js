import {
  buildAdminBackupPayload,
  uploadBackupToStorage,
  payloadForLocalDownload,
  PLATFORM_BACKUP_STATUS,
} from "./_lib/adminBackup.js";
import { isFirebaseAdminConfigured } from "./_lib/firebaseAdmin.js";
import { loadLocalEnv } from "./_lib/loadLocalEnv.js";
import { enforceRateLimit, rateLimitKey } from "./_lib/rateLimit.js";
import { requireAdmin } from "./_lib/requireAdmin.js";

/**
 * Admin manual backup: Auth users + customers + orders + inventory + products + Storage image bytes.
 * Body: { downloadLocal?: boolean, uploadStorage?: boolean }
 */
export default async function handler(req, res) {
  loadLocalEnv();

  if (req.method === "GET") {
    const admin = await requireAdmin(req, res);
    if (!admin) return undefined;
    return res.status(200).json({
      ok: true,
      platformBackupStatus: PLATFORM_BACKUP_STATUS,
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return undefined;

  if (!enforceRateLimit(req, res, {
    limit: 4,
    windowMs: 10 * 60 * 1000,
    key: rateLimitKey(req, `admin-backup:${admin.uid || admin.email}`),
  })) {
    return undefined;
  }

  const downloadLocal = Boolean(req.body?.downloadLocal);
  const uploadStorage = Boolean(req.body?.uploadStorage);
  if (!downloadLocal && !uploadStorage) {
    return res.status(400).json({
      error: "Choose at least one destination: download to this device and/or upload to Storage.",
    });
  }

  if (!isFirebaseAdminConfigured()) {
    return res.status(503).json({ error: "Firebase Admin is not configured on this environment." });
  }

  try {
    if (typeof res.setHeader === "function") {
      res.setHeader("Cache-Control", "no-store");
    }

    const payload = await buildAdminBackupPayload({ createdBy: admin.email || admin.uid });
    let storage = null;
    if (uploadStorage) {
      storage = await uploadBackupToStorage(payload);
    }

    let localPayload = null;
    let omittedStorageFiles = false;
    if (downloadLocal) {
      const prepared = payloadForLocalDownload(payload);
      localPayload = prepared.payload;
      omittedStorageFiles = prepared.omittedStorageFiles;
    }

    return res.status(200).json({
      ok: true,
      platformBackupStatus: PLATFORM_BACKUP_STATUS,
      counts: payload.meta.counts,
      stamp: payload.meta.stamp,
      createdAt: payload.meta.createdAt,
      storage,
      omittedStorageFiles,
      ...(localPayload ? { payload: localPayload } : {}),
    });
  } catch (error) {
    console.error("[admin-backup]", error);
    return res.status(500).json({
      error: error?.message || "Backup failed.",
    });
  }
}
