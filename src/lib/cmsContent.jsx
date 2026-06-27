import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ALL_PRODUCTS, BRAND, TESTIMONIALS } from "../data/mockData.js";
import { BANK_ACCOUNTS } from "../data/checkoutSettings.js";

/**
 * Lightweight CMS content store.
 *
 * MOCK: persists editable storefront content to localStorage so admin edits
 * survive reloads and show up on the customer site. When Firebase is wired,
 * replace the localStorage read/write with a Firestore document (e.g.
 * `cms/site`) and keep this hook's API the same.
 */

const STORAGE_KEY = "hobbyarena:cms";

const DEFAULT_TESTIMONIALS = TESTIMONIALS.map((item, index) => ({
  id: `t${index + 1}`,
  ...item,
  active: true,
}));

const DEFAULT_CONTENT = {
  hero: {
    tagline: BRAND.tagline,
    headline: "Get it sealed before it's gone.",
    subtitle: BRAND.blurb,
    cta: "Shop products",
  },
  homepageSections: {
    products: {
      overline: "Featured products",
      title: "In-stock & ready to ship.",
      subtitle: "Factory-fresh sealed boxes and collections available now.",
      anchorId: "featured-products",
    },
    preorders: {
      overline: "Featured pre-orders",
      title: "Pre-order now. Thank yourself later.",
      subtitle: "Lock your slot on incoming sets before they sell out.",
      anchorId: "featured-preorders",
    },
  },
  banners: [
    {
      id: "b1",
      title: "Featured Products",
      subtitle: "Sealed Pokémon & One Piece — restocked weekly.",
      ctaLabel: "Shop products",
      link: "featured-products",
      color: "#2563EB",
      active: true,
    },
    {
      id: "b2",
      title: "Featured Pre-Orders",
      subtitle: "Lock in upcoming sets with a small deposit.",
      ctaLabel: "View pre-orders",
      link: "featured-preorders",
      color: "#C9A227",
      active: true,
    },
  ],
  featureDrops: [
    {
      id: "fd1",
      productId: "pkm-ascended-etb",
      badge: "FEATURED DROP",
      tier: "SEALED DROP",
      active: true,
    },
    {
      id: "fd2",
      productId: "pkm-charizard-upc",
      badge: "FEATURED DROP",
      tier: "ULTRA-PREMIUM",
      active: true,
    },
  ],
  announcements: [
    { id: "a1", text: "SEALED DROPS — Pokémon Mega Evolution now landing", active: true },
    { id: "a2", text: "FREE shipping on orders over ₱5,000", active: true },
    { id: "a3", text: "One Piece OP-15 booster boxes in stock", active: true },
    { id: "a4", text: "Holiday hours: closed Dec 25", active: false },
  ],
  testimonials: {
    enabled: false,
    overline: "Loved by collectors",
    title: "The thrill of the pull.",
    items: DEFAULT_TESTIMONIALS,
  },
  productReviews: {
    showRatings: false,
  },
  bankDetails: {
    enabled: true,
    title: "Choose from the wide variety of payment options available",
    subtitle: "We offer secure and convenient payment methods to suit your needs.",
    showBirSeal: true,
    birSealNote: "Official BIR QR Code Seal — coming soon.",
    birQrImage: "",
    accounts: BANK_ACCOUNTS.map((account) => ({ ...account })),
  },
  social: {
    instagram: "https://www.instagram.com/hobbyarena.ph/",
    facebook: "https://www.facebook.com/hobbyarena.ph",
    tiktok: "",
    whatsapp: "https://wa.me/639177930238",
  },
  contact: {
    legalName: BRAND.legalName,
    blurb: BRAND.blurb,
    email: "hello@hobbyarena.ph",
    phone: "+63 917 793 0238",
    address: "1139 Mahatma Gandhi St., Paco Manila, Metro Manila, Philippines",
    hours: BRAND.hours,
    handle: "@hobbyarena.ph",
  },
};

function mergeTestimonials(saved) {
  if (!saved) return DEFAULT_CONTENT.testimonials;
  const items = (saved.items ?? DEFAULT_TESTIMONIALS).map((item) => {
    const fallback = DEFAULT_TESTIMONIALS.find((t) => t.id === item.id);
    return { ...fallback, ...item };
  });
  return {
    ...DEFAULT_CONTENT.testimonials,
    ...saved,
    items: items.length ? items : DEFAULT_TESTIMONIALS,
  };
}

function mergeBankDetails(saved) {
  if (!saved) return DEFAULT_CONTENT.bankDetails;
  const savedAccounts = saved.accounts ?? [];
  const byId = new Map(savedAccounts.map((a) => [a.id, a]));
  const accounts = DEFAULT_CONTENT.bankDetails.accounts.map((account) => {
    const patch = byId.get(account.id);
    if (!patch) return account;
    return {
      ...account,
      ...patch,
      qrImage: patch.qrImage || account.qrImage,
      type: patch.type || account.type,
    };
  });
  const custom = savedAccounts.filter((a) => !DEFAULT_CONTENT.bankDetails.accounts.some((d) => d.id === a.id));
  return {
    ...DEFAULT_CONTENT.bankDetails,
    ...saved,
    accounts: [...accounts, ...custom],
  };
}

function loadContent() {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTENT;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_CONTENT;
    return {
      ...DEFAULT_CONTENT,
      ...parsed,
      hero: { ...DEFAULT_CONTENT.hero, ...parsed.hero },
      homepageSections: {
        products: { ...DEFAULT_CONTENT.homepageSections.products, ...parsed.homepageSections?.products },
        preorders: { ...DEFAULT_CONTENT.homepageSections.preorders, ...parsed.homepageSections?.preorders },
      },
      social: { ...DEFAULT_CONTENT.social, ...parsed.social },
      contact: { ...DEFAULT_CONTENT.contact, ...parsed.contact },
      testimonials: mergeTestimonials(parsed.testimonials),
      productReviews: { ...DEFAULT_CONTENT.productReviews, ...parsed.productReviews },
      bankDetails: mergeBankDetails(parsed.bankDetails),
      banners: (parsed.banners || DEFAULT_CONTENT.banners).map((banner) => {
        const fallback = DEFAULT_CONTENT.banners.find((b) => b.id === banner.id);
        const { image: _image, ...rest } = banner;
        return { ...fallback, ...rest };
      }),
      featureDrops: parsed.featureDrops || DEFAULT_CONTENT.featureDrops,
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
    const setHomepageSection = (key, patch) =>
      setContent((c) => ({
        ...c,
        homepageSections: {
          ...c.homepageSections,
          [key]: { ...c.homepageSections[key], ...patch },
        },
      }));
    const setProductReviews = (patch) =>
      setContent((c) => ({ ...c, productReviews: { ...c.productReviews, ...patch } }));
    const setTestimonials = (patch) =>
      setContent((c) => ({ ...c, testimonials: { ...c.testimonials, ...patch } }));
    const addTestimonial = (item) =>
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: [...c.testimonials.items, { id: `t_${Date.now()}`, active: true, quote: "", name: "", role: "", ...item }],
        },
      }));
    const updateTestimonial = (id, patch) =>
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: c.testimonials.items.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        },
      }));
    const removeTestimonial = (id) =>
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: c.testimonials.items.filter((t) => t.id !== id),
        },
      }));
    const setBankDetails = (patch) =>
      setContent((c) => ({ ...c, bankDetails: { ...c.bankDetails, ...patch } }));
    const updateBankAccount = (id, patch) =>
      setContent((c) => ({
        ...c,
        bankDetails: {
          ...c.bankDetails,
          accounts: c.bankDetails.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        },
      }));
    const addBankAccount = (account) =>
      setContent((c) => ({
        ...c,
        bankDetails: {
          ...c.bankDetails,
          accounts: [...c.bankDetails.accounts, { id: `bank_${Date.now()}`, active: true, qrImage: "", ...account }],
        },
      }));
    const removeBankAccount = (id) =>
      setContent((c) => ({
        ...c,
        bankDetails: {
          ...c.bankDetails,
          accounts: c.bankDetails.accounts.filter((a) => a.id !== id),
        },
      }));

    const addBanner = (banner) =>
      setContent((c) => ({ ...c, banners: [...c.banners, { id: `b_${Date.now()}`, active: true, color: "#2563EB", link: "featured-products", ...banner }] }));
    const updateBanner = (id, patch) =>
      setContent((c) => ({ ...c, banners: c.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    const removeBanner = (id) =>
      setContent((c) => ({ ...c, banners: c.banners.filter((b) => b.id !== id) }));

    const addFeatureDrop = (drop) =>
      setContent((c) => ({
        ...c,
        featureDrops: [
          ...c.featureDrops,
          {
            id: `fd_${Date.now()}`,
            productId: ALL_PRODUCTS[0]?.id ?? "",
            badge: "FEATURED DROP",
            tier: "ULTRA-PREMIUM",
            active: true,
            ...drop,
          },
        ],
      }));
    const updateFeatureDrop = (id, patch) =>
      setContent((c) => ({
        ...c,
        featureDrops: c.featureDrops.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      }));
    const removeFeatureDrop = (id) =>
      setContent((c) => ({ ...c, featureDrops: c.featureDrops.filter((d) => d.id !== id) }));

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
      setHomepageSection,
      setProductReviews,
      setTestimonials,
      addTestimonial,
      updateTestimonial,
      removeTestimonial,
      setBankDetails,
      updateBankAccount,
      addBankAccount,
      removeBankAccount,
      addBanner,
      updateBanner,
      removeBanner,
      addFeatureDrop,
      updateFeatureDrop,
      removeFeatureDrop,
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
