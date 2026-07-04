async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `Email request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

export async function sendOrderStatusEmail({ emailType, order, bodyOverride }) {
  return postJson("/api/order-status-email", {
    emailType,
    order,
    ...(bodyOverride ? { bodyOverride } : {}),
  });
}

export async function previewOrderStatusEmail({ emailType, order, bodyOverride }) {
  return postJson("/api/order-status-email", {
    preview: true,
    emailType,
    order,
    ...(bodyOverride ? { bodyOverride } : {}),
  });
}

export function queueOrderStatusEmail(payload, onResult) {
  if (!payload?.order?.email || !payload?.emailType) return;

  sendOrderStatusEmail(payload)
    .then((result) => onResult?.({ ok: true, result }))
    .catch((error) => {
      console.warn("Order status email failed:", error);
      onResult?.({ ok: false, error: error.message });
    });
}

export async function sendOrderAcknowledgementEmail(order) {
  return postJson("/api/order-acknowledgement", {
    id: order.id,
    customer: order.customer,
    email: order.email,
    phone: order.phone,
    items: order.items,
    lineItems: order.lineItems,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    balanceDue: order.balanceDue,
    type: order.type,
    payment: order.payment,
    date: order.date,
  });
}

export async function sendInquiryEmails(inquiry) {
  return postJson("/api/inquiry-notification", {
    name: inquiry.name,
    email: inquiry.email,
    subject: inquiry.subject,
    message: inquiry.message,
  });
}

export function queueOrderAcknowledgement(order, onResult) {
  if (!order?.email) return;

  sendOrderAcknowledgementEmail(order)
    .then((result) => onResult?.({ ok: true, result }))
    .catch((error) => {
      console.warn("Order acknowledgement email failed:", error);
      onResult?.({ ok: false, error: error.message });
    });
}

export function queueInquiryEmails(inquiry, onResult) {
  if (!inquiry?.email) return;

  sendInquiryEmails(inquiry)
    .then((result) => onResult?.({ ok: true, result }))
    .catch((error) => {
      console.warn("Inquiry email failed:", error);
      onResult?.({ ok: false, error: error.message });
    });
}
