/** Default product lines, product types & T&C — editable in Admin → Classifications. */

export const DEFAULT_PRODUCT_LINES = [
  { id: "pokemon", label: "Pokémon TCG", match: "Pokémon TCG", active: true },
  { id: "one-piece", label: "One Piece CG", match: "One Piece Card Game", active: true },
  { id: "gundam", label: "Gundam", match: "Gundam", active: true },
];

/** Categories for in-stock products only (not pre-orders). Shown as "Product types" in admin. */
export const DEFAULT_PRODUCT_CATEGORIES = [
  { id: "tcg", label: "TCG", description: "Trading card game sealed products", active: true, forPreorders: false },
  { id: "accessories", label: "Card Accessories", description: "Sleeves, binders, deck boxes", active: true, forPreorders: false },
  { id: "figures", label: "Figures", description: "Collectible figures", active: true, forPreorders: false },
];

export const GENERIC_PRODUCT_TERMS = [
  "All products sold are authentic and sourced from official distributors unless stated otherwise.",
  "Prices are in Philippine Peso (₱) and subject to change without prior notice.",
  "Orders are processed Monday to Friday, 8:00 AM – 8:00 PM.",
  "Shipping and delivery costs are at the expense of the buyer unless a promotion states otherwise.",
  "Defective or damaged items must be reported within 48 hours of delivery with photo proof.",
  "Hobby Arena reserves the right to cancel orders suspected of fraud or payment issues.",
];

export const PREORDER_TERMS = [
  "Please carefully review the following terms and conditions before placing your pre-order:",
  "A 30% down payment is required to secure and confirm your pre-order.",
  "The remaining 70% balance must be fully settled before the Product Release Day to ensure smooth processing and timely turnover of your order.",
  "Orders that remain unpaid or unclaimed seven (7) days after the Product Release Day will be considered abandoned, and the corresponding down payment will be forfeited.",
  "While small pre-orders are accepted, they are not recommended, as allocation cuts are common for highly anticipated products, particularly Pokémon releases.",
  "Customers whose pre-orders are affected by allocation cuts will have their down payment refunded for the unfulfilled quantity.",
  "Allocation cuts are computed using whole numbers only. Fractional allocations will not be rounded up.",
  "Example: 25 units × 10% allocation = 2 units allocated (Not 2.5 units or 3 units)",
  "If an allocation cut occurs, customers whose orders cannot be fulfilled will automatically qualify for the raffle for the loose allocations. The number of raffle entries will be based on the quantity of unserved pre-orders.",
  "Example: 10 unfulfilled pre-order units = 10 raffle entries",
  "Cancellation of pre-orders is strictly prohibited. Down payments are non-refundable except in cases where the order is affected by country distributor allocation cuts.",
  "Refunds resulting from allocation cuts will be processed within 3–7 business days after the corresponding refund amount has been received from the country distributor.",
  "By proceeding with your purchase, you acknowledge that you have read, understood, and agreed to the above Pre-Order Terms and Conditions.",
];

export const DEFAULT_CONTACT_ADDRESS =
  "1139 Mahatma Gandhi St., Paco Manila, Metro Manila, Philippines";

export function buildContactMapUrl(address = DEFAULT_CONTACT_ADDRESS) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

export function buildContactMapEmbedUrl(address = DEFAULT_CONTACT_ADDRESS, zoom = 17) {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=${zoom}&output=embed`;
}

/** Resolve open + embed map URLs from CMS contact fields. */
export function resolveContactMapUrls(contact) {
  const address = contact?.address?.trim() || DEFAULT_CONTACT_ADDRESS;
  const customUrl = contact?.googleMapsUrl?.trim();

  if (customUrl) {
    if (/embed|output=embed/i.test(customUrl)) {
      return {
        openUrl: customUrl.replace(/([?&])output=embed/, "").replace("/maps/embed", "/maps"),
        embedUrl: customUrl,
      };
    }

    try {
      const parsed = new URL(customUrl);
      const query = parsed.searchParams.get("q") ?? parsed.searchParams.get("query");
      if (query) {
        return {
          openUrl: buildContactMapUrl(query),
          embedUrl: buildContactMapEmbedUrl(query),
        };
      }
    } catch {
      // fall through — treat as plain open link
    }

    return {
      openUrl: customUrl,
      embedUrl: buildContactMapEmbedUrl(address),
    };
  }

  return {
    openUrl: buildContactMapUrl(address),
    embedUrl: buildContactMapEmbedUrl(address),
  };
}

export const CONTACT_MAP_URL = buildContactMapUrl();
