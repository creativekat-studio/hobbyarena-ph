import { isPreorderProduct } from "./preorder.js";

/**
 * Storefront + order-create quantity caps.
 * - On-hand / sealed: remaining available units, soft-capped at 9999.
 * - Pre-order: no definite business cap; UI/API still use a finite safety ceiling.
 */

/** Soft ceiling for in-stock qty (also clamps extreme stock values in the UI). */
export const INSTOCK_QTY_SOFT_MAX = 9999;

/**
 * Hard ceiling applied when creating orders (API) so a single line cannot explode.
 * Matches the storefront soft max — never silently shrink a valid cart qty below this.
 */
export const MAX_LINE_QUANTITY = INSTOCK_QTY_SOFT_MAX;

/**
 * Practical UI bound only so steppers/inputs stay finite.
 * Not a business rule — pre-orders are treated as uncapped in the shop UI.
 */
const PREORDER_QTY_UI_MAX = Number.MAX_SAFE_INTEGER;

export function maxStorefrontQuantity(product, availableUnits) {
  if (isPreorderProduct(product)) return PREORDER_QTY_UI_MAX;

  const remaining = availableUnits != null && Number.isFinite(Number(availableUnits))
    ? Math.max(0, Number(availableUnits))
    : Math.max(0, Number(product?.stock) || 0);

  return Math.min(remaining, INSTOCK_QTY_SOFT_MAX);
}

/** Normalize a cart/API quantity into 1…MAX_LINE_QUANTITY. */
export function clampLineQuantity(value) {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty) || qty < 1) return 1;
  return Math.min(qty, MAX_LINE_QUANTITY);
}
