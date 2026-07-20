/** Read Firebase web config from Vite env vars. */

/**
 * Use the current site host as authDomain when we proxy `/__/auth` on Vercel.
 * Required for Google sign-in on Safari/Chrome that block third-party storage
 * (firebaseapp.com iframe). Falls back to VITE_FIREBASE_AUTH_DOMAIN otherwise.
 */
export function resolveAuthDomain(configuredAuthDomain) {
  const fallback = String(configuredAuthDomain || "").trim();
  if (typeof window === "undefined") return fallback;

  const host = window.location.hostname;
  const sameOriginOk =
    host === "localhost"
    || host === "127.0.0.1"
    || host.endsWith(".vercel.app")
    || host === "hobbyarena.ph"
    || host.endsWith(".hobbyarena.ph");

  if (!sameOriginOk) return fallback;
  return host;
}

export function readFirebaseConfig() {
  const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: resolveAuthDomain(configuredAuthDomain) || configuredAuthDomain,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return { config, missing, isComplete: missing.length === 0 };
}

export function isFirebaseConfigured() {
  return Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim());
}

export function getDataSource() {
  const explicit = import.meta.env.VITE_DATA_SOURCE;
  if (explicit === "firebase" || explicit === "local") return explicit;
  return isFirebaseConfigured() ? "firebase" : "local";
}

export function useFirebaseData() {
  return getDataSource() === "firebase" && isFirebaseConfigured();
}
