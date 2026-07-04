import { formatPeso } from "./emailConfig.js";
import {
  EMAIL_BRAND,
  bodyLead,
  bodyText,
  escapeHtml,
  formatEmailDate,
  invoiceTable,
  metaLine,
  sectionHeading,
  statusList,
  totalsBlock,
  wrapSimpleEmail,
} from "./emailTemplate.js";

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
    };
  }

  return null;
}

function itemLabel(item) {
  const qty = item.quantity ?? 1;
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
  return {
    customer: order.customer || "",
    item: item ? itemLabel(item) : (order.items || "your order"),
    order: order.id || "",
    balance: formatPeso(item?.balanceDue ?? order.balanceDue),
    refund: formatPeso(item?.refundAmount ?? order.refundAmount),
    allocated: String(item?.allocatedQty ?? order.allocatedQty ?? 0),
    qty: String(item?.quantity ?? order.qty ?? 1),
  };
}

/** Emails about units the customer actually receives should show allocated qty. */
const ALLOCATED_QTY_EMAIL_TYPES = new Set([
  "ready_for_pickup",
  "partial_refund_sent",
  "order_fulfilled",
]);

/**
 * For pickup / fulfillment emails on partially-allocated pre-orders, present the
 * allocated quantity (units being released) instead of the full ordered quantity
 * so the customer isn't confused about how many they're receiving.
 */
function reflectAllocatedQty(order, emailType) {
  if (!ALLOCATED_QTY_EMAIL_TYPES.has(emailType)) return order;
  const item = order.updatedLineItem;
  if (!item) return order;
  const allocated = Number(item.allocatedQty) || 0;
  const ordered = Number(item.quantity) || 1;
  if (allocated <= 0 || allocated >= ordered) return order;
  return {
    ...order,
    qty: allocated,
    updatedLineItem: { ...item, quantity: allocated },
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
  if (!item) return "";

  const c = EMAIL_BRAND.colors;
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

function invoiceSummary(order) {
  const item = getUpdatedItem(order);
  const rows = [];

  if (item) {
    if (item.depositPaid > 0) {
      rows.push({ label: "Deposit paid (this item)", value: formatPeso(item.depositPaid) });
    }
    if (item.balanceDue > 0) {
      rows.push({ label: "Balance due (this item)", value: formatPeso(item.balanceDue), strong: true });
    }
    if (item.refundAmount > 0) {
      rows.push({ label: "Refund amount (this item)", value: formatPeso(item.refundAmount), strong: true });
    }
  } else {
    rows.push({ label: "Paid so far", value: formatPeso(order.total) });
    if (order.balanceDue > 0) {
      rows.push({ label: "Balance due", value: formatPeso(order.balanceDue), strong: true });
    }
    if (order.refundAmount > 0) {
      rows.push({ label: "Refund amount", value: formatPeso(order.refundAmount), strong: true });
    }
  }

  const tableItems = item?.id
    ? normalizeLineItems(order).filter((line) => line.id === item.id)
    : normalizeLineItems(order);

  return `
    ${sectionHeading("Item summary")}
    ${invoiceTable(tableItems, { highlightId: item?.id })}
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
        ? `Deposit received — ${itemLabel(item)} — ${order.id}`
        : `Payment received — ${order.id}`;
    },
    preheader: "We received your deposit. Awaiting stock allocation.",
    title: "Payment received",
    lead: (order) => `Hello <strong>${escapeHtml(order.customer)}</strong>,`,
    body: (order) => {
      const item = getUpdatedItem(order);
      if (item) {
        return `We received and verified your deposit. This item is now <strong>awaiting stock allocation</strong> — we'll email you when allocation is confirmed.`;
      }
      return `We received and verified your payment. Your order is now <strong>awaiting stock allocation</strong>. We'll email you once allocation is confirmed.`;
    },
    footer: "Reply to this email if you have questions.",
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
      return `Great news — this item received <strong>100% allocation</strong>. Please pay the remaining balance of <strong>${balance}</strong>. Upload proof in your account or send via Messenger.`;
    },
    footer: "Balance must be settled before release day.",
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
      const allocated = item?.allocatedQty ?? order.allocatedQty ?? 0;
      const qty = item?.quantity ?? order.qty ?? 1;
      const balance = formatPeso(item?.balanceDue ?? order.balanceDue);
      return `Your allocation is <strong>${allocated} / ${qty}</strong> units. Please pay the remaining balance of <strong>${balance}</strong> for your fulfilled units. Upload proof in your account or send via Messenger.`;
    },
    footer: "We'll confirm once your balance payment is verified.",
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
      const allocated = item?.allocatedQty ?? order.allocatedQty ?? 0;
      const qty = item?.quantity ?? order.qty ?? 1;
      const refund = formatPeso(item?.refundAmount ?? order.refundAmount);
      return `Only <strong>${allocated} / ${qty}</strong> units were allocated. A refund of <strong>${refund}</strong> is due on the unallocated units. Please share your bank details so we can process it.`;
    },
    footer: "Reply with your bank account details so we can process your refund.",
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
      return `We're sorry — <strong>no allocation</strong> was available for this item. Your deposit of <strong>${refund}</strong> will be fully refunded. Please share your bank details so we can process it.`;
    },
    footer: "Reply with your bank account details so we can process your refund.",
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
      return `We have sent your refund of <strong>${refund}</strong>. Your allocated units are <strong>ready for pickup</strong> — please schedule pickup with our team.`;
    },
    footer: "Contact us to arrange pickup.",
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
    body: () => {
      return `This item is <strong>ready for pickup</strong>. Please schedule pickup with our team during processing hours (Mon–Fri, 8:00 AM – 8:00 PM).`;
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
    body: () => {
      return `This item is <strong>fulfilled</strong>. Thank you for shopping with Hobby Arena — hope to see you again soon!`;
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
      return `We have <strong>not received your payment</strong> for this order, so we can <strong>no longer hold the stock</strong> for you — it has been released and may be purchased by other customers. If you still want the item, please place a new order while stock lasts. If you've already paid, reply with your proof of payment and we'll sort it out.`;
    },
    footer: "Stock is not reserved until payment is confirmed.",
  },
};

export function buildOrderStatusEmail(rawOrder, emailType, options = {}) {
  const template = TEMPLATES[emailType];
  if (!template) return null;

  const order = reflectAllocatedQty(rawOrder, emailType);
  const item = getUpdatedItem(order);
  const bodyOverride = typeof options.bodyOverride === "string" && options.bodyOverride.trim()
    ? options.bodyOverride
    : null;
  const showSummary = [
    "balance_due_full",
    "balance_due_partial",
    "partial_refund_pending",
    "full_refund_pending",
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
    ${itemFocusBlock(order)}
    ${bodyOverride ? renderOverrideBody(order, bodyOverride) : bodyText(template.body(order))}
    ${showSummary ? invoiceSummary(order) : ""}
    ${showMilestones ? preorderMilestones(item, emailType) : ""}
  `;

  const plainBody = bodyOverride
    ? String(bodyOverride).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => buildPlaceholderMap(order)[key] ?? "")
    : template.body(order).replace(/<[^>]+>/g, "");

  const text = [
    template.title,
    "",
    `Order: ${order.id}`,
    item ? `Item: ${itemLabel(item)}` : "",
    "",
    plainBody,
    "",
    EMAIL_BRAND.supportEmail,
  ].filter(Boolean).join("\n");

  return {
    subject: template.subject(order),
    text,
    html: wrapSimpleEmail({
      preheader: template.preheader,
      bodyHtml,
      footerNote: template.footer,
    }),
    emailType,
  };
}

// Re-export invoice helpers used by order acknowledgement
export { normalizeLineItems };
