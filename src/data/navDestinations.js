/**
 * Shared nav destinations for all layout styles.
 */
import { DEFAULT_PRODUCT_LINES } from "./catalogDefaults.js";
import { buildCrateDropNav, CRATE_DROP_NAV } from "./shopNav.js";

export { CRATE_DROP_NAV };

export function buildNavDestinations(lines = DEFAULT_PRODUCT_LINES) {
  const crate = buildCrateDropNav(lines);
  return {
    home: crate.home,
    contact: { label: "Contact", to: "/contact" },
    preorders: crate.groups.find((g) => g.id === "preorders"),
    products: crate.groups.find((g) => g.id === "products"),
  };
}

export function buildNavGroups(lines = DEFAULT_PRODUCT_LINES) {
  const destinations = buildNavDestinations(lines);
  return [destinations.preorders, destinations.products];
}

/** Static defaults — prefer buildNavDestinations / buildNavGroups with active catalog lines. */
export const NAV_DESTINATIONS = buildNavDestinations();
export const NAV_GROUPS = buildNavGroups();

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
