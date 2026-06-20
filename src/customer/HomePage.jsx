import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { Link as RouterLink, useLocation, useOutletContext } from "react-router-dom";
import { MONO_FONT, getBrand } from "../theme.js";
import { announcementBarColors, heroHeadlineSx, sectionHeadlineSx } from "../lib/surfaces.js";
import { wider } from "../lib/layout.js";
import { OFF_WHITE } from "../lib/colors.js";
import { useCms } from "../lib/cmsContent.jsx";
import { useInquiries } from "../lib/inquiriesStore.jsx";
import ProductCard, { PESO } from "../components/ProductCard.jsx";
import BannerMarquee from "../components/BannerMarquee.jsx";
import PaymentMethodsMarquee from "../components/PaymentMethodsMarquee.jsx";
import TestimonialsShowcase from "../components/TestimonialsShowcase.jsx";
import {
  BoltIcon,
  BoxIcon,
  CardIcon,
  FacebookIcon,
  InstagramIcon,
  PokeballIcon,
  ShieldIcon,
  SparkleIcon,
  TiktokIcon,
  TruckIcon,
} from "../components/icons.jsx";
import {
  ALL_PRODUCTS,
  BRAND,
  PREORDER_PRODUCTS,
  SEALED_PRODUCTS,
  STATS,
} from "../data/mockData.js";

const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
`;
const shimmer = keyframes`
  0%   { transform: translateX(-120%) rotate(8deg); }
  100% { transform: translateX(220%)  rotate(8deg); }
`;
const liveDot = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.25; }
`;
const tickerSlide = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;
const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
`;

const fadeSlide = keyframes`
  0%   { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

function resolveProductAccent(product, theme) {
  if (theme.ha?.proposalId === 2) {
    if (product.line.startsWith("Pokémon")) return theme.palette.secondary.main;
    if (product.line.startsWith("One Piece")) return theme.ha?.brand?.accentRose ?? theme.palette.error.main;
    return theme.palette.primary.main;
  }
  return product.accent || theme.palette.primary.main;
}

function resolveFeatureDropProduct(drop) {
  return ALL_PRODUCTS.find((p) => p.id === drop.productId) ?? ALL_PRODUCTS[0];
}

const PERKS = [
  { icon: ShieldIcon, title: "100% authentic & sealed", description: "Every box is sourced from official distributors. Factory-sealed, never resealed." },
  { icon: TruckIcon, title: "Collector-grade shipping", description: "Double-boxed and bubble-wrapped. 48-hour delivery within Metro Manila." },
  { icon: SparkleIcon, title: "Secure your pre-orders", description: "Lock incoming Pokémon & One Piece sets early — we hold your slot until release." },
  { icon: BoltIcon, title: "The thrill of the pull", description: "Live drops, hot restocks, and the chase for the next big hit. This is where it begins." },
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function AnnouncementBar({ theme, items }) {
  if (!items.length) return null;
  const loop = [...items, ...items];
  const barColors = announcementBarColors(theme);
  return (
    <Box sx={{ bgcolor: barColors.bgcolor, color: barColors.color, overflow: "hidden", py: 0.75, borderBottom: "1px solid", borderColor: alpha(barColors.color, 0.15) }}>
      <Box sx={{ display: "inline-flex", whiteSpace: "nowrap", animation: `${tickerSlide} 30s linear infinite` }}>
        {loop.map((item, index) => (
          <Typography key={index} component="span" sx={{ px: 4, fontFamily: MONO_FONT, fontSize: "0.76rem", fontWeight: 700, letterSpacing: 0.5 }}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

const BANNER_LINK_TAGS = {
  sealed: "Sealed drop",
  preorders: "Pre-order",
  newsletter: "Updates",
};

function PromoBannerVisual({ link, accent, isDarkMode, hovered }) {
  const VisualIcon = link === "preorders" ? SparkleIcon : BoxIcon;
  const watermark = link === "preorders" ? "PRE-ORDER" : "SEALED";

  return (
    <Box
      aria-hidden
      sx={{
        position: "relative",
        flexShrink: 0,
        width: { xs: "100%", sm: "38%" },
        minHeight: { xs: 108, sm: "auto" },
        overflow: "hidden",
        borderTop: { xs: `1px solid ${alpha(accent, 0.15)}`, sm: "none" },
        borderLeft: { sm: `1px solid ${alpha(accent, 0.15)}` },
        background: isDarkMode
          ? `linear-gradient(165deg, ${alpha(accent, hovered ? 0.26 : 0.18)} 0%, ${alpha(accent, 0.06)} 55%, transparent 100%)`
          : `linear-gradient(165deg, ${alpha(accent, hovered ? 0.16 : 0.1)} 0%, ${alpha(accent, 0.03)} 55%, transparent 100%)`,
        transition: "background 280ms ease",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${alpha(accent, isDarkMode ? 0.45 : 0.35)} 1px, transparent 1px)`,
          backgroundSize: "16px 16px",
          opacity: 0.28,
        }}
      />
      {[120, 88].map((size) => (
        <Box
          key={size}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: size,
            height: size,
            borderRadius: "50%",
            border: `1px solid ${alpha(accent, 0.22)}`,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      {link === "sealed" ? (
        <>
          <Box
            sx={{
              position: "absolute",
              top: "22%",
              right: "18%",
              width: 52,
              height: 68,
              borderRadius: 1,
              border: `2px solid ${alpha(accent, 0.45)}`,
              bgcolor: alpha(accent, 0.14),
              transform: hovered ? "rotate(-10deg) translateY(-4px)" : "rotate(-14deg)",
              transition: "transform 280ms ease",
              boxShadow: `0 8px 24px ${alpha(accent, 0.2)}`,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "34%",
              right: "32%",
              width: 44,
              height: 58,
              borderRadius: 1,
              border: `2px solid ${alpha(accent, 0.28)}`,
              bgcolor: alpha(accent, 0.08),
              transform: hovered ? "rotate(8deg) translateY(-2px)" : "rotate(12deg)",
              transition: "transform 280ms ease",
            }}
          />
        </>
      ) : (
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 72,
            height: 72,
            borderRadius: "50%",
            border: `2px dashed ${alpha(accent, 0.4)}`,
            transform: "translate(-50%, -50%)",
            animation: hovered ? "none" : "promoSpin 24s linear infinite",
            "@keyframes promoSpin": {
              "0%": { transform: "translate(-50%, -50%) rotate(0deg)" },
              "100%": { transform: "translate(-50%, -50%) rotate(360deg)" },
            },
          }}
        />
      )}
      <VisualIcon
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: { xs: 44, sm: 52 },
          color: alpha(accent, hovered ? 0.85 : 0.65),
          filter: `drop-shadow(0 4px 16px ${alpha(accent, 0.35)})`,
          transition: "color 280ms ease",
        }}
      />
      <Typography
        sx={{
          position: "absolute",
          bottom: { xs: 4, sm: 8 },
          right: { xs: 8, sm: 10 },
          fontFamily: MONO_FONT,
          fontWeight: 900,
          fontSize: { xs: "2rem", sm: "2.35rem" },
          letterSpacing: 2,
          lineHeight: 1,
          color: alpha(accent, isDarkMode ? 0.14 : 0.1),
          userSelect: "none",
        }}
      >
        {watermark}
      </Typography>
    </Box>
  );
}

function PromoBannerCard({ banner, isDarkMode, surfaceBorderColor }) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const accent = banner.color || theme.palette.primary.main;
  const tag = BANNER_LINK_TAGS[banner.link] ?? "Promo";

  const cardBg = isDarkMode
    ? `linear-gradient(148deg, ${alpha("#0F1D42", 0.96)} 0%, ${alpha("#0B1538", 0.98)} 100%)`
    : `linear-gradient(148deg, ${OFF_WHITE.paper} 0%, ${OFF_WHITE.paperSoft} 100%)`;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => scrollToId(banner.link)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 1.5,
        width: "100%",
        minHeight: 200,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "stretch",
        textAlign: "left",
        cursor: "pointer",
        appearance: "none",
        font: "inherit",
        border: "1px solid",
        borderColor: hovered ? alpha(accent, 0.5) : surfaceBorderColor,
        background: cardBg,
        color: isDarkMode ? OFF_WHITE.textBright : theme.palette.text.primary,
        boxShadow: hovered
          ? isDarkMode
            ? `0 24px 56px rgba(0,0,0,0.45), 0 0 0 1px ${alpha(accent, 0.2)}, 0 0 40px ${alpha(accent, 0.15)}`
            : `0 20px 48px ${alpha(accent, 0.14)}, 0 0 0 1px ${alpha(accent, 0.12)}`
          : isDarkMode
            ? "0 16px 40px rgba(0,0,0,0.35)"
            : `0 14px 36px ${alpha("#1E3A8A", 0.06)}`,
        transform: hovered ? "translateY(-4px)" : "none",
        transition: "transform 280ms cubic-bezier(0.34, 1.4, 0.64, 1), border-color 280ms ease, box-shadow 320ms ease",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0.15)})`,
          zIndex: 1,
        }}
      />

      <Box
        sx={{
          position: "relative",
          flex: 1,
          p: { xs: 3, md: 3.5 },
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          zIndex: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: "0.65rem",
            fontWeight: 800,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            color: accent,
            mb: 1.5,
          }}
        >
          {tag}
        </Typography>

        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            maxWidth: wider(480),
            lineHeight: 1.12,
            minHeight: { md: "2.5em" },
            fontSize: { xs: "1.35rem", md: "1.55rem" },
          }}
        >
          {banner.title}
        </Typography>

        <Typography
          sx={{
            mt: 1,
            flexGrow: 1,
            maxWidth: wider(460),
            fontSize: "0.92rem",
            lineHeight: 1.55,
            color: isDarkMode ? alpha(OFF_WHITE.textBright, 0.78) : theme.palette.text.secondary,
          }}
        >
          {banner.subtitle}
        </Typography>

        {banner.ctaLabel ? (
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mt: 2.5, pt: 0.25 }}>
            <Typography
              sx={{
                fontFamily: MONO_FONT,
                fontWeight: 700,
                fontSize: "0.72rem",
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: isDarkMode ? OFF_WHITE.textBright : theme.palette.text.primary,
              }}
            >
              {banner.ctaLabel}
            </Typography>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid",
                borderColor: alpha(accent, hovered ? 0.7 : 0.4),
                bgcolor: alpha(accent, hovered ? 0.18 : 0.08),
                color: accent,
                fontSize: "0.85rem",
                transform: hovered ? "translateX(4px)" : "none",
                transition: "transform 240ms ease, background-color 240ms ease, border-color 240ms ease",
              }}
            >
              →
            </Box>
          </Stack>
        ) : null}
      </Box>

      <PromoBannerVisual link={banner.link} accent={accent} isDarkMode={isDarkMode} hovered={hovered} />
    </Box>
  );
}

function PromoBanners({ banners, isDarkMode, surfaceBorderColor }) {
  const active = banners.filter((b) => b.active);
  if (!active.length) return null;
  return (
    <Grid container spacing={2.5} alignItems="stretch">
      {active.map((banner) => (
        <Grid size={{ xs: 12, md: active.length > 1 ? 6 : 12 }} key={banner.id} sx={{ display: "flex" }}>
          <PromoBannerCard banner={banner} isDarkMode={isDarkMode} surfaceBorderColor={surfaceBorderColor} />
        </Grid>
      ))}
    </Grid>
  );
}

function HeroShowcase({ panelSx, isDarkMode, featureDrops }) {
  const theme = useTheme();
  const brand = getBrand(theme);
  const activeDrops = featureDrops.filter((d) => d.active);
  const slides = activeDrops.length ? activeDrops : [{ id: "fallback", productId: SEALED_PRODUCTS[3]?.id, badge: "FEATURED DROP", tier: "ULTRA-PREMIUM", active: true }];
  const [index, setIndex] = useState(0);
  const [tilt, setTilt] = useState({ x: -5, y: 3, hovered: false });
  const [paused, setPaused] = useState(false);
  const current = slides[index % slides.length];
  const product = resolveFeatureDropProduct(current);
  const accent = resolveProductAccent(product, theme);
  const Glyph = product.line.startsWith("Pokémon") ? PokeballIcon : CardIcon;
  const showcaseBg = brand.heroShowcaseGradient?.(accent) ?? `linear-gradient(150deg, ${alpha(accent, 0.95)} 0%, ${alpha(theme.palette.primary.main, 0.85)} 100%)`;

  useEffect(() => {
    if (slides.length <= 1 || paused) return undefined;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused, index]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width - 0.5;
    const yRatio = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: xRatio * 16, y: -yRatio * 12, hovered: true });
  }
  function handleMouseLeave() {
    setTilt({ x: -5, y: 3, hovered: false });
    setPaused(false);
  }

  return (
    <Box
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setPaused(true)}
      sx={{
        ...panelSx,
        p: { xs: 2.5, md: 3 },
        position: "relative",
        overflow: "hidden",
        transformStyle: "preserve-3d",
        transform: {
          xs: "none",
          md: `perspective(1400px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${tilt.hovered ? 1.02 : 1})`,
        },
        transition: tilt.hovered ? "transform 80ms ease-out" : "transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        willChange: "transform",
        boxShadow: isDarkMode
          ? `0 30px 80px rgba(0,0,0,0.6), 0 0 60px ${alpha(accent, tilt.hovered ? 0.4 : 0.22)}`
          : `0 26px 60px ${alpha(accent, tilt.hovered ? 0.28 : 0.16)}`,
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: brand.liveDot, boxShadow: `0 0 10px ${brand.liveDot}`, animation: `${liveDot} 1.6s ease-in-out infinite` }} />
            <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.7rem", letterSpacing: 1.5 }}>DROP ▸ LIVE</Typography>
          </Stack>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.7rem", color: "text.secondary" }}>{current.tier || "ULTRA-PREMIUM"}</Typography>
        </Stack>

        <Box
          key={current.id}
          sx={{
            position: "relative",
            borderRadius: 1,
            overflow: "hidden",
            aspectRatio: "16 / 11",
            background: showcaseBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: `${fadeSlide} 480ms ease-out`,
            "&::after": {
              content: '""',
              position: "absolute",
              top: "-50%",
              left: 0,
              width: "55%",
              height: "200%",
              background: `linear-gradient(110deg, transparent 30%, ${OFF_WHITE.shimmer} 50%, transparent 70%)`,
              animation: `${shimmer} 5.5s ease-in-out infinite`,
            },
          }}
        >
          {product.image ? (
            <Box
              component="img"
              src={product.image}
              alt={product.name}
              sx={{
                position: "relative",
                zIndex: 1,
                maxHeight: "86%",
                maxWidth: "86%",
                objectFit: "contain",
                filter: "drop-shadow(0 16px 28px rgba(0,0,0,0.45))",
                animation: `${floatY} 5s ease-in-out infinite`,
              }}
            />
          ) : (
            <Glyph sx={{ fontSize: 140, color: OFF_WHITE.glyph, filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.3))", animation: `${floatY} 5s ease-in-out infinite` }} />
          )}
          <Chip label={current.badge || "FEATURED DROP"} size="small" sx={{ position: "absolute", top: 12, left: 12, zIndex: 2, bgcolor: "rgba(0,0,0,0.45)", color: OFF_WHITE.textBright, fontFamily: MONO_FONT, letterSpacing: 1, backdropFilter: "blur(4px)" }} />
        </Box>

        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" key={`${current.id}-meta`} sx={{ animation: `${fadeSlide} 480ms ease-out` }}>
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15, fontSize: "1rem" }}>{product.name}</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
              <Rating value={product.rating} precision={0.1} size="small" readOnly />
              <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>{product.line}</Typography>
            </Stack>
          </Box>
          <Typography sx={{ color: "primary.main", fontWeight: 800, fontSize: "1.35rem", whiteSpace: "nowrap" }}>{PESO.format(product.price)}</Typography>
        </Stack>

        {slides.length > 1 ? (
          <Stack direction="row" spacing={0.75} justifyContent="center" alignItems="center">
            {slides.map((slide, i) => (
              <Box
                key={slide.id}
                component="button"
                type="button"
                aria-label={`Show feature drop ${i + 1}`}
                onClick={() => setIndex(i)}
                sx={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  p: 0,
                  border: "none",
                  borderRadius: 999,
                  cursor: "pointer",
                  bgcolor: i === index ? "primary.main" : alpha(theme.palette.text.primary, 0.2),
                  transition: "width 240ms ease, background-color 240ms ease",
                }}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  );
}

function NewsletterForm({ panelSx }) {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("sent");
    setEmail("");
  }

  return (
    <Box id="newsletter" component="form" onSubmit={handleSubmit} sx={{ ...panelSx, p: { xs: 3, md: 5 } }}>
      <Grid container spacing={3} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>▣ Join the arena</Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>Get the drops before they sell out.</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Restock alerts, pre-order windows, and member-only deals — straight to your inbox.</Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {status === "sent" ? <Alert severity="success" sx={{ mb: 2 }}>You&apos;re in! Watch your inbox for the next drop.</Alert> : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField fullWidth type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" variant="contained" color="primary" sx={{ px: 4, whiteSpace: "nowrap", fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase" }}>Subscribe</Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

function InquiryForm({ panelSx }) {
  const theme = useTheme();
  const { addInquiry } = useInquiries();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Name, email, and message are required.");
      return;
    }
    addInquiry(form);
    setStatus("sent");
    setForm({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <Box id="contact" component="form" onSubmit={handleSubmit} sx={{ ...panelSx, p: { xs: 3, md: 5 } }}>
      <Grid container spacing={{ xs: 3, md: 5 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>▣ Got a question?</Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>Send us a message.</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Ask about stock, pre-orders, pickup, or anything else. Our team replies during processing hours — no bots.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            {status === "sent" ? <Alert severity="success">Thanks! Your message was sent — we&apos;ll get back to you soon.</Alert> : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Name" fullWidth value={form.name} onChange={(e) => update("name", e.target.value)} required />
              <TextField label="Email" type="email" fullWidth value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </Stack>
            <TextField label="Subject" fullWidth value={form.subject} onChange={(e) => update("subject", e.target.value)} />
            <TextField label="Message" fullWidth multiline minRows={4} value={form.message} onChange={(e) => update("message", e.target.value)} required />
            <Box>
              <Button type="submit" variant="contained" color="primary" size="large" sx={{ px: 4, py: 1.3, fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase" }}>
                ▶ Send message
              </Button>
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function HomePage() {
  const theme = useTheme();
  const location = useLocation();
  const { content } = useCms();
  const { surfaces, isDarkMode } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const hero = content.hero;
  const announcements = content.announcements.filter((a) => a.active).map((a) => a.text);
  const brand = getBrand(theme);
  const headlineSx = heroHeadlineSx(theme);
  const sectionTitleSx = sectionHeadlineSx(theme);
  const heroGlow = brand.heroGlowColor ?? theme.palette.primary.main;

  useEffect(() => {
    const target = location.state?.scrollTo;
    if (target) {
      const id = window.setTimeout(() => scrollToId(target), 80);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [location.state]);

  return (
    <Box>
      <AnnouncementBar theme={theme} items={announcements} />
      <BannerMarquee />

      <Box sx={{ position: "relative", overflow: "hidden" }}>
        <Box aria-hidden sx={{ position: "absolute", top: { xs: -120, md: -160 }, right: { xs: -160, md: -100 }, width: { xs: 360, md: 560 }, height: { xs: 360, md: 560 }, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(heroGlow, isDarkMode ? 0.3 : 0.18)} 0%, transparent 65%)`, filter: "blur(20px)", pointerEvents: "none" }} />
        <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 9 }, pb: { xs: 5, md: 7 }, position: "relative" }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <Box sx={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 1, px: 1.5, py: 0.5, borderRadius: 1, border: "1px solid", borderColor: alpha(theme.palette.primary.main, 0.45) }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: brand.liveDot, boxShadow: `0 0 8px ${brand.liveDot}`, animation: `${liveDot} 1.6s ease-in-out infinite` }} />
                  <Typography variant="caption" sx={{ letterSpacing: 1.5, color: "primary.main", fontWeight: 800, textTransform: "uppercase", fontFamily: MONO_FONT }}>{hero.tagline}</Typography>
                </Box>

                <Typography variant="h1" sx={headlineSx}>
                  {hero.headline}
                </Typography>

                <Typography variant="h6" sx={{ fontWeight: 400, color: "text.secondary", maxWidth: wider(540) }}>{hero.subtitle}</Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
                  <Button size="large" variant="contained" color="primary" onClick={() => scrollToId("sealed")} sx={{ px: 4, py: 1.4, fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase" }}>▶ {hero.cta}</Button>
                  <Button size="large" variant="outlined" color="inherit" onClick={() => scrollToId("preorders")} sx={{ px: 4, py: 1.4, borderColor: surfaceBorderColor }}>View pre-orders</Button>
                </Stack>

                <Grid container spacing={2} sx={{ pt: 1 }}>
                  {STATS.map((stat) => (
                    <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
                      <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: "primary.main" }}>{stat.value}</Typography>
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{stat.label}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <HeroShowcase panelSx={panelSx} isDarkMode={isDarkMode} featureDrops={content.featureDrops} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 7, md: 11 }}>
          <PromoBanners banners={content.banners} isDarkMode={isDarkMode} surfaceBorderColor={surfaceBorderColor} />

          <Box id="sealed">
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={1} sx={{ mb: 4 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BoxIcon sx={{ color: "primary.main" }} />
                  <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Sealed products</Typography>
                </Stack>
                <Typography variant="h4" sx={sectionTitleSx}>Get it sealed before it&apos;s gone.</Typography>
              </Box>
              <Button component={RouterLink} to="/shop?category=sealed" color="primary" sx={{ fontWeight: 700 }}>Shop all →</Button>
            </Stack>
            <Grid container spacing={2.5}>
              {SEALED_PRODUCTS.map((product) => (
                <Grid size={{ xs: 6, sm: 6, md: 3 }} key={product.id}>
                  <ProductCard product={product} panelSx={panelSx} isDarkMode={isDarkMode} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box id="preorders">
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={1} sx={{ mb: 4 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SparkleIcon sx={{ color: "primary.main" }} />
                  <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Pre-order products</Typography>
                </Stack>
                <Typography variant="h4" sx={sectionTitleSx}>Pre-order now. Thank yourself later.</Typography>
              </Box>
              <Button component={RouterLink} to="/shop?category=preorder" color="primary" sx={{ fontWeight: 700 }}>Shop all →</Button>
            </Stack>
            <Grid container spacing={2.5}>
              {PREORDER_PRODUCTS.map((product) => (
                <Grid size={{ xs: 6, sm: 6, md: 3 }} key={product.id}>
                  <ProductCard product={product} panelSx={panelSx} isDarkMode={isDarkMode} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box>
            <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 4 }}>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Why Hobby Arena</Typography>
              <Typography variant="h4">TCG starts here.</Typography>
            </Stack>
            <Grid container spacing={2.5}>
              {PERKS.map((perk) => {
                const Icon = perk.icon;
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 3 }} key={perk.title}>
                    <Box sx={{ ...panelSx, p: 3, height: "100%" }}>
                      <Box sx={{ width: 44, height: 44, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "primary.main", bgcolor: alpha(theme.palette.primary.main, 0.12), mb: 1.5 }}>
                        <Icon />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{perk.title}</Typography>
                      <Typography color="text.secondary" sx={{ fontSize: "0.9rem", mt: 0.5 }}>{perk.description}</Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <TestimonialsShowcase panelSx={panelSx} isDarkMode={isDarkMode} surfaceBorderColor={surfaceBorderColor} />

          <NewsletterForm panelSx={panelSx} />

          <InquiryForm panelSx={panelSx} />

          <PaymentMethodsMarquee panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />

          <Box sx={{ borderTop: "1px solid", borderColor: surfaceBorderColor, pt: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{content.contact.legalName}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: "0.9rem", mt: 1, maxWidth: wider(360) }}>{content.contact.blurb}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  {[
                    { Icon: InstagramIcon, href: content.social.instagram },
                    { Icon: FacebookIcon, href: content.social.facebook },
                    { Icon: TiktokIcon, href: content.social.tiktok },
                  ]
                    .filter((s) => s.href)
                    .map(({ Icon, href }) => (
                      <IconButton key={href} size="small" component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ border: "1px solid", borderColor: surfaceBorderColor, color: "text.secondary", "&:hover": { color: "primary.main", borderColor: "primary.main" } }}>
                        <Icon sx={{ fontSize: 18 }} />
                      </IconButton>
                    ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Shop</Typography>
                <Stack spacing={1}>
                  {[
                    { label: "Sealed products", to: "/shop?category=sealed" },
                    { label: "Pre-orders", to: "/shop?category=preorder" },
                    { label: "Pokémon TCG", to: "/shop?line=pokemon" },
                    { label: "One Piece CG", to: "/shop?line=one-piece" },
                  ].map((link) => (
                    <Typography key={link.to} component={RouterLink} to={link.to} sx={{ color: "text.secondary", fontSize: "0.88rem", textDecoration: "none", "&:hover": { color: "primary.main" } }}>{link.label}</Typography>
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 6, sm: 4, md: 4 }}>
                <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Reach us</Typography>
                <Stack spacing={1}>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.88rem" }}>📩 {content.contact.email}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.88rem" }}>📦 {content.contact.hours}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: "0.88rem", fontFamily: MONO_FONT }}>{content.contact.handle}</Typography>
                </Stack>
              </Grid>
            </Grid>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", pt: 4, mt: 4, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
              © {new Date().getFullYear()} {BRAND.name} · Premium TCG sealed & pre-orders.
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
