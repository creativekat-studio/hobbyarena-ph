import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BRAND } from "../data/brand.js";
import { resolveCheckoutHoldMinutes } from "../data/checkoutSettings.js";
import { MARQUEE_BANNERS } from "../data/mediaAssets.js";
import { useFirebaseData } from "./firebase/config.js";
import { useAdminFirestoreWrite } from "./firebase/adminWriteAccess.js";
import { saveCmsContent, subscribeCmsContent } from "./firebase/repositories/cms.js";

/**
 * CMS content store — drafts locally, persists to Firestore only on Save.
 * localStorage is a read cache for faster first paint, never auto-seeded to Firestore.
 */

const STORAGE_KEY = "hobbyarena:cms";

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
  banners: [],
  marqueeBanners: MARQUEE_BANNERS.map((imageUrl, index) => ({
    id: `mq_${index + 1}`,
    imageUrl,
    active: true,
  })),
  featureDrops: [],
  announcements: [],
  testimonials: {
    enabled: false,
    overline: "Loved by collectors",
    title: "The thrill of the pull.",
    items: [],
  },
  perks: {
    enabled: true,
    overline: "Why Hobby Arena",
    title: "Why choose Hobby Arena?",
    items: [
      {
        id: "perk_1",
        active: true,
        icon: "shield",
        color: "#2563EB",
        title: "1. 100% Authentic Products Guaranteed",
        description: "Every box is sourced from official distributors. Factory-sealed, never resealed.",
      },
      {
        id: "perk_2",
        active: true,
        icon: "truck",
        color: "#06b6d4",
        title: "Collector-grade shipping",
        description: "Double-boxed and bubble-wrapped. 48-hour delivery within Metro Manila.",
      },
      {
        id: "perk_3",
        active: true,
        icon: "sparkle",
        color: "#C9A227",
        title: "Secure your pre-orders",
        description: "Lock incoming Pokémon & One Piece sets early — we hold your slot until release.",
      },
      {
        id: "perk_4",
        active: true,
        icon: "bolt",
        color: "#7c3aed",
        title: "The thrill of the pull",
        description: "Live drops, hot restocks, and the chase for the next big hit. This is where it begins.",
      },
    ],
  },
  productReviews: {
    showRatings: false,
  },
  bankDetails: {
    enabled: true,
    title: "Choose from the wide variety of payment options available",
    subtitle: "We offer secure and convenient payment methods to suit your needs.",
    showBirSeal: false,
    birSealNote: "Bureau of Internal Revenue — Registered",
    birQrImage: "",
    birSealMarkImage: "",
    accounts: [],
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
    googleMapsUrl: "",
    hours: BRAND.hours,
    handle: BRAND.handle,
  },
  storefront: {
    landingMode: false,
    landingTagline: "Something new is coming",
    landingHeadline: "We're building something new.",
    landingMessage:
      "Hobby Arena is getting a major upgrade. Follow us for updates — sealed drops, pre-orders, and the thrill of the pull are on the way.",
    landingSocialLabel: "Stay in the loop",
    /** When false, guest checkout skips reCAPTCHA (client + create-order API). */
    guestCaptchaEnabled: true,
    /** Stock-hold / checkout countdown length. */
    checkoutHoldMinutes: 20,
  },
};

/** Guest checkout captcha — on unless explicitly disabled in CMS Site mode. */
export function isGuestCaptchaEnabled(storefront) {
  return storefront?.guestCaptchaEnabled !== false;
}

function mergeTestimonials(saved) {
  if (!saved) return DEFAULT_CONTENT.testimonials;
  const items = Array.isArray(saved.items)
    ? saved.items.map((item, index) => ({
        id: item.id || `t_${index + 1}`,
        quote: item.quote || "",
        name: item.name || "",
        role: item.role || "",
        active: item.active !== false,
      }))
    : [];
  return {
    ...DEFAULT_CONTENT.testimonials,
    ...saved,
    items,
  };
}

function mergePerks(saved) {
  if (!saved) return DEFAULT_CONTENT.perks;
  const defaults = DEFAULT_CONTENT.perks.items;
  const items = (saved.items ?? defaults).map((item) => {
    const fallback = defaults.find((p) => p.id === item.id);
    return { ...fallback, ...item };
  });
  return {
    ...DEFAULT_CONTENT.perks,
    ...saved,
    items: items.length ? items : defaults,
  };
}

function mergeBankAccount(account, patch) {
  if (!patch) return { logo: "", qrImage: "", ...account };
  return {
    logo: "",
    qrImage: "",
    ...account,
    ...patch,
    type: patch.type || account.type || "bank",
  };
}

/** Prefer the saved account list as-is so admin customizations are never replaced by defaults. */
function mergeBankDetails(saved) {
  if (!saved) return DEFAULT_CONTENT.bankDetails;
  const savedAccounts = Array.isArray(saved.accounts) ? saved.accounts : [];
  return {
    ...DEFAULT_CONTENT.bankDetails,
    ...saved,
    showBirSeal: saved.showBirSeal === true,
    accounts: savedAccounts.map((account) => mergeBankAccount(
      {
        id: account.id,
        label: "",
        accountName: "",
        accountNumber: "",
        note: "",
        qrImage: "",
        logo: "",
        active: true,
        type: "bank",
      },
      account,
    )),
  };
}

function mergeStorefront(saved) {
  if (!saved) return DEFAULT_CONTENT.storefront;
  const {
    sponsorshipPackages: _removedPackages,
    landingExploreLabel: legacyExploreLabel,
    ...rest
  } = saved;
  const landingSocialLabel = rest.landingSocialLabel
    ?? (legacyExploreLabel && !/sponsorship/i.test(legacyExploreLabel) ? legacyExploreLabel : undefined)
    ?? DEFAULT_CONTENT.storefront.landingSocialLabel;
  return {
    ...DEFAULT_CONTENT.storefront,
    ...rest,
    landingSocialLabel,
    guestCaptchaEnabled: saved.guestCaptchaEnabled !== false,
    checkoutHoldMinutes: resolveCheckoutHoldMinutes(saved),
  };
}

function mergeCmsPayload(parsed) {
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
    perks: mergePerks(parsed.perks),
    productReviews: { ...DEFAULT_CONTENT.productReviews, ...parsed.productReviews },
    bankDetails: mergeBankDetails(parsed.bankDetails),
    storefront: mergeStorefront(parsed.storefront),
    banners: Array.isArray(parsed.banners)
      ? parsed.banners.map((banner) => {
          const { image: _image, ...rest } = banner;
          return { active: true, color: "#2563EB", link: "featured-products", ...rest };
        })
      : [],
    featureDrops: Array.isArray(parsed.featureDrops) ? parsed.featureDrops : [],
    announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
    marqueeBanners: Array.isArray(parsed.marqueeBanners)
      ? parsed.marqueeBanners.map((banner, index) => ({
          id: banner.id || `mq_${index + 1}`,
          imageUrl: banner.imageUrl || banner.src || "",
          active: banner.active !== false,
        })).filter((banner) => banner.imageUrl)
      : DEFAULT_CONTENT.marqueeBanners,
  };
}

function loadCachedContent() {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONTENT;
    return mergeCmsPayload(JSON.parse(raw));
  } catch {
    return DEFAULT_CONTENT;
  }
}

function cacheContentLocally(payload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota errors — remote sync remains authoritative.
  }
}

function cloneContent(payload) {
  return JSON.parse(JSON.stringify(payload));
}

const CmsContext = createContext(null);

export function CmsProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const adminWrite = useAdminFirestoreWrite();
  const [content, setContent] = useState(() => loadCachedContent());
  const [hydrated, setHydrated] = useState(!firebaseEnabled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const syncingRemote = useRef(false);
  const contentRef = useRef(content);
  const dirtyRef = useRef(false);
  const baselineRef = useRef(cloneContent(content));

  contentRef.current = content;
  dirtyRef.current = dirty;

  const markDirty = useCallback(() => {
    setDirty(true);
    dirtyRef.current = true;
    setSaveOk(false);
    setSaveError("");
  }, []);

  useEffect(() => {
    if (!firebaseEnabled) {
      setHydrated(true);
      return undefined;
    }

    return subscribeCmsContent(
      (remote) => {
        syncingRemote.current = true;
        if (remote) {
          // Never clobber in-progress admin edits with a remote snapshot.
          if (!dirtyRef.current) {
            const next = mergeCmsPayload(remote);
            setContent(next);
            baselineRef.current = cloneContent(next);
            cacheContentLocally(next);
          }
        }
        // If remote is empty, keep the cached draft — do NOT auto-seed Firestore
        // (that previously overwrote live bank details with stale local defaults).
        setHydrated(true);
        queueMicrotask(() => {
          syncingRemote.current = false;
        });
      },
      (error) => console.error("[cms] Firestore sync failed:", error),
    );
  }, [firebaseEnabled]);

  const saveContent = useCallback(async () => {
    if (firebaseEnabled && (!adminWrite.ready || !adminWrite.allowed)) {
      setSaveError("Sign in as admin to save CMS changes.");
      return { ok: false };
    }

    const payload = cloneContent(contentRef.current);
    setSaving(true);
    setSaveError("");
    setSaveOk(false);
    try {
      cacheContentLocally(payload);
      if (firebaseEnabled) {
        await saveCmsContent(payload);
      }
      baselineRef.current = cloneContent(payload);
      setDirty(false);
      dirtyRef.current = false;
      setSaveOk(true);
      return { ok: true };
    } catch (error) {
      console.error("[cms] Failed to save content:", error);
      setSaveError(error?.message || "Could not save CMS content.");
      return { ok: false, error };
    } finally {
      setSaving(false);
    }
  }, [firebaseEnabled, adminWrite.ready, adminWrite.allowed]);

  const discardChanges = useCallback(() => {
    const cached = cloneContent(baselineRef.current);
    setContent(cached);
    setDirty(false);
    dirtyRef.current = false;
    setSaveOk(false);
    setSaveError("");
  }, []);

  const api = useMemo(() => {
    const setHero = (hero) => {
      markDirty();
      setContent((c) => ({ ...c, hero: { ...c.hero, ...hero } }));
    };
    const setSocial = (social) => {
      markDirty();
      setContent((c) => ({ ...c, social: { ...c.social, ...social } }));
    };
    const setContact = (contact) => {
      markDirty();
      setContent((c) => ({ ...c, contact: { ...c.contact, ...contact } }));
    };
    const setStorefront = (patch) => {
      markDirty();
      setContent((c) => ({
        ...c,
        storefront: mergeStorefront({ ...c.storefront, ...patch }),
      }));
    };
    const setHomepageSection = (key, patch) => {
      markDirty();
      setContent((c) => ({
        ...c,
        homepageSections: {
          ...c.homepageSections,
          [key]: { ...c.homepageSections[key], ...patch },
        },
      }));
    };
    const setProductReviews = (patch) => {
      markDirty();
      setContent((c) => ({ ...c, productReviews: { ...c.productReviews, ...patch } }));
    };
    const setTestimonials = (patch) => {
      markDirty();
      setContent((c) => ({ ...c, testimonials: { ...c.testimonials, ...patch } }));
    };
    const addTestimonial = (item) => {
      markDirty();
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: [...c.testimonials.items, { id: `t_${Date.now()}`, active: true, quote: "", name: "", role: "", ...item }],
        },
      }));
    };
    const updateTestimonial = (id, patch) => {
      markDirty();
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: c.testimonials.items.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        },
      }));
    };
    const removeTestimonial = (id) => {
      markDirty();
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: c.testimonials.items.filter((t) => t.id !== id),
        },
      }));
    };
    const setPerks = (patch) => {
      markDirty();
      setContent((c) => ({ ...c, perks: { ...c.perks, ...patch } }));
    };
    const addPerk = (item) => {
      markDirty();
      setContent((c) => ({
        ...c,
        perks: {
          ...c.perks,
          items: [
            ...c.perks.items,
            {
              id: `perk_${Date.now()}`,
              active: true,
              icon: "sparkle",
              color: "#2563EB",
              title: "",
              description: "",
              ...item,
            },
          ],
        },
      }));
    };
    const updatePerk = (id, patch) => {
      markDirty();
      setContent((c) => ({
        ...c,
        perks: {
          ...c.perks,
          items: c.perks.items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        },
      }));
    };
    const removePerk = (id) => {
      markDirty();
      setContent((c) => ({
        ...c,
        perks: {
          ...c.perks,
          items: c.perks.items.filter((p) => p.id !== id),
        },
      }));
    };
    const setBankDetails = (patch) => {
      markDirty();
      setContent((c) => ({ ...c, bankDetails: { ...c.bankDetails, ...patch } }));
    };
    const updateBankAccount = (id, patch) => {
      markDirty();
      setContent((c) => ({
        ...c,
        bankDetails: {
          ...c.bankDetails,
          accounts: c.bankDetails.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        },
      }));
    };
    const addBankAccount = (account) => {
      markDirty();
      setContent((c) => ({
        ...c,
        bankDetails: {
          ...c.bankDetails,
          accounts: [
            ...c.bankDetails.accounts,
            { id: `bank_${Date.now()}`, active: true, qrImage: "", logo: "", ...account },
          ],
        },
      }));
    };
    const removeBankAccount = (id) => {
      markDirty();
      setContent((c) => ({
        ...c,
        bankDetails: {
          ...c.bankDetails,
          accounts: c.bankDetails.accounts.filter((a) => a.id !== id),
        },
      }));
    };

    const addBanner = (banner) => {
      markDirty();
      setContent((c) => ({
        ...c,
        banners: [...c.banners, { id: `b_${Date.now()}`, active: true, color: "#2563EB", link: "featured-products", ...banner }],
      }));
    };
    const updateBanner = (id, patch) => {
      markDirty();
      setContent((c) => ({ ...c, banners: c.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    };
    const removeBanner = (id) => {
      markDirty();
      setContent((c) => ({ ...c, banners: c.banners.filter((b) => b.id !== id) }));
    };

    const addFeatureDrop = (drop) => {
      markDirty();
      setContent((c) => ({
        ...c,
        featureDrops: [
          ...c.featureDrops,
          {
            id: `fd_${Date.now()}`,
            productId: "",
            badge: "FEATURED DROP",
            tier: "ULTRA-PREMIUM",
            color: "",
            active: true,
            ...drop,
          },
        ],
      }));
    };
    const updateFeatureDrop = (id, patch) => {
      markDirty();
      setContent((c) => ({
        ...c,
        featureDrops: c.featureDrops.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      }));
    };
    const removeFeatureDrop = (id) => {
      markDirty();
      setContent((c) => ({ ...c, featureDrops: c.featureDrops.filter((d) => d.id !== id) }));
    };

    const addAnnouncement = (text) => {
      markDirty();
      setContent((c) => ({ ...c, announcements: [...c.announcements, { id: `a_${Date.now()}`, text, active: true }] }));
    };
    const updateAnnouncement = (id, patch) => {
      markDirty();
      setContent((c) => ({ ...c, announcements: c.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    };
    const removeAnnouncement = (id) => {
      markDirty();
      setContent((c) => ({ ...c, announcements: c.announcements.filter((a) => a.id !== id) }));
    };


    const addMarqueeBanner = (banner) => {
      markDirty();
      setContent((c) => ({
        ...c,
        marqueeBanners: [
          ...(c.marqueeBanners || []),
          { id: `mq_${Date.now()}`, active: true, imageUrl: "", ...banner },
        ],
      }));
    };
    const updateMarqueeBanner = (id, patch) => {
      markDirty();
      setContent((c) => ({
        ...c,
        marqueeBanners: (c.marqueeBanners || []).map((b) => (b.id === id ? { ...b, ...patch } : b)),
      }));
    };
    const removeMarqueeBanner = (id) => {
      markDirty();
      setContent((c) => ({
        ...c,
        marqueeBanners: (c.marqueeBanners || []).filter((b) => b.id !== id),
      }));
    };

    return {
      setHero,
      setSocial,
      setContact,
      setStorefront,
      setHomepageSection,
      setProductReviews,
      setTestimonials,
      addTestimonial,
      updateTestimonial,
      removeTestimonial,
      setPerks,
      addPerk,
      updatePerk,
      removePerk,
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
      addMarqueeBanner,
      updateMarqueeBanner,
      removeMarqueeBanner,
      saveContent,
      discardChanges,
    };
  }, [markDirty, saveContent, discardChanges]);

  const value = useMemo(
    () => ({
      content,
      hydrated,
      dirty,
      saving,
      saveError,
      saveOk,
      ...api,
    }),
    [content, hydrated, dirty, saving, saveError, saveOk, api],
  );

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms() {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error("useCms must be used within a CmsProvider");
  }
  return context;
}
