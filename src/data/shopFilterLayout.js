/** Listing-page product-line filter layouts — applied on /products, /preorders, and /shop. */

export const DEFAULT_SHOP_FILTER_LAYOUT = "current";

export const SHOP_FILTER_LAYOUTS = {
  current: {
    id: "current",
    label: "Current · Sidebar chips",
    shortLabel: "Sidebar chips",
    description: "Sticky “Filter by” card with chip pills — common e-commerce pattern (live today).",
  },
  franchiseRail: {
    id: "franchiseRail",
    label: "A · Franchise rail",
    shortLabel: "Franchise rail",
    description: "Vertical logo rail — pick a game like a shelf label, not a filter panel.",
  },
  commandBar: {
    id: "commandBar",
    label: "B · Command bar",
    shortLabel: "Command bar",
    description: "One bar: type tabs left, line dropdown right — minimal chrome.",
  },
  franchiseTiles: {
    id: "franchiseTiles",
    label: "C · Franchise tiles",
    shortLabel: "Franchise tiles",
    description: "Scrollable branded tiles above the grid — game launcher feel.",
  },
  breadcrumb: {
    id: "breadcrumb",
    label: "D · Wayfinding breadcrumb",
    shortLabel: "Breadcrumb",
    description: "Filter state in the page path — boutique wayfinding, no filter box.",
  },
};

export const MOCK_LINE_FILTERS = [
  { id: "all", label: "All lines", short: "All", logo: null, count: 12 },
  { id: "pokemon", label: "Pokémon TCG", short: "Pokémon", logo: "/TCG logos/Pokemon Logo.png", count: 4 },
  { id: "onepiece", label: "One Piece CG", short: "One Piece", logo: "/TCG logos/One Piece Logo.png", count: 5 },
  { id: "gundam", label: "Gundam", short: "Gundam", logo: "/TCG logos/Gundam Logo.png", count: 3 },
];

export const MOCK_TYPE_TABS = ["All Products", "TCG", "Accessories", "Figures"];
