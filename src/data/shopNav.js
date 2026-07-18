/**
 * Shop navigation layouts — switch in Admin → Design preview.
 */
import { DEFAULT_PRODUCT_LINES } from "./catalogDefaults.js";

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

export function lineUrl(base, line) {
  if (!line || line === "all") return base;
  return `${base}?line=${line}`;
}

/** Short label for mega-menu links (e.g. "Pokémon TCG" → "Pokémon"). */
export function navLineLabel(line) {
  const raw = String(line?.label || line?.match || "").trim();
  if (!raw) return "Line";
  return raw
    .replace(/\s+TCG$/i, "")
    .replace(/\s+CG$/i, "")
    .replace(/\s+Card Game$/i, "")
    .trim() || raw;
}

export function buildLineNavItems(basePath, lines, { allLabel, allHint, lineHint } = {}) {
  const active = (Array.isArray(lines) ? lines : []).filter((line) => line?.active !== false && line?.id);
  return [
    { label: allLabel, to: basePath, hint: allHint },
    ...active.map((line) => {
      const label = navLineLabel(line);
      const hint = typeof lineHint === "function" ? lineHint(label, line) : `${label} products`;
      return {
        label,
        to: lineUrl(basePath, line.id),
        hint,
      };
    }),
  ];
}

export function buildCrateDropNav(lines = DEFAULT_PRODUCT_LINES) {
  return {
    home: { label: "Home", to: "/" },
    contact: { label: "Contact", to: "/contact" },
    groups: [
      {
        id: "preorders",
        label: "Pre-Orders",
        tagline: "Reserve incoming sets before they sell out.",
        accent: "#F5C518",
        to: "/preorders",
        items: buildLineNavItems("/preorders", lines, {
          allLabel: "All Pre-Orders",
          allHint: "Full pre-order catalog",
          lineHint: (label) => `${label} pre-orders`,
        }),
      },
      {
        id: "products",
        label: "Products",
        tagline: "In-stock sealed products ready to ship.",
        accent: "#2563EB",
        to: "/products",
        items: buildLineNavItems("/products", lines, {
          allLabel: "All Products",
          allHint: "Everything in stock",
          lineHint: (label) => `${label} products`,
        }),
      },
    ],
  };
}

/** Static default — prefer buildCrateDropNav(activeLines) in the UI. */
export const CRATE_DROP_NAV = buildCrateDropNav();

export const FLAT_NAV = {
  home: { label: "Home", to: "/" },
  contact: { label: "Contact", to: "/contact" },
  links: [
    { label: "Pre-Orders", to: "/preorders" },
    { label: "Products", to: "/products" },
    { label: "Contact", to: "/contact" },
  ],
};

export function buildCompactNav(lines = DEFAULT_PRODUCT_LINES) {
  const crate = buildCrateDropNav(lines);
  return {
    home: crate.home,
    contact: crate.contact,
    shopMenu: {
      label: "Shop",
      groups: crate.groups,
    },
  };
}

export const COMPACT_NAV = buildCompactNav();

export function getNavConfig(layoutId, lines = DEFAULT_PRODUCT_LINES) {
  const crate = buildCrateDropNav(lines);
  switch (layoutId) {
    case "flat":
      return { type: "flat", ...FLAT_NAV };
    case "compact":
      return { type: "compact", ...buildCompactNav(lines) };
    case "crateDrop":
      return { type: "crateDrop", ...crate };
    default:
      return { type: "dock", ...crate };
  }
}
