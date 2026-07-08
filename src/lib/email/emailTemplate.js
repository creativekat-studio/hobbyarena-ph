import { getEmailLinks, getSupportEmail } from "./emailUtils.js";

/** Minimal Hobby Arena email shell — clean, invoice-friendly. */

export const EMAIL_BRAND = {
  name: "Hobby Arena",
  tagline: "Your Trusted Source for Premium TCG",
  supportEmail: "hello@hobbyarena.ph",
  siteUrl: "https://hobbyarena.vercel.app",
  logoPath: "/hobby_arena_hd.png",
  logoAspect: 1536 / 1024,
  colors: {
    page: "#F7F7F5",
    panel: "#FFFFFF",
    text: "#1C2434",
    muted: "#7A8499",
    faint: "#B8BFCA",
    border: "#E6E8EC",
    ink: "#0B1538",
    gold: "#B8921E",
    accent: "#7C3AED",
  },
};

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

export function getEmailLogoUrl() {
  const base = getEmailLinks().siteUrl;
  return `${String(base).replace(/\/$/, "")}${EMAIL_BRAND.logoPath}`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatEmailDate(iso) {
  try {
    return new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    }).format(new Date(iso || Date.now()));
  } catch {
    return "";
  }
}

function preheaderBlock(text) {
  if (!text) return "";
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      ${escapeHtml(text)}&nbsp;&zwnj;&nbsp;&zwnj;
    </div>
  `;
}

export function emailLogo({ width = 128 } = {}) {
  const url = escapeHtml(getEmailLogoUrl());
  const height = Math.round(width / EMAIL_BRAND.logoAspect);
  return `
    <img
      src="${url}"
      alt="${escapeHtml(EMAIL_BRAND.name)}"
      width="${width}"
      height="${height}"
      style="display:block;width:${width}px;height:${height}px;margin:0 auto;border:0;outline:none;-ms-interpolation-mode:bicubic"
    />
  `;
}

export function emailHeader() {
  const c = EMAIL_BRAND.colors;
  return `
    <div style="text-align:center;margin:0 0 28px">
      ${emailLogo({ width: 128 })}
      <p style="margin:14px 0 0;font-family:${FONT};font-size:12px;font-weight:500;letter-spacing:0.04em;color:${c.muted}">
        ${EMAIL_BRAND.tagline}
      </p>
    </div>
  `;
}

export function divider() {
  return `<hr style="border:0;border-top:1px solid ${EMAIL_BRAND.colors.border};margin:28px 0" />`;
}

export function sectionHeading(label) {
  const c = EMAIL_BRAND.colors;
  return `
    <p style="margin:0 0 14px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${c.muted}">
      <span style="color:${c.faint};margin-right:6px">—</span>${escapeHtml(label)}
    </p>
  `;
}

export function bodyText(html) {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.7;color:${EMAIL_BRAND.colors.text}">${html}</p>`;
}

export function bodyLead(html) {
  return `<p style="margin:0 0 20px;font-family:${FONT};font-size:16px;line-height:1.65;color:${EMAIL_BRAND.colors.text}">${html}</p>`;
}

export function metaLine(html) {
  return `<p style="margin:0 0 6px;font-family:${FONT};font-size:14px;line-height:1.6;color:${EMAIL_BRAND.colors.muted}">${html}</p>`;
}

export function quoteBlock(text) {
  const c = EMAIL_BRAND.colors;
  return `
    <div style="margin:0 0 8px;padding:0 0 0 14px;border-left:2px solid ${c.border};font-family:${FONT};font-size:15px;line-height:1.75;color:${c.text};white-space:pre-wrap">
      ${escapeHtml(text)}
    </div>
  `;
}

export function statusList(items) {
  const c = EMAIL_BRAND.colors;
  const rows = items
    .map(({ label, done = false, note = "" }) => `
      <tr>
        <td width="22" valign="top" style="padding:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.5;color:${done ? c.accent : c.faint}">
          ${done ? "✓" : "○"}
        </td>
        <td valign="top" style="padding:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.5;color:${c.text}">
          ${escapeHtml(label)}
        </td>
        <td align="right" valign="top" style="padding:0 0 12px;font-family:${FONT};font-size:13px;line-height:1.5;color:${c.muted};white-space:nowrap">
          ${escapeHtml(note || (done ? "Done" : "—"))}
        </td>
      </tr>
    `)
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px">
      ${rows}
    </table>
  `;
}

/**
 * @param {{
 *   preheader?: string;
 *   bodyHtml: string;
 *   footerNote?: string;
 * }} options
 */
export function defaultFooterNote() {
  const supportEmail = getSupportEmail();
  return `Questions? Email us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:${EMAIL_BRAND.colors.muted};text-decoration:underline">${escapeHtml(supportEmail)}</a>. Please do not reply to this message — this inbox is not monitored.`;
}

/**
 * Stacked CTA buttons for balance payment or refund detail submission.
 * @param {{ caption?: string; accountLabel: string; accountHref: string; messengerLabel: string; messengerHref: string }} options
 */
export function customerResponseButtons({
  caption = "",
  accountLabel,
  accountHref,
  messengerLabel,
  messengerHref,
}) {
  const c = EMAIL_BRAND.colors;
  const buttonBase = `display:block;width:100%;max-width:320px;margin:0 auto;padding:13px 20px;border-radius:8px;font-family:${FONT};font-size:14px;font-weight:700;line-height:1.35;text-align:center;text-decoration:none;box-sizing:border-box`;

  const linkAttrs = 'target="_blank" rel="noopener noreferrer"';

  const accountButton = `
    <a href="${escapeHtml(accountHref)}" ${linkAttrs} style="${buttonBase};background:${c.accent};color:#FFFFFF;border:1px solid ${c.accent}">
      ${escapeHtml(accountLabel)}
    </a>
  `;
  const messengerButton = `
    <a href="${escapeHtml(messengerHref)}" ${linkAttrs} style="${buttonBase};background:#0084FF;color:#FFFFFF;border:1px solid #0084FF">
      ${escapeHtml(messengerLabel)}
    </a>
  `;

  return `
    <div style="margin:8px 0 20px;padding:18px 16px;border-radius:10px;background:${c.page};border:1px solid ${c.border}">
      ${caption ? `<p style="margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:1.6;color:${c.muted};text-align:center">${escapeHtml(caption)}</p>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:0 0 10px">${accountButton}</td>
        </tr>
        <tr>
          <td align="center" style="padding:0">${messengerButton}</td>
        </tr>
      </table>
    </div>
  `;
}

export function wrapSimpleEmail({ preheader = "", bodyHtml, footerNote = "" }) {
  const c = EMAIL_BRAND.colors;
  const year = new Date().getFullYear();
  const links = getEmailLinks();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(EMAIL_BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background:${c.page};color:${c.text};-webkit-text-size-adjust:100%">
  ${preheaderBlock(preheader)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.page};padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${c.panel};padding:40px 36px">
          <tr>
            <td style="font-family:${FONT}">
              ${emailHeader()}
              ${bodyHtml}
              ${divider()}
              <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;line-height:1.6;color:${c.muted}">
                ${footerNote || defaultFooterNote()}
              </p>
              <p style="margin:0;font-family:${FONT};font-size:12px;color:${c.muted}">
                <a href="${links.siteUrl}" style="color:${c.muted};text-decoration:none">${links.siteUrl.replace(/^https?:\/\//, "")}</a>
                <span style="color:${c.faint}"> · </span>
                <a href="mailto:${escapeHtml(links.supportEmail)}" style="color:${c.muted};text-decoration:none">${escapeHtml(links.supportEmail)}</a>
              </p>
              <p style="margin:16px 0 0;font-family:${FONT};font-size:11px;color:${c.faint}">© ${year} ${EMAIL_BRAND.name}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function invoiceTable(lineItems, { highlightId = null } = {}) {
  const c = EMAIL_BRAND.colors;
  const rows = lineItems
    .map((item) => {
      const amount = item.lineTotal > 0
        ? `₱${Number(item.lineTotal).toLocaleString("en-PH")}`
        : item.price > 0
          ? `₱${Number(item.price * item.quantity).toLocaleString("en-PH")}`
          : "—";
      const tag = item.tag
        ? `<span style="display:block;margin-top:2px;font-size:12px;color:${c.muted}">${escapeHtml(item.tag)}</span>`
        : "";
      const statusMeta = item.status
        ? `<span style="display:block;margin-top:4px;font-size:12px;color:${c.muted}">${escapeHtml(item.status)}${item.payment ? ` · ${escapeHtml(item.payment)}` : ""}</span>`
        : "";
      const highlighted = highlightId && item.id === highlightId;
      const rowBg = highlighted ? `background:${c.page};` : "";
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.45;color:${c.text};vertical-align:top;${rowBg}${highlighted ? `font-weight:600;` : ""}">
            ${escapeHtml(item.name)}${tag}${statusMeta}
          </td>
          <td align="center" style="padding:12px 8px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:14px;color:${c.muted};vertical-align:top;width:48px;${rowBg}">
            ${item.quantity}
          </td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:14px;color:${c.text};vertical-align:top;width:96px;white-space:nowrap;${rowBg}">
            ${amount}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px">
      <tr>
        <td style="padding:0 0 8px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${c.muted}">Item</td>
        <td align="center" style="padding:0 8px 8px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${c.muted};width:48px">Qty</td>
        <td align="right" style="padding:0 0 8px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${c.muted};width:96px">Amount</td>
      </tr>
      ${rows}
    </table>
  `;
}

export function totalsBlock(rows) {
  const c = EMAIL_BRAND.colors;
  const html = rows
    .map(({ label, value, strong = false }) => `
      <tr>
        <td style="padding:6px 0;font-family:Inter,Arial,sans-serif;font-size:${strong ? "15px" : "14px"};font-weight:${strong ? "700" : "500"};color:${strong ? c.ink : c.muted};text-align:right">
          ${escapeHtml(label)}
        </td>
        <td style="padding:6px 0 6px 20px;font-family:Inter,Arial,sans-serif;font-size:${strong ? "15px" : "14px"};font-weight:${strong ? "700" : "600"};color:${strong ? c.ink : c.text};text-align:right;width:110px;white-space:nowrap">
          ${value}
        </td>
      </tr>
    `)
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="margin:12px 0 0">
      ${html}
    </table>
  `;
}
