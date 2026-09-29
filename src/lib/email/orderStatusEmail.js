import {
  formatPeso,
  getEmailLinks,
  getSupportContactHtml,
  isPreorderEmailContext,
  resolveReminderFooter,
  shouldShowPreorderReminder,
} from "./emailUtils.js";
import {
  EMAIL_BRAND,
  bodyLead,
  bodyText,
  customerResponseButtons,
  escapeHtml,
  formatEmailDate,
  messengerButton,
  metaLine,
  preorderReminderBlock,
  preorderReminderText,
  quoteBlock,
  sectionHeading,
  statusList,
  totalsBlock,
  wrapSimpleEmail,
} from "./emailTemplate.js";

export const BALANCE_ACTION_EMAIL_TYPES = new Set(["balance_due_full", "balance_due_partial"]);
export const REFUND_ACTION_EMAIL_TYPES = new Set(["partial_refund_pending", "full_refund_pending"]);
export const DEFAULT_REFUND_ACTION_NOTE = "Refunds go to the bank details on your account. Submit them with the button below.";
export const DEFAULT_BALANCE_ACTION_NOTE = "Pay the remaining balance and send your proof with the button below.";
const REFUND_BUTTON_LABEL = "Submit Bank Details";
const BALANCE_BUTTON_LABEL = "Submit Proof";
/** Off on every template until an admin turns it on. `emailType` is kept for call sites. */
export function defaultShowMessengerButton(_emailType) {
  return false;
}

function depositPercentOf(order) {
  return Math.max(0, Math.min(100, Number(order?.depositPercent) || 30));
}

function balancePercentOf(order) {
  return Math.max(0, 100 - depositPercentOf(order));
}

function consolidatedNet(order) {
  const net = Number(order?.consolidated?.totals?.net);
  if (Number.isFinite(net)) return net;
  const refund = Number(order?.refundAmount) || 0;
  if (refund > 0) return -refund;
  return Number(order?.balanceDue) || 0;
}

function consolidatedOrderIds(order) {
  const ids = Array.isArray(order?.consolidated?.orderIds)
    ? order.consolidated.orderIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (ids.length) return ids;
  return order?.id ? [String(order.id)] : [];
}

function consolidatedId(order) {
  const id = String(order?.consolidated?.id || "").trim();
  return !id || id === "—" ? "" : id;
}

function consolidatedNetLabel(order) {
  const totals = order?.consolidated?.totals || {};
  if (totals.netLabel) return totals.netLabel;
  const net = consolidatedNet(order);
  if (net < 0) return "Refund amount";
  if (net > 0) return "Balance";
  return "No balance";
}

function gridHeaderCell(label, { align = "left" } = {}) {
  const c = EMAIL_BRAND.colors;
  return `
    <td align="${align}" valign="bottom" style="padding:0 8px 8px 0;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.06em;line-height:1.25;text-transform:uppercase;color:${c.muted}">
      ${escapeHtml(label)}
    </td>
  `;
}

function gridBodyCell(content, { align = "left", muted = false, strong = false, nowrap = false } = {}) {
  const c = EMAIL_BRAND.colors;
  return `
    <td align="${align}" valign="top" style="padding:12px 8px 12px 0;border-bottom:1px solid ${c.border};font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.4;color:${muted ? c.muted : c.text};font-weight:${strong ? "600" : "400"};${nowrap ? "white-space:nowrap;" : ""}">
      ${content}
    </td>
  `;
}

function stackLine(label, value) {
  const c = EMAIL_BRAND.colors;
  return `
    <tr>
      <td style="padding:2px 12px 2px 0;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.4;color:${c.muted}">${escapeHtml(label)}</td>
      <td align="right" style="padding:2px 0;font-family:Inter,Arial,sans-serif;font-size:13px;font-weight:600;line-height:1.4;color:${c.text};white-space:nowrap">${value}</td>
    </tr>
  `;
}

function pendingMarkup() {
  const c = EMAIL_BRAND.colors;
  return `<span style="font-style:italic;font-weight:500;color:${c.muted}">Pending</span>`;
}

function dashMarkup() {
  const c = EMAIL_BRAND.colors;
  return `<span style="color:${c.muted}">—</span>`;
}

function itemAllocationPending(item) {
  return Boolean(item?.allocationPending || item?.pending);
}

function allocationCell(item) {
  if (itemAllocationPending(item)) return pendingMarkup();
  const qty = Number(item?.totalQty) || 0;
  const stored = Number(item?.allocationPercent);
  const pct = Number.isFinite(stored)
    ? stored
    : (qty > 0 ? ((Number(item?.newQty) || 0) / qty) * 100 : 0);
  return `${pct.toFixed(2)}%`;
}

function qtyCell(item) {
  if (itemAllocationPending(item)) return dashMarkup();
  return String(Math.max(0, Number(item?.newQty) || 0));
}

function amountCell(item) {
  if (itemAllocationPending(item)) return dashMarkup();
  return formatPeso(item?.newAmount);
}

function orderDetailsTable(rows, totalDp) {
  if (!rows.length) return "";
  const c = EMAIL_BRAND.colors;
  const wideRows = rows.map((row) => `
    <tr>
      ${gridBodyCell(escapeHtml(row.orderId || "—"), { muted: true, nowrap: true })}
      ${gridBodyCell(escapeHtml(row.name || "Item"))}
      ${gridBodyCell(String(Math.max(0, Number(row.qty) || 0)), { align: "center", muted: true, nowrap: true })}
      ${gridBodyCell(formatPeso(row.dpAmount), { align: "right", nowrap: true })}
    </tr>
  `).join("");
  const narrowRows = rows.map((row) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border-bottom:1px solid ${c.border}">
      <tr>
        <td style="padding:0 0 2px;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:1.4;color:${c.muted}">
          ${escapeHtml(row.orderId || "—")}
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1.4;color:${c.text}">
          ${escapeHtml(row.name || "Item")}
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${stackLine("Qty", String(Math.max(0, Number(row.qty) || 0)))}
            ${stackLine("Downpayment", formatPeso(row.dpAmount))}
          </table>
        </td>
      </tr>
    </table>
  `).join("");
  return `
    ${sectionHeading("Order details")}
    <table role="presentation" class="consolidated-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px">
      <tr>
        ${gridHeaderCell("Order #")}
        ${gridHeaderCell("Product")}
        ${gridHeaderCell("Qty", { align: "center" })}
        ${gridHeaderCell("Downpayment", { align: "right" })}
      </tr>
      ${wideRows}
    </table>
    <div class="consolidated-stack" style="display:none;max-height:0;overflow:hidden;">${narrowRows}</div>
    ${totalsBlock([{ label: "Total downpayment:", value: formatPeso(totalDp) }])}
    <div style="clear:both;height:20px"></div>
  `;
}

function summaryItemsTable(items) {
  if (!items.length) return "";
  const c = EMAIL_BRAND.colors;
  const wideRows = items.map((item) => `
    <tr>
      ${gridBodyCell(escapeHtml(item.name || "Item"))}
      ${gridBodyCell(String(Math.max(0, Number(item.totalQty) || 0)), { align: "center", muted: true, nowrap: true })}
      ${gridBodyCell(formatPeso(item.totalDp), { align: "right", muted: true, nowrap: true })}
      ${gridBodyCell(allocationCell(item), { align: "center", nowrap: true })}
      ${gridBodyCell(qtyCell(item), { align: "center", nowrap: true })}
      ${gridBodyCell(amountCell(item), { align: "right", nowrap: true })}
    </tr>
  `).join("");
  const narrowRows = items.map((item) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border-bottom:1px solid ${c.border}">
      <tr>
        <td style="padding:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1.4;color:${c.text}">
          ${escapeHtml(item.name || "Item")}
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${stackLine("Qty", String(Math.max(0, Number(item.totalQty) || 0)))}
            ${stackLine("Downpayment", formatPeso(item.totalDp))}
            ${stackLine("Allocation", allocationCell(item))}
            ${stackLine("New qty", qtyCell(item))}
            ${stackLine("New amount", amountCell(item))}
          </table>
        </td>
      </tr>
    </table>
  `).join("");
  return `
    ${sectionHeading("Summary")}
    <table role="presentation" class="consolidated-table" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px">
      <tr>
        ${gridHeaderCell("Product")}
        ${gridHeaderCell("Qty", { align: "center" })}
        ${gridHeaderCell("Downpayment", { align: "right" })}
        ${gridHeaderCell("Alloc %", { align: "center" })}
        ${gridHeaderCell("New Qty", { align: "center" })}
        ${gridHeaderCell("New Amount", { align: "right" })}
      </tr>
      ${wideRows}
    </table>
    <div class="consolidated-stack" style="display:none;max-height:0;overflow:hidden;">${narrowRows}</div>
  `;
}

function consolidatedNoteBlock(order) {
  const note = String(order?.notes || "").trim();
  if (!note) return "";
  return `
    ${sectionHeading("Note")}
    ${quoteBlock(note)}
    <div style="height:12px"></div>
  `;
}

function presentationTotalsBlock({ newTotal, totalDp, net, netLabel, totalsPending }) {
  const rows = [
    { label: "New total:", value: totalsPending ? dashMarkup() : formatPeso(newTotal) },
    { label: "Total downpayment:", value: formatPeso(totalDp) },
    {
      label: `${totalsPending ? "Settlement" : netLabel}:`,
      value: totalsPending ? dashMarkup() : formatPeso(Math.abs(net)),
      strong: true,
    },
  ];
  return `${totalsBlock(rows)}<div style="clear:both"></div>`;
}

function consolidatedEmailTables(order) {
  const details = Array.isArray(order?.consolidated?.orderDetails) ? order.consolidated.orderDetails : [];
  const items = Array.isArray(order?.consolidated?.items) ? order.consolidated.items : [];
  const totals = order?.consolidated?.totals || {};
  const totalsPending = items.length > 0 && items.every((item) => itemAllocationPending(item));
  return `${orderDetailsTable(details, totals.totalDp)}${summaryItemsTable(items)}${presentationTotalsBlock({
    newTotal: totals.newTotal,
    totalDp: totals.totalDp,
    net: consolidatedNet(order),
    netLabel: consolidatedNetLabel(order),
    totalsPending,
  })}${consolidatedNoteBlock(order)}`;
}

function lineIsPreorderPresentation(order, line) {
  return line?.tag === "Pre-order" || order?.type === "Pre-order" || order?.kind === "preorder";
}

function lineDownpayment(order, line) {
  const paid = Number(line?.depositPaid);
  if (Number.isFinite(paid) && paid > 0) return paid;
  const qty = Math.max(1, Number(line?.quantity) || 1);
  const full = Number(line?.lineTotal) > 0 ? Number(line.lineTotal) : itemUnitPrice(line) * qty;
  if (lineIsPreorderPresentation(order, line)) return (full * depositPercentOf(order)) / 100;
  return full;
}

function presentationLines(order) {
  const lines = normalizeLineItems(order);
  const updated = order?.updatedLineItem;
  if (!updated?.name) return lines;
  const overlay = {
    name: String(updated.name),
    quantity: Number(updated.quantity) || undefined,
    price: Number(updated.price) || undefined,
    tag: updated.tag || undefined,
    payment: updated.payment ? String(updated.payment) : undefined,
    status: updated.status ? String(updated.status) : undefined,
    balanceDue: updated.balanceDue != null ? Number(updated.balanceDue) || 0 : undefined,
    refundAmount: updated.refundAmount != null ? Number(updated.refundAmount) || 0 : undefined,
    allocatedQty: updated.allocatedQty != null ? Number(updated.allocatedQty) || 0 : undefined,
    depositPaid: updated.depositPaid != null ? Number(updated.depositPaid) || 0 : undefined,
    lineTotal: Number(updated.lineTotal) > 0 ? Number(updated.lineTotal) : undefined,
    creditAmount: updated.creditAmount != null ? Number(updated.creditAmount) || 0 : undefined,
  };
  const merge = (line) => {
    const next = { ...line };
    for (const [key, value] of Object.entries(overlay)) {
      if (value !== undefined) next[key] = value;
    }
    if (!(Number(next.lineTotal) > 0)) next.lineTotal = payableLineTotal(next);
    return next;
  };
  const id = updated.id ? String(updated.id) : "";
  if (id && lines.some((line) => line.id === id)) {
    return lines.map((line) => (line.id === id ? merge(line) : line));
  }
  if (lines.length <= 1) {
    return [merge(lines[0] || { id, name: overlay.name, quantity: overlay.quantity || 1, price: 0, lineTotal: overlay.lineTotal || 0 })];
  }
  return lines;
}

/** Order details only. A single order does not repeat itself in a summary. */
export function singleOrderEmailSections(order) {
  const rows = presentationLines(order).map((line) => ({
    orderId: String(order?.id || "—"),
    name: line.name || "Item",
    qty: Math.max(1, Number(line.quantity) || 1),
    dp: lineDownpayment(order, line),
  }));
  if (!rows.length) return { html: "", lines: [] };
  const totalDp = rows.reduce((sum, row) => sum + (Number(row.dp) || 0), 0);
  const note = String(order?.notes || "").trim();
  const html = `${orderDetailsTable(rows.map((row) => ({
    orderId: row.orderId,
    name: row.name,
    qty: row.qty,
    dpAmount: row.dp,
  })), totalDp)}${note ? consolidatedNoteBlock({ notes: note }) : ""}`;
  const lines = ["Order details"];
  for (const row of rows) {
    lines.push(`${row.orderId}  ${row.name}  ×${row.qty}  ${formatPeso(row.dp)}`);
  }
  lines.push(`Total downpayment: ${formatPeso(totalDp)}`);
  if (note) lines.push("", "Note", note);
  return { html, lines };
}

function actionNoteText(kind, actionNotes) {
  const custom = String(actionNotes?.[kind] ?? "").trim();
  if (actionNotes && Object.prototype.hasOwnProperty.call(actionNotes, kind)) return custom;
  return kind === "refund" ? DEFAULT_REFUND_ACTION_NOTE : DEFAULT_BALANCE_ACTION_NOTE;
}

function accountOrderUrl(order, { consolidated = false } = {}) {
  const links = getEmailLinks();
  const setId = consolidated
    ? (consolidatedId(order) || String(order?.mergedSetId || "").trim())
    : String(order?.mergedSetId || "").trim();
  const id = setId || String(order?.id || "").trim();
  if (!id) return links.accountUrl;
  return `${links.displaySiteUrl}/account/orders/${encodeURIComponent(id)}#balance-proof`;
}

function customerActionButtonsBlock(emailType, order, { showMessenger = false, actionNotes } = {}) {
  const links = getEmailLinks();
  const messengerOpts = {
    messengerLabel: "Message Hobby Arena PH",
    messengerHref: links.messengerUrl,
    showMessenger,
  };

  if (emailType === "consolidated_allocation") {
    const net = consolidatedNet(order);
    if (net < 0) {
      return customerResponseButtons({
        caption: actionNoteText("refund", actionNotes),
        accountLabel: REFUND_BUTTON_LABEL,
        accountHref: links.bankDetailsUrl,
        ...messengerOpts,
      });
    }
    if (net > 0) {
      return customerResponseButtons({
        caption: actionNoteText("balance", actionNotes),
        accountLabel: BALANCE_BUTTON_LABEL,
        accountHref: accountOrderUrl(order, { consolidated: true }),
        ...messengerOpts,
      });
    }
    return showMessenger ? messengerButton({ label: "Message Hobby Arena PH" }) : "";
  }

  if (BALANCE_ACTION_EMAIL_TYPES.has(emailType)) {
    return customerResponseButtons({
      caption: actionNoteText("balance", actionNotes),
      accountLabel: BALANCE_BUTTON_LABEL,
      accountHref: accountOrderUrl(order),
      ...messengerOpts,
    });
  }

  if (REFUND_ACTION_EMAIL_TYPES.has(emailType)) {
    return customerResponseButtons({
      caption: actionNoteText("refund", actionNotes),
      accountLabel: REFUND_BUTTON_LABEL,
      accountHref: links.bankDetailsUrl,
      ...messengerOpts,
    });
  }

  if (showMessenger) {
    return messengerButton({ label: "Message Hobby Arena PH" });
  }

  return "";
}

function isHttpsUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

function isInlineImageUrl(url) {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  return isHttpsUrl(trimmed) || /^data:image\//i.test(trimmed);
}

function statusAttachmentBlock(attachment) {
  if (!attachment) return "";
  const c = EMAIL_BRAND.colors;
  const label = escapeHtml(attachment.label || "Attachment");
  const rawUrl = String(attachment.url || "").trim();
  const links = getEmailLinks();
  const isPdf = attachment.type === "pdf"
    || /\.pdf(?:\?|#|$)/i.test(rawUrl)
    || /application\/pdf/i.test(rawUrl)
    || /^data:application\/pdf/i.test(rawUrl);

  if (isPdf && isHttpsUrl(rawUrl)) {
    const href = escapeHtml(rawUrl);
    return `
      <div style="margin:20px 0;padding:14px 16px;border-radius:8px;background:${c.page};border:1px solid ${c.border}">
        <p style="margin:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${c.muted}">Attachment</p>
        <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.5;color:${c.ink}">
          <a href="${href}" style="color:${c.accent};font-weight:700;text-decoration:none">${label} (PDF)</a>
        </p>
      </div>`;
  }

  if (isInlineImageUrl(rawUrl) && !isPdf) {
    // https URLs are preferred; data:image works in the sim inbox / some clients.
    // Do not HTML-escape the data: payload — that breaks the image. Only escape https.
    const src = isHttpsUrl(rawUrl) ? escapeHtml(rawUrl) : rawUrl.replace(/"/g, "&quot;");
    const href = isHttpsUrl(rawUrl) ? src : escapeHtml(links.accountUrl);
    const openLabel = isHttpsUrl(rawUrl) ? `Open ${label}` : `View ${label} in your account`;
    return `
      <div style="margin:20px 0;padding:14px 16px;border-radius:8px;background:${c.page};border:1px solid ${c.border}">
        <p style="margin:0 0 10px;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${c.muted}">Attachment</p>
        <a href="${href}" style="display:block"><img src="${src}" alt="${label}" style="max-width:100%;height:auto;border-radius:6px;border:1px solid ${c.border}" /></a>
        <p style="margin:10px 0 0;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.5;color:${c.muted}">
          <a href="${href}" style="color:${c.accent};font-weight:600;text-decoration:none">${openLabel}</a>
        </p>
      </div>`;
  }

  const accountHref = escapeHtml(links.accountUrl);
  return `
    <div style="margin:20px 0;padding:14px 16px;border-radius:8px;background:${c.page};border:1px solid ${c.border}">
      <p style="margin:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${c.muted}">Attachment</p>
      <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.5;color:${c.ink}">
        <a href="${accountHref}" style="color:${c.accent};font-weight:700;text-decoration:none">View ${label} in your account</a>
      </p>
    </div>`;
}

function orderMeta(order, { consolidated = false } = {}) {
  const date = escapeHtml(formatEmailDate(order.date));
  if (consolidated) {
    const id = consolidatedId(order);
    if (!id) return metaLine(date);
    return metaLine(
      `<strong style="color:${EMAIL_BRAND.colors.text}">${escapeHtml(id)}</strong> · ${date}`,
    );
  }
  return metaLine(
    `<strong style="color:${EMAIL_BRAND.colors.text}">${escapeHtml(order.id)}</strong> · ${date}`,
  );
}

function normalizeDiscountPercent(value) {
  const raw = Number(value);
  return Number.isFinite(raw) && raw > 0 ? Math.min(100, raw) : 0;
}

function payableLineTotal(item) {
  const quantity = Math.max(1, Number(item?.quantity) || 1);
  const stored = Number(item?.lineTotal);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const price = Number(item?.price) || 0;
  const discountPercent = normalizeDiscountPercent(item?.discountPercent);
  const unit = discountPercent > 0 ? price * (1 - discountPercent / 100) : price;
  return unit * quantity;
}

function normalizeLineItems(order) {
  if (Array.isArray(order.lineItems) && order.lineItems.length) {
    return order.lineItems.map((item) => {
      const discountPercent = normalizeDiscountPercent(item.discountPercent);
      return {
        id: item.id ? String(item.id) : "",
        name: String(item.name || "Item"),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        lineTotal: payableLineTotal(item),
        ...(discountPercent > 0 ? { discountPercent } : {}),
        tag: item.tag || "",
        payment: item.payment ? String(item.payment) : "",
        status: item.status ? String(item.status) : "",
        balanceDue: Number(item.balanceDue) || 0,
        refundAmount: Number(item.refundAmount) || 0,
        allocatedQty: Number(item.allocatedQty) || 0,
        depositPaid: Number(item.depositPaid) || 0,
        creditAmount: Number(item.creditAmount) || 0,
      };
    });
  }
  return [{
    id: "",
    name: order.items || "Order items",
    quantity: order.qty || 1,
    price: 0,
    lineTotal: 0,
    tag: "",
    payment: order.payment || "",
    status: order.status || "",
    balanceDue: Number(order.balanceDue) || 0,
    refundAmount: Number(order.refundAmount) || 0,
    allocatedQty: Number(order.allocatedQty) || 0,
    depositPaid: Number(order.total) || 0,
    creditAmount: Number(order.creditAmount) || 0,
  }];
}

function getUpdatedItem(order) {
  if (order.updatedLineItem?.name) {
    const discountPercent = normalizeDiscountPercent(order.updatedLineItem.discountPercent);
    return {
      id: order.updatedLineItem.id ? String(order.updatedLineItem.id) : "",
      name: String(order.updatedLineItem.name),
      quantity: Number(order.updatedLineItem.quantity) || 1,
      price: Number(order.updatedLineItem.price) || 0,
      tag: order.updatedLineItem.tag || "",
      payment: order.updatedLineItem.payment || "",
      status: order.updatedLineItem.status || "",
      balanceDue: Number(order.updatedLineItem.balanceDue) || 0,
      refundAmount: Number(order.updatedLineItem.refundAmount) || 0,
      allocatedQty: Number(order.updatedLineItem.allocatedQty) || 0,
      depositPaid: Number(order.updatedLineItem.depositPaid) || 0,
      creditAmount: Number(order.updatedLineItem.creditAmount) || 0,
      lineTotal: payableLineTotal(order.updatedLineItem),
      ...(discountPercent > 0 ? { discountPercent } : {}),
    };
  }

  const lineItems = normalizeLineItems(order);
  if (lineItems.length === 1) {
    return {
      ...lineItems[0],
      balanceDue: Number(order.balanceDue) || lineItems[0].balanceDue || 0,
      refundAmount: Number(lineItems[0].refundAmount) || Number(order.refundAmount) || 0,
      allocatedQty: Number(order.allocatedQty) || lineItems[0].allocatedQty || 0,
      depositPaid: Number(lineItems[0].depositPaid) || Number(order.total) || 0,
      creditAmount: Number(order.creditAmount ?? lineItems[0].creditAmount) || 0,
    };
  }

  return null;
}

function allocationOfOrdered(item) {
  const qty = Math.max(1, Number(item?.quantity) || 1);
  const allocated = Math.max(0, Number(item?.allocatedQty) || 0);
  if (allocated <= 0) return null;
  return `${Math.min(allocated, qty)} of ${qty}`;
}

function itemBillQty(item) {
  const qty = Math.max(1, Number(item?.quantity) || 1);
  const allocated = Math.max(0, Number(item?.allocatedQty) || 0);
  if (allocated > 0) return Math.min(allocated, qty);
  return qty;
}

function itemUnitPrice(item) {
  const qty = Math.max(1, Number(item?.quantity) || 1);
  // Payable unit first so discounted lines don't show list price in emails.
  if (Number(item?.lineTotal) > 0) return Number(item.lineTotal) / qty;
  const list = Number(item?.price) || 0;
  const rawPct = Number(item?.discountPercent);
  if (Number.isFinite(rawPct) && rawPct > 0 && list > 0) {
    return list * (1 - Math.min(100, rawPct) / 100);
  }
  return list;
}

/** Final for allocated units (= unit × allocated), else ordered line total. */
function itemFinalTotal(item) {
  const unit = itemUnitPrice(item);
  const allocated = Math.max(0, Number(item?.allocatedQty) || 0);
  if (allocated > 0 && unit > 0) return unit * itemBillQty(item);
  if (Number(item?.lineTotal) > 0) return Number(item.lineTotal);
  return unit * Math.max(1, Number(item?.quantity) || 1);
}

function lineRefundIsCompleted(line) {
  const payment = String(line?.payment || "");
  const status = String(line?.status || "");
  return payment === "Refunded" || payment === "Partially Refunded" || status === "Refunded";
}

function lineRefundIsPending(line) {
  const payment = String(line?.payment || "");
  const status = String(line?.status || "");
  return payment === "For Partial Refund"
    || payment === "For Full Refund"
    || status === "For Full Refund"
    || status === "Partially Fulfilled & For Refund";
}

function lineCountsTowardEmailRefund(line, emailType) {
  if (emailType === "partial_refund_pending" || emailType === "full_refund_pending") {
    return lineRefundIsPending(line) && !lineRefundIsCompleted(line);
  }
  if (emailType === "partial_refund_sent" || emailType === "full_refund_sent") {
    return lineRefundIsCompleted(line);
  }
  return (Number(line?.refundAmount) || 0) > 0;
}

function refundTotalForEmail(order, emailType, item = null) {
  if (item && Number(item.refundAmount) > 0) return Number(item.refundAmount);
  const lines = normalizeLineItems(order).filter((line) => lineCountsTowardEmailRefund(line, emailType));
  const fromLines = lines.reduce((sum, line) => sum + (Number(line.refundAmount) || 0), 0);
  if (fromLines > 0) return fromLines;
  if (item) return 0;
  return Number(order.refundAmount) || 0;
}

function itemLabel(item) {
  const qty = Math.max(1, Number(item?.quantity) || 1);
  const allocPhrase = allocationOfOrdered(item);
  // Once allocated, always show "7 of 10" (partial or full).
  if (allocPhrase) return `${item.name} · ${allocPhrase}`;
  return qty > 1 ? `${item.name} ×${qty}` : item.name;
}

const ORDER_STATUS_LABELS = {
  "For Full Refund": "No Allocation, For Full Refund",
};

function orderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] ?? status;
}

/** Values available to admin-authored email bodies via {{token}} placeholders. */
function buildPlaceholderMap(order, emailType) {
  const item = getUpdatedItem(order);
  const allocated = String(item?.allocatedQty ?? order.allocatedQty ?? 0);
  const qty = String(item?.quantity ?? order.qty ?? 1);
  return {
    customer: order.customer || "",
    item: item ? itemLabel(item) : (order.items || "your order"),
    order: order.id || "",
    balance: formatPeso(item?.balanceDue ?? order.balanceDue),
    refund: formatPeso(refundTotalForEmail(order, emailType, item)),
    allocated,
    qty,
    allocation: allocationOfOrdered(item) || `${allocated} of ${qty}`,
    finalTotal: formatPeso(item ? itemFinalTotal(item) : 0),
    orders: consolidatedOrderIds(order).join(", "),
    consolidated: consolidatedId(order),
  };
}

/** Render an admin-authored plain-text body into safe email HTML paragraphs. */
function renderOverrideBody(order, bodyOverride, emailType) {
  const map = buildPlaceholderMap(order, emailType);
  const escaped = escapeHtml(String(bodyOverride).trim());
  const withValues = escaped.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = map[key];
    return value ? `<strong>${escapeHtml(value)}</strong>` : "";
  });
  return withValues
    .split(/\n{2,}/)
    .map((paragraph) => bodyText(paragraph.replace(/\n/g, "<br>")))
    .join("");
}


function preorderMilestones(item, emailType) {
  const map = {
    deposit_received: [
      { label: "Payment verified", done: true, note: "Done" },
      { label: "Awaiting stock allocation", done: false, note: "Next" },
      { label: "Balance / fulfillment", done: false },
    ],
    balance_due_full: [
      { label: "Payment verified", done: true, note: "Done" },
      { label: "Stock allocated", done: true, note: "Done" },
      { label: "Pay remaining balance", done: false, note: "Next" },
    ],
    balance_due_partial: [
      { label: "Payment verified", done: true, note: "Done" },
      { label: "Partial stock allocated", done: true, note: "Done" },
      { label: "Pay balance on allocated units", done: false, note: "Next" },
    ],
    partial_refund_pending: [
      { label: "Partial allocation confirmed", done: true, note: "Done" },
      { label: "Refund processing", done: false, note: "Next" },
    ],
    full_refund_pending: [
      { label: "No allocation available", done: true, note: "Done" },
      { label: "Full refund processing", done: false, note: "Next" },
    ],
    partial_refund_sent: [
      { label: "Refund sent", done: true, note: "Done" },
      { label: "Ready for pickup", done: true, note: "Next" },
    ],
    ready_for_pickup: [
      { label: "Payment complete", done: true, note: "Done" },
      { label: "Ready for pickup", done: true, note: "Next" },
    ],
    order_fulfilled: [
      { label: "Order fulfilled", done: true, note: "Done" },
    ],
    full_refund_sent: [
      { label: "Full refund sent", done: true, note: "Done" },
    ],
  };

  const items = map[emailType];
  if (!items) return "";

  return `
    ${sectionHeading("What's next")}
    ${statusList(items)}
  `;
}

const TEMPLATES = {
  deposit_received: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `Payment verified — ${itemLabel(item)} — ${order.id}`
        : `Payment verified — ${order.id}`;
    },
    preheader: "We verified your deposit. Awaiting stock allocation.",
    title: "Payment verified",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      if (item) {
        return `We received and verified your deposit. This item is now <strong>awaiting stock allocation</strong> — we'll email you when allocation is confirmed.`;
      }
      return `We received and verified your payment. Your order is now <strong>awaiting stock allocation</strong>. We'll email you once allocation is confirmed.`;
    },
    footer: () => "",
  },
  balance_due_full: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `100% allocation — pay balance — ${itemLabel(item)} — ${order.id}`
        : `100% allocation — pay balance — ${order.id}`;
    },
    preheader: "Your full allocation is confirmed. Balance payment is due.",
    title: "Full allocation confirmed",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      const balance = formatPeso(item?.balanceDue ?? order.balanceDue);
      return `Great news — this item received <strong>100% allocation</strong>. Please pay the remaining balance of <strong>${balance}</strong>.`;
    },
    footer: () => "",
  },
  balance_due_partial: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `Partial allocation — pay balance — ${itemLabel(item)} — ${order.id}`
        : `Partial allocation — pay balance — ${order.id}`;
    },
    preheader: "Partial allocation confirmed. Balance due on fulfilled units.",
    title: "Partial allocation confirmed",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      const balance = formatPeso(item?.balanceDue ?? order.balanceDue);
      const alloc = allocationOfOrdered(item)
        || `${item?.allocatedQty ?? order.allocatedQty ?? 0} of ${item?.quantity ?? order.qty ?? 1}`;
      return `Your allocation is <strong>${escapeHtml(alloc)}</strong> units. Please pay the remaining balance of <strong>${balance}</strong> for your allocated units.`;
    },
    footer: () => "",
  },
  partial_refund_pending: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `Partial allocation — refund due — ${itemLabel(item)} — ${order.id}`
        : `Partial allocation — refund due — ${order.id}`;
    },
    preheader: "Partial allocation confirmed. Refund processing required.",
    title: "Partial allocation — refund due",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      const refund = formatPeso(refundTotalForEmail(order, "partial_refund_pending", item));
      const alloc = allocationOfOrdered(item)
        || `${item?.allocatedQty ?? order.allocatedQty ?? 0} of ${item?.quantity ?? order.qty ?? 1}`;
      return `Only <strong>${escapeHtml(alloc)}</strong> units were allocated. A refund of <strong>${refund}</strong> is due on the unallocated units.`;
    },
    footer: () => getSupportContactHtml(),
  },
  full_refund_pending: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `No allocation — full refund — ${itemLabel(item)} — ${order.id}`
        : `No allocation — full refund — ${order.id}`;
    },
    preheader: "Unfortunately no allocation was available.",
    title: "No allocation — full refund",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      const refund = formatPeso(
        refundTotalForEmail(order, "full_refund_pending", item)
        || item?.depositPaid
        || order.total,
      );
      return `We're sorry — <strong>no allocation</strong> was available for this item. Your deposit of <strong>${refund}</strong> will be fully refunded.`;
    },
    footer: () => getSupportContactHtml(),
  },
  partial_refund_sent: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `Refund sent — ${itemLabel(item)} — ${order.id}`
        : `Refund sent — ${order.id}`;
    },
    preheader: "Your partial refund has been sent.",
    title: "Refund sent",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      const refund = formatPeso(refundTotalForEmail(order, "partial_refund_sent", item));
      const alloc = allocationOfOrdered(item);
      const allocNote = alloc ? ` Allocated quantity: <strong>${escapeHtml(alloc)}</strong>.` : "";
      return `We have sent your refund of <strong>${refund}</strong>.${allocNote} Your allocated units are <strong>ready for pickup</strong> — please schedule pickup with our team.`;
    },
    footer: () => `Contact us via Hobby Arena PH or your account to arrange pickup.`,
  },
  ready_for_pickup: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `Ready for pickup — ${itemLabel(item)} — ${order.id}`
        : `Ready for pickup — ${order.id}`;
    },
    preheader: "Your order is ready. Schedule pickup with us.",
    title: "Ready for pickup",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      const alloc = allocationOfOrdered(item);
      const allocNote = alloc
        ? ` Allocated quantity: <strong>${escapeHtml(alloc)}</strong>.`
        : "";
      return `This item is <strong>ready for pickup</strong>.${allocNote} Please schedule pickup with our team during processing hours (Mon–Fri, 8:00 AM – 8:00 PM).`;
    },
    footer: "See you soon at Hobby Arena!",
  },
  order_fulfilled: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `Order fulfilled — ${itemLabel(item)} — ${order.id}`
        : `Order fulfilled — ${order.id}`;
    },
    preheader: "Your order has been fulfilled. Thank you!",
    title: "Order fulfilled",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      const alloc = allocationOfOrdered(item);
      const allocNote = alloc
        ? ` Allocated quantity: <strong>${escapeHtml(alloc)}</strong>.`
        : "";
      return `This item is <strong>fulfilled</strong>.${allocNote} Thank you for shopping with Hobby Arena — hope to see you again soon!`;
    },
    footer: "We appreciate your support.",
  },
  full_refund_sent: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `Full refund sent — ${itemLabel(item)} — ${order.id}`
        : `Full refund sent — ${order.id}`;
    },
    preheader: "Your full refund has been processed.",
    title: "Full refund sent",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      const refund = formatPeso(
        refundTotalForEmail(order, "full_refund_sent", item)
        || item?.depositPaid
        || order.total,
      );
      return `We have sent your full refund of <strong>${refund}</strong>. Please confirm once received.`;
    },
    footer: "Thank you for your patience.",
  },
  payment_not_received: {
    subject: (order) => {
      const item = getUpdatedItem(order);
      return item
        ? `Payment not received — ${itemLabel(item)} — ${order.id}`
        : `Payment not received — ${order.id}`;
    },
    preheader: "We haven't received your payment — the stock was released.",
    title: "We haven't received your payment",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: () => {
      return `We have <strong>not received your payment</strong> for this order, so we can <strong>no longer hold the stock</strong> for you — it has been released and may be purchased by other customers. If you still want the item, please place a new order while stock lasts. If you've already paid, upload proof via your account or Hobby Arena PH and we'll sort it out.`;
    },
    footer: "Stock is not reserved until payment is confirmed.",
  },
  consolidated_allocation: {
    subject: () => "Allocation confirmed",
    preheader: "Your allocated quantities are confirmed.",
    title: "Allocation confirmed",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: () => "We reviewed your related orders and confirmed the allocated quantities below.",
    footer: (order) => (consolidatedNet(order) < 0 ? getSupportContactHtml() : ""),
  },
};

export function buildOrderStatusEmail(rawOrder, emailType, options = {}) {
  const template = TEMPLATES[emailType];
  if (!template) return null;

  const order = rawOrder;
  const item = getUpdatedItem(order);
  const bodyOverride = typeof options.bodyOverride === "string" && options.bodyOverride.trim()
    ? options.bodyOverride
    : null;
  const subjectOverride = typeof options.subjectOverride === "string" && options.subjectOverride.trim()
    ? options.subjectOverride.trim()
    : "";
  const showMessengerButton = typeof options.showMessengerButton === "boolean"
    ? options.showMessengerButton
    : defaultShowMessengerButton(emailType);
  const actionNotes = options.actionNotes && typeof options.actionNotes === "object"
    ? options.actionNotes
    : null;
  const showMilestones = [
    "deposit_received",
    "balance_due_full",
    "balance_due_partial",
    "partial_refund_pending",
    "full_refund_pending",
    "partial_refund_sent",
    "ready_for_pickup",
    "order_fulfilled",
    "full_refund_sent",
  ].includes(emailType);

  const isConsolidated = emailType === "consolidated_allocation";
  const singleSections = isConsolidated ? null : singleOrderEmailSections(order);
  const net = consolidatedNet(order);
  const resolvedSubject = subjectOverride
    ? subjectOverride.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => buildPlaceholderMap(order, emailType)[key] ?? "")
    : template.subject(order);
  const heading = isConsolidated ? escapeHtml(resolvedSubject) : template.title;
  const bodyHtml = `
    <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${EMAIL_BRAND.colors.ink}">
      ${heading}
    </p>
    ${orderMeta(order, { consolidated: isConsolidated })}
    ${bodyLead(template.lead(order))}
    ${bodyOverride ? renderOverrideBody(order, bodyOverride, emailType) : bodyText(template.body(order))}
    ${isConsolidated ? consolidatedEmailTables(order) : (singleSections?.html || "")}
    ${showMilestones && !isConsolidated ? preorderMilestones(item, emailType) : ""}
    ${customerActionButtonsBlock(emailType, order, { showMessenger: showMessengerButton, actionNotes })}
    ${order.statusAttachment ? statusAttachmentBlock(order.statusAttachment) : ""}
  `;

  const plainBody = bodyOverride
    ? String(bodyOverride).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => buildPlaceholderMap(order, emailType)[key] ?? "")
    : template.body(order).replace(/<[^>]+>/g, "");

  const links = getEmailLinks();
  const text = [
    isConsolidated ? resolvedSubject : template.title,
    "",
    isConsolidated
      ? (consolidatedId(order) ? `${consolidatedId(order)} · ${formatEmailDate(order.date)}` : formatEmailDate(order.date))
      : `Order: ${order.id}`,
    !isConsolidated && item ? `Item: ${itemLabel(item)}` : "",
    "",
    plainBody,
  ];
  if (isConsolidated) {
    const details = order.consolidated?.orderDetails || [];
    if (details.length) {
      text.push("", "Order details");
      for (const row of details) {
        text.push(`${row.orderId}  ${row.name}  ×${Math.max(0, Number(row.qty) || 0)}  ${formatPeso(row.dpAmount)}`);
      }
      text.push(`Total downpayment: ${formatPeso(order.consolidated?.totals?.totalDp)}`);
    }
    text.push("", "Summary");
    const summaryItems = order.consolidated?.items || [];
    const summaryPending = summaryItems.length > 0 && summaryItems.every((row) => itemAllocationPending(row));
    for (const row of summaryItems) {
      const allocation = itemAllocationPending(row) ? "Pending" : allocationCell(row).replace(/<[^>]+>/g, "");
      const nextQty = itemAllocationPending(row) ? "—" : String(Math.max(0, Number(row.newQty) || 0));
      const nextAmount = itemAllocationPending(row) ? "—" : formatPeso(row.newAmount);
      text.push(
        `${row.name}  ×${Math.max(0, Number(row.totalQty) || 0)}  DP ${formatPeso(row.totalDp)}  Allocation ${allocation}  New qty ${nextQty}  New ${nextAmount}`,
      );
    }
    const totals = order.consolidated?.totals || {};
    text.push(
      "",
      `New total: ${summaryPending ? "—" : formatPeso(totals.newTotal)}`,
      `Total downpayment: ${formatPeso(totals.totalDp)}`,
      `${summaryPending ? "Settlement" : consolidatedNetLabel(order)}: ${summaryPending ? "—" : formatPeso(Math.abs(net))}`,
    );
    if (String(order.notes || "").trim()) {
      text.push("", "Note", String(order.notes).trim());
    }
  } else if (singleSections?.lines?.length) {
    text.push("", ...singleSections.lines);
  }

  if (BALANCE_ACTION_EMAIL_TYPES.has(emailType) || (isConsolidated && net > 0)) {
    const note = actionNoteText("balance", actionNotes);
    if (note) text.push("", note);
    text.push("", `${BALANCE_BUTTON_LABEL}:`, accountOrderUrl(order, { consolidated: isConsolidated }));
    if (showMessengerButton) text.push("Message Hobby Arena PH:", links.messengerUrl);
  } else if (REFUND_ACTION_EMAIL_TYPES.has(emailType) || (isConsolidated && net < 0)) {
    const note = actionNoteText("refund", actionNotes);
    if (note) text.push("", note);
    text.push("", `${REFUND_BUTTON_LABEL}:`, links.bankDetailsUrl);
    if (showMessengerButton) text.push("Message Hobby Arena PH:", links.messengerUrl);
  } else if (showMessengerButton) {
    text.push("", "Message Hobby Arena PH:", links.messengerUrl);
  }

  if (order.statusAttachment) {
    if (isHttpsUrl(order.statusAttachment.url)) {
      text.push("", `Attachment: ${order.statusAttachment.url}`);
    } else {
      text.push("", `Attachment: view in your account — ${links.accountUrl}`);
    }
  }

  const assignedFooter = resolveReminderFooter(options.reminder, emailType);
  const showReminder = shouldShowPreorderReminder(order, emailType, options.reminder);
  const depositPercent = depositPercentOf(order);
  const reminderOpts = {
    depositPercent,
    title: assignedFooter?.title,
    lines: assignedFooter?.lines,
    placeholders: {
      ...buildPlaceholderMap(order, emailType),
      depositPercent: String(depositPercent),
      balancePercent: String(balancePercentOf(order)),
    },
  };
  if (showReminder) {
    text.push("", preorderReminderText(reminderOpts));
  } else {
    const templateFooter = typeof template.footer === "function" ? template.footer(order) : template.footer;
    if (templateFooter) text.push("", String(templateFooter).replace(/<[^>]+>/g, ""));
  }

  const footerNote = showReminder
    ? preorderReminderBlock(reminderOpts)
    : (typeof template.footer === "function" ? template.footer(order) : template.footer);

  return {
    subject: resolvedSubject,
    text: text.filter(Boolean).join("\n"),
    html: wrapSimpleEmail({
      preheader: template.preheader,
      bodyHtml,
      footerNote,
    }),
    emailType,
  };
}

// Re-export invoice helpers used by order acknowledgement
export { normalizeLineItems };
