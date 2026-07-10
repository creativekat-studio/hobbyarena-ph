/** Default client loyalty tiers — based on fulfilled order spend. */

export const DEFAULT_CLIENT_TIERS = [
  {
    id: "tier_member",
    name: "Member",
    badgeColor: "#64748b",
    minSpend: 0,
    maxSpend: 9999,
    sortOrder: 0,
    active: true,
  },
  {
    id: "tier_elite",
    name: "Elite Trainer",
    badgeColor: "#2563EB",
    minSpend: 10000,
    maxSpend: 29999,
    sortOrder: 1,
    active: true,
  },
  {
    id: "tier_champion",
    name: "Champion",
    badgeColor: "#C9A227",
    minSpend: 30000,
    maxSpend: null,
    sortOrder: 2,
    active: true,
  },
];
