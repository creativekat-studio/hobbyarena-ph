import { Resend } from "resend";
import { getEmailConfig } from "./emailConfig.js";
import { isEmailSimulate, recordSimulatedEmail } from "./emailSimulator.js";

function isResendSandboxRestriction(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("only send testing emails")
    || message.includes("verify a domain")
    || message.includes("not authorized to send")
  );
}

/**
 * Send via Resend, or capture locally when EMAIL_SIMULATE is enabled
 * (auto-on when RESEND_FROM_EMAIL uses onboarding@resend.dev).
 */
export async function dispatchEmail({ to, subject, html, text, from, replyTo, meta = {} }) {
  const recipients = Array.isArray(to) ? to : [to];

  if (isEmailSimulate()) {
    const entry = recordSimulatedEmail({
      to: recipients,
      subject,
      html,
      text,
      from,
      meta,
    });
    return { ok: true, simulated: true, messageId: entry.id, skipped: false };
  }

  const { apiKey, from: defaultFrom } = getEmailConfig();
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: from || defaultFrom,
    to: recipients,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (result.error) {
    if (isResendSandboxRestriction(result.error)) {
      const entry = recordSimulatedEmail({
        to: recipients,
        subject,
        html,
        text,
        from: from || defaultFrom,
        meta: { ...meta, fallbackSimulate: true },
      });
      return {
        ok: true,
        simulated: true,
        messageId: entry.id,
        skipped: true,
        skipReason:
          "Resend test mode only delivers to your Resend account email. Email captured in the local outbox instead.",
      };
    }
    return { ok: false, error: result.error };
  }

  return { ok: true, simulated: false, messageId: result.data?.id ?? null };
}
