/** Session-persisted checkout contact/address details. */

export const CHECKOUT_DETAILS_KEY = "hobbyarena:checkout-details";

export const EMPTY_CHECKOUT_DETAILS = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  province: "",
  postal: "",
  notes: "",
};

export function readCheckoutDetails() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_DETAILS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return { ...EMPTY_CHECKOUT_DETAILS, ...parsed };
  } catch {
    return null;
  }
}

export function writeCheckoutDetails(details) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CHECKOUT_DETAILS_KEY,
      JSON.stringify({ ...EMPTY_CHECKOUT_DETAILS, ...details }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function clearCheckoutDetails() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_DETAILS_KEY);
  } catch {
    // ignore
  }
}
