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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
  { value: "sealed", label: "Sealed products" },
  { value: "preorders", label: "Pre-orders" },
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
  const { content, setHero, addFeatureDrop, updateFeatureDrop, removeFeatureDrop } = useCms();
  const hero = content.hero;
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
  const PreviewIcon = banner.link === "preorders" ? SparkleIcon : BoxIcon;
  const headerBg = isDarkMode
    ? `linear-gradient(148deg, ${alpha("#0F1D42", 0.96)} 0%, ${alpha("#0B1538", 0.98)} 100%)`
    : `linear-gradient(148deg, ${OFF_WHITE.paper} 0%, ${OFF_WHITE.paperSoft} 100%)`;

  return (
    <Box sx={{ ...panelSx, p: 0, overflow: "hidden", opacity: banner.active ? 1 : 0.6 }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, background: headerBg, color: isDarkMode ? OFF_WHITE.textBright : theme.palette.text.primary, overflow: "hidden" }}>
        <Box sx={{ position: "relative", flex: 1, p: 3, minHeight: 130 }}>
          <Box aria-hidden sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0.15)})` }} />
          <Typography sx={{ position: "relative", fontFamily: MONO_FONT, fontSize: "0.6rem", fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: accent, mb: 1 }}>{banner.link === "preorders" ? "Pre-order" : "Sealed drop"}</Typography>
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
            <TextField label="TikTok URL" fullWidth value={social.tiktok} onChange={(e) => setSocial({ tiktok: e.target.value })} InputProps={{ startAdornment: (<InputAdornment position="start"><TiktokIcon sx={{ fontSize: 18 }} /></InputAdornment>) }} />
          </Stack>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, height: "100%" }}>
          <SectionHeader title="Contact & business info" />
          <Stack spacing={2}>
            <TextField label="Business name" fullWidth value={contact.legalName} onChange={(e) => setContact({ legalName: e.target.value })} />
            <TextField label="Contact email" fullWidth value={contact.email} onChange={(e) => setContact({ email: e.target.value })} />
            <TextField label="Order hours" fullWidth value={contact.hours} onChange={(e) => setContact({ hours: e.target.value })} />
            <TextField label="Social handle" fullWidth value={contact.handle} onChange={(e) => setContact({ handle: e.target.value })} />
            <TextField label="Footer blurb" fullWidth multiline minRows={2} value={contact.blurb} onChange={(e) => setContact({ blurb: e.target.value })} />
          </Stack>
        </Box>
      </Grid>
    </Grid>
  );
}

function ProductsTab({ panelSx }) {
  const [items, setItems] = useState(
    ALL_PRODUCTS.map((p, i) => ({ id: p.id, name: p.name, line: p.line, price: p.price, published: i % 5 !== 0 })),
  );

  function toggle(id) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, published: !it.published } : it)));
  }

  return (
    <Box sx={{ ...panelSx, overflow: "hidden" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800 }}>Product</TableCell>
            <TableCell sx={{ fontWeight: 800, display: { xs: "none", sm: "table-cell" } }} align="right">Price</TableCell>
            <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
            <TableCell sx={{ fontWeight: 800 }} align="center">Published</TableCell>
            <TableCell sx={{ fontWeight: 800 }} align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} hover>
              <TableCell sx={{ maxWidth: 360 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.3 }}>{item.name}</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: MONO_FONT }}>{item.line}</Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, display: { xs: "none", sm: "table-cell" } }}>{PESO.format(item.price)}</TableCell>
              <TableCell align="center"><Chip label={item.published ? "Published" : "Draft"} size="small" color={item.published ? "success" : "default"} variant="outlined" /></TableCell>
              <TableCell align="center"><Switch checked={item.published} onChange={() => toggle(item.id)} color="primary" /></TableCell>
              <TableCell align="right"><Button size="small" variant="outlined" color="inherit">Edit</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

const TABS = ["Homepage", "Banners", "Announcements", "Social & Contact", "Products"];

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
      {tab === 3 ? <SocialContactTab panelSx={panelSx} /> : null}
      {tab === 4 ? <ProductsTab panelSx={panelSx} /> : null}
    </Stack>
  );
}
