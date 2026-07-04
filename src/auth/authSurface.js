const AUTH_SURFACE_KEY = "hobbyarena:authSurface";

/** @typedef {"customer" | "admin"} AuthSurface */

/** @returns {AuthSurface | null} */
export function getAuthSurface() {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(AUTH_SURFACE_KEY);
  return value === "customer" || value === "admin" ? value : null;
}

/** @param {AuthSurface} surface */
export function setAuthSurface(surface) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_SURFACE_KEY, surface);
}

export function clearAuthSurface() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTH_SURFACE_KEY);
}

/**
 * Admin Firebase accounts only appear on the storefront after an explicit customer sign-in.
 * Regular customers always show when Firebase has an active session.
 */
export function shouldExposeCustomerSession(profile) {
  if (!profile) return false;
  if (!profile.isAdmin) return true;
  return getAuthSurface() === "customer";
}
