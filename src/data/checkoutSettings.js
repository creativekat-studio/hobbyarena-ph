/** Checkout settings — shipping/fulfillment. Bank accounts live in CMS (Firestore). */

export const DEFAULT_CHECKOUT_HOLD_MINUTES = 20;
export const MIN_CHECKOUT_HOLD_MINUTES = 1;
export const MAX_CHECKOUT_HOLD_MINUTES = 180;

/** CMS-configured reservation length; falls back to 20 minutes. */
export function resolveCheckoutHoldMinutes(storefront) {
  const raw = Number(storefront?.checkoutHoldMinutes);
  if (!Number.isFinite(raw)) return DEFAULT_CHECKOUT_HOLD_MINUTES;
  return Math.min(
    MAX_CHECKOUT_HOLD_MINUTES,
    Math.max(MIN_CHECKOUT_HOLD_MINUTES, Math.round(raw)),
  );
}

export function checkoutHoldDurationMs(storefront) {
  return resolveCheckoutHoldMinutes(storefront) * 60 * 1000;
}

export const SHIPPING = {
  metroManila: 150,
  provincial: 250,
  pickup: 0,
  freeThreshold: 5000,
};

export const SHIPPING_DISCLAIMER =
  "Shipping and delivery are at the expense of the buyer. Please book and pay for your chosen courier separately.";

export const STORE_PICKUP_INFO =
  "Store pickup is available at Hobby Arena. We'll email you when your order is ready.";

export const PROCESSING_HOURS = "Order processing Monday to Friday, 8:00am – 8:00pm";

export function fulfillmentLabel(fulfillment) {
  if (fulfillment === "pickup") return "Store pickup";
  if (fulfillment === "lalamove-grab") return "Lalamove / Grab";
  if (fulfillment === "lbc") return "LBC";
  if (fulfillment === "delivery") return "Delivery";
  return fulfillment;
}

export function calcShipping() {
  return 0;
}

/** Accent colors for payment method display when an account id matches. */
export const PAYMENT_METHOD_ACCENTS = {
  bpi: { name: "BPI", type: "bank", accent: "#C8102E" },
  bdo: { name: "BDO", type: "bank", accent: "#003DA5" },
  chinabank: { name: "Chinabank", type: "bank", accent: "#C41230" },
  gcash: { name: "GCash", type: "ewallet", accent: "#007DFE" },
  maya: { name: "Maya", type: "ewallet", accent: "#00D632" },
};

/** @deprecated Prefer CMS bankDetails.accounts — kept empty so callers never seed mock banks. */
export const BANK_ACCOUNTS = [];

/** Display list built from CMS account ids + known accents. */
export function paymentMethodsFromAccounts(accounts = []) {
  return (accounts || [])
    .filter((account) => account && account.active !== false)
    .map((account) => {
      const known = PAYMENT_METHOD_ACCENTS[account.id] || {};
      return {
        id: account.id,
        name: account.label || known.name || account.id,
        type: account.type || known.type || "bank",
        accent: known.accent || "#2563EB",
      };
    });
}

/** @deprecated Use paymentMethodsFromAccounts(cmsAccounts). */
export const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_ACCENTS).map(([id, meta]) => ({
  id,
  ...meta,
}));
