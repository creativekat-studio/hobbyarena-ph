import { getFirebaseAuth } from "./firebase/app.js";

async function adminAuthHeaders() {
  try {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

/**
 * Create an order via trusted API (server price validation + rate limits + captcha).
 */
export async function createOrderViaApi(payload) {
  const headers = {
    "Content-Type": "application/json",
    ...(payload.manual ? await adminAuthHeaders() : {}),
  };

  let response;
  try {
    response = await fetch("/api/create-order", {
      method: "POST",
      headers,
      body: JSON.stringify({
        cartItems: (payload.cartItems || []).map((item) => ({
          id: item.id,
          quantity: item.quantity ?? 1,
        })),
        customer: payload.customer,
        email: payload.email,
        phone: payload.phone,
        fulfillment: payload.fulfillment,
        address: payload.address,
        notes: payload.notes || "",
        guest: Boolean(payload.guest),
        userId: payload.userId || null,
        proofOfPayment: payload.proofOfPayment || null,
        recaptchaToken: payload.recaptchaToken || null,
        manual: Boolean(payload.manual),
        ...(payload.manual
          ? {
              initialPayment: payload.initialPayment,
              initialStatus: payload.initialStatus,
              deductStock: payload.deductStock !== false,
            }
          : {}),
      }),
    });
  } catch {
    throw new Error(
      "We couldn’t place the order because the API isn’t reachable. "
      + "Start it with yarn dev:full, or try again in a moment.",
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Could not place order. Please try again.");
  }

  if (!data?.order?.id) {
    throw new Error("Could not place order. Please try again.");
  }

  return data.order;
}
