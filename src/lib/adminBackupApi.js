/**
 * Admin manual backup API (Auth users, customers, orders).
 */
import { getFirebaseAuth } from "./firebase/app.js";

async function adminAuthHeaders() {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in as admin to run a backup.");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchPlatformBackupStatus() {
  const response = await fetch("/api/admin-backup", {
    method: "GET",
    headers: await adminAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Could not load backup status.");
  }
  return data;
}

export async function runAdminBackup({ downloadLocal, uploadStorage }) {
  const response = await fetch("/api/admin-backup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await adminAuthHeaders()),
    },
    body: JSON.stringify({ downloadLocal, uploadStorage }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Backup failed.");
  }
  return data;
}

export function downloadBackupJson(payload, stamp) {
  const name = `hobbyarena-backup-${stamp || new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
