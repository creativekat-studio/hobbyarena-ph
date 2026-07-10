import { useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Popover,
  Stack,
  Switch as MuiSwitch,
  Tab,
  Tabs,
  TextField as MuiTextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { FacebookIcon, InstagramIcon, TiktokIcon, SparkleIcon, BoxIcon, EditIcon } from "../components/icons.jsx";
import { OFF_WHITE } from "../lib/colors.js";
import { useCms } from "../lib/cmsContent.jsx";
import { useFirebaseData } from "../lib/firebase/config.js";
import { uploadCmsAsset } from "../lib/firebase/repositories/uploads.js";
import { compressProductImageFile } from "../lib/imageCompression.js";
import { PREVIEW_STOREFRONT_URL } from "../lib/siteAccess.js";
import { ALL_PRODUCTS } from "../data/mockData.js";
import CmsPreviewMockup from "../components/CmsPreviewMockup.jsx";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import AdminSectionTitle from "../components/AdminSectionTitle.jsx";
import AdminColorPicker from "../components/AdminColorPicker.jsx";
import { PERK_ICON_OPTIONS, getPerkIcon } from "../lib/perkIcons.js";

const LINK_OPTIONS = [
  { value: "featured-products", label: "Products page (/products)" },
  { value: "featured-preorders", label: "Pre-orders page (/preorders)" },
  { value: "newsletter", label: "Newsletter section (scroll)" },
];

const CMS_SWITCH_LABEL_SX = {
  fontSize: "0.84rem",
  fontWeight: 700,
  lineHeight: 1.35,
};

function TextField(props) {
  return <MuiTextField size="small" {...props} />;
}

function Switch(props) {
  return <MuiSwitch size="small" {...props} />;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function BankAssetUpload({ label, value, onChange, surfaceBorderColor, kind }) {
  const theme = useTheme();
  const firebaseEnabled = useFirebaseData();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Image must be a PNG, JPG, or WebP file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const compressedFile = await compressProductImageFile(file);
      const url = firebaseEnabled
        ? await uploadCmsAsset(compressedFile, kind)
        : await readAsDataUrl(compressedFile);
      onChange(url);
    } catch (uploadError) {
      console.error("[cms] Asset upload failed:", uploadError);
      setError("Could not upload the image. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: "0.65rem",
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {label}
      </Typography>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        hidden
        onChange={handleFileChange}
      />
      <Box
        role={value ? undefined : "button"}
        tabIndex={uploading || value ? undefined : 0}
        aria-label={value ? undefined : `Upload ${label}`}
        onClick={() => {
          if (!uploading && !value) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (!uploading && !value && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        sx={{
          position: "relative",
          aspectRatio: "1 / 1",
          minHeight: 112,
          borderRadius: 1.25,
          border: "1px solid",
          borderColor: value ? surfaceBorderColor : alpha(theme.palette.primary.main, 0.45),
          borderStyle: value ? "solid" : "dashed",
          bgcolor: alpha("#fff", value ? 0.035 : 0.025),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          cursor: uploading ? "default" : value ? "default" : "pointer",
          transition: "border-color 160ms ease, background-color 160ms ease",
          "&:hover, &:focus-visible": {
            borderColor: value ? alpha(theme.palette.primary.main, 0.5) : theme.palette.primary.main,
            bgcolor: alpha(theme.palette.primary.main, 0.06),
          },
          "&:hover .bank-asset-actions, &:focus-within .bank-asset-actions": {
            opacity: 1,
            transform: "translateY(0)",
            pointerEvents: "auto",
          },
        }}
      >
        {uploading ? (
          <CircularProgress size={24} />
        ) : value ? (
          <Box component="img" src={value} alt="" sx={{ width: "100%", height: "100%", objectFit: "contain", p: 1 }} />
        ) : (
          <Stack spacing={0.75} alignItems="center" sx={{ px: 1.25, textAlign: "center", color: "text.secondary" }}>
            <EditIcon sx={{ fontSize: 20, color: alpha(theme.palette.primary.main, 0.85) }} />
            <Typography sx={{ fontSize: "0.68rem", lineHeight: 1.25 }}>
              Upload image
            </Typography>
          </Stack>
        )}
        {value && !uploading ? (
          <Stack
            className="bank-asset-actions"
            direction="row"
            spacing={0.75}
            sx={{
              position: "absolute",
              inset: 0,
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha("#050505", 0.58),
              opacity: 0,
              transform: "translateY(4px)",
              pointerEvents: "none",
              transition: "opacity 160ms ease, transform 160ms ease",
            }}
          >
            <IconButton
              size="small"
              aria-label={`Replace ${label}`}
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
              sx={{
                width: 32,
                height: 32,
                p: 0,
                borderRadius: "50%",
                color: "primary.main",
                bgcolor: alpha("#000", 0.45),
                border: "1px solid",
                borderColor: alpha(theme.palette.primary.main, 0.45),
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.18) },
              }}
            >
              <EditIcon sx={{ fontSize: 17 }} />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`Remove ${label}`}
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
              }}
              sx={{
                width: 32,
                height: 32,
                p: 0,
                borderRadius: "50%",
                color: "text.primary",
                bgcolor: alpha("#000", 0.45),
                border: "1px solid",
                borderColor: alpha("#fff", 0.18),
                fontSize: "0.85rem",
                lineHeight: 1,
                "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.22), color: "error.light" },
              }}
            >
              ✕
            </IconButton>
          </Stack>
        ) : null}
      </Box>
      {error ? (
        <Typography sx={{ fontSize: "0.72rem", color: "error.main" }}>{error}</Typography>
      ) : null}
    </Stack>
  );
}

function SectionHeader({ title, action }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <AdminSectionTitle>{title}</AdminSectionTitle>
      {action}
    </Stack>
  );
}

function PerkIconPicker({ pickerId, value, accent, onChange, surfaceBorderColor, ariaLabel }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const optionRefs = useRef([]);
  const selectedId = value || "sparkle";
  const selectedOption = PERK_ICON_OPTIONS.find((option) => option.id === selectedId) ?? PERK_ICON_OPTIONS[0];
  const selectedIndex = Math.max(0, PERK_ICON_OPTIONS.findIndex((option) => option.id === selectedId));
  const SelectedIcon = getPerkIcon(selectedId);
  const open = Boolean(anchorEl);
  const popoverId = `${pickerId}-popover`;

  function focusOption(index) {
    const boundedIndex = (index + PERK_ICON_OPTIONS.length) % PERK_ICON_OPTIONS.length;
    optionRefs.current[boundedIndex]?.focus();
  }

  function handleOptionKeyDown(event, index) {
    const columns = 4;
    const lastIndex = PERK_ICON_OPTIONS.length - 1;
    let nextIndex = null;

    if (event.key === "ArrowRight") nextIndex = index + 1;
    if (event.key === "ArrowLeft") nextIndex = index - 1;
    if (event.key === "ArrowDown") nextIndex = index + columns;
    if (event.key === "ArrowUp") nextIndex = index - columns;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex === null) return;
    event.preventDefault();
    focusOption(Math.max(0, Math.min(lastIndex, nextIndex)));
  }

  function handleSelect(iconId) {
    onChange(iconId);
    setAnchorEl(null);
  }

  function handleOpen(event) {
    setAnchorEl(event.currentTarget);
    window.setTimeout(() => focusOption(selectedIndex), 0);
  }

  return (
    <Stack spacing={0.5} sx={{ width: 96, flexShrink: 0 }}>
      <Typography
        component="label"
        id={`${pickerId}-label`}
        sx={{
          color: "text.secondary",
          fontFamily: MONO_FONT,
          fontSize: "0.62rem",
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Icon
      </Typography>
      <Button
        type="button"
        variant="outlined"
        aria-label={`${ariaLabel}. Current icon: ${selectedOption.label}`}
        aria-haspopup="dialog"
        aria-expanded={open ? "true" : undefined}
        aria-controls={open ? popoverId : undefined}
        onClick={handleOpen}
        sx={{
          minWidth: 0,
          height: 40,
          px: 1,
          borderColor: open ? alpha(theme.palette.primary.main, 0.8) : surfaceBorderColor,
          bgcolor: alpha("#fff", 0.03),
          color: accent,
          "&:hover": {
            borderColor: alpha(theme.palette.primary.main, 0.8),
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          },
          "&.Mui-focusVisible": {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.22)}`,
          },
        }}
      >
        <SelectedIcon sx={{ fontSize: 22 }} />
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.75,
              p: 1.25,
              border: "1px solid",
              borderColor: surfaceBorderColor,
              bgcolor: "background.paper",
              backgroundImage: "none",
              boxShadow: `0 18px 48px ${alpha("#000", 0.32)}`,
            },
          },
        }}
      >
        <Box
          id={popoverId}
          role="group"
          aria-labelledby={`${pickerId}-label`}
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 40px)",
            gap: 0.75,
          }}
        >
          {PERK_ICON_OPTIONS.map((option, index) => {
            const Icon = getPerkIcon(option.id);
            const selected = option.id === selectedId;
            return (
              <IconButton
                key={option.id}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                size="small"
                aria-pressed={selected}
                aria-label={`${option.label}${selected ? ", selected" : ""}`}
                title={option.label}
                onClick={() => handleSelect(option.id)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                sx={{
                  width: 40,
                  height: 40,
                  border: "1px solid",
                  borderColor: selected ? theme.palette.primary.main : surfaceBorderColor,
                  bgcolor: selected ? alpha(theme.palette.primary.main, 0.16) : alpha("#fff", 0.03),
                  color: selected ? theme.palette.primary.main : "text.secondary",
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.8),
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  },
                  "&.Mui-focusVisible": {
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.22)}`,
                    color: theme.palette.primary.main,
                  },
                }}
              >
                <Icon sx={{ fontSize: 21 }} />
              </IconButton>
            );
          })}
        </Box>
      </Popover>
    </Stack>
  );
}

function SiteModeTab({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const { content, setStorefront } = useCms();
  const storefront = content.storefront;

  return (
    <Stack spacing={2.5}>
      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader title="Public landing page" />
        <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 2.5, lineHeight: 1.55 }}>
          When enabled, visitors on your production domain see a &ldquo;coming soon&rdquo; page
          instead of the full shop. Localhost and the Vercel preview site always show the full storefront. Append{" "}
          <Box component="code" sx={{ fontFamily: MONO_FONT, fontSize: "0.8rem" }}>?storefront=1</Box> on production to
          preview the full shop while landing mode is on.
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2.5 }}>
          <Switch
            checked={storefront.landingMode}
            onChange={(e) => setStorefront({ landingMode: e.target.checked })}
            color="primary"
          />
          <Box>
            <Typography sx={CMS_SWITCH_LABEL_SX}>
              {storefront.landingMode ? "Landing page live on production" : "Full storefront live on production"}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 0.25 }}>
              Preview always available at{" "}
              <Link href={PREVIEW_STOREFRONT_URL} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 700 }}>
                {PREVIEW_STOREFRONT_URL.replace(/^https?:\/\//, "")}
              </Link>
            </Typography>
          </Box>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label="Tagline"
            fullWidth
            value={storefront.landingTagline}
            onChange={(e) => setStorefront({ landingTagline: e.target.value })}
          />
          <TextField
            label="Headline"
            fullWidth
            value={storefront.landingHeadline}
            onChange={(e) => setStorefront({ landingHeadline: e.target.value })}
          />
          <TextField
            label="Message"
            fullWidth
            multiline
            minRows={3}
            value={storefront.landingMessage}
            onChange={(e) => setStorefront({ landingMessage: e.target.value })}
          />
          <TextField
            label="Stay in the loop label"
            fullWidth
            value={storefront.landingSocialLabel ?? "Stay in the loop"}
            onChange={(e) => setStorefront({ landingSocialLabel: e.target.value })}
            helperText="Heading above social icons on the landing page. Links come from Social & Contact."
          />
        </Stack>
      </Box>

      <Box
        sx={{
          ...panelSx,
          p: { xs: 2, md: 2.5 },
          borderColor: alpha(theme.palette.info.main, 0.35),
          bgcolor: alpha(theme.palette.info.main, 0.06),
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: "0.88rem", mb: 0.75 }}>How it works</Typography>
        <Stack spacing={0.75} sx={{ color: "text.secondary", fontSize: "0.84rem", lineHeight: 1.5 }}>
          <Typography sx={{ fontSize: "inherit" }}>
            <strong style={{ color: theme.palette.text.primary }}>hobbyarena.ph</strong> — shows landing page when toggle is on
          </Typography>
          <Typography sx={{ fontSize: "inherit" }}>
            <strong style={{ color: theme.palette.text.primary }}>localhost</strong> — follows the toggle (use{" "}
            <code>?storefront=1</code> to bypass landing locally)
          </Typography>
          <Typography sx={{ fontSize: "inherit" }}>
            <strong style={{ color: theme.palette.text.primary }}>hobbyarena.vercel.app</strong> — always shows full shop for testing
          </Typography>
          <Typography sx={{ fontSize: "inherit" }}>
            <strong style={{ color: theme.palette.text.primary }}>/admin</strong> — always accessible on any domain
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
}

function HomepageTab({ panelSx, surfaceBorderColor }) {
  const { content, setHero, setHomepageSection, addFeatureDrop, updateFeatureDrop, removeFeatureDrop, setPerks, addPerk, updatePerk, removePerk } = useCms();
  const hero = content.hero;
  const sections = content.homepageSections;
  const perks = content.perks ?? { enabled: true, overline: "", title: "", items: [] };
  const [saved, setSaved] = useState(false);
  const theme = useTheme();

  return (
    <Stack spacing={2.5}>
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
        <Grid container spacing={2}>
          {content.featureDrops.map((drop) => {
            const product = ALL_PRODUCTS.find((p) => p.id === drop.productId);
            return (
              <Grid size={{ xs: 12, md: 6 }} key={drop.id}>
                <Box
                  sx={{
                    ...panelSx,
                    p: 0,
                    overflow: "hidden",
                    height: "100%",
                    opacity: drop.active ? 1 : 0.55,
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      height: 3,
                      background: `linear-gradient(90deg, ${drop.color || theme.palette.primary.main}, ${alpha(drop.color || theme.palette.primary.main, 0.15)})`,
                    }}
                  />
                  <Stack spacing={1.5} sx={{ p: 2.5 }}>
                    <TextField
                      size="small"
                      label="Product"
                      select
                      fullWidth
                      value={drop.productId}
                      onChange={(e) => updateFeatureDrop(drop.id, { productId: e.target.value })}
                    >
                      {ALL_PRODUCTS.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </TextField>
                    <Stack direction="row" spacing={1.5}>
                      <TextField
                        size="small"
                        label="Badge"
                        fullWidth
                        value={drop.badge}
                        onChange={(e) => updateFeatureDrop(drop.id, { badge: e.target.value })}
                      />
                      <TextField
                        size="small"
                        label="Tier label"
                        fullWidth
                        value={drop.tier}
                        onChange={(e) => updateFeatureDrop(drop.id, { tier: e.target.value })}
                      />
                    </Stack>
                    {product ? (
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", fontFamily: MONO_FONT }}>
                        {PESO.format(product.price)} · {product.line}
                      </Typography>
                    ) : null}
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <AdminColorPicker
                        value={drop.color}
                        onChange={(color) => updateFeatureDrop(drop.id, { color })}
                        ariaLabel={`Accent for ${drop.badge || "feature drop"}`}
                        fallback={theme.palette.primary.main}
                      />
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Switch
                          checked={drop.active}
                          onChange={(e) => updateFeatureDrop(drop.id, { active: e.target.checked })}
                          color="primary"
                        />
                        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Active</Typography>
                        <IconButton
                          size="small"
                          onClick={() => removeFeatureDrop(drop.id)}
                          sx={{ color: "text.secondary", border: "1px solid", borderColor: surfaceBorderColor }}
                        >
                          ✕
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              </Grid>
            );
          })}
          {content.featureDrops.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ ...panelSx, p: 5, textAlign: "center", color: "text.secondary" }}>
                No feature drops yet. Add one to populate the hero showcase.
              </Box>
            </Grid>
          ) : null}
        </Grid>
      </Box>

      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader
          title="Why Hobby Arena"
          action={
            <Button
              variant="contained"
              color="primary"
              onClick={() => addPerk({})}
              disabled={(perks.items?.length ?? 0) >= 6}
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
            >
              + Add box
            </Button>
          }
        />
        <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 2 }}>
          Active boxes shown on the homepage (1–6). Pick an icon, color, title, and description for each.
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Switch
            checked={perks.enabled !== false}
            onChange={(e) => setPerks({ enabled: e.target.checked })}
            color="primary"
          />
          <Typography sx={CMS_SWITCH_LABEL_SX}>{perks.enabled !== false ? "Visible on homepage" : "Hidden on homepage"}</Typography>
        </Stack>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Section overline" fullWidth value={perks.overline || ""} onChange={(e) => setPerks({ overline: e.target.value })} />
          <TextField label="Section title" fullWidth value={perks.title || ""} onChange={(e) => setPerks({ title: e.target.value })} />
        </Stack>
        <Grid container spacing={2}>
          {(perks.items || []).map((perk) => {
            const accent = perk.color || theme.palette.primary.main;
            return (
              <Grid size={{ xs: 12, md: 6 }} key={perk.id}>
                <Box
                  sx={{
                    ...panelSx,
                    p: 0,
                    overflow: "hidden",
                    height: "100%",
                    opacity: perk.active !== false ? 1 : 0.55,
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      height: 3,
                      background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0.15)})`,
                    }}
                  />
                  <Stack spacing={1.5} sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <PerkIconPicker
                        pickerId={`perk-icon-${perk.id}`}
                        value={perk.icon}
                        accent={accent}
                        surfaceBorderColor={surfaceBorderColor}
                        ariaLabel={`Icon for ${perk.title || "perk"}`}
                        onChange={(icon) => updatePerk(perk.id, { icon })}
                      />
                      <TextField
                        size="small"
                        label="Title"
                        fullWidth
                        value={perk.title || ""}
                        onChange={(e) => updatePerk(perk.id, { title: e.target.value })}
                      />
                    </Stack>
                    <TextField
                      size="small"
                      label="Description"
                      fullWidth
                      multiline
                      minRows={3}
                      value={perk.description || ""}
                      onChange={(e) => updatePerk(perk.id, { description: e.target.value })}
                    />
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <AdminColorPicker
                        value={perk.color}
                        onChange={(color) => updatePerk(perk.id, { color })}
                        ariaLabel={`Color for ${perk.title || "perk"}`}
                        fallback={theme.palette.primary.main}
                      />
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Switch
                          checked={perk.active !== false}
                          onChange={(e) => updatePerk(perk.id, { active: e.target.checked })}
                          color="primary"
                        />
                        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Active</Typography>
                        <IconButton
                          size="small"
                          onClick={() => removePerk(perk.id)}
                          sx={{ color: "text.secondary", border: "1px solid", borderColor: surfaceBorderColor }}
                        >
                          ✕
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              </Grid>
            );
          })}
          {(perks.items || []).length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ ...panelSx, p: 5, textAlign: "center", color: "text.secondary" }}>
                No boxes yet. Add one to show a perk on the homepage.
              </Box>
            </Grid>
          ) : null}
        </Grid>
      </Box>
    </Stack>
  );
}


function BannerCard({ banner, panelSx, surfaceBorderColor, updateBanner, removeBanner }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
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
          <AdminColorPicker
            value={banner.color}
            onChange={(color) => updateBanner(banner.id, { color })}
            ariaLabel={`Color for ${banner.title || "banner"}`}
            fallback={theme.palette.primary.main}
          />
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
          <Typography sx={CMS_SWITCH_LABEL_SX}>
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
          <Typography sx={CMS_SWITCH_LABEL_SX}>{testimonials.enabled ? "Visible on homepage" : "Hidden on homepage"}</Typography>
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
            <Typography sx={CMS_SWITCH_LABEL_SX}>{bank.enabled ? "Shown on homepage" : "Hidden"}</Typography>
          </Stack>
          <TextField label="Section title" fullWidth value={bank.title} onChange={(e) => setBankDetails({ title: e.target.value })} />
          <TextField label="Section subtitle" fullWidth multiline minRows={2} value={bank.subtitle} onChange={(e) => setBankDetails({ subtitle: e.target.value })} />
          <Stack direction="row" alignItems="center" spacing={2}>
            <Switch checked={bank.showBirSeal} onChange={(e) => setBankDetails({ showBirSeal: e.target.checked })} color="primary" />
            <Typography sx={{ ...CMS_SWITCH_LABEL_SX, fontWeight: 600 }}>Show BIR QR placeholder</Typography>
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
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 6 }}>
                    <BankAssetUpload
                      label="Logo"
                      kind="bank-logo"
                      value={account.logo ?? ""}
                      surfaceBorderColor={surfaceBorderColor}
                      onChange={(url) => updateBankAccount(account.id, { logo: url })}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <BankAssetUpload
                      label="QR code"
                      kind="bank-qr"
                      value={account.qrImage ?? ""}
                      surfaceBorderColor={surfaceBorderColor}
                      onChange={(url) => updateBankAccount(account.id, { qrImage: url })}
                    />
                  </Grid>
                </Grid>
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
            <TextField label="Address" fullWidth multiline minRows={2} value={contact.address ?? ""} onChange={(e) => setContact({ address: e.target.value })} helperText="Shown on the contact page and footer." />
            <TextField
              label="Google Maps link"
              fullWidth
              value={contact.googleMapsUrl ?? ""}
              onChange={(e) => setContact({ googleMapsUrl: e.target.value })}
              placeholder="https://maps.google.com/?q=1139+Mahatma+Gandhi+St..."
              helperText="Used for the map embed and Open in Google Maps. Leave blank to auto-generate from the address above."
            />
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

const TABS = ["Site mode", "Homepage", "Banners", "Announcements", "Reviews", "Bank details", "Social & Contact"];

export default function CmsPage() {
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { reset } = useCms();
  const [tab, setTab] = useState(0);

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      <AdminPageHeader
        eyebrow="Content"
        title="CMS"
        subtitle="Homepage, banners, announcements, and contact info. Edit on the left — preview updates on the right."
        action={(
          <Button variant="outlined" color="inherit" onClick={reset} sx={{ borderColor: surfaceBorderColor, fontSize: "0.78rem" }}>
            Reset to defaults
          </Button>
        )}
      />

      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 6 }} order={{ xs: 1, lg: 1 }}>
          <Stack spacing={ADMIN_PAGE_SPACING}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: "1px solid",
                borderColor: surfaceBorderColor,
              }}
            >
              {TABS.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
            {tab === 0 ? <SiteModeTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
            {tab === 1 ? <HomepageTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
            {tab === 2 ? <BannersTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
            {tab === 3 ? <AnnouncementsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
            {tab === 4 ? <TestimonialsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
            {tab === 5 ? <BankDetailsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
            {tab === 6 ? <SocialContactTab panelSx={panelSx} /> : null}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }} order={{ xs: 2, lg: 2 }} sx={{ display: "flex", minHeight: 0 }}>
          <Box sx={{ position: { lg: "sticky" }, top: { lg: 16 }, alignSelf: "flex-start", width: "100%", maxHeight: { lg: "calc(100dvh - 80px)" }, display: "flex", flexDirection: "column", flex: 1 }}>
            <CmsPreviewMockup panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} activeTab={tab} />
          </Box>
        </Grid>
      </Grid>
    </Stack>
  );
}
