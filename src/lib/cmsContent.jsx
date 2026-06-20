import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BRAND } from "../data/mockData.js";

/**
 * Lightweight CMS content store.
 *
 * MOCK: persists editable storefront content to localStorage so admin edits
 * survive reloads and show up on the customer site. When Firebase is wired,
 * replace the localStorage read/write with a Firestore document (e.g.
 * `cms/site`) and keep this hook's API the same.
 */

const STORAGE_KEY = "hobbyarena:cms";

const DEFAULT_CONTENT = {
  hero: {
    tagline: BRAND.tagline,
    headline: "Get it sealed before it's gone.",
    subtitle: BRAND.blurb,
    cta: "Shop sealed",
  },
  banners: [
    {
      id: "b1",
      title: "Get It Sealed Before It's Gone",
      subtitle: "Sealed Pokémon & One Piece — restocked weekly.",
      ctaLabel: "Shop sealed",
      link: "sealed",
      color: "#7c3aed",
      active: true,
    },
    {
      id: "b2",
      title: "Pre-Order Now. Thank Yourself Later.",
      subtitle: "Lock in upcoming sets with a small deposit.",
      ctaLabel: "View pre-orders",
      link: "preorders",
      color: "#06b6d4",
      active: true,
    },
  ],
  announcements: [
    { id: "a1", text: "SEALED DROPS — Pokémon Mega Evolution now landing", active: true },
    { id: "a2", text: "FREE shipping on orders over ₱5,000", active: true },
    { id: "a3", text: "One Piece OP-15 booster boxes in stock", active: true },
    { id: "a4", text: "Holiday hours: closed Dec 25", active: false },
  ],
  social: {
    instagram: "https://instagram.com/hobbyarenaph",
    facebook: "https://facebook.com/hobbyarenaph",
    tiktok: "https://tiktok.com/@hobbyarenaph",
  },
  contact: {
    legalName: BRAND.legalName,
    blurb: BRAND.blurb,
    email: BRAND.email,
    hours: BRAND.hours,
    handle: BRAND.handle,
  },
};

function loadContent() {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTENT;
    const parsed = JSON.parse(raw);
    // Shallow-merge so new default keys appear for older saved blobs.
    return {
      ...DEFAULT_CONTENT,
      ...parsed,
      hero: { ...DEFAULT_CONTENT.hero, ...parsed.hero },
      social: { ...DEFAULT_CONTENT.social, ...parsed.social },
      contact: { ...DEFAULT_CONTENT.contact, ...parsed.contact },
      banners: parsed.banners || DEFAULT_CONTENT.banners,
      announcements: parsed.announcements || DEFAULT_CONTENT.announcements,
    };
  } catch {
    return DEFAULT_CONTENT;
  }
}

const CmsContext = createContext(null);

export function CmsProvider({ children }) {
  const [content, setContent] = useState(loadContent);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }, [content]);

  const api = useMemo(() => {
    const setHero = (hero) => setContent((c) => ({ ...c, hero: { ...c.hero, ...hero } }));
    const setSocial = (social) => setContent((c) => ({ ...c, social: { ...c.social, ...social } }));
    const setContact = (contact) => setContent((c) => ({ ...c, contact: { ...c.contact, ...contact } }));

    const addBanner = (banner) =>
      setContent((c) => ({ ...c, banners: [...c.banners, { id: `b_${Date.now()}`, active: true, color: "#7c3aed", link: "sealed", ...banner }] }));
    const updateBanner = (id, patch) =>
      setContent((c) => ({ ...c, banners: c.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    const removeBanner = (id) =>
      setContent((c) => ({ ...c, banners: c.banners.filter((b) => b.id !== id) }));

    const addAnnouncement = (text) =>
      setContent((c) => ({ ...c, announcements: [...c.announcements, { id: `a_${Date.now()}`, text, active: true }] }));
    const updateAnnouncement = (id, patch) =>
      setContent((c) => ({ ...c, announcements: c.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    const removeAnnouncement = (id) =>
      setContent((c) => ({ ...c, announcements: c.announcements.filter((a) => a.id !== id) }));

    const reset = () => setContent(DEFAULT_CONTENT);

    return {
      setHero,
      setSocial,
      setContact,
      addBanner,
      updateBanner,
      removeBanner,
      addAnnouncement,
      updateAnnouncement,
      removeAnnouncement,
      reset,
    };
  }, []);

  const value = useMemo(() => ({ content, ...api }), [content, api]);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms() {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error("useCms must be used within a CmsProvider");
  }
  return context;
}
