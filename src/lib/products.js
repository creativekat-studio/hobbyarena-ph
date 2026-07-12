/** Catalog helpers — operate on inventory/product lists, not mock data. */

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
