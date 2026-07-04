/** Read Firebase web config from Vite env vars. */

export function readFirebaseConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
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
