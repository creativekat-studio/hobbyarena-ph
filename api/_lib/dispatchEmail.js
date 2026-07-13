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

function isVercelProduction() {
  return process.env.VERCEL_ENV === "production"
    || (process.env.NODE_ENV === "production" && Boolean(process.env.VERCEL));
}

/**
 * Send via Resend, or capture locally when EMAIL_SIMULATE is enabled
 * (auto-on in local/dev when RESEND_FROM_EMAIL uses onboarding@resend.dev).
 *
 * Production never pretends a failed Resend send succeeded — that hid guest
 * acknowledgement failures when the From address was still in Resend test mode.
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
  const sender = from || defaultFrom;
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: sender,
    to: recipients,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (result.error) {
    if (isResendSandboxRestriction(result.error)) {
      const reason =
        "Resend rejected this send (test-mode / unverified domain). "
        + "Verify hobbyarena.ph in Resend and set RESEND_FROM_EMAIL to an address on that domain "
        + "(e.g. Hobby Arena <noreply@hobbyarena.ph>). "
        + "onboarding@resend.dev can only deliver to your Resend account email.";

      // Local/dev: keep capturing into the outbox so QA can still inspect HTML.
      // Production: fail loudly so we don't mark orders as emailed when nothing was delivered.
      if (!isVercelProduction()) {
        const entry = recordSimulatedEmail({
          to: recipients,
          subject,
          html,
          text,
          from: sender,
          meta: { ...meta, fallbackSimulate: true },
        });
        return {
          ok: true,
          simulated: true,
          messageId: entry.id,
          skipped: true,
          skipReason: reason,
        };
      }

      console.error("[email] Resend sandbox/domain block:", {
        to: recipients,
        from: sender,
        subject,
        error: result.error,
      });
      return {
        ok: false,
        simulated: false,
        skipped: true,
        skipReason: reason,
        error: { message: reason, resend: result.error },
      };
    }
    return { ok: false, error: result.error };
  }

  return { ok: true, simulated: false, messageId: result.data?.id ?? null };
}
