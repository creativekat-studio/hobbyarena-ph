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
import { MONO_FONT } from "../theme.js";
import { useCms } from "../lib/cmsContent.jsx";
import { useInquiries } from "../lib/inquiriesStore.jsx";
import ProductCard, { PESO } from "../components/ProductCard.jsx";
import {
  BoltIcon,
  BoxIcon,
  FacebookIcon,
  InstagramIcon,
  PokeballIcon,
  ShieldIcon,
  SparkleIcon,
  TiktokIcon,
  TruckIcon,
} from "../components/icons.jsx";
import {
  BRAND,
  PREORDER_PRODUCTS,
  SEALED_PRODUCTS,
  STATS,
  TESTIMONIALS,
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
  return (
    <Box sx={{ bgcolor: theme.palette.primary.main, color: "#fff", overflow: "hidden", py: 0.75 }}>
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

function PromoBanners({ banners }) {
  const active = banners.filter((b) => b.active);
  if (!active.length) return null;
  return (
    <Grid container spacing={2.5}>
      {active.map((banner) => (
        <Grid size={{ xs: 12, md: active.length > 1 ? 6 : 12 }} key={banner.id}>
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 1,
              p: { xs: 3, md: 4 },
              color: "#fff",
              minHeight: 170,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              background: banner.image
                ? `linear-gradient(130deg, ${alpha(banner.color, 0.72)}, ${alpha(banner.color, 0.4)}), url(${banner.image})`
                : `linear-gradient(130deg, ${alpha(banner.color, 0.96)}, ${alpha(banner.color, 0.55)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow: `0 18px 40px ${alpha(banner.color, 0.35)}`,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 800, maxWidth: 520, textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>{banner.title}</Typography>
            <Typography sx={{ opacity: 0.96, mt: 1, maxWidth: 520, textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>{banner.subtitle}</Typography>
            {banner.ctaLabel ? (
              <Button
                onClick={() => scrollToId(banner.link)}
                variant="contained"
                sx={{ mt: 2.5, alignSelf: "flex-start", bgcolor: "rgba(0,0,0,0.35)", color: "#fff", fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", "&:hover": { bgcolor: "rgba(0,0,0,0.5)" } }}
              >
                ▶ {banner.ctaLabel}
              </Button>
            ) : null}
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}

function HeroShowcase({ panelSx, isDarkMode }) {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const [tilt, setTilt] = useState({ x: -5, y: 3, hovered: false });
  const featured = SEALED_PRODUCTS[3];

  function handleMouseMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width - 0.5;
    const yRatio = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: xRatio * 16, y: -yRatio * 12, hovered: true });
  }
  function handleMouseLeave() {
    setTilt({ x: -5, y: 3, hovered: false });
  }

  return (
    <Box
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
            <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "#22c55e", boxShadow: "0 0 10px #22c55e", animation: `${liveDot} 1.6s ease-in-out infinite` }} />
            <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.7rem", letterSpacing: 1.5 }}>DROP ▸ LIVE</Typography>
          </Stack>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.7rem", color: "text.secondary" }}>ULTRA-PREMIUM</Typography>
        </Stack>

        <Box
          sx={{
            position: "relative",
            borderRadius: 1,
            overflow: "hidden",
            aspectRatio: "16 / 11",
            background: `linear-gradient(150deg, ${alpha(accent, 0.95)} 0%, ${alpha("#06b6d4", 0.9)} 55%, ${alpha("#f43f5e", 0.85)} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "&::after": {
              content: '""',
              position: "absolute",
              top: "-50%",
              left: 0,
              width: "55%",
              height: "200%",
              background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)",
              animation: `${shimmer} 5.5s ease-in-out infinite`,
            },
          }}
        >
          <PokeballIcon sx={{ fontSize: 140, color: "rgba(255,255,255,0.92)", filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.3))", animation: `${floatY} 5s ease-in-out infinite` }} />
          <Chip label="FEATURED DROP" size="small" sx={{ position: "absolute", top: 12, left: 12, bgcolor: "rgba(0,0,0,0.45)", color: "#fff", fontFamily: MONO_FONT, letterSpacing: 1, backdropFilter: "blur(4px)" }} />
        </Box>

        <Stack direction="row" alignItems="flex-end" justifyContent="space-between">
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15, fontSize: "1rem" }}>{featured.name}</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
              <Rating value={featured.rating} precision={0.1} size="small" readOnly />
              <Typography sx={{ color: "text.secondary", fontSize: "0.75rem" }}>{featured.line}</Typography>
            </Stack>
          </Box>
          <Typography sx={{ color: "primary.main", fontWeight: 800, fontSize: "1.35rem", whiteSpace: "nowrap" }}>{PESO.format(featured.price)}</Typography>
        </Stack>
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
            <Button type="submit" variant="contained" color="primary" sx={{ px: 4, whiteSpace: "nowrap", fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase", boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}` }}>Subscribe</Button>
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
              <Button type="submit" variant="contained" color="primary" size="large" sx={{ px: 4, py: 1.3, fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase", boxShadow: `0 12px 36px ${alpha(theme.palette.primary.main, 0.45)}` }}>
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

      <Box sx={{ position: "relative", overflow: "hidden" }}>
        <Box aria-hidden sx={{ position: "absolute", top: { xs: -120, md: -160 }, right: { xs: -160, md: -100 }, width: { xs: 360, md: 560 }, height: { xs: 360, md: 560 }, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, isDarkMode ? 0.3 : 0.18)} 0%, transparent 65%)`, filter: "blur(20px)", pointerEvents: "none" }} />
        <Container maxWidth="lg" sx={{ pt: { xs: 5, md: 9 }, pb: { xs: 5, md: 7 }, position: "relative" }}>
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <Box sx={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 1, px: 1.5, py: 0.5, borderRadius: 1, border: "1px solid", borderColor: alpha(theme.palette.primary.main, 0.45), bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: `${liveDot} 1.6s ease-in-out infinite` }} />
                  <Typography variant="caption" sx={{ letterSpacing: 1.5, color: "primary.main", fontWeight: 800, textTransform: "uppercase", fontFamily: MONO_FONT }}>{hero.tagline}</Typography>
                </Box>

                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: "2.5rem", md: "3.9rem" },
                    lineHeight: 1.03,
                    backgroundImage: `linear-gradient(120deg, ${theme.palette.text.primary} 35%, ${theme.palette.primary.main}, #06b6d4, #f43f5e)`,
                    backgroundSize: "200% 200%",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    animation: `${gradientShift} 6s ease-in-out infinite`,
                  }}
                >
                  {hero.headline}
                </Typography>

                <Typography variant="h6" sx={{ fontWeight: 400, color: "text.secondary", maxWidth: 540 }}>{hero.subtitle}</Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="flex-start">
                  <Button size="large" variant="contained" color="primary" onClick={() => scrollToId("sealed")} sx={{ px: 4, py: 1.4, fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase", boxShadow: `0 12px 36px ${alpha(theme.palette.primary.main, 0.5)}` }}>▶ {hero.cta}</Button>
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
              <HeroShowcase panelSx={panelSx} isDarkMode={isDarkMode} />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: { xs: 6, md: 10 } }}>
        <Stack spacing={{ xs: 7, md: 11 }}>
          <PromoBanners banners={content.banners} />

          <Box id="sealed">
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={1} sx={{ mb: 4 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BoxIcon sx={{ color: "primary.main" }} />
                  <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Sealed products</Typography>
                </Stack>
                <Typography variant="h4">Get it sealed before it&apos;s gone.</Typography>
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
                <Typography variant="h4">Pre-order now. Thank yourself later.</Typography>
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

          <Box>
            <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 4 }}>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Loved by collectors</Typography>
              <Typography variant="h4">The thrill of the pull.</Typography>
            </Stack>
            <Grid container spacing={2.5}>
              {TESTIMONIALS.map((item) => (
                <Grid size={{ xs: 12, md: 4 }} key={item.name}>
                  <Box sx={{ ...panelSx, p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
                    <Rating value={5} size="small" readOnly sx={{ mb: 1.5 }} />
                    <Typography sx={{ fontSize: "1rem", lineHeight: 1.6, flexGrow: 1 }}>“{item.quote}”</Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2.5 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: alpha(theme.palette.primary.main, 0.18), color: "primary.main", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{item.name.charAt(0)}</Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.name}</Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{item.role}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          <NewsletterForm panelSx={panelSx} />

          <InquiryForm panelSx={panelSx} />

          <Box sx={{ borderTop: "1px solid", borderColor: surfaceBorderColor, pt: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{content.contact.legalName}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: "0.9rem", mt: 1, maxWidth: 360 }}>{content.contact.blurb}</Typography>
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
