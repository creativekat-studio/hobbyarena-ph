/**
 * Firestore collection + document paths for Hobby Arena.
 * Keep in sync with firestore.rules.
 */

export const COLLECTIONS = {
  meta: "_meta",
  products: "products",
  inventory: "inventory",
  orders: "orders",
  inquiries: "inquiries",
  customers: "customers",
  cms: "cms",
  catalog: "catalog",
  stockHolds: "stockHolds",
};

/** Singleton docs (fixed id). */
export const SINGLETON_DOCS = {
  cmsContent: "content",
  cmsDesign: "design",
  catalogSettings: "settings",
  health: "health",
};

export const STORAGE_PATHS = {
  orderProofs: (orderId) => `order-proofs/${orderId}`,
  productImages: (productId) => `products/${productId}`,
  cmsAssets: (filename) => `cms/${filename}`,
};

/** Shape reference — not enforced at runtime. */
export const SCHEMA = {
  order: {
    id: "string",
    customer: "string",
    email: "string",
    phone: "string",
    type: "In-stock | Pre-order | Mixed",
    payment: "string",
    status: "string",
    lineItems: "array",
    total: "number",
    discount: "number",
    balanceDue: "number",
    refundAmount: "number",
    date: "string",
    createdAt: "timestamp",
    updatedAt: "timestamp",
  },
  inquiry: {
    name: "string",
    email: "string",
    subject: "string",
    message: "string",
    status: "New | Read | Handled",
    createdAt: "timestamp",
  },
  customer: {
    email: "string",
    name: "string",
    phone: "string",
    marketingOptIn: "boolean",
    joinedAt: "timestamp",
  },
  product: {
    name: "string",
    line: "string",
    price: "number",
    cost: "number",
    stock: "number",
    type: "Sealed | Pre-order",
    published: "boolean",
    comingSoon: "boolean",
    active: "boolean",
  },
};
