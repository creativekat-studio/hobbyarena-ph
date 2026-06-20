// Mock analytics for the admin dashboard. Replace with real aggregates later.

export const KPIS = {
  revenue: 1284500,
  revenueDelta: 12.4,
  orders: 342,
  ordersDelta: 8.1,
  customers: 1280,
  customersDelta: 5.6,
  avgOrder: 3756,
  avgOrderDelta: -2.3,
};

export const REVENUE_TREND = [
  { month: "Jan", revenue: 142000, orders: 38 },
  { month: "Feb", revenue: 168000, orders: 44 },
  { month: "Mar", revenue: 155000, orders: 41 },
  { month: "Apr", revenue: 198000, orders: 52 },
  { month: "May", revenue: 232000, orders: 61 },
  { month: "Jun", revenue: 289500, orders: 76 },
];

export const SALES_BY_LINE = [
  { name: "Pokémon TCG", value: 58, color: "#7c3aed" },
  { name: "One Piece CG", value: 34, color: "#06b6d4" },
  { name: "Accessories", value: 8, color: "#f59e0b" },
];

export const CHANNEL_SPLIT = [
  { channel: "Sealed", value: 62 },
  { channel: "Pre-order", value: 31 },
  { channel: "Singles", value: 7 },
];

export const TOP_PRODUCTS = [
  { name: "Mega Charizard X ex UPC", units: 86, revenue: 1548000 },
  { name: "OP-15 Booster Box", units: 142, revenue: 681600 },
  { name: "Ascended Heroes ETB", units: 38, revenue: 456000 },
  { name: "Pokémon 151 Bundle", units: 96, revenue: 264000 },
  { name: "Pitch Black Booster Box", units: 73, revenue: 189435 },
];

export const RECENT_ORDERS = [
  { id: "HA-10428", customer: "Ash K.", total: 18000, status: "Processing", date: "2026-06-15" },
  { id: "HA-10427", customer: "Misty W.", total: 4800, status: "Paid", date: "2026-06-15" },
  { id: "HA-10426", customer: "Brock H.", total: 9600, status: "Shipped", date: "2026-06-14" },
  { id: "HA-10425", customer: "Nami O.", total: 2340, status: "Pre-order", date: "2026-06-14" },
  { id: "HA-10424", customer: "Gary O.", total: 12000, status: "Paid", date: "2026-06-13" },
];
