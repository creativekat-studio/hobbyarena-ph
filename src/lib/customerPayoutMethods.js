import { getOrderLineItems, lineItemTrailLabel } from "../data/orderWorkflow.js";
import { getRefundProof, resolveProofAttachmentUrl } from "./orderProofStorage.js";

function resolveRefundQrUrl(order, lineItemId) {
  const trailEntry = (order.trail || []).find((entry) => (
    entry?.attachment?.kind === "refund" && String(entry.lineItemId) === String(lineItemId)
  ));
  if (trailEntry) {
    const url = resolveProofAttachmentUrl(order, trailEntry);
    if (url) return url;
  }
  return getRefundProof(order.id, lineItemId);
}

export function normalizePayoutMethod(method) {
  const id = String(method?.id || "").trim();
  const qrUrl = String(method?.qrUrl || "").trim();
  return {
    id: id || `payout_${Date.now()}`,
    bankName: String(method?.bankName || "").trim(),
    accountName: String(method?.accountName || "").trim(),
    accountNumber: String(method?.accountNumber || "").trim(),
    note: String(method?.note || "").trim(),
    qrUrl,
    qrName: String(method?.qrName || "").trim(),
    isPdf: Boolean(method?.isPdf) || qrUrl.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/i.test(qrUrl),
    createdAt: method?.createdAt || new Date().toISOString(),
    updatedAt: method?.updatedAt || method?.createdAt || new Date().toISOString(),
    source: method?.source === "order" ? "order" : method?.source === "account" ? "account" : "admin",
  };
}

export function normalizePayoutMethods(list) {
  const seen = new Set();
  const methods = [];
  for (const entry of Array.isArray(list) ? list : []) {
    const method = normalizePayoutMethod(entry);
    if (!method.id || seen.has(method.id)) continue;
    if (!method.bankName && !method.accountName && !method.accountNumber && !method.qrUrl) continue;
    seen.add(method.id);
    methods.push(method);
  }
  return methods;
}

export function resolvePrimaryPayoutMethodId(methods, preferredId = "") {
  const list = normalizePayoutMethods(methods);
  const preferred = String(preferredId || "").trim();
  if (preferred && list.some((method) => method.id === preferred)) return preferred;
  return list[0]?.id || "";
}

export function resolvePrimaryPayoutMethod(profile) {
  const methods = normalizePayoutMethods(profile?.payoutMethods);
  const id = resolvePrimaryPayoutMethodId(methods, profile?.primaryPayoutMethodId);
  return methods.find((method) => method.id === id) || null;
}

export function payoutMethodHasBank(method) {
  return Boolean(method?.bankName || method?.accountName || method?.accountNumber);
}

export function orderPayoutMethodId(payout) {
  return `order_${String(payout?.key || payout?.orderId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function methodFromOrderPayout(payout) {
  return normalizePayoutMethod({
    id: orderPayoutMethodId(payout),
    bankName: payout?.bankName,
    accountName: payout?.accountName,
    accountNumber: payout?.accountNumber,
    note: payout?.note,
    qrUrl: payout?.qrUrl,
    qrName: payout?.qrName || payout?.lineLabel || "",
    isPdf: payout?.isPdf,
    createdAt: payout?.submittedAt,
    source: "order",
  });
}

export function collectCustomerPayouts(orders) {
  const payouts = [];
  for (const order of orders || []) {
    const details = order.refundDetails;
    if (!details || typeof details !== "object") continue;
    const items = getOrderLineItems(order);
    for (const [lineItemId, detail] of Object.entries(details)) {
      if (!detail || typeof detail !== "object") continue;
      const item = items.find((entry) => entry.id === lineItemId);
      const qrUrl = detail.method === "qr" || detail.hasQr
        ? resolveRefundQrUrl(order, lineItemId)
        : null;
      payouts.push({
        key: `${order.id}:${lineItemId}`,
        orderId: order.id,
        lineLabel: item ? lineItemTrailLabel(item) : lineItemId,
        method: detail.method === "qr" || detail.hasQr ? "qr" : "bank",
        bankName: String(detail.bankName || "").trim(),
        accountName: String(detail.accountName || "").trim(),
        accountNumber: String(detail.accountNumber || "").trim(),
        note: String(detail.note || "").trim(),
        submittedAt: detail.submittedAt || "",
        qrUrl: typeof qrUrl === "string" && qrUrl ? qrUrl : null,
        isPdf: typeof qrUrl === "string" && (
          qrUrl.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/i.test(qrUrl)
        ),
      });
    }
  }
  return payouts.sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
}

export function formatPayoutMethodCopy(method, contact = {}) {
  const lines = [];
  if (contact.name) lines.push(contact.name);
  if (contact.email) lines.push(contact.email);
  if (method?.bankName) lines.push(method.bankName);
  if (method?.accountName) lines.push(method.accountName);
  if (method?.accountNumber) lines.push(method.accountNumber);
  if (method?.qrUrl) lines.push("QR code");
  if (method?.note) lines.push(method.note);
  return lines.filter(Boolean).join("\n");
}
