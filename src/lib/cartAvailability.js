import { getCountdownParts, isPreorderProduct } from "./preorder.js";
import { isComingSoonProduct } from "./products.js";
import { productMaxPerOrder, productTracksStock } from "./quantityLimits.js";

/**
 * Why a live catalog product cannot be purchased right now.
 * Uses current inventory (not the cart snapshot) so closed pre-orders and
 * drafted/removed products are blocked even if they were added earlier.
 */
export function productUnavailableReason(product) {
  if (!product) return "is no longer available";
  if (product.deletedAt || product.deleted) return "is no longer available";
  if (!product.published) return "is no longer available";

  if (isComingSoonProduct(product)) return "is coming soon";

  if (isPreorderProduct(product) && getCountdownParts(product.preorderEndsAt)?.expired) {
    return "pre-order window has closed";
  }

  if (productTracksStock(product) && Math.max(0, Number(product.stock) || 0) <= 0) {
    return "is out of stock";
  }
  return null;
}

/**
 * @param {Array<{ id: string, name?: string, quantity?: number, tag?: string }>} cartItems
 * @param {(id: string) => object | null | undefined} getProduct
 * @returns {Array<{ id: string, name: string, reason: string }>}
 */
export function validateCartAgainstCatalog(cartItems, getProduct) {
  const issues = [];
  for (const item of cartItems || []) {
    const id = String(item?.id || "").trim();
    if (!id) continue;
    const product = typeof getProduct === "function" ? getProduct(id) : null;
    const name = String(item?.name || product?.name || id).trim() || id;
    const reason = productUnavailableReason(product);
    if (reason) {
      issues.push({ id, name, reason });
      continue;
    }
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const perOrder = productMaxPerOrder(product);
    if (perOrder != null && qty > perOrder) {
      issues.push({
        id,
        name,
        reason: perOrder === 1 ? "is limited to 1 per order" : `is limited to ${perOrder} per order`,
      });
      continue;
    }
    if (productTracksStock(product)) {
      const stock = Math.max(0, Number(product.stock) || 0);
      if (qty > stock) {
        issues.push({
          id,
          name,
          reason: stock === 1 ? "only has 1 left" : `only has ${stock} left`,
        });
      }
    }
  }
  return issues;
}

export function formatCartAvailabilityError(issues) {
  if (!Array.isArray(issues) || !issues.length) return "";
  if (issues.length === 1) {
    return `${issues[0].name} ${issues[0].reason}. Remove it from your cart to continue.`;
  }
  const names = issues.map((row) => row.name).join(", ");
  return `Some items can no longer be purchased (${names}). Remove them from your cart to continue.`;
}
