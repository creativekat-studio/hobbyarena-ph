/**
 * Shop navigation layouts — switch in Admin → Design preview.
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

function lineUrl(base, line) {
  if (!line || line === "all") return base;
  return `${base}?line=${line}`;
}

export const CRATE_DROP_NAV = {
  home: { label: "Home", to: "/" },
  contact: { label: "Contact", to: "/contact" },
  groups: [
    {
      id: "preorders",
      label: "Pre-Orders",
      tagline: "Reserve incoming sets before they sell out.",
      accent: "#F5C518",
      to: "/preorders",
      items: [
        { label: "All Pre-Orders", to: "/preorders", hint: "Full pre-order catalog" },
        { label: "One Piece", to: lineUrl("/preorders", "one-piece"), hint: "OP TCG pre-orders" },
        { label: "Pokémon", to: lineUrl("/preorders", "pokemon"), hint: "Pokémon TCG pre-orders" },
      ],
    },
    {
      id: "products",
      label: "Products",
      tagline: "In-stock sealed products ready to ship.",
      accent: "#2563EB",
      to: "/products",
      items: [
        { label: "All Products", to: "/products", hint: "Everything in stock" },
        { label: "One Piece", to: lineUrl("/products", "one-piece"), hint: "OP sealed products" },
        { label: "Pokémon", to: lineUrl("/products", "pokemon"), hint: "Pokémon sealed products" },
        { label: "Gundam", to: lineUrl("/products", "gundam"), hint: "Gundam products" },
      ],
    },
  ],
};

export const FLAT_NAV = {
  home: { label: "Home", to: "/" },
  contact: { label: "Contact", to: "/contact" },
  links: [
    { label: "Pre-Orders", to: "/preorders" },
    { label: "Products", to: "/products" },
    { label: "Contact", to: "/contact" },
  ],
};

export const COMPACT_NAV = {
  home: { label: "Home", to: "/" },
  contact: { label: "Contact", to: "/contact" },
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
