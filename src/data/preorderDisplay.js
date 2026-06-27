/** Pre-order UI variants — switch via the design preview panel (bottom-left). */

export const PREORDER_COUNTDOWN_VARIANTS = {
  segments: {
    id: "segments",
    label: "Segment boxes",
    description: "Day / hour / min / sec blocks with labels.",
  },
  inline: {
    id: "inline",
    label: "Inline timer",
    description: "Single monospace line — 12d 05:41:22.",
  },
  chip: {
    id: "chip",
    label: "Compact chip",
    description: "Small pill badge — minimal footprint on cards.",
  },
};

export const PREORDER_PRICING_VARIANTS = {
  split: {
    id: "split",
    label: "Split columns",
    description: "Due now and balance side by side.",
  },
  inline: {
    id: "inline",
    label: "Inline row",
    description: "30% now · 70% later on one line.",
  },
  badges: {
    id: "badges",
    label: "Percent badges",
    description: "Colored chips for deposit and balance.",
  },
  depositFirst: {
    id: "depositFirst",
    label: "Deposit first",
    description: "Large deposit price with balance as footnote.",
  },
};

export const DEFAULT_COUNTDOWN_VARIANT = "segments";
export const DEFAULT_PRICING_VARIANT = "split";
