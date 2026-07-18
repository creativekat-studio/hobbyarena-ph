import { formatPeso, getEmailLinks, getSupportContactHtml, resolveReminderFooter, shouldShowPreorderReminder } from "./emailUtils.js";
import {
  EMAIL_BRAND,
  bodyLead,
  bodyText,
  customerResponseButtons,
  escapeHtml,
  formatEmailDate,
  invoiceTable,
  messengerButton,
  metaLine,
  preorderReminderBlock,
  preorderReminderText,
  sectionHeading,
  statusList,
  totalsBlock,
  wrapSimpleEmail,
} from "./emailTemplate.js";

const BALANCE_ACTION_EMAIL_TYPES = new Set(["balance_due_full", "balance_due_partial"]);
const REFUND_ACTION_EMAIL_TYPES = new Set(["partial_refund_pending", "full_refund_pending"]);

function depositPercentOf(order) {
  return Math.max(0, Math.min(100, Number(order?.depositPercent) || 30));
}

function balancePercentOf(order) {
  return Math.max(0, 100 - depositPercentOf(order));
}

function customerActionButtonsBlock(emailType) {
  const links = getEmailLinks();

  if (BALANCE_ACTION_EMAIL_TYPES.has(emailType)) {
    return customerResponseButtons({
      caption: "Pay the balance and send your proof using either option below.",
      accountLabel: "Upload in my account",
      accountHref: links.accountUrl,
      messengerLabel: "Message Hobby Arena PH",
      messengerHref: links.messengerUrl,
    });
  }

  if (REFUND_ACTION_EMAIL_TYPES.has(emailType)) {
    return customerResponseButtons({
      caption: "Share your bank or e-wallet details using either option below.",
      accountLabel: "Submit refund details",
      accountHref: links.accountUrl,
      messengerLabel: "Message Hobby Arena PH",
      messengerHref: links.messengerUrl,
    });
  }

  if (emailType === "ready_for_pickup" || emailType === "partial_refund_sent") {
    return messengerButton({
      caption: "Message us to schedule pickup during processing hours (Mon–Fri, 8:00 AM – 8:00 PM).",
      label: "Message Hobby Arena PH",
    });
  }

  return "";
}

function statusAttachmentBlock(attachment) {
  if (!attachment?.url) return "";
  const c = EMAIL_BRAND.colors;
  const label = escapeHtml(attachment.label || "Attachment");
  const href = escapeHtml(attachment.url);
  const isPdf = attachment.type === "pdf" || href.includes(".pdf") || href.includes("application/pdf");

  if (isPdf) {
    return `
      <div style="margin:20px 0;padding:14px 16px;border-radius:8px;background:${c.page};border:1px solid ${c.border}">
        <p style="margin:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${c.muted}">Attachment</p>
        <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.5;color:${c.ink}">
          <a href="${href}" style="color:${c.accent};font-weight:700;text-decoration:none">${label} (PDF)</a>
        </p>
      </div>`;
  }

  return `
    <div style="margin:20px 0;padding:14px 16px;border-radius:8px;background:${c.page};border:1px solid ${c.border}">
      <p style="margin:0 0 10px;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${c.muted}">Attachment</p>
      <a href="${href}" style="display:block"><img src="${href}" alt="${label}" style="max-width:100%;height:auto;border-radius:6px;border:1px solid ${c.border}" /></a>
      <p style="margin:10px 0 0;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.5;color:${c.muted}">
        <a href="${href}" style="color:${c.accent};font-weight:600;text-decoration:none">Open ${label}</a>
      </p>
    </div>`;
}

function orderMeta(order) {
  return metaLine(
    `<strong style="color:${EMAIL_BRAND.colors.text}">${escapeHtml(order.id)}</strong> · ${escapeHtml(formatEmailDate(order.date))}`,
  );
}

function normalizeLineItems(order) {
  if (Array.isArray(order.lineItems) && order.lineItems.length) {
    return order.lineItems.map((item) => ({
      id: item.id ? String(item.id) : "",
      name: String(item.name || "Item"),
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      lineTotal: Number(item.lineTotal) || 0,
      tag: item.tag || "",
      payment: item.payment ? String(item.payment) : "",
      status: item.status ? String(item.status) : "",
      balanceDue: Number(item.balanceDue) || 0,
      refundAmount: Number(item.refundAmount) || 0,
      allocatedQty: Number(item.allocatedQty) || 0,
      depositPaid: Number(item.depositPaid) || 0,
      creditAmount: Number(item.creditAmount) || 0,
    }));
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
    return {
      id: order.updatedLineItem.id ? String(order.updatedLineItem.id) : "",
      name: String(order.updatedLineItem.name),
      quantity: Number(order.updatedLineItem.quantity) || 1,
      tag: order.updatedLineItem.tag || "",
      payment: order.updatedLineItem.payment || "",
      status: order.updatedLineItem.status || "",
      balanceDue: Number(order.updatedLineItem.balanceDue) || 0,
      refundAmount: Number(order.updatedLineItem.refundAmount) || 0,
      allocatedQty: Number(order.updatedLineItem.allocatedQty) || 0,
      depositPaid: Number(order.updatedLineItem.depositPaid) || 0,
      creditAmount: Number(order.updatedLineItem.creditAmount) || 0,
      lineTotal: Number(order.updatedLineItem.lineTotal) || 0,
    };
  }

  const lineItems = normalizeLineItems(order);
  if (lineItems.length === 1) {
    return {
      ...lineItems[0],
      balanceDue: Number(order.balanceDue) || 0,
      refundAmount: Number(order.refundAmount) || 0,
      allocatedQty: Number(order.allocatedQty) || 0,
      depositPaid: Number(order.total) || 0,
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
  if (Number(item?.price) > 0) return Number(item.price);
  if (Number(item?.lineTotal) > 0) return Number(item.lineTotal) / qty;
  return 0;
}

/** Final for allocated units (= unit × allocated), else ordered line total. */
function itemFinalTotal(item) {
  const unit = itemUnitPrice(item);
  const allocated = Math.max(0, Number(item?.allocatedQty) || 0);
  if (allocated > 0 && unit > 0) return unit * itemBillQty(item);
  if (Number(item?.lineTotal) > 0) return Number(item.lineTotal);
  return unit * Math.max(1, Number(item?.quantity) || 1);
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
function buildPlaceholderMap(order) {
  const item = getUpdatedItem(order);
  const allocated = String(item?.allocatedQty ?? order.allocatedQty ?? 0);
  const qty = String(item?.quantity ?? order.qty ?? 1);
  return {
    customer: order.customer || "",
    item: item ? itemLabel(item) : (order.items || "your order"),
    order: order.id || "",
    balance: formatPeso(item?.balanceDue ?? order.balanceDue),
    refund: formatPeso(item?.refundAmount ?? order.refundAmount),
    allocated,
    qty,
    allocation: allocationOfOrdered(item) || `${allocated} of ${qty}`,
    finalTotal: formatPeso(item ? itemFinalTotal(item) : 0),
  };
}

/** Render an admin-authored plain-text body into safe email HTML paragraphs. */
function renderOverrideBody(order, bodyOverride) {
  const map = buildPlaceholderMap(order);
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

function itemFocusBlock(order) {
  const item = getUpdatedItem(order);
  const lineItems = normalizeLineItems(order);
  const c = EMAIL_BRAND.colors;

  if (item) {
    const tag = item.tag
      ? `<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${c.muted};background:${c.page}">${escapeHtml(item.tag)}</span>`
      : "";

    return `
      <div style="margin:0 0 20px;padding:14px 16px;border-radius:8px;background:${c.page};border:1px solid ${c.border}">
        <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${c.muted}">
          Item updated
        </p>
        <p style="margin:0 0 8px;font-family:Inter,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.35;color:${c.ink}">
          ${escapeHtml(itemLabel(item))}${tag}
        </p>
        <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.5;color:${c.muted}">
          ${escapeHtml(item.status ? orderStatusLabel(item.status) : "—")}${item.payment ? ` · ${escapeHtml(item.payment)}` : ""}
        </p>
      </div>
    `;
  }

  if (lineItems.length <= 1) return "";

  const rows = lineItems.map((line) => {
    const tag = line.tag
      ? `<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${c.muted};background:${c.page}">${escapeHtml(line.tag)}</span>`
      : "";
    return `
      <div style="margin:0 0 10px;padding:10px 0;border-bottom:1px solid ${c.border}">
        <p style="margin:0 0 4px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1.35;color:${c.ink}">
          ${escapeHtml(itemLabel(line))}${tag}
        </p>
        <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.5;color:${c.muted}">
          ${escapeHtml(line.status ? orderStatusLabel(line.status) : "—")}${line.payment ? ` · ${escapeHtml(line.payment)}` : ""}
        </p>
      </div>
    `;
  }).join("");

  return `
    <div style="margin:0 0 20px;padding:14px 16px;border-radius:8px;background:${c.page};border:1px solid ${c.border}">
      <p style="margin:0 0 10px;font-family:Inter,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${c.muted}">
        Items in this update (${lineItems.length})
      </p>
      ${rows}
    </div>
  `;
}

function invoiceSummary(order) {
  const item = getUpdatedItem(order);
  const lineItems = normalizeLineItems(order);
  const rows = [];
  const dp = depositPercentOf(order);
  const bal = balancePercentOf(order);

  const tableItems = item?.id
    ? lineItems.filter((line) => line.id === item.id)
    : lineItems;
  const hasAllocation = tableItems.some((line) => (Number(line.allocatedQty) || 0) > 0);
  const finalTotal = tableItems.reduce((sum, line) => sum + itemFinalTotal(line), 0);

  if (item) {
    if (item.depositPaid > 0) {
      rows.push({ label: `Deposit paid (${dp}%)`, value: formatPeso(item.depositPaid) });
    }
    if ((item.creditAmount || 0) > 0) {
      rows.push({ label: "Order credit", value: formatPeso(item.creditAmount) });
    }
    if (item.balanceDue > 0) {
      rows.push({ label: `Balance due now (${bal}%)`, value: formatPeso(item.balanceDue), strong: true });
    }
    if (item.refundAmount > 0) {
      rows.push({ label: "Refund amount (this item)", value: formatPeso(item.refundAmount), strong: true });
    }
  } else if (lineItems.length > 1) {
    const depositTotal = lineItems.reduce((sum, line) => sum + line.depositPaid, 0);
    const creditTotal = lineItems.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
    const balanceTotal = lineItems.reduce((sum, line) => sum + line.balanceDue, 0);
    const refundTotal = lineItems.reduce((sum, line) => sum + line.refundAmount, 0);
    if (depositTotal > 0) {
      rows.push({ label: `Deposit paid (${dp}%)`, value: formatPeso(depositTotal) });
    }
    if (creditTotal > 0) {
      rows.push({ label: "Order credit", value: formatPeso(creditTotal) });
    }
    if (balanceTotal > 0) {
      rows.push({ label: `Balance due now (${bal}%)`, value: formatPeso(balanceTotal), strong: true });
    }
    if (refundTotal > 0) {
      rows.push({ label: "Refund amount (selected items)", value: formatPeso(refundTotal), strong: true });
    }
  } else {
    rows.push({ label: `Paid now DP (${dp}%)`, value: formatPeso(order.total) });
    if ((order.creditAmount || 0) > 0) {
      rows.push({ label: "Order credit", value: formatPeso(order.creditAmount) });
    }
    if (order.balanceDue > 0) {
      rows.push({ label: `Balance Due (${bal}%)`, value: formatPeso(order.balanceDue), strong: true });
    }
    if (order.refundAmount > 0) {
      rows.push({ label: "Refund amount", value: formatPeso(order.refundAmount), strong: true });
    }
  }

  if (hasAllocation && finalTotal > 0) {
    rows.push({ label: "Total (allocated)", value: formatPeso(finalTotal), strong: true });
  }

  const heading = lineItems.length > 1 ? sectionHeading("Items in this email") : "";

  return `
    ${heading}
    ${invoiceTable(tableItems, { highlightId: item?.id, useAllocation: hasAllocation })}
    ${rows.length ? `${totalsBlock(rows)}<div style="clear:both"></div>` : ""}
  `;
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
      const refund = formatPeso(item?.refundAmount ?? order.refundAmount);
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
      const refund = formatPeso(item?.refundAmount ?? item?.depositPaid ?? (order.refundAmount || order.total));
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
      const refund = formatPeso(item?.refundAmount ?? order.refundAmount);
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
      const refund = formatPeso(item?.refundAmount ?? item?.depositPaid ?? (order.refundAmount || order.total));
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
};

export function buildOrderStatusEmail(rawOrder, emailType, options = {}) {
  const template = TEMPLATES[emailType];
  if (!template) return null;

  const order = rawOrder;
  const item = getUpdatedItem(order);
  const bodyOverride = typeof options.bodyOverride === "string" && options.bodyOverride.trim()
    ? options.bodyOverride
    : null;
  const showSummary = [
    "balance_due_full",
    "balance_due_partial",
    "partial_refund_pending",
    "full_refund_pending",
    "partial_refund_sent",
    "ready_for_pickup",
    "order_fulfilled",
  ].includes(emailType);

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

  const bodyHtml = `
    <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${EMAIL_BRAND.colors.ink}">
      ${template.title}
    </p>
    ${orderMeta(order)}
    ${bodyLead(template.lead(order))}
    ${!showSummary ? itemFocusBlock(order) : ""}
    ${bodyOverride ? renderOverrideBody(order, bodyOverride) : bodyText(template.body(order))}
    ${showSummary ? invoiceSummary(order) : ""}
    ${showMilestones ? preorderMilestones(item, emailType) : ""}
    ${customerActionButtonsBlock(emailType)}
    ${order.statusAttachment ? statusAttachmentBlock(order.statusAttachment) : ""}
  `;

  const plainBody = bodyOverride
    ? String(bodyOverride).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => buildPlaceholderMap(order)[key] ?? "")
    : template.body(order).replace(/<[^>]+>/g, "");

  const links = getEmailLinks();
  const text = [
    template.title,
    "",
    `Order: ${order.id}`,
    item ? `Item: ${itemLabel(item)}` : "",
    "",
    plainBody,
  ];

  if (BALANCE_ACTION_EMAIL_TYPES.has(emailType)) {
    text.push(
      "",
      "Upload in my account:",
      links.accountUrl,
      "Message Hobby Arena PH:",
      links.messengerUrl,
    );
  } else if (REFUND_ACTION_EMAIL_TYPES.has(emailType)) {
    text.push(
      "",
      "Submit refund details:",
      links.accountUrl,
      "Message Hobby Arena PH:",
      links.messengerUrl,
    );
  } else if (emailType === "ready_for_pickup" || emailType === "partial_refund_sent") {
    text.push("", "Message Hobby Arena PH:", links.messengerUrl);
  }

  if (order.statusAttachment?.url) {
    text.push("", `Attachment: ${order.statusAttachment.url}`);
  }

  const assignedFooter = resolveReminderFooter(options.reminder, emailType);
  const showReminder = shouldShowPreorderReminder(order, emailType, options.reminder);
  const depositPercent = depositPercentOf(order);
  const reminderOpts = {
    depositPercent,
    title: assignedFooter?.title,
    lines: assignedFooter?.lines,
    placeholders: {
      ...buildPlaceholderMap(order),
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
    subject: template.subject(order),
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
