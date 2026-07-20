/** Default BIR assets kept for local/reference use. Storefront only shows CMS uploads. */

export const DEFAULT_BIR_SEAL_IMAGE = "/bir-registered-seal.png";
export const DEFAULT_BIR_SEAL_MARK_IMAGE = "/bir-registered-seal-mark.png";

/**
 * Where the full BIR badge sits inside the homepage payment / bank-details block.
 * Images & on/off stay in CMS → Business Info; this switch lives in Admin → Design.
 */
export const BIR_PAYMENT_LAYOUTS = {
  beside: {
    id: "beside",
    label: "Beside headline",
    description: "Full badge sits to the right of the payment section title (like the secure-checkout example).",
  },
  below: {
    id: "below",
    label: "Below payment logos",
    description: "Full badge centered under the bank / e-wallet marquee.",
  },
  under_copy: {
    id: "under_copy",
    label: "Under intro copy",
    description: "Full badge centered between the subtitle and the payment logos.",
  },
};

export const DEFAULT_BIR_PAYMENT_LAYOUT = "beside";

export function normalizeBirPaymentLayout(value) {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(BIR_PAYMENT_LAYOUTS, value)
    ? value
    : DEFAULT_BIR_PAYMENT_LAYOUT;
}
