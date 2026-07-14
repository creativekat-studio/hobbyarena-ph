import {
  EMAIL_BRAND,
  bodyLead,
  bodyText,
  escapeHtml,
  wrapSimpleEmail,
} from "./emailTemplate.js";
import { getEmailLinks } from "./emailUtils.js";

export const PASSWORD_RESET_EMAIL_TYPE = "password_reset";

export const DEFAULT_PASSWORD_RESET_BODY =
  "We received a request to reset the password for {{email}}.\n\n"
  + "Tap the button below to choose a new password. This link expires soon for your security.\n\n"
  + "If you didn't ask for this, you can ignore this email — your password won't change.";

export const PASSWORD_RESET_PLACEHOLDERS = [
  { token: "{{email}}", description: "Account email" },
];

function renderBodyHtml(body, { email }) {
  const escaped = escapeHtml(String(body || DEFAULT_PASSWORD_RESET_BODY).trim());
  const withValues = escaped.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    if (key === "email") return `<strong>${escapeHtml(email)}</strong>`;
    return "";
  });
  return withValues
    .split(/\n{2,}/)
    .map((paragraph) => bodyText(paragraph.replace(/\n/g, "<br>")))
    .join("");
}

function resetButton(resetLink) {
  const c = EMAIL_BRAND.colors;
  return `
    <div style="margin:24px 0 8px;text-align:center">
      <a href="${escapeHtml(resetLink)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;border-radius:8px;background:${c.gold};color:${c.ink};font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:800;letter-spacing:0.04em;text-decoration:none;border:1px solid ${c.gold}">
        Reset password
      </a>
    </div>
  `;
}

/**
 * Branded password-reset email (Hobby Arena shell + admin-editable body).
 * @param {{ email: string, resetLink: string, bodyOverride?: string }} options
 */
export function buildPasswordResetEmail({
  email,
  resetLink,
  bodyOverride = "",
} = {}) {
  const safeEmail = String(email || "").trim() || "trainer@example.com";
  const link = String(resetLink || "").trim() || `${getEmailLinks().siteUrl}/account`;
  const body = String(bodyOverride || "").trim() || DEFAULT_PASSWORD_RESET_BODY;
  const c = EMAIL_BRAND.colors;

  const subject = "Reset your Hobby Arena password";
  const text = [
    "Reset your Hobby Arena password",
    "",
    body
      .replace(/\{\{\s*email\s*\}\}/gi, safeEmail)
      .replace(/\{\{\s*\w+\s*\}\}/g, ""),
    "",
    "Reset password:",
    link,
    "",
    `— ${EMAIL_BRAND.name}`,
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${c.ink}">
      Reset your password
    </p>
    ${bodyLead("Use the secure button below to set a new password for your Hobby Arena account.")}
    ${renderBodyHtml(body, { email: safeEmail })}
    ${resetButton(link)}
    <p style="margin:18px 0 0;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.6;color:${c.muted};text-align:center">
      Button not working? Reply to this email or message Hobby Arena PH and we’ll help.
    </p>
  `;

  return {
    subject,
    text,
    html: wrapSimpleEmail({
      preheader: "Reset your Hobby Arena password.",
      bodyHtml,
      footerNote: "This link was requested from the Hobby Arena account page.",
    }),
  };
}
