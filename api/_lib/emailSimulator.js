import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "fs";
import { resolve } from "path";
import { loadLocalEnv } from "./loadLocalEnv.js";

const OUTBOX_DIR = resolve(process.cwd(), ".email-outbox");
const INDEX_FILE = resolve(OUTBOX_DIR, "index.json");
const MAX_ENTRIES = 200;

export function isEmailSimulate() {
  loadLocalEnv();
  const flag = String(process.env.EMAIL_SIMULATE || "").trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  if (flag === "false" || flag === "0" || flag === "no") return false;
  const from = process.env.RESEND_FROM_EMAIL || "";
  return from.includes("onboarding@resend.dev");
}

function readIndex() {
  if (!existsSync(INDEX_FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(rows) {
  mkdirSync(OUTBOX_DIR, { recursive: true });
  writeFileSync(INDEX_FILE, JSON.stringify(rows.slice(0, MAX_ENTRIES), null, 2));
}

export function recordSimulatedEmail({ to, subject, html, text, from, meta = {} }) {
  mkdirSync(OUTBOX_DIR, { recursive: true });
  const entry = {
    id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    to: Array.isArray(to) ? to : [to],
    subject: subject || "(no subject)",
    html: html || "",
    text: text || "",
    from: from || "",
    meta,
  };
  writeFileSync(resolve(OUTBOX_DIR, `${entry.id}.json`), JSON.stringify(entry, null, 2));
  const index = readIndex();
  index.unshift({
    id: entry.id,
    at: entry.at,
    to: entry.to,
    subject: entry.subject,
    kind: meta.kind || "email",
    emailType: meta.emailType || null,
    orderId: meta.orderId || null,
  });
  writeIndex(index);
  console.log(`[email-sim] captured → ${entry.to.join(", ")}: ${entry.subject}`);
  return entry;
}

export function listSimulatedEmails() {
  return readIndex();
}

export function getSimulatedEmail(id) {
  if (!id) return null;
  const path = resolve(OUTBOX_DIR, `${id}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function clearSimulatedEmails() {
  if (!existsSync(OUTBOX_DIR)) return;
  for (const file of readdirSync(OUTBOX_DIR)) {
    if (file.endsWith(".json")) {
      unlinkSync(resolve(OUTBOX_DIR, file));
    }
  }
}
