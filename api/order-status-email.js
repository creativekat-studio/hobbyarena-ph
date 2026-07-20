import { buildOrderStatusEmail } from "./_lib/orderStatusEmail.js";
import { dispatchEmail } from "./_lib/dispatchEmail.js";
import { isValidEmail } from "./_lib/emailConfig.js";
import { requireAdmin } from "./_lib/requireAdmin.js";

function readReminderConfig(raw) {
  if (!raw || typeof raw !== "object") return null;

  if (Array.isArray(raw.footers)) {
    const footers = raw.footers.slice(0, 20).map((footer, index) => {
      const lines = Array.isArray(footer?.lines)
        ? footer.lines.map((line) => String(line ?? "").trim()).filter(Boolean).slice(0, 10)
        : [];
      return {
        id: footer?.id ? String(footer.id).trim().slice(0, 80) : `ft-${index}`,
        name: footer?.name ? String(footer.name).trim().slice(0, 120) : `Footer ${index + 1}`,
        title: footer?.title ? String(footer.title).trim().slice(0, 120) : undefined,
        lines,
      };
    }).filter((footer) => footer.id);
    const assignmentByType = raw.assignmentByType && typeof raw.assignmentByType === "object"
      ? Object.fromEntries(
        Object.entries(raw.assignmentByType)
          .map(([key, value]) => [String(key), String(value ?? "").trim().slice(0, 80)]),
      )
      : {};
    return { footers, assignmentByType };
  }

  const lines = Array.isArray(raw.lines)
    ? raw.lines.map((line) => String(line ?? "").trim()).filter(Boolean).slice(0, 10)
    : null;
  const enabledByType = raw.enabledByType && typeof raw.enabledByType === "object"
    ? Object.fromEntries(
      Object.entries(raw.enabledByType)
        .filter(([, value]) => typeof value === "boolean")
        .map(([key, value]) => [String(key), value]),
    )
    : undefined;
  return {
    enabled: raw.enabled !== false,
    title: raw.title ? String(raw.title).trim().slice(0, 120) : undefined,
    lines: lines && lines.length ? lines : undefined,
    ...(enabledByType && Object.keys(enabledByType).length ? { enabledByType } : {}),
  };
}

function readPayload(body) {
  if (!body || typeof body !== "object") return null;
  const { emailType, order, bodyOverride, reminder } = body;
  if (!emailType || !order?.id || !order?.customer || !isValidEmail(order.email)) return null;
  return {
    emailType: String(emailType),
    bodyOverride: typeof bodyOverride === "string" ? bodyOverride.slice(0, 4000) : "",
    reminder: readReminderConfig(reminder),
    order: {
      id: String(order.id),
      customer: String(order.customer).trim(),
      email: order.email.trim(),
      phone: order.phone ? String(order.phone) : "",
      type: order.type ? String(order.type) : "In-stock",
      payment: order.payment ? String(order.payment) : "",
      status: order.status ? String(order.status) : "",
      total: Number(order.total) || 0,
      balanceDue: Number(order.balanceDue) || 0,
      refundAmount: Number(order.refundAmount) || 0,
      allocatedQty: Number(order.allocatedQty) || 0,
      qty: Number(order.qty) || 1,
      depositPercent: Number(order.depositPercent) || 30,
      date: order.date ? String(order.date) : "",
      items: order.items ? String(order.items) : "",
      lineItems: Array.isArray(order.lineItems) ? order.lineItems : [],
      updatedLineItem: order.updatedLineItem && typeof order.updatedLineItem === "object"
        ? {
          id: order.updatedLineItem.id ? String(order.updatedLineItem.id) : "",
          name: order.updatedLineItem.name ? String(order.updatedLineItem.name) : "",
          quantity: Number(order.updatedLineItem.quantity) || 1,
          price: Number(order.updatedLineItem.price) || 0,
          tag: order.updatedLineItem.tag ? String(order.updatedLineItem.tag) : "",
          payment: order.updatedLineItem.payment ? String(order.updatedLineItem.payment) : "",
          status: order.updatedLineItem.status ? String(order.updatedLineItem.status) : "",
          balanceDue: Number(order.updatedLineItem.balanceDue) || 0,
          refundAmount: Number(order.updatedLineItem.refundAmount) || 0,
          allocatedQty: Number(order.updatedLineItem.allocatedQty) || 0,
          depositPaid: Number(order.updatedLineItem.depositPaid) || 0,
          lineTotal: Number(order.updatedLineItem.lineTotal) || 0,
        }
        : null,
      statusAttachment: order.statusAttachment && typeof order.statusAttachment === "object"
        ? (() => {
          const raw = typeof order.statusAttachment.url === "string"
            ? order.statusAttachment.url.trim()
            : "";
          // Prefer https Storage URLs; allow data:image for inline HTML (never data: PDFs).
          const url = /^https?:\/\//i.test(raw) || /^data:image\//i.test(raw) ? raw : "";
          return {
            label: order.statusAttachment.label ? String(order.statusAttachment.label) : "Attachment",
            url,
            type: order.statusAttachment.type ? String(order.statusAttachment.type) : "image",
          };
        })()
        : null,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return undefined;

    const payload = readPayload(req.body);
    if (!payload) {
      return res.status(400).json({ error: "Invalid status email payload." });
    }

    const content = buildOrderStatusEmail(payload.order, payload.emailType, {
      bodyOverride: payload.bodyOverride,
      ...(payload.reminder ? { reminder: payload.reminder } : {}),
    });
    if (!content) {
      return res.status(400).json({ error: "Unknown email type." });
    }

    if (req.body?.preview === true) {
      return res.status(200).json({
        ok: true,
        preview: true,
        subject: content.subject,
        html: content.html,
        emailType: payload.emailType,
      });
    }

    const result = await dispatchEmail({
      to: payload.order.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
      meta: {
        kind: "order_status",
        emailType: payload.emailType,
        orderId: payload.order.id,
      },
    });

    if (!result.ok) {
      return res.status(502).json({ error: result.error?.message || "Failed to send status email." });
    }

    return res.status(200).json({
      ok: true,
      to: payload.order.email,
      messageId: result.messageId ?? null,
      emailType: payload.emailType,
      simulated: Boolean(result.simulated),
      skipped: Boolean(result.skipped),
      skipReason: result.skipReason || null,
    });
  } catch (error) {
    console.error("order-status-email:", error);
    return res.status(500).json({ error: error.message || "Email service error." });
  }
}
