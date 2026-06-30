import { ALL_PRODUCTS, PREORDER_PRODUCTS, SEALED_PRODUCTS } from "../data/mockData.js";

export function getProductById(id) {
  return ALL_PRODUCTS.find((product) => product.id === id) ?? null;
}

export function filterPublishedProducts(products, publishedIds) {
  return products.filter((product) => publishedIds.has(product.id));
}

export function publishedSealedProducts(publishedIds) {
  return filterPublishedProducts(SEALED_PRODUCTS, publishedIds);
}

export function publishedPreorderProducts(publishedIds) {
  return filterPublishedProducts(PREORDER_PRODUCTS, publishedIds);
}

export function productsForShopCategory(category, publishedIds) {
  if (category === "sealed") return publishedSealedProducts(publishedIds);
  if (category === "preorder") return publishedPreorderProducts(publishedIds);
  if (category === "accessories") return [];
  return filterPublishedProducts(ALL_PRODUCTS, publishedIds);
}

export function productCategoryLabel(product) {
  if (product.tag === "Pre-order") return "Pre-orders";
  return "Products";
}

export function productCategoryPath(product) {
  if (product.tag === "Pre-order") return "/preorders";
  return "/products";
}

export function productNeighbors(id, catalogProducts = ALL_PRODUCTS) {
  const index = catalogProducts.findIndex((product) => product.id === id);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? catalogProducts[index - 1] : null,
    next: index < catalogProducts.length - 1 ? catalogProducts[index + 1] : null,
  };
}

export function isSealedCatalogProduct(product) {
  return SEALED_PRODUCTS.some((item) => item.id === product.id);
}

export function isPreorderCatalogProduct(product) {
  return PREORDER_PRODUCTS.some((item) => item.id === product.id);
}
