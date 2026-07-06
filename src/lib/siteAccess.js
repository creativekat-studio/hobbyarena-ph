/** Local dev hosts — used for admin "open storefront" shortcuts, not landing bypass. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export const PREVIEW_STOREFRONT_URL =
  import.meta.env.VITE_PREVIEW_STOREFRONT_URL || "https://hobbyarena.vercel.app";

export function isLocalHost(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  return LOCAL_HOSTS.has(hostname);
}

/** Vercel preview deploys always show the full storefront for owner testing. */
export function isPreviewHost(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  if (!hostname) return false;
  return hostname.endsWith(".vercel.app");
}

function hasStorefrontOverride(search = "") {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.has("storefront");
}

/** Production (and localhost) show the landing page when landing mode is enabled in CMS. */
export function shouldShowLandingPage(landingModeEnabled, search = "") {
  if (!landingModeEnabled) return false;
  if (hasStorefrontOverride(search)) return false;
  return !isPreviewHost();
}
