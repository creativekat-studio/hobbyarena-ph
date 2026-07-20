import { COLLECTIONS, SINGLETON_DOCS } from "../../src/data/firestoreSchema.js";

/**
 * Read CMS storefront.guestCaptchaEnabled (default true).
 * Fail closed — require captcha if Firestore is unavailable.
 */
export async function isGuestCaptchaEnabled(db) {
  if (!db) return true;
  try {
    const snap = await db.collection(COLLECTIONS.cms).doc(SINGLETON_DOCS.cmsContent).get();
    return snap.data()?.storefront?.guestCaptchaEnabled !== false;
  } catch (error) {
    console.warn("cmsSettings.isGuestCaptchaEnabled:", error?.message || error);
    return true;
  }
}
