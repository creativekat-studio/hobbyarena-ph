import {
  EMAIL_BRAND,
  bodyLead,
  bodyText,
  escapeHtml,
  formatEmailDate,
  metaLine,
  quoteBlock,
  sectionHeading,
  wrapSimpleEmail,
} from "./emailTemplate.js";

export function buildAdminInquiryEmail(inquiry) {
  const subjectText = inquiry.subject?.trim() || "General inquiry";
  const subject = `New inquiry — ${subjectText}`;
  const receivedAt = formatEmailDate(new Date().toISOString());
  const replySubject = encodeURIComponent(`Re: ${subjectText}`);
  const mailto = `mailto:${encodeURIComponent(inquiry.email)}?subject=${replySubject}`;

  const text = [
    "New inquiry — Hobby Arena",
    "",
    `From: ${inquiry.name} <${inquiry.email}>`,
    `Date: ${receivedAt}`,
    `Subject: ${subjectText}`,
    "",
    inquiry.message,
    "",
    `Reply: ${inquiry.email}`,
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${EMAIL_BRAND.colors.ink}">
      New inquiry
    </p>
    ${metaLine(`${escapeHtml(receivedAt)}`)}
    ${bodyLead(`<strong>${escapeHtml(inquiry.name)}</strong> sent a message through the contact form.`)}
    ${sectionHeading("From")}
    ${metaLine(`<a href="mailto:${escapeHtml(inquiry.email)}" style="color:${EMAIL_BRAND.colors.text};text-decoration:none">${escapeHtml(inquiry.email)}</a>`)}
    ${sectionHeading("Subject")}
    ${bodyText(`<strong>${escapeHtml(subjectText)}</strong>`)}
    ${sectionHeading("Message")}
    ${quoteBlock(inquiry.message)}
    ${bodyText(`<a href="${mailto}" style="color:${EMAIL_BRAND.colors.accent};text-decoration:none;font-weight:600">Reply to customer →</a>`)}
  `;

  const html = wrapSimpleEmail({
    preheader: `${inquiry.name}: ${subjectText}`,
    bodyHtml,
    footerNote: "Storefront inquiry — reply or manage in Admin → Inquiries.",
  });

  return { subject, text, html };
}

export function buildInquiryAutoReply(inquiry) {
  const subjectText = inquiry.subject?.trim();
  const subject = subjectText
    ? `We received your message — ${subjectText}`
    : "We received your message — Hobby Arena";

  const text = [
    `Hello ${inquiry.name},`,
    "",
    "Thanks for reaching out to Hobby Arena. We received your message and will get back to you soon.",
    "",
    subjectText ? `Subject: ${subjectText}` : "",
    "",
    inquiry.message,
    "",
    `— ${EMAIL_BRAND.name}`,
  ]
    .filter(Boolean)
    .join("\n");

  const bodyHtml = `
    <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${EMAIL_BRAND.colors.ink}">
      Message received
    </p>
    ${bodyLead(`Hello <strong>${escapeHtml(inquiry.name)}</strong>,`)}
    ${bodyText("Thanks for reaching out. We received your message and will reply during our processing hours (Mon–Fri, 8:00 AM – 8:00 PM).")}
    ${subjectText ? `${sectionHeading("Subject")}${bodyText(`<strong>${escapeHtml(subjectText)}</strong>`)}` : ""}
    ${sectionHeading("Your message")}
    ${quoteBlock(inquiry.message)}
    ${bodyText(`<span style="color:${EMAIL_BRAND.colors.muted}">We'll reply to <strong style="color:${EMAIL_BRAND.colors.text}">${escapeHtml(inquiry.email)}</strong>.</span>`)}
  `;

  const html = wrapSimpleEmail({
    preheader: "We got your message and will reply soon.",
    bodyHtml,
  });

  return { subject, text, html };
}
