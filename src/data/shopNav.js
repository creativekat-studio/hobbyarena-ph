/**
 * Shop navigation layouts — switch via the design preview panel (bottom-left).
 *
 * • dock — Floating command island + mega-panels (default, distinctive)
 * • crateDrop — Classic dropdown groups (Crate Drop Collective style)
 * • flat — All links in one row
 * • compact — Single Shop menu
 */

export const SHOP_NAV_LAYOUTS = {
  dock: {
    id: "dock",
    label: "Command dock",
    description: "Floating island bar with expandable category panels.",
  },
  crateDrop: {
    id: "crateDrop",
    label: "Crate Drop",
    description: "Dropdown groups: Pre-Orders and Products with line filters.",
  },
  flat: {
    id: "flat",
    label: "Flat",
    description: "All shop links in one row — good for narrow headers.",
  },
  compact: {
    id: "compact",
    label: "Compact",
    description: "Single Shop menu — minimal navbar footprint.",
  },
};

export const SHOP_LINES = [
  { value: "pokemon", label: "Pokémon", match: "Pokémon TCG" },
  { value: "one-piece", label: "One Piece", match: "One Piece Card Game" },
  { value: "gundam", label: "Gundam", match: "Gundam" },
];

function shopUrl(category, line) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (line && line !== "all") params.set("line", line);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export const CRATE_DROP_NAV = {
  home: { label: "Home", to: "/" },
  contact: { label: "Contact", section: "contact" },
  groups: [
    {
      id: "preorders",
      label: "Pre-Orders",
      tagline: "Reserve incoming sets before they sell out.",
      accent: "#F5C518",
      items: [
        { label: "All Pre-Orders", to: shopUrl("preorder"), hint: "Full pre-order catalog" },
        { label: "One Piece", to: shopUrl("preorder", "one-piece"), hint: "OP TCG pre-orders" },
        { label: "Pokémon", to: shopUrl("preorder", "pokemon"), hint: "Pokémon TCG pre-orders" },
      ],
    },
    {
      id: "products",
      label: "Products",
      tagline: "In-stock sealed products ready to ship.",
      accent: "#2563EB",
      items: [
        { label: "All Products", to: shopUrl("sealed"), hint: "Everything in stock" },
        { label: "One Piece", to: shopUrl("sealed", "one-piece"), hint: "OP sealed products" },
        { label: "Pokémon", to: shopUrl("sealed", "pokemon"), hint: "Pokémon sealed products" },
        { label: "Gundam", to: shopUrl("sealed", "gundam"), hint: "Gundam products" },
      ],
    },
  ],
};

export const FLAT_NAV = {
  home: { label: "Home", to: "/" },
  contact: { label: "Contact", section: "contact" },
  links: [
    { label: "All Pre-Orders", to: shopUrl("preorder") },
    { label: "All Products", to: shopUrl("sealed") },
    { label: "One Piece", to: shopUrl("sealed", "one-piece") },
    { label: "Pokémon", to: shopUrl("sealed", "pokemon") },
    { label: "Gundam", to: shopUrl("sealed", "gundam") },
  ],
};

export const COMPACT_NAV = {
  home: { label: "Home", to: "/" },
  contact: { label: "Contact", section: "contact" },
  shopMenu: {
    label: "Shop",
    groups: CRATE_DROP_NAV.groups,
  },
};

export function getNavConfig(layoutId) {
  switch (layoutId) {
    case "flat":
      return { type: "flat", ...FLAT_NAV };
    case "compact":
      return { type: "compact", ...COMPACT_NAV };
    case "crateDrop":
      return { type: "crateDrop", ...CRATE_DROP_NAV };
    default:
      return { type: "dock", ...CRATE_DROP_NAV };
  }
}
