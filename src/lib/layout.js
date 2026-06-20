/** MUI `lg` is 1200px — bumped 5% for wider customer-facing layout. */
export const CONTENT_MAX_WIDTH_LG = 1260;

/** Scale explicit content caps by the same 5%. */
export function wider(px) {
  return Math.round(px * 1.05);
}
