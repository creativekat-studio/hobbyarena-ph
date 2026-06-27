// Mock data only — no backend yet. Prices in PHP.
// Modeled on the real Hobby Arena (hobbyarena.ph): a premium TCG store.

import { productImage } from "./mediaAssets.js";

export const BRAND = {
  name: "Hobby Arena",
  legalName: "Hobby Arena Marketing Corporation",
  tagline: "Your Trusted Source for Premium TCG",
  blurb:
    "Your go-to destination for sealed products, exciting drops, and the thrill of the pull. Whether you're building your collection or chasing the next big hit, this is where it all begins.",
  email: "hello@hobbyarena.ph",
  hours: "Order processing Monday to Friday, 8:00am – 8:00pm",
  socials: ["Instagram", "Facebook", "TikTok"],
  handle: "@hobbyarena.ph",
};

export const STATS = [
  { value: "5,000+", label: "Packs pulled" },
  { value: "120+", label: "Sealed SKUs" },
  { value: "4.9★", label: "Collector rating" },
  { value: "48hr", label: "Metro Manila ship" },
];

export const SEALED_PRODUCTS = [
  {
    id: "pkm-phantasmal-etb",
    name: "Mega Evolution — Phantasmal Flames Elite Trainer Box",
    line: "Pokémon TCG",
    price: 8000,
    rating: 4.9,
    reviews: 64,
    stock: 0,
    accent: "#f43f5e",
    tag: "Sealed",
    image: productImage("pkm-phantasmal-etb"),
    descriptionSections: [
      {
        title: "What's in the box",
        specs: [
          { label: "Booster packs", value: "9 × Phantasmal Flames" },
          { label: "Promo card", value: "Charcadet (full-art foil)" },
          { label: "Card sleeves", value: "65" },
        ],
      },
      {
        title: "Accessories",
        specs: [
          { label: "Energy cards", value: "40" },
          { label: "Player's guide", value: "Phantasmal Flames expansion" },
          { label: "Damage-counter dice", value: "6" },
          { label: "Coin-flip die", value: "1 (competition-legal)" },
          { label: "Plastic coin", value: "1" },
          { label: "Storage", value: "Collector's box + 6 dividers" },
        ],
      },
      {
        title: "Digital",
        specs: [{ label: "Pokémon TCG Live", value: "Code card included" }],
      },
    ],
  },
  {
    id: "pkm-ascended-etb",
    name: "Mega Evolution — Ascended Heroes Elite Trainer Box",
    line: "Pokémon TCG",
    price: 12000,
    rating: 5.0,
    reviews: 38,
    stock: 4,
    accent: "#7c3aed",
    tag: "Sealed",
    image: productImage("pkm-ascended-etb"),
    descriptionSections: [
      {
        title: "What's in the box",
        specs: [
          { label: "Booster packs", value: "9 × Ascended Heroes" },
          { label: "Promo card", value: "1 full-art foil" },
          { label: "Card sleeves", value: "65 (Ascended Heroes art)" },
        ],
      },
      {
        title: "Accessories",
        specs: [
          { label: "Energy cards", value: "40" },
          { label: "Player's guide", value: "Ascended Heroes expansion" },
          { label: "Damage-counter dice", value: "6" },
          { label: "Coin-flip die", value: "1 (competition-legal)" },
          { label: "Plastic coin", value: "1" },
          { label: "Storage", value: "Collector's box + dividers" },
        ],
      },
      {
        title: "Digital",
        specs: [{ label: "Pokémon TCG Live", value: "Code card included" }],
      },
    ],
  },
  {
    id: "pkm-first-partner",
    name: "First Partner Illustration Collection — Series 1",
    line: "Pokémon TCG",
    price: 4000,
    rating: 4.8,
    reviews: 51,
    stock: 9,
    accent: "#06b6d4",
    tag: "Sealed",
    image: productImage("pkm-first-partner"),
    descriptionSections: [
      {
        title: "Collection overview",
        intro: "Illustration collection featuring partner Pokémon across generations in premium foil treatments.",
        specs: [
          { label: "Format", value: "Illustration collection box" },
          { label: "Language", value: "English" },
          { label: "Condition", value: "Factory sealed" },
        ],
      },
      {
        title: "Good to know",
        bullets: [
          "Ideal for collectors building a display set or gifting to new trainers.",
          "Sourced from official distributors.",
        ],
      },
    ],
  },
  {
    id: "pkm-charizard-upc",
    name: "Mega Charizard X ex Ultra-Premium Collection",
    line: "Pokémon TCG",
    price: 18000,
    rating: 5.0,
    reviews: 22,
    stock: 0,
    accent: "#f59e0b",
    tag: "Grail",
    image: productImage("pkm-charizard-upc"),
    descriptionSections: [
      {
        title: "What's in the box",
        specs: [
          { label: "Featured Pokémon", value: "Mega Charizard X ex" },
          { label: "Product type", value: "Ultra-Premium Collection" },
          { label: "Presentation", value: "Deluxe collector box" },
        ],
      },
      {
        title: "Highlights",
        bullets: [
          "Includes booster packs and exclusive promo cards in premium packaging.",
          "Highly sought-after grail sealed product.",
          "Ships double-boxed with collector-grade padding.",
        ],
      },
    ],
  },
  {
    id: "op-15-booster",
    name: "Booster Box — The Adventure of The Island of God [OP-15]",
    line: "One Piece Card Game",
    price: 4800,
    rating: 4.7,
    reviews: 88,
    stock: 12,
    accent: "#ef4444",
    tag: "Sealed",
    image: productImage("op-15-booster"),
    descriptionSections: [
      {
        title: "Box contents",
        specs: [
          { label: "Booster packs", value: "24" },
          { label: "Set", value: "OP-15 — Island of God" },
          { label: "Language", value: "English" },
          { label: "Condition", value: "Factory sealed" },
        ],
      },
      {
        title: "Good to know",
        bullets: [
          "Main expansion booster box for the One Piece Card Game.",
          "Ready to rip or hold sealed.",
        ],
      },
    ],
  },
];

const PREORDER_DEADLINES = {
  "op-jp-3rd-anni-en": "2026-07-18T23:59:59+08:00",
  "op-jp-3rd-anni-cn": "2026-07-22T23:59:59+08:00",
  "op-treasure-chest-2": "2026-08-05T23:59:59+08:00",
  "op-spc-01": "2026-08-12T23:59:59+08:00",
  "op-mini-tin-4": "2026-07-30T23:59:59+08:00",
};

export const PREORDER_PRODUCTS = [
  {
    id: "op-jp-3rd-anni-en",
    name: "One Piece (Japanese) English 3rd Anniversary Set",
    line: "One Piece Card Game",
    price: 2880,
    preorderEndsAt: PREORDER_DEADLINES["op-jp-3rd-anni-en"],
    depositPercent: 30,
    rating: 4.8,
    reviews: 12,
    stock: 0,
    accent: "#ef4444",
    tag: "Pre-order",
    image: productImage("op-jp-3rd-anni-en"),
    descriptionSections: [
      {
        title: "Set details",
        specs: [
          { label: "Product", value: "JP 3rd Anniversary Set" },
          { label: "Packaging", value: "English" },
          { label: "Status", value: "Pre-order" },
        ],
      },
      {
        title: "Pre-order terms",
        bullets: [
          "Reserve your slot now — balance due before release.",
          "Limited allocation; orders confirmed in the order received.",
        ],
        note: "We'll email you when your unit is ready to ship or pay.",
      },
    ],
  },
  {
    id: "op-jp-3rd-anni-cn",
    name: "One Piece (Japanese) China 3rd Anniversary Set",
    line: "One Piece Card Game",
    price: 2160,
    preorderEndsAt: PREORDER_DEADLINES["op-jp-3rd-anni-cn"],
    depositPercent: 30,
    rating: 4.7,
    reviews: 9,
    stock: 0,
    accent: "#ef4444",
    tag: "Pre-order",
    image: productImage("op-jp-3rd-anni-cn"),
    descriptionSections: [
      {
        title: "Set details",
        specs: [
          { label: "Product", value: "JP 3rd Anniversary Set" },
          { label: "Edition", value: "China market" },
          { label: "Status", value: "Pre-order" },
        ],
      },
      {
        title: "Pre-order terms",
        bullets: [
          "Small deposit locks your slot until stock arrives.",
          "Authentic sealed product via official channels.",
        ],
      },
    ],
  },
  {
    id: "op-treasure-chest-2",
    name: "One Piece Treasure Chest Vol. 2 [TC-02]",
    line: "One Piece Card Game",
    price: 1230,
    preorderEndsAt: PREORDER_DEADLINES["op-treasure-chest-2"],
    depositPercent: 30,
    rating: 4.6,
    reviews: 17,
    stock: 0,
    accent: "#06b6d4",
    tag: "Pre-order",
    image: productImage("op-treasure-chest-2"),
    descriptionSections: [
      {
        title: "Set details",
        specs: [
          { label: "Product", value: "Treasure Chest Vol. 2 [TC-02]" },
          { label: "Game", value: "One Piece Card Game" },
          { label: "Status", value: "Pre-order" },
        ],
      },
      {
        title: "Why pre-order",
        bullets: [
          "Curated collection box with exclusive promo treatments.",
          "Secure your copy before general release sells out.",
        ],
      },
    ],
  },
  {
    id: "op-spc-01",
    name: "One Piece Super Premium Collection Vol. 1 [SPC-01]",
    line: "One Piece Card Game",
    price: 3300,
    preorderEndsAt: PREORDER_DEADLINES["op-spc-01"],
    depositPercent: 30,
    rating: 4.9,
    reviews: 14,
    stock: 0,
    accent: "#7c3aed",
    tag: "Pre-order",
    image: productImage("op-spc-01"),
    descriptionSections: [
      {
        title: "Set details",
        specs: [
          { label: "Product", value: "Super Premium Collection Vol. 1 [SPC-01]" },
          { label: "Language", value: "English" },
          { label: "Status", value: "Pre-order" },
        ],
      },
      {
        title: "Pre-order terms",
        bullets: [
          "Deposit locks your slot until stock lands at Hobby Arena.",
          "Premium packaging with exclusive card treatments.",
        ],
      },
    ],
  },
  {
    id: "op-mini-tin-4",
    name: "One Piece Mini Tin Pack Set Vol. 4 [TS-04]",
    line: "One Piece Card Game",
    price: 300,
    preorderEndsAt: PREORDER_DEADLINES["op-mini-tin-4"],
    depositPercent: 30,
    rating: 4.5,
    reviews: 31,
    stock: 0,
    accent: "#06b6d4",
    tag: "Pre-order",
    image: productImage("op-mini-tin-4"),
    descriptionSections: [
      {
        title: "Set details",
        specs: [
          { label: "Product", value: "Mini Tin Pack Set Vol. 4 [TS-04]" },
          { label: "Format", value: "Mini tins + booster packs" },
          { label: "Status", value: "Pre-order" },
        ],
      },
      {
        title: "Good to know",
        bullets: [
          "Compact gift-ready sealed product.",
          "Great entry point for new One Piece players.",
        ],
        note: "Ships when stock arrives at our warehouse.",
      },
    ],
  },
];

export const ALL_PRODUCTS = [...SEALED_PRODUCTS, ...PREORDER_PRODUCTS];

export const TESTIMONIALS = [
  {
    quote:
      "Sealed ETB arrived mint, double-boxed and bubble-wrapped. The pulls were insane. My new go-to for Pokémon.",
    name: "Marco D.",
    role: "Pokémon collector",
  },
  {
    quote:
      "Pre-ordered an OP booster box and got a slot when it sold out everywhere else. Smooth, legit, fast.",
    name: "Aira S.",
    role: "One Piece player",
  },
  {
    quote:
      "Real TCG people behind it. They helped me start my Master set and the prices beat the resellers.",
    name: "JP R.",
    role: "First-time collector",
  },
];

// --- Account (mock signed-in user) ---
export const ACCOUNT = {
  name: "Ash Ketchum",
  email: "ash@hobbyarena.ph",
  memberSince: "2024",
  tier: "Elite Trainer",
  storeCredit: 1250,
  loyaltyPoints: 3480,
  orders: [
    {
      id: "HA-10428",
      date: "2026-06-10",
      items: "Mega Charizard X ex Ultra-Premium Collection",
      total: 18000,
      status: "Processing",
    },
    {
      id: "HA-10391",
      date: "2026-05-28",
      items: "OP-15 Booster Box ×2",
      total: 9600,
      status: "Shipped",
    },
    {
      id: "HA-10355",
      date: "2026-05-04",
      items: "First Partner Illustration Collection",
      total: 4000,
      status: "Delivered",
    },
    {
      id: "HA-10299",
      date: "2026-04-12",
      items: "One Piece Treasure Chest Vol. 2 [TC-02]",
      total: 1230,
      status: "Delivered",
    },
  ],
  wishlist: [
    "Ascended Heroes Elite Trainer Box",
    "One Piece SPC-01",
    "Phantasmal Flames ETB",
  ],
};

// --- Orders (admin) ---
export const ORDERS = [
  {
    id: "HA-10428",
    customer: "Ash Ketchum",
    email: "ash@hobbyarena.ph",
    type: "In-stock",
    items: "Mega Charizard X ex Ultra-Premium Collection",
    qty: 1,
    total: 18000,
    payment: "Paid",
    status: "Processing",
    date: "2026-06-15",
  },
  {
    id: "HA-10427",
    customer: "Misty Waterflower",
    email: "misty@example.com",
    type: "In-stock",
    items: "OP-15 Booster Box",
    qty: 1,
    total: 4800,
    payment: "Paid",
    status: "Packing",
    date: "2026-06-15",
  },
  {
    id: "HA-10426",
    customer: "Brock Harrison",
    email: "brock@example.com",
    type: "In-stock",
    items: "OP-15 Booster Box ×2",
    qty: 2,
    total: 9600,
    payment: "Paid",
    status: "Shipped",
    date: "2026-06-14",
  },
  {
    id: "HA-10425",
    customer: "Nami Oda",
    email: "nami@example.com",
    type: "Pre-order",
    items: "One Piece Super Premium Collection Vol. 1 [SPC-01]",
    qty: 1,
    total: 3300,
    payment: "Deposit",
    status: "Awaiting stock",
    date: "2026-06-14",
  },
  {
    id: "HA-10424",
    customer: "Gary Oak",
    email: "gary@example.com",
    type: "In-stock",
    items: "Ascended Heroes Elite Trainer Box",
    qty: 1,
    total: 12000,
    payment: "Paid",
    status: "Delivered",
    date: "2026-06-13",
  },
  {
    id: "HA-10423",
    customer: "May Maple",
    email: "may@example.com",
    type: "Pre-order",
    items: "One Piece (Japanese) English 3rd Anniversary Set",
    qty: 1,
    total: 2880,
    payment: "Deposit",
    status: "Awaiting stock",
    date: "2026-06-12",
  },
  {
    id: "HA-10422",
    customer: "Zoro Roronoa",
    email: "zoro@example.com",
    type: "Pre-order",
    items: "One Piece Super Premium Collection Vol. 1 [SPC-01]",
    qty: 1,
    total: 3300,
    payment: "Unpaid",
    status: "Reserved",
    date: "2026-06-11",
  },
  {
    id: "HA-10421",
    customer: "Dawn Berlitz",
    email: "dawn@example.com",
    type: "In-stock",
    items: "First Partner Illustration Collection",
    qty: 2,
    total: 8000,
    payment: "Paid",
    status: "Delivered",
    date: "2026-06-10",
  },
  {
    id: "HA-10420",
    customer: "Luffy Monkey",
    email: "luffy@example.com",
    type: "Pre-order",
    items: "One Piece (Japanese) English 3rd Anniversary Set",
    qty: 1,
    total: 2880,
    payment: "Deposit",
    status: "Ready for pickup",
    date: "2026-06-09",
  },
  {
    id: "HA-10419",
    customer: "Serena Yvonne",
    email: "serena@example.com",
    type: "In-stock",
    items: "OP-15 Booster Box",
    qty: 1,
    total: 4800,
    payment: "Refunded",
    status: "Cancelled",
    date: "2026-06-08",
  },
];

// --- Customers (admin / marketing) ---
export const CUSTOMERS = [
  { id: "c1", name: "Ash Ketchum", email: "ash@hobbyarena.ph", joined: "2024-02-11", orders: 12, totalSpent: 86400, marketingOptIn: true, status: "Active" },
  { id: "c2", name: "Misty Waterflower", email: "misty@example.com", joined: "2024-05-02", orders: 7, totalSpent: 31200, marketingOptIn: true, status: "Active" },
  { id: "c3", name: "Brock Harrison", email: "brock@example.com", joined: "2024-06-18", orders: 9, totalSpent: 45800, marketingOptIn: false, status: "Active" },
  { id: "c4", name: "Nami Oda", email: "nami@example.com", joined: "2025-01-09", orders: 4, totalSpent: 12600, marketingOptIn: true, status: "Active" },
  { id: "c5", name: "Gary Oak", email: "gary@example.com", joined: "2025-03-21", orders: 6, totalSpent: 54000, marketingOptIn: true, status: "Active" },
  { id: "c6", name: "May Maple", email: "may@example.com", joined: "2025-07-30", orders: 2, totalSpent: 5190, marketingOptIn: false, status: "Active" },
  { id: "c7", name: "Zoro Roronoa", email: "zoro@example.com", joined: "2025-09-14", orders: 3, totalSpent: 9900, marketingOptIn: true, status: "Dormant" },
  { id: "c8", name: "Dawn Berlitz", email: "dawn@example.com", joined: "2026-01-05", orders: 5, totalSpent: 26000, marketingOptIn: true, status: "Active" },
];

// --- Inventory (mock stock management rows) ---
export const INVENTORY = ALL_PRODUCTS.map((product, index) => {
  const sku = `HA-${product.line.startsWith("Pokémon") ? "PKM" : "OP"}-${String(
    1001 + index,
  )}`;
  const type = PREORDER_PRODUCTS.some((p) => p.id === product.id)
    ? "Pre-order"
    : "Sealed";
  const cost = Math.round(product.price * 0.72);
  return {
    id: product.id,
    sku,
    name: product.name,
    line: product.line,
    type,
    price: product.price,
    cost,
    stock: product.stock,
    reorderAt: 3,
    ...(type === "Pre-order"
      ? {
          preorderEndsAt: product.preorderEndsAt ?? null,
          depositPercent: product.depositPercent ?? 30,
        }
      : {}),
  };
});
