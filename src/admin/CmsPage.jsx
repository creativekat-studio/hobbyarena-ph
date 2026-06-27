import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { FacebookIcon, InstagramIcon, TiktokIcon, SparkleIcon, BoxIcon } from "../components/icons.jsx";
import { cmsPreviewGradient } from "../lib/surfaces.js";
import { OFF_WHITE } from "../lib/colors.js";
import { useCms } from "../lib/cmsContent.jsx";
import { ALL_PRODUCTS } from "../data/mockData.js";

const LINK_OPTIONS = [
  { value: "featured-products", label: "Featured products" },
  { value: "featured-preorders", label: "Featured pre-orders" },
  { value: "newsletter", label: "Newsletter" },
];

const SWATCHES_FALLBACK = ["#7c3aed", "#06b6d4", "#f43f5e", "#f59e0b", "#22c55e", "#ec4899"];

function SectionHeader({ title, action }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
      {action}
    </Stack>
  );
}

function HomepageTab({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const { content, setHero, setHomepageSection, addFeatureDrop, updateFeatureDrop, removeFeatureDrop } = useCms();
  const hero = content.hero;
  const sections = content.homepageSections;
  const [saved, setSaved] = useState(false);

  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
            <SectionHeader title="Hero section" />
            <Stack spacing={2}>
              <TextField label="Tagline" fullWidth value={hero.tagline} onChange={(e) => { setHero({ tagline: e.target.value }); setSaved(false); }} />
              <TextField label="Headline" fullWidth value={hero.headline} onChange={(e) => { setHero({ headline: e.target.value }); setSaved(false); }} />
              <TextField label="Subtitle" fullWidth multiline minRows={3} value={hero.subtitle} onChange={(e) => { setHero({ subtitle: e.target.value }); setSaved(false); }} />
              <TextField label="Primary button label" fullWidth value={hero.cta} onChange={(e) => { setHero({ cta: e.target.value }); setSaved(false); }} />
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button variant="contained" color="primary" onClick={() => setSaved(true)} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>Save</Button>
                <Typography sx={{ color: saved ? "success.main" : "text.secondary", fontSize: "0.82rem", fontWeight: 600 }}>
                  {saved ? "Saved — live on storefront" : "Changes auto-save as you type"}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, height: "100%" }}>
            <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: 1.5 }}>Live preview</Typography>
            <Box sx={{ mt: 2, p: 3, borderRadius: 1, background: cmsPreviewGradient(theme), border: "1px solid", borderColor: alpha(theme.palette.primary.main, 0.2) }}>
              <Typography sx={{ fontFamily: MONO_FONT, color: "primary.main", fontWeight: 800, fontSize: "0.7rem", letterSpacing: 1, textTransform: "uppercase" }}>{hero.tagline}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>{hero.headline}</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mt: 1 }}>{hero.subtitle}</Typography>
              <Button variant="contained" color="primary" sx={{ mt: 2, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>▶ {hero.cta}</Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {[
          { key: "products", label: "Featured products section" },
          { key: "preorders", label: "Featured pre-orders section" },
        ].map(({ key, label }) => {
          const section = sections[key];
          return (
            <Grid size={{ xs: 12, md: 6 }} key={key}>
              <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, height: "100%" }}>
                <SectionHeader title={label} />
                <Stack spacing={2}>
                  <TextField label="Overline" fullWidth value={section.overline} onChange={(e) => setHomepageSection(key, { overline: e.target.value })} />
                  <TextField label="Title" fullWidth value={section.title} onChange={(e) => setHomepageSection(key, { title: e.target.value })} />
                  <TextField label="Subtitle" fullWidth multiline minRows={2} value={section.subtitle} onChange={(e) => setHomepageSection(key, { subtitle: e.target.value })} />
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader
          title="Feature drops"
          action={
            <Button variant="contained" color="primary" onClick={() => addFeatureDrop({})} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
              + Add drop
            </Button>
          }
        />
        <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 2 }}>
          Active drops rotate in the hero card on the homepage. Pick a product and customize the badge labels.
        </Typography>
        <Stack spacing={2}>
          {content.featureDrops.map((drop) => {
            const product = ALL_PRODUCTS.find((p) => p.id === drop.productId);
            return (
              <Stack
                key={drop.id}
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", md: "center" }}
                sx={{ p: 2, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor, opacity: drop.active ? 1 : 0.55 }}
              >
                <TextField
                  size="small"
                  label="Product"
                  select
                  fullWidth
                  value={drop.productId}
                  onChange={(e) => updateFeatureDrop(drop.id, { productId: e.target.value })}
                  sx={{ flex: 2 }}
                >
                  {ALL_PRODUCTS.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </TextField>
                <TextField size="small" label="Badge" fullWidth value={drop.badge} onChange={(e) => updateFeatureDrop(drop.id, { badge: e.target.value })} sx={{ flex: 1 }} />
                <TextField size="small" label="Tier label" fullWidth value={drop.tier} onChange={(e) => updateFeatureDrop(drop.id, { tier: e.target.value })} sx={{ flex: 1 }} />
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Switch checked={drop.active} onChange={(e) => updateFeatureDrop(drop.id, { active: e.target.checked })} color="primary" />
                  <IconButton size="small" onClick={() => removeFeatureDrop(drop.id)} sx={{ color: "text.secondary", border: "1px solid", borderColor: surfaceBorderColor }}>✕</IconButton>
                </Stack>
                {product ? (
                  <Typography sx={{ display: { xs: "block", md: "none" }, fontSize: "0.78rem", color: "text.secondary", fontFamily: MONO_FONT }}>
                    {PESO.format(product.price)} · {product.line}
                  </Typography>
                ) : null}
              </Stack>
            );
          })}
          {content.featureDrops.length === 0 ? (
            <Typography sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>No feature drops yet. Add one to populate the hero showcase.</Typography>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}


function BannerCard({ banner, panelSx, surfaceBorderColor, updateBanner, removeBanner }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const swatches = theme.ha?.cmsSwatches ?? SWATCHES_FALLBACK;
  const accent = banner.color || theme.palette.primary.main;
  const PreviewIcon = banner.link === "featured-preorders" || banner.link === "preorders" ? SparkleIcon : BoxIcon;
  const headerBg = isDarkMode
    ? `linear-gradient(148deg, ${alpha("#0F1D42", 0.96)} 0%, ${alpha("#0B1538", 0.98)} 100%)`
    : `linear-gradient(148deg, ${OFF_WHITE.paper} 0%, ${OFF_WHITE.paperSoft} 100%)`;

  return (
    <Box sx={{ ...panelSx, p: 0, overflow: "hidden", opacity: banner.active ? 1 : 0.6 }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, background: headerBg, color: isDarkMode ? OFF_WHITE.textBright : theme.palette.text.primary, overflow: "hidden" }}>
        <Box sx={{ position: "relative", flex: 1, p: 3, minHeight: 130 }}>
          <Box aria-hidden sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0.15)})` }} />
          <Typography sx={{ position: "relative", fontFamily: MONO_FONT, fontSize: "0.6rem", fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: accent, mb: 1 }}>{banner.link === "featured-preorders" || banner.link === "preorders" ? "Pre-order" : "Featured products"}</Typography>
          <Typography sx={{ position: "relative", fontWeight: 800, fontSize: "1.2rem", lineHeight: 1.15 }}>{banner.title}</Typography>
          <Typography sx={{ position: "relative", fontSize: "0.85rem", mt: 0.5, color: isDarkMode ? alpha(OFF_WHITE.textBright, 0.78) : theme.palette.text.secondary }}>{banner.subtitle}</Typography>
          <Chip label={banner.ctaLabel || "Button"} size="small" sx={{ position: "relative", mt: 1.5, bgcolor: alpha(accent, 0.12), color: accent, fontWeight: 700, border: "1px solid", borderColor: alpha(accent, 0.35) }} />
        </Box>
        <Box
          aria-hidden
          sx={{
            position: "relative",
            width: { xs: "100%", sm: 120 },
            minHeight: { xs: 72, sm: "auto" },
            flexShrink: 0,
            borderTop: { xs: `1px solid ${alpha(accent, 0.15)}`, sm: "none" },
            borderLeft: { sm: `1px solid ${alpha(accent, 0.15)}` },
            background: `linear-gradient(165deg, ${alpha(accent, 0.18)} 0%, transparent 100%)`,
          }}
        >
          <PreviewIcon sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 36, color: alpha(accent, 0.55) }} />
        </Box>
      </Box>
      <Stack spacing={1.5} sx={{ p: 2.5 }}>
        <TextField size="small" label="Title" fullWidth value={banner.title} onChange={(e) => updateBanner(banner.id, { title: e.target.value })} />
        <TextField size="small" label="Subtitle" fullWidth value={banner.subtitle} onChange={(e) => updateBanner(banner.id, { subtitle: e.target.value })} />
        <Stack direction="row" spacing={1.5}>
          <TextField size="small" label="Button label" fullWidth value={banner.ctaLabel} onChange={(e) => updateBanner(banner.id, { ctaLabel: e.target.value })} />
          <TextField size="small" label="Links to" select fullWidth value={banner.link} onChange={(e) => updateBanner(banner.id, { link: e.target.value })}>
            {LINK_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={0.75} alignItems="center">
            {swatches.map((color) => (
              <Box
                key={color}
                onClick={() => updateBanner(banner.id, { color })}
                sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: color, cursor: "pointer", border: "2px solid", borderColor: banner.color === color ? "text.primary" : "transparent" }}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Switch checked={banner.active} onChange={(e) => updateBanner(banner.id, { active: e.target.checked })} color="primary" />
            <IconButton size="small" onClick={() => removeBanner(banner.id)} sx={{ color: "text.secondary", border: "1px solid", borderColor: surfaceBorderColor }}>✕</IconButton>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

function BannersTab({ panelSx, surfaceBorderColor }) {
  const { content, addBanner, updateBanner, removeBanner } = useCms();

  return (
    <Stack spacing={2.5}>
      <SectionHeader
        title="Promo banners"
        action={
          <Button variant="contained" color="primary" onClick={() => addBanner({ title: "New banner", subtitle: "Describe this promo." })} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
            + Add banner
          </Button>
        }
      />
      <Grid container spacing={2.5}>
        {content.banners.map((banner) => (
          <Grid size={{ xs: 12, md: 6 }} key={banner.id}>
            <BannerCard banner={banner} panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} updateBanner={updateBanner} removeBanner={removeBanner} />
          </Grid>
        ))}
        {content.banners.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ ...panelSx, p: 5, textAlign: "center", color: "text.secondary" }}>No banners yet. Add one to show a promo on the homepage.</Box>
          </Grid>
        ) : null}
      </Grid>
    </Stack>
  );
}

function AnnouncementsTab({ panelSx, surfaceBorderColor }) {
  const { content, addAnnouncement, updateAnnouncement, removeAnnouncement } = useCms();
  const [draft, setDraft] = useState("");

  function add() {
    if (!draft.trim()) return;
    addAnnouncement(draft.trim());
    setDraft("");
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
      <SectionHeader title="Announcement bar" />
      <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 2 }}>
        Active items scroll across the top of the storefront.
      </Typography>
      <Stack spacing={1.5}>
        {content.announcements.map((item) => (
          <Stack key={item.id} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }}>
            <Switch checked={item.active} onChange={(e) => updateAnnouncement(item.id, { active: e.target.checked })} color="primary" />
            <TextField variant="standard" fullWidth value={item.text} onChange={(e) => updateAnnouncement(item.id, { text: e.target.value })} sx={{ opacity: item.active ? 1 : 0.5 }} InputProps={{ disableUnderline: true, sx: { fontWeight: 600 } }} />
            <IconButton size="small" color="inherit" onClick={() => removeAnnouncement(item.id)} sx={{ color: "text.secondary" }}>✕</IconButton>
          </Stack>
        ))}
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2.5 }}>
        <TextField fullWidth size="small" placeholder="New announcement…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <Button variant="contained" color="primary" onClick={add} sx={{ whiteSpace: "nowrap", fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>+ Add</Button>
      </Stack>
    </Box>
  );
}

function TestimonialsTab({ panelSx, surfaceBorderColor }) {
  const { content, setTestimonials, setProductReviews, addTestimonial, updateTestimonial, removeTestimonial } = useCms();
  const { testimonials, productReviews } = content;

  return (
    <Stack spacing={2.5}>
      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader title="Product ratings" />
        <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 2 }}>
          Star ratings on product cards and detail pages. Set rating and review count per SKU in Inventory → Edit product.
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Switch
            checked={productReviews.showRatings}
            onChange={(e) => setProductReviews({ showRatings: e.target.checked })}
            color="primary"
          />
          <Typography sx={{ fontWeight: 700 }}>
            {productReviews.showRatings ? "Ratings visible on storefront" : "Ratings hidden (recommended until real reviews)"}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader title="Store testimonials" />
        <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 2 }}>
          Hidden on the storefront by default. Enable when the client provides real reviews.
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Switch
            checked={testimonials.enabled}
            onChange={(e) => setTestimonials({ enabled: e.target.checked })}
            color="primary"
          />
          <Typography sx={{ fontWeight: 700 }}>{testimonials.enabled ? "Visible on homepage" : "Hidden on homepage"}</Typography>
        </Stack>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Section overline" fullWidth value={testimonials.overline} onChange={(e) => setTestimonials({ overline: e.target.value })} />
          <TextField label="Section title" fullWidth value={testimonials.title} onChange={(e) => setTestimonials({ title: e.target.value })} />
        </Stack>
        <Button variant="contained" color="primary" onClick={() => addTestimonial({})} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          + Add testimonial
        </Button>
      </Box>

      <Stack spacing={2}>
        {testimonials.items.map((item) => (
          <Box key={item.id} sx={{ ...panelSx, p: 2.5, opacity: item.active !== false ? 1 : 0.55 }}>
            <Stack spacing={1.5}>
              <TextField label="Quote" fullWidth multiline minRows={2} value={item.quote} onChange={(e) => updateTestimonial(item.id, { quote: e.target.value })} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField label="Name" fullWidth value={item.name} onChange={(e) => updateTestimonial(item.id, { name: e.target.value })} />
                <TextField label="Role" fullWidth value={item.role} onChange={(e) => updateTestimonial(item.id, { role: e.target.value })} />
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Switch checked={item.active !== false} onChange={(e) => updateTestimonial(item.id, { active: e.target.checked })} color="primary" />
                  <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Active</Typography>
                </Stack>
                <IconButton size="small" onClick={() => removeTestimonial(item.id)} sx={{ color: "text.secondary", border: "1px solid", borderColor: surfaceBorderColor }}>✕</IconButton>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

function BankDetailsTab({ panelSx, surfaceBorderColor }) {
  const { content, setBankDetails, updateBankAccount, addBankAccount, removeBankAccount } = useCms();
  const bank = content.bankDetails;

  return (
    <Stack spacing={2.5}>
      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader title="Bank details section" />
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Switch checked={bank.enabled} onChange={(e) => setBankDetails({ enabled: e.target.checked })} color="primary" />
            <Typography sx={{ fontWeight: 700 }}>{bank.enabled ? "Shown on homepage" : "Hidden"}</Typography>
          </Stack>
          <TextField label="Section title" fullWidth value={bank.title} onChange={(e) => setBankDetails({ title: e.target.value })} />
          <TextField label="Section subtitle" fullWidth multiline minRows={2} value={bank.subtitle} onChange={(e) => setBankDetails({ subtitle: e.target.value })} />
          <Stack direction="row" alignItems="center" spacing={2}>
            <Switch checked={bank.showBirSeal} onChange={(e) => setBankDetails({ showBirSeal: e.target.checked })} color="primary" />
            <Typography sx={{ fontWeight: 600 }}>Show BIR QR placeholder</Typography>
          </Stack>
          <TextField label="BIR seal note" fullWidth value={bank.birSealNote} onChange={(e) => setBankDetails({ birSealNote: e.target.value })} />
          <TextField label="BIR QR image URL (optional)" fullWidth placeholder="/payment/bir-qr.png" value={bank.birQrImage ?? ""} onChange={(e) => setBankDetails({ birQrImage: e.target.value })} />
        </Stack>
      </Box>

      <SectionHeader
        title="Bank accounts"
        action={
          <Button variant="contained" color="primary" onClick={() => addBankAccount({ label: "New account", accountName: "", accountNumber: "", note: "" })} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
            + Add account
          </Button>
        }
      />
      <Grid container spacing={2.5}>
        {bank.accounts.map((account) => (
          <Grid size={{ xs: 12, md: 6 }} key={account.id}>
            <Box sx={{ ...panelSx, p: 2.5, opacity: account.active !== false ? 1 : 0.55 }}>
              <Stack spacing={1.5}>
                <TextField size="small" label="Label" fullWidth value={account.label} onChange={(e) => updateBankAccount(account.id, { label: e.target.value })} />
                <TextField size="small" label="Account name" fullWidth value={account.accountName} onChange={(e) => updateBankAccount(account.id, { accountName: e.target.value })} />
                <TextField size="small" label="Account number" fullWidth value={account.accountNumber} onChange={(e) => updateBankAccount(account.id, { accountNumber: e.target.value })} />
                <TextField size="small" label="Note" fullWidth value={account.note ?? ""} onChange={(e) => updateBankAccount(account.id, { note: e.target.value })} />
                <TextField size="small" label="QR image URL" fullWidth placeholder="/payment/gcash-qr.png" value={account.qrImage ?? ""} onChange={(e) => updateBankAccount(account.id, { qrImage: e.target.value })} />
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Switch checked={account.active !== false} onChange={(e) => updateBankAccount(account.id, { active: e.target.checked })} color="primary" />
                    <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Active</Typography>
                  </Stack>
                  <IconButton size="small" onClick={() => removeBankAccount(account.id)} sx={{ color: "text.secondary", border: "1px solid", borderColor: surfaceBorderColor }}>✕</IconButton>
                </Stack>
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

function SocialContactTab({ panelSx }) {
  const { content, setSocial, setContact } = useCms();
  const social = content.social;
  const contact = content.contact;

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, height: "100%" }}>
          <SectionHeader title="Social media links" />
          <Stack spacing={2}>
            <TextField label="Instagram URL" fullWidth value={social.instagram} onChange={(e) => setSocial({ instagram: e.target.value })} InputProps={{ startAdornment: (<InputAdornment position="start"><InstagramIcon sx={{ fontSize: 18 }} /></InputAdornment>) }} />
            <TextField label="Facebook URL" fullWidth value={social.facebook} onChange={(e) => setSocial({ facebook: e.target.value })} InputProps={{ startAdornment: (<InputAdornment position="start"><FacebookIcon sx={{ fontSize: 18 }} /></InputAdornment>) }} />
            <TextField label="TikTok URL (optional)" fullWidth value={social.tiktok} onChange={(e) => setSocial({ tiktok: e.target.value })} InputProps={{ startAdornment: (<InputAdornment position="start"><TiktokIcon sx={{ fontSize: 18 }} /></InputAdornment>) }} helperText="Leave blank to hide TikTok from the footer." />
          </Stack>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, height: "100%" }}>
          <SectionHeader title="Contact & business info" />
          <Stack spacing={2}>
            <TextField label="Business name" fullWidth value={contact.legalName} onChange={(e) => setContact({ legalName: e.target.value })} />
            <TextField label="Contact email" fullWidth value={contact.email} onChange={(e) => setContact({ email: e.target.value })} />
            <TextField label="Phone" fullWidth value={contact.phone ?? ""} onChange={(e) => setContact({ phone: e.target.value })} />
            <TextField label="Address" fullWidth multiline minRows={2} value={contact.address ?? ""} onChange={(e) => setContact({ address: e.target.value })} />
            <TextField label="Order hours" fullWidth value={contact.hours} onChange={(e) => setContact({ hours: e.target.value })} />
            <TextField label="Social handle" fullWidth value={contact.handle} onChange={(e) => setContact({ handle: e.target.value })} />
            <TextField label="WhatsApp link (optional)" fullWidth value={social.whatsapp ?? ""} onChange={(e) => setSocial({ whatsapp: e.target.value })} placeholder="https://wa.me/639..." />
            <TextField label="Footer blurb" fullWidth multiline minRows={2} value={contact.blurb} onChange={(e) => setContact({ blurb: e.target.value })} />
          </Stack>
        </Box>
      </Grid>
    </Grid>
  );
}

const TABS = ["Homepage", "Banners", "Announcements", "Reviews", "Bank details", "Social & Contact"];

export default function CmsPage() {
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { reset } = useCms();
  const [tab, setTab] = useState(0);

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
        <Box>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>Content</Typography>
          <Typography variant="h3">CMS</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Manage what customers see — homepage, banners, announcements, and links. Edits save automatically.</Typography>
        </Box>
        <Button variant="outlined" color="inherit" onClick={reset} sx={{ borderColor: surfaceBorderColor }}>Reset to defaults</Button>
      </Stack>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
        {TABS.map((label) => (
          <Tab key={label} label={label} sx={{ fontWeight: 700, textTransform: "none" }} />
        ))}
      </Tabs>

      {tab === 0 ? <HomepageTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
      {tab === 1 ? <BannersTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
      {tab === 2 ? <AnnouncementsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
      {tab === 3 ? <TestimonialsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
      {tab === 4 ? <BankDetailsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
      {tab === 5 ? <SocialContactTab panelSx={panelSx} /> : null}
    </Stack>
  );
}
