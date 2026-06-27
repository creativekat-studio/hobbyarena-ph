/** Build a duplicated track long enough to fill wide viewports for -50% marquee loops. */
export function marqueeLoop(items, repeats = 6) {
  if (!items?.length) return [];
  const track = Array.from({ length: repeats }, () => items).flat();
  return [...track, ...track];
}

/** Keep scroll speed steady as repeat count grows (duration scales with track length). */
export function marqueeDuration(baseSeconds, repeats) {
  return baseSeconds * Math.max(repeats, 1);
}
