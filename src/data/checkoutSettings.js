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

/** Accepted payment methods for storefront display — banks & e-wallets only. */
export const PAYMENT_METHODS = [
  { id: "bpi", name: "BPI", type: "bank", accent: "#C8102E" },
  { id: "bdo", name: "BDO", type: "bank", accent: "#003DA5" },
  { id: "metrobank", name: "Metrobank", type: "bank", accent: "#004B8D" },
  { id: "landbank", name: "Landbank", type: "bank", accent: "#007A33" },
  { id: "unionbank", name: "UnionBank", type: "bank", accent: "#F7941D" },
  { id: "gcash", name: "GCash", type: "ewallet", accent: "#007DFE" },
  { id: "maya", name: "Maya", type: "ewallet", accent: "#00D632" },
  { id: "grabpay", name: "GrabPay", type: "ewallet", accent: "#00B14F" },
  { id: "shopeepay", name: "ShopeePay", type: "ewallet", accent: "#EE4D2D" },
];
