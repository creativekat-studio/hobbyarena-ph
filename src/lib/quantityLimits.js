import { isPreorderProduct } from "./preorder.js";

/**
 * Storefront + order-create quantity caps.
 * - Remaining units (stock / pre-order slots), soft-capped at 9999.
 * - Optional admin-set max-per-order on both sealed and pre-order SKUs.
 */

/** Soft ceiling for qty (also clamps extreme stock values in the UI). */
export const INSTOCK_QTY_SOFT_MAX = 9999;

/**
 * Hard ceiling applied when creating orders (API) so a single line cannot explode.
 * Matches the storefront soft max — never silently shrink a valid cart qty below this.
 */
export const MAX_LINE_QUANTITY = INSTOCK_QTY_SOFT_MAX;

/** Normalize admin “max per order”; blank / 0 / invalid → unset (no extra cap). */
export function productMaxPerOrder(product) {
  const raw = Number(product?.maxPerOrder);
  if (!Number.isFinite(raw) || raw < 1) return null;
  return Math.min(Math.floor(raw), INSTOCK_QTY_SOFT_MAX);
}

/**
 * Pre-order uses `stock` as a remaining-slot cap only when the admin opted in.
 * Legacy products with stock 0 and no flag stay unlimited so existing listings
 * don’t go sold-out overnight. A positive stock value is treated as a cap.
 */
export function isPreorderStockLimited(product) {
  if (!isPreorderProduct(product)) return false;
  if (product?.preorderLimited === true) return true;
  return Number(product?.stock) > 0;
}

/** Sealed products always track stock; pre-orders only when a slot cap is set. */
export function productTracksStock(product) {
  if (!product) return false;
  if (isPreorderProduct(product)) return isPreorderStockLimited(product);
  return true;
}

export function remainingProductUnits(product, availableUnits) {
  if (!productTracksStock(product)) return Number.POSITIVE_INFINITY;
  if (availableUnits != null && Number.isFinite(Number(availableUnits))) {
    return Math.max(0, Number(availableUnits));
  }
  return Math.max(0, Number(product?.stock) || 0);
}

export function maxStorefrontQuantity(product, availableUnits) {
  const remaining = remainingProductUnits(product, availableUnits);
  const stockCap = Number.isFinite(remaining)
    ? Math.min(remaining, INSTOCK_QTY_SOFT_MAX)
    : INSTOCK_QTY_SOFT_MAX;
  const perOrder = productMaxPerOrder(product);
  if (perOrder == null) return stockCap;
  return Math.min(stockCap, perOrder);
}

export function maxPerOrderHint(product) {
  const perOrder = productMaxPerOrder(product);
  if (perOrder == null) return "";
  return perOrder === 1 ? "Max 1 per order" : `Max ${perOrder} per order`;
}

/** Normalize a cart/API quantity into 1…MAX_LINE_QUANTITY. */
export function clampLineQuantity(value) {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty) || qty < 1) return 1;
  return Math.min(qty, MAX_LINE_QUANTITY);
}
