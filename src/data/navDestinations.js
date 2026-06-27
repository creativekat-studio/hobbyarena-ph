/** Shared nav destinations for all layout styles. */
import { CRATE_DROP_NAV } from "./shopNav.js";

export { CRATE_DROP_NAV };

export function shopUrl(category, line) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (line && line !== "all") params.set("line", line);
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}

export const NAV_GROUPS = CRATE_DROP_NAV.groups;

export const NAV_DESTINATIONS = {
  home: CRATE_DROP_NAV.home,
  contact: CRATE_DROP_NAV.contact,
  groups: NAV_GROUPS,
};

export function isShopLinkActive(pathname, search, to) {
  if (!to?.startsWith("/shop")) return false;
  return `${pathname}${search}` === to || search.includes(to.split("?")[1] ?? "___");
}

export function groupIsActive(pathname, search, items) {
  return items.some((item) => isShopLinkActive(pathname, search, item.to));
}
