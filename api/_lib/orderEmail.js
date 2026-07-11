import { formatPeso, getSupportContactHtml, shouldShowPreorderReminder } from "./emailUtils.js";
import {
  EMAIL_BRAND,
  bodyLead,
  bodyText,
  divider,
  escapeHtml,
  formatEmailDate,
  invoiceTable,
  metaLine,
  preorderReminderBlock,
  preorderReminderText,
  sectionHeading,
  statusList,
  totalsBlock,
  wrapSimpleEmail,
} from "./emailTemplate.js";

function orderKind(order) {
  if (order.type === "Pre-order") return "preorder";
  return "purchase";
}

function depositPercentOf(order) {
  return Math.max(0, Math.min(100, Number(order?.depositPercent) || 30));
}

function balancePercentOf(order) {
  return Math.max(0, 100 - depositPercentOf(order));
}

function normalizeLineItems(order) {
  if (Array.isArray(order.lineItems) && order.lineItems.length) {
    return order.lineItems.map((item) => ({
      name: String(item.name || "Item").trim(),
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      lineTotal: Number(item.lineTotal) || (Number(item.price) || 0) * (Number(item.quantity) || 1),
      tag: item.tag ? String(item.tag) : "",
    }));
  }

  if (order.items) {
    return String(order.items)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^(\d+)×\s*(.+)$/i) || part.match(/^(\d+)x\s*(.+)$/i);
        if (match) {
          const quantity = Number(match[1]) || 1;
          return { name: match[2].trim(), quantity, price: 0, lineTotal: 0, tag: "" };
        }
        return { name: part, quantity: 1, price: 0, lineTotal: 0, tag: "" };
      });
  }

  return [];
}

export function buildOrderAcknowledgementEmail(order, options = {}) {
  const kind = orderKind(order);
  const isPreorder = kind === "preorder";
  const lineItems = normalizeLineItems(order);
  const orderDate = formatEmailDate(order.date || new Date().toISOString());
  const subject = isPreorder
    ? `Pre-order confirmation — ${order.id}`
    : `Order confirmation — ${order.id}`;
  const dp = depositPercentOf(order);
  const bal = balancePercentOf(order);

  const totalRows = [
    { label: "Subtotal", value: formatPeso(order.subtotal || order.total) },
    { label: "Shipping", value: order.shippingFee > 0 ? formatPeso(order.shippingFee) : "At buyer's expense" },
  ];

  if (isPreorder) {
    totalRows.push({ label: `Paid now DP (${dp}%)`, value: formatPeso(order.total) });
    if (order.balanceDue > 0) {
      totalRows.push({ label: `Balance Due (${bal}%)`, value: formatPeso(order.balanceDue) });
    }
    totalRows.push({ label: "Order total", value: formatPeso((order.subtotal || order.total) + (order.balanceDue || 0)), strong: true });
  } else {
    totalRows.push({ label: "Total", value: formatPeso(order.total), strong: true });
  }

  const showReminder = shouldShowPreorderReminder(order, null, {
    enabled: options.reminder?.enabled,
  });
  const reminderOpts = {
    depositPercent: dp,
    title: options.reminder?.title,
    lines: options.reminder?.lines,
  };

  const text = [
    `Hello ${order.customer},`,
    "",
    isPreorder
      ? `Thanks for your pre-order with Hobby Arena. Order ${order.id} is received and pending payment verification.`
      : `Thanks for your order with Hobby Arena. Order ${order.id} is received and pending payment verification.`,
    "",
    `Date: ${orderDate}`,
    `Payment: ${order.payment || "Pending Verification"}`,
    "",
    ...lineItems.map((item) => {
      const unit = item.price > 0 ? ` @ ${formatPeso(item.price)}` : "";
      return `${item.quantity}× ${item.name}${unit}`;
    }),
    "",
    ...totalRows.map((row) => `${row.label}: ${row.value}`),
    "",
    showReminder ? preorderReminderText(reminderOpts) : "Questions? Message us at Hobby Arena PH.",
    "",
    `— ${EMAIL_BRAND.name}`,
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${EMAIL_BRAND.colors.ink}">
      ${isPreorder ? "Pre-order confirmation" : "Order confirmation"}
    </p>
    ${metaLine(`<strong style="color:${EMAIL_BRAND.colors.text}">${escapeHtml(order.id)}</strong> · ${escapeHtml(orderDate)}`)}
    ${bodyLead(`Hello <strong>${escapeHtml(order.customer)}</strong>,`)}
    ${bodyText(
      isPreorder
        ? `Thanks for your pre-order. We've received it and will verify your proof of payment shortly. Here's your order summary.`
        : `Thanks for shopping with us. We've received your order and will verify your proof of payment shortly. Here's your order summary.`,
    )}
    ${sectionHeading("Bill to")}
    ${metaLine(`<strong style="color:${EMAIL_BRAND.colors.text}">${escapeHtml(order.customer)}</strong>`)}
    ${metaLine(escapeHtml(order.email))}
    ${order.phone ? metaLine(escapeHtml(order.phone)) : ""}
    ${sectionHeading("Order summary")}
    ${invoiceTable(lineItems)}
    ${totalsBlock(totalRows)}
    <div style="clear:both"></div>
    ${divider()}
    ${sectionHeading("Status")}
    ${statusList([
      { label: "Payment verification", done: false, note: order.payment || "Pending" },
      { label: "Order confirmed", done: false },
      { label: isPreorder ? "Balance settlement (pre-order)" : "Fulfillment", done: false, note: isPreorder ? "Before release" : "Pickup / shipping" },
    ])}
    ${bodyText(`<span style="color:${EMAIL_BRAND.colors.muted}">Shipping is at the buyer&apos;s expense. Orders are processed Mon–Fri, 8:00 AM – 8:00 PM.</span>`)}
  `;

  const html = wrapSimpleEmail({
    preheader: `${order.id} — ${formatPeso(order.total)} received, pending verification`,
    bodyHtml,
    footerNote: showReminder ? preorderReminderBlock(reminderOpts) : getSupportContactHtml(),
  });

  return { subject, text, html, kind };
}

export function buildAdminOrderNotificationEmail(order) {
  const lineItems = normalizeLineItems(order);
  const orderDate = formatEmailDate(order.date || new Date().toISOString());
  const subject = `New order — ${order.id}`;

  const text = [
    `New order: ${order.id}`,
    `Date: ${orderDate}`,
    `Customer: ${order.customer}`,
    `Email: ${order.email}`,
    `Phone: ${order.phone || "—"}`,
    `Type: ${order.type || "In-stock"}`,
    `Payment: ${order.payment || "Pending Verification"}`,
    `Total: ${formatPeso(order.total)}`,
    "",
    ...lineItems.map((item) => `${item.quantity}× ${item.name}`),
    "",
    "Review in Admin → Orders.",
  ].join("\n");

  const bodyHtml = `
    <p style="margin:0 0 6px;font-family:Inter,Arial,sans-serif;font-size:22px;font-weight:700;line-height:1.3;color:${EMAIL_BRAND.colors.ink}">
      New order
    </p>
    ${metaLine(`<strong style="color:${EMAIL_BRAND.colors.text}">${escapeHtml(order.id)}</strong> · ${escapeHtml(orderDate)}`)}
    ${bodyLead(`<strong>${escapeHtml(order.customer)}</strong> placed a new ${escapeHtml(order.type || "in-stock")} order.`)}
    ${sectionHeading("Customer")}
    ${metaLine(escapeHtml(order.email))}
    ${order.phone ? metaLine(escapeHtml(order.phone)) : ""}
    ${sectionHeading("Items")}
    ${invoiceTable(lineItems)}
    ${totalsBlock([
      { label: "Total", value: formatPeso(order.total), strong: true },
      { label: "Payment", value: escapeHtml(order.payment || "Pending Verification") },
    ])}
    <div style="clear:both"></div>
    ${bodyText(`<span style="color:${EMAIL_BRAND.colors.muted}">Review and verify in <strong style="color:${EMAIL_BRAND.colors.text}">Admin → Orders</strong>.</span>`)}
  `;

  const html = wrapSimpleEmail({
    preheader: `${order.customer} — ${order.id} · ${formatPeso(order.total)}`,
    bodyHtml,
    footerNote: "New order alert — verify payment in the admin dashboard.",
  });

  return { subject, text, html };
}
