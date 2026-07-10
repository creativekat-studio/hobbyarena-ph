import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ALL_PRODUCTS, BRAND, TESTIMONIALS } from "../data/mockData.js";
import { BANK_ACCOUNTS } from "../data/checkoutSettings.js";
import { useFirebaseData } from "./firebase/config.js";
import { useAdminFirestoreWrite } from "./firebase/adminWriteAccess.js";
import { saveCmsContent, subscribeCmsContent } from "./firebase/repositories/cms.js";

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
      productId: "op-treasure-chest-2",
      badge: "PRE-ORDER",
      tier: "ONE PIECE",
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
    googleMapsUrl: "",
    hours: BRAND.hours,
    handle: "@hobbyarena.ph",
  },
  storefront: {
    landingMode: false,
    landingTagline: "Something new is coming",
    landingHeadline: "We're building something new.",
    landingMessage:
      "Hobby Arena is getting a major upgrade. Follow us for updates — sealed drops, pre-orders, and the thrill of the pull are on the way.",
    landingSocialLabel: "Stay in the loop",
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
  if (!patch) return { logo: "", ...account };
  return {
    logo: "",
    ...account,
    ...patch,
    type: patch.type || account.type || "bank",
  };
}

function mergeBankDetails(saved) {
  if (!saved) return DEFAULT_CONTENT.bankDetails;
  const savedAccounts = saved.accounts ?? [];
  const byId = new Map(savedAccounts.map((a) => [a.id, a]));
  const defaults = DEFAULT_CONTENT.bankDetails.accounts;
  const accounts = defaults.map((account) => mergeBankAccount(account, byId.get(account.id)));
  const custom = savedAccounts
    .filter((a) => !defaults.some((d) => d.id === a.id))
    .map((a) => mergeBankAccount({ id: a.id, label: "", accountName: "", accountNumber: "", note: "", qrImage: "", active: true }, a));
  return {
    ...DEFAULT_CONTENT.bankDetails,
    ...saved,
    accounts: [...accounts, ...custom],
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
    banners: (parsed.banners || DEFAULT_CONTENT.banners).map((banner) => {
      const fallback = DEFAULT_CONTENT.banners.find((b) => b.id === banner.id);
      const { image: _image, ...rest } = banner;
      return { ...fallback, ...rest };
    }),
    featureDrops: parsed.featureDrops || DEFAULT_CONTENT.featureDrops,
    announcements: parsed.announcements || DEFAULT_CONTENT.announcements,
  };
}

function loadContent() {
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

/** Skip remote snapshots briefly after local edits so typing is not clobbered. */
const CONTENT_EDIT_GRACE_MS = 5000;

function persistCmsContent(payload, firebaseEnabled, adminWrite) {
  cacheContentLocally(payload);
  if (!firebaseEnabled) return Promise.resolve();
  if (!adminWrite.ready || !adminWrite.allowed) return Promise.resolve();
  return saveCmsContent(payload);
}

const CmsContext = createContext(null);

export function CmsProvider({ children }) {
  const firebaseEnabled = useFirebaseData();
  const adminWrite = useAdminFirestoreWrite();
  const [content, setContent] = useState(() => loadContent());
  const [hydrated, setHydrated] = useState(!firebaseEnabled);
  const syncingRemote = useRef(false);
  const saveTimer = useRef(null);
  const pendingSeed = useRef(null);
  const lastContentEditAt = useRef(0);
  const firebaseEnabledRef = useRef(firebaseEnabled);
  const adminWriteRef = useRef(adminWrite);

  firebaseEnabledRef.current = firebaseEnabled;
  adminWriteRef.current = adminWrite;

  const touchContent = useCallback(() => {
    lastContentEditAt.current = Date.now();
  }, []);

  const flushContent = useCallback((payload) => {
    persistCmsContent(payload, firebaseEnabledRef.current, adminWriteRef.current).catch((error) => {
      console.error("[cms] Failed to save content:", error);
    });
  }, []);

  useEffect(() => {
    if (!firebaseEnabled) return undefined;

    return subscribeCmsContent(
      (remote) => {
        syncingRemote.current = true;
        if (!remote) {
          const local = loadContent();
          setContent(local);
          pendingSeed.current = local;
        } else {
          pendingSeed.current = null;
          setContent((prev) => {
            if (Date.now() - lastContentEditAt.current < CONTENT_EDIT_GRACE_MS) {
              return prev;
            }
            const next = mergeCmsPayload(remote);
            cacheContentLocally(next);
            return next;
          });
        }
        setHydrated(true);
        queueMicrotask(() => {
          syncingRemote.current = false;
        });
      },
      (error) => console.error("[cms] Firestore sync failed:", error),
    );
  }, [firebaseEnabled]);

  useEffect(() => {
    if (!firebaseEnabled || !adminWrite.ready || !adminWrite.allowed) return undefined;
    if (!pendingSeed.current) return undefined;

    const seed = pendingSeed.current;
    pendingSeed.current = null;
    saveCmsContent(seed).catch((error) => {
      console.error("[cms] Failed to seed Firestore:", error);
    });
  }, [firebaseEnabled, adminWrite]);

  useEffect(() => {
    if (syncingRemote.current) return undefined;

    if (!firebaseEnabled) {
      cacheContentLocally(content);
      return undefined;
    }

    if (!adminWrite.ready || !adminWrite.allowed) return undefined;

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveCmsContent(content).catch((error) => {
        console.error("[cms] Failed to save content:", error);
      });
    }, 400);

    return () => clearTimeout(saveTimer.current);
  }, [content, firebaseEnabled, adminWrite]);

  const api = useMemo(() => {
    const setHero = (hero) => {
      touchContent();
      setContent((c) => ({ ...c, hero: { ...c.hero, ...hero } }));
    };
    const setSocial = (social) => {
      touchContent();
      setContent((c) => ({ ...c, social: { ...c.social, ...social } }));
    };
    const setContact = (contact) => {
      touchContent();
      setContent((c) => ({ ...c, contact: { ...c.contact, ...contact } }));
    };
    const setStorefront = (patch) => {
      touchContent();
      setContent((c) => {
        const next = {
          ...c,
          storefront: mergeStorefront({ ...c.storefront, ...patch }),
        };
        flushContent(next);
        return next;
      });
    };
    const setHomepageSection = (key, patch) => {
      touchContent();
      setContent((c) => ({
        ...c,
        homepageSections: {
          ...c.homepageSections,
          [key]: { ...c.homepageSections[key], ...patch },
        },
      }));
    };
    const setProductReviews = (patch) => {
      touchContent();
      setContent((c) => ({ ...c, productReviews: { ...c.productReviews, ...patch } }));
    };
    const setTestimonials = (patch) => {
      touchContent();
      setContent((c) => ({ ...c, testimonials: { ...c.testimonials, ...patch } }));
    };
    const addTestimonial = (item) => {
      touchContent();
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: [...c.testimonials.items, { id: `t_${Date.now()}`, active: true, quote: "", name: "", role: "", ...item }],
        },
      }));
    };
    const updateTestimonial = (id, patch) => {
      touchContent();
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: c.testimonials.items.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        },
      }));
    };
    const removeTestimonial = (id) => {
      touchContent();
      setContent((c) => ({
        ...c,
        testimonials: {
          ...c.testimonials,
          items: c.testimonials.items.filter((t) => t.id !== id),
        },
      }));
    };
    const setPerks = (patch) => {
      touchContent();
      setContent((c) => ({ ...c, perks: { ...c.perks, ...patch } }));
    };
    const addPerk = (item) => {
      touchContent();
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
      touchContent();
      setContent((c) => ({
        ...c,
        perks: {
          ...c.perks,
          items: c.perks.items.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        },
      }));
    };
    const removePerk = (id) => {
      touchContent();
      setContent((c) => ({
        ...c,
        perks: {
          ...c.perks,
          items: c.perks.items.filter((p) => p.id !== id),
        },
      }));
    };
    const setBankDetails = (patch) => {
      touchContent();
      setContent((c) => ({ ...c, bankDetails: { ...c.bankDetails, ...patch } }));
    };
    const updateBankAccount = (id, patch) => {
      touchContent();
      setContent((c) => ({
        ...c,
        bankDetails: {
          ...c.bankDetails,
          accounts: c.bankDetails.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        },
      }));
    };
    const addBankAccount = (account) => {
      touchContent();
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
      touchContent();
      setContent((c) => ({
        ...c,
        bankDetails: {
          ...c.bankDetails,
          accounts: c.bankDetails.accounts.filter((a) => a.id !== id),
        },
      }));
    };

    const addBanner = (banner) => {
      touchContent();
      setContent((c) => ({
        ...c,
        banners: [...c.banners, { id: `b_${Date.now()}`, active: true, color: "#2563EB", link: "featured-products", ...banner }],
      }));
    };
    const updateBanner = (id, patch) => {
      touchContent();
      setContent((c) => ({ ...c, banners: c.banners.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
    };
    const removeBanner = (id) => {
      touchContent();
      setContent((c) => ({ ...c, banners: c.banners.filter((b) => b.id !== id) }));
    };

    const addFeatureDrop = (drop) => {
      touchContent();
      setContent((c) => ({
        ...c,
        featureDrops: [
          ...c.featureDrops,
          {
            id: `fd_${Date.now()}`,
            productId: ALL_PRODUCTS[0]?.id ?? "",
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
      touchContent();
      setContent((c) => ({
        ...c,
        featureDrops: c.featureDrops.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      }));
    };
    const removeFeatureDrop = (id) => {
      touchContent();
      setContent((c) => ({ ...c, featureDrops: c.featureDrops.filter((d) => d.id !== id) }));
    };

    const addAnnouncement = (text) => {
      touchContent();
      setContent((c) => ({ ...c, announcements: [...c.announcements, { id: `a_${Date.now()}`, text, active: true }] }));
    };
    const updateAnnouncement = (id, patch) => {
      touchContent();
      setContent((c) => ({ ...c, announcements: c.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    };
    const removeAnnouncement = (id) => {
      touchContent();
      setContent((c) => ({ ...c, announcements: c.announcements.filter((a) => a.id !== id) }));
    };

    const reset = () => {
      touchContent();
      setContent(DEFAULT_CONTENT);
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
      reset,
    };
  }, [flushContent, touchContent]);

  const value = useMemo(() => ({ content, hydrated, ...api }), [content, hydrated, api]);

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms() {
  const context = useContext(CmsContext);
  if (!context) {
    throw new Error("useCms must be used within a CmsProvider");
  }
  return context;
}
