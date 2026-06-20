/** Checkout settings — mock. Admin bank/shipping settings page can edit these later. */

export const SHIPPING = {
  metroManila: 150,
  provincial: 250,
  pickup: 0,
  freeThreshold: 5000,
};

export const BANK_ACCOUNTS = [
  {
    id: "bpi",
    label: "BPI Savings",
    accountName: "Hobby Arena Marketing Corporation",
    accountNumber: "1234-5678-90",
    note: "Use your order ID as payment reference.",
  },
  {
    id: "gcash",
    label: "GCash",
    accountName: "Hobby Arena Marketing Corp.",
    accountNumber: "0917 123 4567",
    note: "Send exact amount. Screenshot required below.",
  },
];

export function calcShipping(subtotal, fulfillment, region) {
  if (fulfillment === "pickup") return 0;
  if (subtotal >= SHIPPING.freeThreshold) return 0;
  if (region === "provincial") return SHIPPING.provincial;
  return SHIPPING.metroManila;
}
