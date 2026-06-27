/** Checkout settings — banks & e-wallets from client-provided details. */

import { PAYMENT_QR } from "./mediaAssets.js";

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

export const BANK_ACCOUNTS = [
  {
    id: "bdo",
    type: "bank",
    label: "BDO",
    accountName: "Ralph Jeffrey Lim",
    accountNumber: "0028-6036-3935",
    qrImage: PAYMENT_QR.bdo,
    note: "Use your order ID as payment reference.",
    active: true,
  },
  {
    id: "bpi",
    type: "bank",
    label: "BPI",
    accountName: "Ralph Jeffrey Lim",
    accountNumber: "3509-0105-27",
    qrImage: PAYMENT_QR.bpi,
    note: "Use your order ID as payment reference.",
    active: true,
  },
  {
    id: "unionbank",
    type: "bank",
    label: "UnionBank",
    accountName: "Hobby Arena Marketing Corporation",
    accountNumber: "Pending",
    qrImage: "",
    note: "Account details coming soon.",
    active: false,
  },
  {
    id: "chinabank",
    type: "bank",
    label: "Chinabank",
    accountName: "Ralph Jeffrey Penaflor Lim",
    accountNumber: "1509-0000-2663",
    qrImage: "",
    note: "Use your order ID as payment reference.",
    active: true,
  },
  {
    id: "gcash",
    type: "ewallet",
    label: "GCash",
    accountName: "Ralph Jeffrey Lim",
    accountNumber: "0917-793-0238",
    qrImage: PAYMENT_QR.gcash,
    note: "Send exact amount. Screenshot required at checkout.",
    active: true,
  },
  {
    id: "maya",
    type: "ewallet",
    label: "Maya",
    accountName: "Ralph Jeffrey Lim",
    accountNumber: "0917-793-0238",
    qrImage: PAYMENT_QR.maya,
    note: "Send exact amount. Screenshot required at checkout.",
    active: true,
  },
];

export function calcShipping() {
  return 0;
}

/** Accepted payment methods for checkout display. */
export const PAYMENT_METHODS = [
  { id: "bpi", name: "BPI", type: "bank", accent: "#C8102E" },
  { id: "bdo", name: "BDO", type: "bank", accent: "#003DA5" },
  { id: "unionbank", name: "UnionBank", type: "bank", accent: "#F7941D" },
  { id: "chinabank", name: "Chinabank", type: "bank", accent: "#C41230" },
  { id: "gcash", name: "GCash", type: "ewallet", accent: "#007DFE" },
  { id: "maya", name: "Maya", type: "ewallet", accent: "#00D632" },
];
