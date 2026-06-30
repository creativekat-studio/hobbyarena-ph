/**
 * Shared nav destinations for all layout styles.
 */
import { CRATE_DROP_NAV } from "./shopNav.js";

export { CRATE_DROP_NAV };

export const NAV_DESTINATIONS = {
  home: CRATE_DROP_NAV.home,
  contact: { label: "Contact", to: "/contact" },
  preorders: {
    id: "preorders",
    label: "Pre-Orders",
    tagline: "Reserve incoming sets before they sell out.",
    accent: "#F5C518",
    to: "/preorders",
    items: CRATE_DROP_NAV.groups.find((g) => g.id === "preorders")?.items.map((item) => ({
      ...item,
      to: item.to.replace("/shop?category=preorder", "/preorders").replace("category=preorder&", "preorders?"),
    })) ?? [],
  },
  products: {
    id: "products",
    label: "Products",
    tagline: "In-stock sealed products ready to ship.",
    accent: "#2563EB",
    to: "/products",
    items: CRATE_DROP_NAV.groups.find((g) => g.id === "products")?.items.map((item) => ({
      ...item,
      to: item.to.replace("/shop?category=sealed", "/products").replace("category=sealed&", "products?"),
    })) ?? [],
  },
};

export const NAV_GROUPS = [NAV_DESTINATIONS.preorders, NAV_DESTINATIONS.products];

/** @deprecated Use NAV_GROUPS — kept for callers expecting a groups array on destinations. */
NAV_DESTINATIONS.groups = NAV_GROUPS;

export function isNavLinkActive(pathname, search, to) {
  if (!to) return false;
  const [path, query] = to.split("?");
  if (pathname !== path) return false;
  if (!query) return !search || search === "?";
  return search.includes(query);
}

export function groupIsActive(pathname, search, group) {
  if (group.to && pathname === group.to) return true;
  return (group.items ?? []).some((item) => isNavLinkActive(pathname, search, item.to));
}
