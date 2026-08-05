import { formatPeso, getEmailLinks, getSupportContactHtml } from "./emailUtils.js";

/** Minimal Hobby Arena email shell — clean, invoice-friendly. */

export const EMAIL_BRAND = {
  name: "Hobby Arena PH",
  tagline: "Your Trusted Source for Premium TCG",
  siteUrl: "https://www.hobbyarena.ph",
  logoPath: "/hobby_arena_logo.png",
  logoAspect: 1536 / 1024,
  colors: {
    page: "#F7F7F5",
    panel: "#FFFFFF",
    text: "#1C2434",
    muted: "#7A8499",
    faint: "#B8BFCA",
    border: "#E6E8EC",
    ink: "#0B1538",
    gold: "#C9A227",
    navy: "#2563EB",
    accent: "#0B1538",
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
  return getSupportContactHtml();
}

/** Pre-order reminder — only for customers who have not fully paid. */
export function preorderReminderBlock({
  depositPercent = 30,
  title,
  lines,
  placeholders = {},
} = {}) {
  const c = EMAIL_BRAND.colors;
  const dp = Math.max(0, Math.min(100, Number(depositPercent) || 30));
  const balance = Math.max(0, 100 - dp);
  const links = getEmailLinks();
  const heading = String(title || "Pre-Order Reminder").trim() || "Pre-Order Reminder";
  const paragraphs = resolveReminderLines(lines, {
    depositPercent: String(dp),
    balancePercent: String(balance),
    ...placeholders,
  });

  return `
    <div style="margin:0 0 8px;padding:16px 18px;border-radius:8px;background:${c.page};border:1px solid ${c.border}">
      <p style="margin:0 0 10px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${c.ink}">
        ${escapeHtml(heading)}
      </p>
      ${paragraphs.map((line, index) => `
      <p style="margin:0 0 ${index === paragraphs.length - 1 ? "12px" : "8px"};font-family:${FONT};font-size:13px;line-height:1.6;color:${c.text}">
        ${escapeHtml(line)}
      </p>`).join("")}
      <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${c.muted}">
        Questions? Message us directly at
        <a href="${escapeHtml(links.messengerUrl)}" style="color:${c.ink};font-weight:600;text-decoration:underline">Hobby Arena PH</a>
      </p>
    </div>
  `;
}

export function preorderReminderText({
  depositPercent = 30,
  title,
  lines,
  placeholders = {},
} = {}) {
  const dp = Math.max(0, Math.min(100, Number(depositPercent) || 30));
  const balance = Math.max(0, 100 - dp);
  const links = getEmailLinks();
  const heading = String(title || "Pre-Order Reminder").trim() || "Pre-Order Reminder";
  const paragraphs = resolveReminderLines(lines, {
    depositPercent: String(dp),
    balancePercent: String(balance),
    ...placeholders,
  });
  return [
    heading,
    "",
    ...paragraphs.flatMap((line, index) => (index === 0 ? [line] : ["", line])),
    "",
    `Questions? Message us directly at Hobby Arena PH (${links.messengerUrl})`,
  ].join("\n");
}

function resolveReminderLines(lines, placeholders = {}) {
  const depositPercent = placeholders.depositPercent ?? "30";
  const balancePercent = placeholders.balancePercent
    ?? String(Math.max(0, 100 - (Number(depositPercent) || 30)));
  const defaults = [
    `${depositPercent}% down payment is non-refundable (unless it is due to country allocation cuts)`,
    `The remaining ${balancePercent}% balance must be fully settled before the Product Release Day to ensure smooth processing and timely turnover of your order.`,
    "Orders that remain unpaid or unclaimed seven (7) days after the Product Release Day will be considered abandoned, and the corresponding down payment will strictly be forfeited.",
  ];
  const source = Array.isArray(lines) && lines.length
    ? lines.map((line) => String(line ?? "").trim()).filter(Boolean)
    : defaults;
  return source.map((line) => line.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (
    placeholders[key] != null ? String(placeholders[key]) : ""
  )));
}

/**
 * Side-by-side CTA buttons for balance payment or refund detail submission.
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
  const buttonBase = `display:block;width:100%;padding:12px 14px;border-radius:8px;font-family:${FONT};font-size:13px;font-weight:700;line-height:1.35;text-align:center;text-decoration:none;box-sizing:border-box`;
  const linkAttrs = 'target="_blank" rel="noopener noreferrer"';

  const primaryButton = `
    <a href="${escapeHtml(accountHref)}" ${linkAttrs} style="${buttonBase};background:${c.ink};color:#FFFFFF;border:1px solid ${c.ink}">
      ${escapeHtml(accountLabel)}
    </a>
  `;
  const secondaryButton = `
    <a href="${escapeHtml(messengerHref)}" ${linkAttrs} style="${buttonBase};background:${c.gold};color:${c.ink};border:1px solid ${c.gold}">
      ${escapeHtml(messengerLabel)}
    </a>
  `;

  return `
    <div style="margin:16px 0 20px;padding:16px;border-radius:10px;background:${c.page};border:1px solid ${c.border}">
      ${caption ? `<p style="margin:0 0 12px;font-family:${FONT};font-size:14px;line-height:1.6;color:${c.muted};text-align:center">${escapeHtml(caption)}</p>` : ""}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="50%" align="center" valign="top" style="padding:0 6px 0 0">
            ${primaryButton}
          </td>
          <td width="50%" align="center" valign="top" style="padding:0 0 0 6px">
            ${secondaryButton}
          </td>
        </tr>
      </table>
    </div>
  `;
}

/** Single Messenger CTA (e.g. ready for pickup). */
export function messengerButton({
  caption = "",
  label = "Message Hobby Arena PH",
  href,
} = {}) {
  const c = EMAIL_BRAND.colors;
  const links = getEmailLinks();
  const target = href || links.messengerUrl;
  return `
    <div style="margin:16px 0 8px;text-align:center">
      ${caption ? `<p style="margin:0 0 12px;font-family:${FONT};font-size:14px;line-height:1.6;color:${c.muted}">${escapeHtml(caption)}</p>` : ""}
      <a href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 22px;border-radius:8px;background:${c.gold};color:${c.ink};font-family:${FONT};font-size:13px;font-weight:700;text-decoration:none;border:1px solid ${c.gold}">
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

export function wrapSimpleEmail({ preheader = "", bodyHtml, footerNote = "" }) {
  const c = EMAIL_BRAND.colors;
  const year = new Date().getFullYear();
  const links = getEmailLinks();
  const displayHost = String(links.displaySiteUrl || links.siteUrl).replace(/^https?:\/\//, "");

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
              ${footerNote ? `<div style="margin:0 0 12px;font-family:${FONT};font-size:12px;line-height:1.6;color:${c.muted}">${footerNote}</div>` : ""}
              <p style="margin:0;font-family:${FONT};font-size:12px;color:${c.muted}">
                <a href="${escapeHtml(links.displaySiteUrl || links.siteUrl)}" style="color:${c.muted};text-decoration:none">${escapeHtml(displayHost)}</a>
                <span style="color:${c.faint}"> · </span>
                <a href="${escapeHtml(links.messengerUrl || links.facebookUrl)}" style="color:${c.muted};text-decoration:none">Hobby Arena PH</a>
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

/**
 * @param {object[]} lineItems
 * @param {{ highlightId?: string|null, useAllocation?: boolean }} [options]
 *   useAllocation — when allocated qty is set, Qty shows "7 of 10" and Total = unit × allocated
 */
export function invoiceTable(lineItems, { highlightId = null, useAllocation = false } = {}) {
  const c = EMAIL_BRAND.colors;
  const rows = lineItems
    .map((item) => {
      const orderedQty = Math.max(1, Number(item.quantity) || 1);
      const allocated = Math.max(0, Number(item.allocatedQty) || 0);
      const billQty = useAllocation && allocated > 0 ? Math.min(allocated, orderedQty) : orderedQty;
      const qtyLabel = useAllocation && allocated > 0
        ? `${billQty} of ${orderedQty}`
        : String(orderedQty);
      const unitPrice = Number(item.price) || (item.lineTotal > 0 ? Number(item.lineTotal) / orderedQty : 0);
      const lineTotal = useAllocation && allocated > 0
        ? unitPrice * billQty
        : item.lineTotal > 0
          ? Number(item.lineTotal)
          : unitPrice > 0
            ? unitPrice * orderedQty
            : 0;
      const unitLabel = unitPrice > 0
        ? formatPeso(unitPrice)
        : "—";
      const totalLabel = lineTotal > 0
        ? formatPeso(lineTotal)
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
          <td style="padding:12px 12px 12px 16px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.45;color:${c.text};vertical-align:top;${rowBg}${highlighted ? `font-weight:600;` : ""}">
            ${escapeHtml(item.name)}${tag}${statusMeta}
          </td>
          <td align="right" style="padding:12px 8px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:14px;color:${c.muted};vertical-align:top;width:88px;white-space:nowrap;${rowBg}">
            ${unitLabel}
          </td>
          <td align="center" style="padding:12px 8px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:14px;color:${c.muted};vertical-align:top;width:${useAllocation ? "64px" : "40px"};white-space:nowrap;${rowBg}">
            ${qtyLabel}
          </td>
          <td align="right" style="padding:12px 16px 12px 12px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:14px;color:${c.text};vertical-align:top;width:96px;white-space:nowrap;${rowBg}">
            ${totalLabel}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px">
      <tr>
        <td style="padding:0 12px 8px 16px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${c.muted}">Item</td>
        <td align="right" style="padding:0 8px 8px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${c.muted};width:88px">Unit Price</td>
        <td align="center" style="padding:0 8px 8px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${c.muted};width:${useAllocation ? "64px" : "40px"}">Qty</td>
        <td align="right" style="padding:0 16px 8px 12px;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${c.muted};width:96px">Total</td>
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
