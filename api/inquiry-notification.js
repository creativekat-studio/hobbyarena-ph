import { buildAdminInquiryEmail, buildInquiryAutoReply } from "./_lib/inquiryEmail.js";
import { dispatchEmail } from "./_lib/dispatchEmail.js";
import { getEmailConfig, isValidEmail } from "./_lib/emailConfig.js";
import { enforceRateLimit, rateLimitKey } from "./_lib/rateLimit.js";

function readInquiry(body) {
  if (!body || typeof body !== "object") return null;
  const { name, email, subject, message } = body;
  if (!name?.trim() || !isValidEmail(email) || !message?.trim()) return null;
  return {
    name: String(name).trim(),
    email: email.trim(),
    subject: subject ? String(subject).trim() : "",
    message: String(message).trim(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const inquiry = readInquiry(req.body);
    if (!inquiry) {
      return res.status(400).json({ error: "Invalid inquiry payload." });
    }

    if (!enforceRateLimit(req, res, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
      key: rateLimitKey(req, `inquiry|${inquiry.email}`),
    })) {
      return undefined;
    }

    const { adminEmail } = getEmailConfig();
    const adminContent = buildAdminInquiryEmail(inquiry);
    const autoReply = buildInquiryAutoReply(inquiry);

    const [adminResult, customerResult] = await Promise.all([
      dispatchEmail({
        to: adminEmail,
        subject: adminContent.subject,
        html: adminContent.html,
        text: adminContent.text,
        replyTo: inquiry.email,
        meta: { kind: "inquiry_admin", inquiryEmail: inquiry.email },
      }),
      dispatchEmail({
        to: inquiry.email,
        subject: autoReply.subject,
        html: autoReply.html,
        text: autoReply.text,
        meta: { kind: "inquiry_auto_reply", inquiryEmail: inquiry.email },
      }),
    ]);

    if (!adminResult.ok) {
      return res.status(502).json({ error: adminResult.error?.message || "Failed to send admin notification." });
    }

    return res.status(200).json({
      ok: true,
      adminMessageId: adminResult.messageId ?? null,
      customerMessageId: customerResult.ok ? customerResult.messageId ?? null : null,
      adminSimulated: Boolean(adminResult.simulated),
      customerSimulated: Boolean(customerResult.simulated),
      customerSkipped: Boolean(customerResult.skipped),
    });
  } catch (error) {
    console.error("inquiry-notification:", error);
    return res.status(500).json({ error: error.message || "Email service error." });
  }
}
