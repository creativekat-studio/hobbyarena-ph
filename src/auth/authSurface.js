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

export function isAdminPortalPath(pathname) {
  return pathname.startsWith("/admin") && pathname !== "/admin/login";
}

/**
 * Admin portal session — only after explicit /admin/login, or when reloading
 * an admin URL with an existing Firebase admin session.
 */
export function shouldExposeAdminSession(profile) {
  if (!profile?.isAdmin) return false;
  if (getAuthSurface() === "admin") return true;
  if (typeof window !== "undefined" && isAdminPortalPath(window.location.pathname)) {
    setAuthSurface("admin");
    return true;
  }
  return false;
}

/**
 * Storefront customer session. Admin emails are reserved for /admin/login only.
 */
export function shouldExposeCustomerSession(profile) {
  if (!profile) return false;
  if (profile.isAdmin) return false;
  return true;
}
