import { buildAdminOrderNotificationEmail, buildOrderAcknowledgementEmail } from "./_lib/orderEmail.js";
import { dispatchEmail } from "./_lib/dispatchEmail.js";
import { getEmailConfig, isValidEmail } from "./_lib/emailConfig.js";

function readOrder(body) {
  if (!body || typeof body !== "object") return null;
  const {
    id, customer, email, items, lineItems, total, subtotal, shippingFee,
    balanceDue, type, phone, payment, date, depositPercent, reminder,
  } = body;
  if (!id || !customer || !isValidEmail(email)) return null;

  const parsedLineItems = Array.isArray(lineItems)
    ? lineItems.map((item) => ({
        name: String(item.name || "").trim(),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        lineTotal: Number(item.lineTotal) || 0,
        tag: item.tag ? String(item.tag) : "",
      })).filter((item) => item.name)
    : [];

  const reminderConfig = reminder && typeof reminder === "object"
    ? (Array.isArray(reminder.footers)
      ? {
        footers: reminder.footers.slice(0, 20).map((footer, index) => ({
          id: footer?.id ? String(footer.id).trim().slice(0, 80) : `ft-${index}`,
          name: footer?.name ? String(footer.name).trim().slice(0, 120) : `Footer ${index + 1}`,
          title: footer?.title ? String(footer.title).trim().slice(0, 120) : undefined,
          lines: Array.isArray(footer?.lines)
            ? footer.lines.map((line) => String(line ?? "").trim()).filter(Boolean).slice(0, 10)
            : [],
        })),
        assignmentByType: reminder.assignmentByType && typeof reminder.assignmentByType === "object"
          ? Object.fromEntries(
            Object.entries(reminder.assignmentByType)
              .map(([key, value]) => [String(key), String(value ?? "").trim().slice(0, 80)]),
          )
          : {},
      }
      : {
        enabled: reminder.enabled !== false,
        title: reminder.title ? String(reminder.title).trim().slice(0, 120) : undefined,
        lines: Array.isArray(reminder.lines)
          ? reminder.lines.map((line) => String(line ?? "").trim()).filter(Boolean).slice(0, 10)
          : undefined,
        ...(reminder.enabledByType && typeof reminder.enabledByType === "object"
          ? {
            enabledByType: Object.fromEntries(
              Object.entries(reminder.enabledByType)
                .filter(([, value]) => typeof value === "boolean")
                .map(([key, value]) => [String(key), value]),
            ),
          }
          : {}),
      })
    : null;

  return {
    order: {
      id: String(id),
      customer: String(customer).trim(),
      email: email.trim(),
      items: items ? String(items) : "",
      lineItems: parsedLineItems,
      total: Number(total) || 0,
      subtotal: Number(subtotal) || Number(total) || 0,
      shippingFee: Number(shippingFee) || 0,
      balanceDue: Number(balanceDue) || 0,
      depositPercent: Number(depositPercent) || 30,
      type: type ? String(type) : "In-stock",
      phone: phone ? String(phone) : "",
      payment: payment ? String(payment) : "Pending Verification",
      date: date ? String(date) : new Date().toISOString().slice(0, 10),
    },
    reminder: reminderConfig,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = readOrder(req.body);
    if (!payload) {
      return res.status(400).json({ error: "Invalid order payload." });
    }
    const { order, reminder } = payload;

    const { adminEmail } = getEmailConfig();
    const customerEmail = buildOrderAcknowledgementEmail(order, reminder ? { reminder } : {});
    const adminEmailContent = buildAdminOrderNotificationEmail(order);

    const customerPromise = dispatchEmail({
      to: order.email,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
      meta: { kind: "order_ack_customer", orderId: order.id },
    });
    const adminPromise = adminEmail
      ? dispatchEmail({
          to: adminEmail,
          subject: adminEmailContent.subject,
          html: adminEmailContent.html,
          text: adminEmailContent.text,
          replyTo: order.email,
          meta: { kind: "order_ack_admin", orderId: order.id },
        })
      : Promise.resolve({ ok: true, skipped: true, skipReason: "ADMIN_NOTIFICATION_EMAIL not set." });

    const [customerResult, adminResult] = await Promise.all([customerPromise, adminPromise]);

    if (!customerResult.ok) {
      return res.status(502).json({ error: customerResult.error?.message || "Failed to send customer email." });
    }

    return res.status(200).json({
      ok: true,
      customerMessageId: customerResult.messageId ?? null,
      adminMessageId: adminResult.ok ? adminResult.messageId ?? null : null,
      customerSimulated: Boolean(customerResult.simulated),
      adminSimulated: Boolean(adminResult.simulated),
      customerSkipped: Boolean(customerResult.skipped),
      adminSkipped: Boolean(adminResult.skipped),
    });
  } catch (error) {
    console.error("order-acknowledgement:", error);
    return res.status(500).json({ error: error.message || "Email service error." });
  }
}
