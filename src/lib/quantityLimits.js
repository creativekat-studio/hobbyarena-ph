import { isPreorderProduct } from "./preorder.js";

/**
 * Storefront quantity caps.
 * - On-hand / sealed: remaining available units, soft-capped at 9999.
 * - Pre-order: no definite quantity cap.
 */

/** Soft ceiling for in-stock qty (also clamps extreme stock values in the UI). */
export const INSTOCK_QTY_SOFT_MAX = 9999;

/**
 * Practical UI bound only so steppers/inputs stay finite.
 * Not a business rule — pre-orders are treated as uncapped.
 */
const PREORDER_QTY_UI_MAX = Number.MAX_SAFE_INTEGER;

export function maxStorefrontQuantity(product, availableUnits) {
  if (isPreorderProduct(product)) return PREORDER_QTY_UI_MAX;

  const remaining = availableUnits != null && Number.isFinite(Number(availableUnits))
    ? Math.max(0, Number(availableUnits))
    : Math.max(0, Number(product?.stock) || 0);

  return Math.min(remaining, INSTOCK_QTY_SOFT_MAX);
}
