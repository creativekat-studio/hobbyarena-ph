import { Resend } from "resend";
import { buildAdminInquiryEmail, buildInquiryAutoReply } from "./_lib/inquiryEmail.js";
import { getEmailConfig, isValidEmail } from "./_lib/emailConfig.js";

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

    const { apiKey, from, adminEmail } = getEmailConfig();
    const resend = new Resend(apiKey);
    const adminContent = buildAdminInquiryEmail(inquiry);
    const autoReply = buildInquiryAutoReply(inquiry);

    const [adminResult, customerResult] = await Promise.all([
      resend.emails.send({
        from,
        to: adminEmail,
        subject: adminContent.subject,
        html: adminContent.html,
        text: adminContent.text,
        replyTo: inquiry.email,
      }),
      resend.emails.send({
        from,
        to: inquiry.email,
        subject: autoReply.subject,
        html: autoReply.html,
        text: autoReply.text,
      }),
    ]);

    if (adminResult.error) {
      return res.status(502).json({ error: adminResult.error.message || "Failed to send admin notification." });
    }

    return res.status(200).json({
      ok: true,
      adminMessageId: adminResult.data?.id ?? null,
      customerMessageId: customerResult.error ? null : customerResult.data?.id ?? null,
      customerSkipped: Boolean(customerResult.error),
    });
  } catch (error) {
    console.error("inquiry-notification:", error);
    return res.status(500).json({ error: error.message || "Email service error." });
  }
}
