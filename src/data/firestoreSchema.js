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
  customerPayouts: (uid, filename) => `customer-payouts/${uid}/${filename}`,
  adminBackups: (stamp, filename) => `admin-backups/${stamp}/${filename}`,
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
    mergedSetId: "string | undefined — HA-C-yyyymm###### shared id for a consolidated set",
    mergedAt: "string | undefined",
    mergedAllocation: "{ [productKey]: { percent, newQty } } | undefined",
    mergedEmailNote: "string | undefined — staff note included on the consolidated email",
    mergedEmailAttachment: "{ label, url, type, source: \"consolidated\" } | undefined — set-level file for the consolidated email",
    mergedEmailSavedAt: "string | undefined — ISO time the note/attachment were last saved",
  },
  inquiry: {
    name: "string",
    email: "string",
    subject: "string",
    message: "string",
    status: "New | Read | Handled",
    createdAt: "timestamp",
    notificationSeen: "boolean — false until an admin opens the inquiry",
  },
  customer: {
    email: "string",
    name: "string",
    phone: "string",
    marketingOptIn: "boolean",
    joinedAt: "timestamp",
    payoutMethods: "array of { id, bankName, accountName, accountNumber, note, qrUrl, qrName, isPdf, source }",
    primaryPayoutMethodId: "string | undefined — id of the preferred payout method",
  },
  product: {
    name: "string",
    line: "string",
    price: "number",
    cost: "number",
    stock: "number",
    maxPerOrder: "number | null",
    preorderLimited: "boolean",
    type: "Sealed | Pre-order",
    published: "boolean",
    comingSoon: "boolean",
    showCheckoutTimer: "boolean",
    active: "boolean",
  },
};
