/** Catalog helpers — operate on inventory/product lists, not mock data. */

import { getCountdownParts } from "./preorder.js";

/** True when the product cannot be purchased (out of stock or closed pre-order). */
export function isUnavailableProduct(product) {
  if (!product) return true;
  if (product.tag === "Pre-order") {
    return Boolean(getCountdownParts(product.preorderEndsAt)?.expired);
  }
  return Number(product.stock) <= 0;
}

/** Available / in-stock first, then closed / out of stock. Stable for equal availability. */
export function sortStorefrontProducts(products) {
  return [...products].sort((a, b) => Number(isUnavailableProduct(a)) - Number(isUnavailableProduct(b)));
}

export function getProductById(id, catalogProducts = []) {
  return catalogProducts.find((product) => product.id === id) ?? null;
}

export function filterPublishedProducts(products, publishedIds) {
  return products.filter((product) => publishedIds.has(product.id));
}

export function productCategoryLabel(product) {
  if (product.tag === "Pre-order") return "Pre-orders";
  return "Products";
}

export function productCategoryPath(product) {
  if (product.tag === "Pre-order") return "/preorders";
  return "/products";
}

export function productNeighbors(id, catalogProducts = []) {
  const index = catalogProducts.findIndex((product) => product.id === id);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? catalogProducts[index - 1] : null,
    next: index < catalogProducts.length - 1 ? catalogProducts[index + 1] : null,
  };
}

export function isSealedCatalogProduct(product) {
  return product?.tag !== "Pre-order";
}

export function isPreorderCatalogProduct(product) {
  return product?.tag === "Pre-order";
}
