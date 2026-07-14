import { getPreorderReminderConfig } from "./emailTemplatesStore.js";

async function postJson(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "We couldn’t send the email because the local API isn’t running. "
      + "Start it with yarn dev:full so the storefront and /api stay connected.",
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (!data?.error && (response.status === 500 || response.status === 502 || response.status === 504)) {
      throw new Error(
        "We couldn’t send the email because the local API isn’t running. "
        + "Start it with yarn dev:full so the storefront and /api stay connected.",
      );
    }
    throw new Error(
      data?.error
      || "We couldn’t send that email right now. Please try again in a few minutes, or message Hobby Arena PH if it keeps happening.",
    );
  }

  return data;
}

export async function sendOrderStatusEmail({ emailType, order, bodyOverride, reminder }) {
  return postJson("/api/order-status-email", {
    emailType,
    order,
    ...(bodyOverride ? { bodyOverride } : {}),
    ...(reminder ? { reminder } : {}),
  });
}

export async function previewOrderStatusEmail({ emailType, order, bodyOverride, reminder }) {
  return postJson("/api/order-status-email", {
    preview: true,
    emailType,
    order,
    ...(bodyOverride ? { bodyOverride } : {}),
    ...(reminder ? { reminder } : {}),
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

export async function sendOrderAcknowledgementEmail(order, reminder) {
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
    depositPercent: order.depositPercent,
    type: order.type,
    payment: order.payment,
    date: order.date,
    notes: order.notes || "",
    ...(reminder ? { reminder } : {}),
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

export async function sendNewsletterSubscribe(email) {
  return postJson("/api/newsletter-subscribe", { email });
}

export async function requestPasswordReset({ email, bodyOverride, continueUrl, test = false } = {}) {
  return postJson("/api/password-reset", {
    email,
    ...(bodyOverride ? { bodyOverride } : {}),
    ...(continueUrl ? { continueUrl } : {}),
    ...(test ? { test: true } : {}),
  });
}

export async function previewPasswordResetEmail({ email, bodyOverride, continueUrl } = {}) {
  return postJson("/api/password-reset", {
    preview: true,
    email: email || "trainer@example.com",
    ...(bodyOverride ? { bodyOverride } : {}),
    ...(continueUrl ? { continueUrl } : {}),
  });
}

export async function fetchEmailOutboxStatus() {
  const response = await fetch("/api/email-outbox?status=1");
  if (!response.ok) return { simulate: false, count: 0 };
  return response.json();
}

export async function fetchEmailOutbox() {
  const response = await fetch("/api/email-outbox");
  if (!response.ok) throw new Error("Could not load email outbox.");
  return response.json();
}

export async function fetchEmailOutboxEntry(id) {
  const response = await fetch(`/api/email-outbox?id=${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("Could not load email.");
  return response.json();
}

export async function clearEmailOutbox() {
  const response = await fetch("/api/email-outbox", { method: "DELETE" });
  if (!response.ok) throw new Error("Could not clear outbox.");
  return response.json();
}

export function queueOrderAcknowledgement(order, onResult) {
  if (!order?.email) return;

  sendOrderAcknowledgementEmail(order, getPreorderReminderConfig())
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
