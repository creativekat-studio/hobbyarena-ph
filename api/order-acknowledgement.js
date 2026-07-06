import { buildAdminOrderNotificationEmail, buildOrderAcknowledgementEmail } from "./_lib/orderEmail.js";
import { dispatchEmail } from "./_lib/dispatchEmail.js";
import { getEmailConfig, isValidEmail } from "./_lib/emailConfig.js";

function readOrder(body) {
  if (!body || typeof body !== "object") return null;
  const {
    id, customer, email, items, lineItems, total, subtotal, shippingFee,
    balanceDue, type, phone, payment, date,
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

  return {
    id: String(id),
    customer: String(customer).trim(),
    email: email.trim(),
    items: items ? String(items) : "",
    lineItems: parsedLineItems,
    total: Number(total) || 0,
    subtotal: Number(subtotal) || Number(total) || 0,
    shippingFee: Number(shippingFee) || 0,
    balanceDue: Number(balanceDue) || 0,
    type: type ? String(type) : "In-stock",
    phone: phone ? String(phone) : "",
    payment: payment ? String(payment) : "Pending Verification",
    date: date ? String(date) : new Date().toISOString().slice(0, 10),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const order = readOrder(req.body);
    if (!order) {
      return res.status(400).json({ error: "Invalid order payload." });
    }

    const { adminEmail } = getEmailConfig();
    const customerEmail = buildOrderAcknowledgementEmail(order);
    const adminEmailContent = buildAdminOrderNotificationEmail(order);

    const [customerResult, adminResult] = await Promise.all([
      dispatchEmail({
        to: order.email,
        subject: customerEmail.subject,
        html: customerEmail.html,
        text: customerEmail.text,
        meta: { kind: "order_ack_customer", orderId: order.id },
      }),
      dispatchEmail({
        to: adminEmail,
        subject: adminEmailContent.subject,
        html: adminEmailContent.html,
        text: adminEmailContent.text,
        replyTo: order.email,
        meta: { kind: "order_ack_admin", orderId: order.id },
      }),
    ]);

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
