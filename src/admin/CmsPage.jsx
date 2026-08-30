import { useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  OutlinedInput,
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
import { FacebookIcon, InstagramIcon, TiktokIcon, SparkleIcon, BoxIcon, EditIcon, TrashIcon, SearchIcon } from "../components/icons.jsx";
import { OFF_WHITE } from "../lib/colors.js";
import { useCms } from "../lib/cmsContent.jsx";
import { useFirebaseData } from "../lib/firebase/config.js";
import { uploadCmsAsset } from "../lib/firebase/repositories/uploads.js";
import { compressProductImageFile } from "../lib/imageCompression.js";
import { UPLOAD_SIZE_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
import { PREVIEW_STOREFRONT_URL } from "../lib/siteAccess.js";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useAccordionExpanded } from "../lib/mobileUi.js";
import CmsPreviewMockup from "../components/CmsPreviewMockup.jsx";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import AdminSectionTitle from "../components/AdminSectionTitle.jsx";
import AdminColorPicker from "../components/AdminColorPicker.jsx";
import InventoryProductThumb from "../components/InventoryProductThumb.jsx";
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

function BankAssetUpload({
  label,
  value,
  onChange,
  surfaceBorderColor,
  kind,
  aspectRatio = "1 / 1",
  minHeight = 112,
  boxHeight,
  boxWidth,
  helperText,
  hideLabel = false,
}) {
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
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const preserveTransparency =
        kind === "bank-logo" || kind === "bir-seal" || kind === "bir-seal-mark" || file.type === "image/png";
      const url = firebaseEnabled
        ? await uploadCmsAsset(file, kind)
        : await readAsDataUrl(await compressProductImageFile(file, { preserveTransparency }));
      onChange(url);
    } catch (uploadError) {
      console.error("[cms] Asset upload failed:", uploadError);
      setError("Could not upload the image. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const showLabel = Boolean(label) && !hideLabel;
  const showHelper = Boolean(helperText?.trim());
  const uploadLabel = label || "image";

  return (
    <Stack spacing={showLabel || showHelper ? 0.75 : 0} sx={{ minWidth: 0, height: boxHeight ? "100%" : "auto" }}>
      {showLabel ? (
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
      ) : null}
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
        aria-label={value ? undefined : `Upload ${uploadLabel}`}
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
          boxSizing: "border-box",
          ...(boxHeight
            ? {
                aspectRatio: "unset",
                height: "100%",
                minHeight: boxHeight,
                maxHeight: boxHeight,
                width: boxWidth || "100%",
                maxWidth: boxWidth || "none",
                flex: "1 1 auto",
              }
            : {
                aspectRatio,
                minHeight,
              }),
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
                "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.22), color: "error.light" },
              }}
            >
              <TrashIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
        ) : null}
      </Box>
      {error ? (
        <Typography sx={{ fontSize: "0.72rem", color: "error.main" }}>{error}</Typography>
      ) : showHelper ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {helperText}
        </Typography>
      ) : helperText === undefined ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {UPLOAD_SIZE_DISCLAIMER}
        </Typography>
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

function CmsAccordionChevron(props) {
  return (
    <Box
      component="span"
      {...props}
      sx={{
        width: 28,
        height: 28,
        borderRadius: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "text.secondary",
        border: "1px solid",
        borderColor: "divider",
        fontSize: "0.75rem",
        lineHeight: 1,
        transition: "transform 180ms ease, color 180ms ease, border-color 180ms ease",
        ".Mui-expanded &": {
          color: "primary.main",
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.45),
          transform: "rotate(180deg)",
        },
      }}
    >
      ▾
    </Box>
  );
}

function CmsSectionAccordion({
  id,
  title,
  summary,
  expanded,
  onChange,
  panelSx,
  surfaceBorderColor,
  action,
  children,
}) {
  const open = expanded === id;

  return (
    <Accordion
      disableGutters
      elevation={0}
      expanded={open}
      onChange={onChange(id)}
      sx={{
        ...panelSx,
        overflow: "hidden",
        "&::before": { display: "none" },
        "&.Mui-expanded": {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
        },
      }}
    >
      <AccordionSummary
        expandIcon={<CmsAccordionChevron />}
        sx={{
          px: { xs: 2, md: 2.5 },
          py: 0.5,
          minHeight: 64,
          gap: 1.5,
          "& .MuiAccordionSummary-content": {
            my: 1.25,
            alignItems: "center",
            gap: 1.5,
            overflow: "hidden",
          },
          "& .MuiAccordionSummary-expandIconWrapper": {
            transform: "none",
            "&.Mui-expanded": { transform: "none" },
          },
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.3 }}>
            {title}
          </Typography>
          {summary ? (
            <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mt: 0.35, lineHeight: 1.4 }}>
              {summary}
            </Typography>
          ) : null}
        </Box>
        {action ? (
          <Box
            onClick={(event) => event.stopPropagation()}
            onFocus={(event) => event.stopPropagation()}
            sx={{ flexShrink: 0 }}
          >
            {action}
          </Box>
        ) : null}
      </AccordionSummary>
      <AccordionDetails
        sx={{
          px: { xs: 2, md: 2.5 },
          pt: 0,
          pb: { xs: 2.5, md: 3 },
          borderTop: "1px solid",
          borderColor: surfaceBorderColor,
        }}
      >
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

/** Save control shown at the bottom of each CMS tab. */
function CmsTabSaveBar({ surfaceBorderColor }) {
  const { dirty, saving, saveError, saveOk, saveContent, hydrated, discardChanges } = useCms();

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        px: 1.75,
        py: 1.25,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.02),
      }}
    >
      <Typography
        sx={{
          color: saveError ? "error.main" : dirty ? "warning.main" : saveOk ? "success.main" : "text.secondary",
          fontSize: "0.78rem",
          fontWeight: dirty || saveError || saveOk ? 600 : 500,
          lineHeight: 1.4,
        }}
      >
        {saveError
          ? saveError
          : dirty
            ? "Unsaved changes"
            : saveOk
              ? "Saved"
              : "Edits stay local until you save"}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          color="inherit"
          disabled={saving || !dirty}
          onClick={discardChanges}
          sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!hydrated || !dirty || saving}
          onClick={() => saveContent()}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </Stack>
    </Box>
  );
}

function PerkIconPicker({ pickerId, value, accent, onChange, surfaceBorderColor, ariaLabel }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const optionRefs = useRef([]);
  const fieldRef = useRef(null);
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

  function handleOpen() {
    setAnchorEl(fieldRef.current);
    window.setTimeout(() => focusOption(selectedIndex), 0);
  }

  return (
    <FormControl size="small" variant="outlined" sx={{ width: 104, flexShrink: 0 }} ref={fieldRef}>
      <InputLabel id={`${pickerId}-label`} shrink>
        Icon
      </InputLabel>
      <OutlinedInput
        notched
        label="Icon"
        readOnly
        value=""
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleOpen();
          }
        }}
        inputProps={{
          "aria-labelledby": `${pickerId}-label`,
          "aria-label": `${ariaLabel}. Current icon: ${selectedOption.label}`,
          "aria-haspopup": "dialog",
          "aria-expanded": open ? "true" : undefined,
          "aria-controls": open ? popoverId : undefined,
          style: { cursor: "pointer", padding: 0, width: 0, minWidth: 0 },
        }}
        startAdornment={
          <InputAdornment position="start" sx={{ m: 0, mr: 0, width: "100%", maxWidth: "100%", justifyContent: "center" }}>
            <SelectedIcon sx={{ fontSize: 22, color: accent }} />
          </InputAdornment>
        }
        sx={{
          cursor: "pointer",
          height: 40,
          pr: 0,
          pl: 0,
          bgcolor: alpha("#fff", 0.03),
          "& .MuiOutlinedInput-input": { p: 0, width: 0, minWidth: 0 },
          "& .MuiInputAdornment-root": { width: "100%", maxWidth: "100%", ml: 0, mr: 0 },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(theme.palette.primary.main, 0.8),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
            borderWidth: 1,
          },
        }}
      />
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
    </FormControl>
  );
}

function SiteModeTab({ panelSx, surfaceBorderColor }) {
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
            helperText="Heading above social icons on the landing page. Links come from Business Info."
          />
        </Stack>
      </Box>

      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader title="Checkout security" />
        <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 2.5, lineHeight: 1.55 }}>
          Guest checkout can show Google reCAPTCHA when site keys are configured. Turn this off for local testing
          or if captcha is blocking real customers. Signed-in members never see captcha.
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Switch
            checked={storefront.guestCaptchaEnabled !== false}
            onChange={(e) => setStorefront({ guestCaptchaEnabled: e.target.checked })}
            color="primary"
          />
          <Box>
            <Typography sx={CMS_SWITCH_LABEL_SX}>
              {storefront.guestCaptchaEnabled !== false
                ? "Guest reCAPTCHA required"
                : "Guest reCAPTCHA off"}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader title="Checkout reservation" />
        <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mb: 2.5, lineHeight: 1.55 }}>
          How long stock stays reserved after a shopper reaches payment. The countdown appears on
          the storefront for products with “Show checkout timer” enabled. Default is 20 minutes.
        </Typography>
        <TextField
          label="Checkout timer (minutes)"
          type="number"
          inputProps={{ min: 1, max: 180, step: 1 }}
          value={storefront.checkoutHoldMinutes ?? 20}
          onChange={(e) => {
            const raw = e.target.value;
            setStorefront({ checkoutHoldMinutes: raw === "" ? 20 : Number(raw) });
          }}
          helperText="Applies to sealed and pre-order items. Range 1–180 minutes."
          sx={{ maxWidth: 280 }}
        />
      </Box>

      <CmsTabSaveBar surfaceBorderColor={surfaceBorderColor} />
    </Stack>
  );
}

function FeatureDropProductPicker({ value, options, onChange, surfaceBorderColor }) {
  const theme = useTheme();
  const selected = options.find((product) => product.id === value) ?? null;
  const isDark = theme.palette.mode === "dark";

  return (
    <Autocomplete
      fullWidth
      size="small"
      options={options}
      value={selected}
      onChange={(_, next) => onChange(next?.id || "")}
      getOptionLabel={(option) => option?.name || ""}
      isOptionEqualToValue={(option, current) => option.id === current.id}
      filterOptions={(items, state) => {
        const query = state.inputValue.trim().toLowerCase();
        if (!query) return items;
        return items.filter((product) => {
          const haystack = `${product.name} ${product.line || ""} ${product.tag || ""}`.toLowerCase();
          return haystack.includes(query);
        });
      }}
      noOptionsText="No products match your search"
      clearOnBlur={false}
      slotProps={{
        paper: {
          sx: {
            mt: 0.75,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.35),
            bgcolor: isDark ? alpha(theme.palette.background.paper, 0.98) : theme.palette.background.paper,
            backgroundImage: "none",
            boxShadow: isDark
              ? `0 18px 48px ${alpha("#000", 0.55)}, 0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`
              : `0 16px 40px ${alpha(theme.palette.primary.main, 0.12)}`,
            overflow: "hidden",
            "& .MuiAutocomplete-listbox": {
              py: 0.75,
              maxHeight: 320,
            },
          },
        },
      }}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <Box
            component="li"
            key={key}
            {...optionProps}
            sx={{
              display: "flex !important",
              alignItems: "center",
              gap: 1.25,
              px: "12px !important",
              py: "10px !important",
              borderRadius: 1,
              mx: 0.75,
              my: 0.2,
              "&.Mui-focused": {
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.1),
              },
              '&[aria-selected="true"]': {
                bgcolor: alpha(theme.palette.primary.main, isDark ? 0.22 : 0.14),
              },
            }}
          >
            <InventoryProductThumb row={option} size={40} isDarkMode={isDark} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.84rem", lineHeight: 1.3 }}>
                {option.name}
              </Typography>
              <Typography
                sx={{
                  mt: 0.2,
                  fontFamily: MONO_FONT,
                  fontSize: "0.68rem",
                  color: "text.secondary",
                  letterSpacing: 0.2,
                }}
              >
                {PESO.format(option.price)} · {option.line || option.tag || "Product"}
              </Typography>
            </Box>
            {option.tag ? (
              <Chip
                label={option.tag}
                size="small"
                variant="outlined"
                color={option.tag === "Pre-order" ? "secondary" : "default"}
                sx={{ fontSize: "0.65rem", height: 22, flexShrink: 0 }}
              />
            ) : null}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Product"
          placeholder="Search products…"
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <>
                <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                  {selected ? (
                    <InventoryProductThumb row={selected} size={28} isDarkMode={isDark} />
                  ) : (
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  )}
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
      sx={{
        "& .MuiOutlinedInput-root": {
          pr: "9px !important",
          bgcolor: alpha(theme.palette.text.primary, isDark ? 0.03 : 0.015),
          transition: "border-color 160ms ease, box-shadow 160ms ease",
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}`,
          },
          "& fieldset": {
            borderColor: surfaceBorderColor,
          },
        },
      }}
    />
  );
}

function HomepageTab({ panelSx, surfaceBorderColor }) {
  const { content, setHero, setHomepageSection, addFeatureDrop, updateFeatureDrop, removeFeatureDrop, setPerks, addPerk, updatePerk, removePerk } = useCms();
  const { catalogProducts } = useInventory();
  const hero = content.hero;
  const sections = content.homepageSections;
  const perks = content.perks ?? { enabled: true, overline: "", title: "", items: [] };
  const theme = useTheme();
  const [expanded, setExpanded] = useAccordionExpanded("hero");

  const handleAccordionChange = (panel) => (_event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const activeDrops = content.featureDrops.filter((drop) => drop.active).length;
  const activePerks = (perks.items || []).filter((perk) => perk.active !== false).length;

  return (
    <Stack spacing={1.5}>
      <CmsSectionAccordion
        id="hero"
        title="Hero section"
        summary="Tagline, headline, subtitle, and primary CTA"
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <TextField label="Tagline" fullWidth value={hero.tagline} onChange={(e) => setHero({ tagline: e.target.value })} />
          <TextField label="Headline" fullWidth value={hero.headline} onChange={(e) => setHero({ headline: e.target.value })} />
          <TextField label="Subtitle" fullWidth multiline minRows={3} value={hero.subtitle} onChange={(e) => setHero({ subtitle: e.target.value })} />
          <TextField label="Primary button label" fullWidth value={hero.cta} onChange={(e) => setHero({ cta: e.target.value })} />
        </Stack>
      </CmsSectionAccordion>

      <CmsSectionAccordion
        id="products"
        title="Featured products section"
        summary={sections.products?.title || "Homepage products copy"}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <TextField label="Overline" fullWidth value={sections.products.overline} onChange={(e) => setHomepageSection("products", { overline: e.target.value })} />
          <TextField label="Title" fullWidth value={sections.products.title} onChange={(e) => setHomepageSection("products", { title: e.target.value })} />
          <TextField label="Subtitle" fullWidth multiline minRows={2} value={sections.products.subtitle} onChange={(e) => setHomepageSection("products", { subtitle: e.target.value })} />
        </Stack>
      </CmsSectionAccordion>

      <CmsSectionAccordion
        id="preorders"
        title="Featured pre-orders section"
        summary={sections.preorders?.title || "Homepage pre-orders copy"}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <TextField label="Overline" fullWidth value={sections.preorders.overline} onChange={(e) => setHomepageSection("preorders", { overline: e.target.value })} />
          <TextField label="Title" fullWidth value={sections.preorders.title} onChange={(e) => setHomepageSection("preorders", { title: e.target.value })} />
          <TextField label="Subtitle" fullWidth multiline minRows={2} value={sections.preorders.subtitle} onChange={(e) => setHomepageSection("preorders", { subtitle: e.target.value })} />
        </Stack>
      </CmsSectionAccordion>

      <CmsSectionAccordion
        id="featureDrops"
        title="Feature drops"
        summary={`${content.featureDrops.length} drop${content.featureDrops.length === 1 ? "" : "s"} · ${activeDrops} active`}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
        action={(
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => addFeatureDrop({})}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.68rem" }}
          >
            + Add drop
          </Button>
        )}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            Active drops rotate in the hero card on the homepage. Pick a product and customize the badge labels.
          </Typography>
          <Grid container spacing={2}>
            {content.featureDrops.map((drop) => {
              const product = catalogProducts.find((p) => p.id === drop.productId);
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
                      <FeatureDropProductPicker
                        value={drop.productId}
                        options={catalogProducts}
                        onChange={(productId) => updateFeatureDrop(drop.id, { productId })}
                        surfaceBorderColor={surfaceBorderColor}
                      />
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
                            color="error"
                            aria-label="Delete featured drop"
                            onClick={() => removeFeatureDrop(drop.id)}
                            sx={{
                              border: "1px solid",
                              borderColor: surfaceBorderColor,
                              "&:hover": {
                                borderColor: "error.main",
                                bgcolor: (t) => alpha(t.palette.error.main, 0.1),
                              },
                            }}
                          >
                            <TrashIcon sx={{ fontSize: 18 }} />
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
        </Stack>
      </CmsSectionAccordion>

      <CmsSectionAccordion
        id="perks"
        title="Why Hobby Arena"
        summary={`${(perks.items || []).length} box${(perks.items || []).length === 1 ? "" : "es"} · ${activePerks} active · ${perks.enabled !== false ? "visible" : "hidden"}`}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
        action={(
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => addPerk({})}
            disabled={(perks.items?.length ?? 0) >= 6}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.68rem" }}
          >
            + Add box
          </Button>
        )}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            Active boxes shown on the homepage (1–6). Pick an icon, color, title, and description for each.
          </Typography>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Switch
              checked={perks.enabled !== false}
              onChange={(e) => setPerks({ enabled: e.target.checked })}
              color="primary"
            />
            <Typography sx={CMS_SWITCH_LABEL_SX}>{perks.enabled !== false ? "Visible on homepage" : "Hidden on homepage"}</Typography>
          </Stack>
          <Stack spacing={2}>
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
                    <Stack spacing={2} sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
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
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Switch
                            checked={perk.active !== false}
                            onChange={(e) => updatePerk(perk.id, { active: e.target.checked })}
                            color="primary"
                          />
                          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Active</Typography>
                          <IconButton
                            size="small"
                            aria-label={`Delete ${perk.title || "perk"}`}
                            onClick={() => removePerk(perk.id)}
                            sx={{
                              width: 32,
                              height: 32,
                              p: 0,
                              borderRadius: "50%",
                              color: "error.main",
                              border: "1px solid",
                              borderColor: surfaceBorderColor,
                              "&:hover": {
                                borderColor: "error.main",
                                bgcolor: (t) => alpha(t.palette.error.main, 0.1),
                              },
                            }}
                          >
                            <TrashIcon sx={{ fontSize: 18 }} />
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
        </Stack>
      </CmsSectionAccordion>

      <CmsTabSaveBar surfaceBorderColor={surfaceBorderColor} />
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
            <IconButton
            size="small"
            color="error"
            aria-label="Delete banner"
            onClick={() => removeBanner(banner.id)}
            sx={{
              border: "1px solid",
              borderColor: surfaceBorderColor,
              "&:hover": {
                borderColor: "error.main",
                bgcolor: (t) => alpha(t.palette.error.main, 0.1),
              },
            }}
          >
            <TrashIcon sx={{ fontSize: 18 }} />
          </IconButton>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

function BannersTab({ panelSx, surfaceBorderColor }) {
  const {
    content,
    addBanner,
    updateBanner,
    removeBanner,
    addMarqueeBanner,
    updateMarqueeBanner,
    removeMarqueeBanner,
  } = useCms();
  const firebaseEnabled = useFirebaseData();
  const marqueeInputRef = useRef(null);
  const [uploadingMarquee, setUploadingMarquee] = useState(false);
  const [marqueeError, setMarqueeError] = useState("");
  const [expanded, setExpanded] = useAccordionExpanded("marquee");

  const marqueeBanners = content.marqueeBanners || [];
  const activeMarquee = marqueeBanners.filter((banner) => banner.active !== false).length;
  const activePromo = content.banners.filter((banner) => banner.active).length;

  const handleAccordionChange = (panel) => (_event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  async function handleMarqueeUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMarqueeError("");
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setMarqueeError(sizeError);
      return;
    }
    setUploadingMarquee(true);
    try {
      let imageUrl;
      if (firebaseEnabled) {
        imageUrl = await uploadCmsAsset(file, "marquee");
      } else {
        imageUrl = await readAsDataUrl(file);
      }
      addMarqueeBanner({ imageUrl, active: true });
    } catch (err) {
      setMarqueeError(err.message || "Could not upload image.");
    } finally {
      setUploadingMarquee(false);
    }
  }

  return (
    <Stack spacing={1.5}>
      <input ref={marqueeInputRef} type="file" accept="image/*" hidden onChange={handleMarqueeUpload} />

      <CmsSectionAccordion
        id="marquee"
        title="Moving logo banners"
        summary={`${marqueeBanners.length} image${marqueeBanners.length === 1 ? "" : "s"} · ${activeMarquee} active`}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
        action={(
          <Button
            size="small"
            variant="contained"
            color="primary"
            disabled={uploadingMarquee}
            onClick={() => marqueeInputRef.current?.click()}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.68rem" }}
          >
            {uploadingMarquee ? "Uploading…" : "+ Add image"}
          </Button>
        )}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            Images that scroll under the announcement bar on the homepage. {UPLOAD_SIZE_DISCLAIMER}
          </Typography>
          {marqueeError ? (
            <Typography color="error" sx={{ fontSize: "0.82rem" }}>{marqueeError}</Typography>
          ) : null}
          {marqueeBanners.length === 0 ? (
            <Box sx={{ ...panelSx, p: 4, textAlign: "center", color: "text.secondary" }}>
              No marquee images yet. Add logos or promo art to scroll on the homepage.
            </Box>
          ) : (
            <Grid container spacing={2}>
              {marqueeBanners.map((banner) => (
                <Grid size={{ xs: 12, sm: 6 }} key={banner.id}>
                  <Box sx={{ ...panelSx, p: 1.5, opacity: banner.active !== false ? 1 : 0.55 }}>
                    <Box
                      component="img"
                      src={banner.imageUrl}
                      alt="Marquee banner"
                      sx={{ width: "100%", height: 96, objectFit: "cover", borderRadius: 1, display: "block", mb: 1 }}
                    />
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Switch
                          checked={banner.active !== false}
                          onChange={(e) => updateMarqueeBanner(banner.id, { active: e.target.checked })}
                          color="primary"
                        />
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {banner.active !== false ? "Active" : "Hidden"}
                        </Typography>
                      </Stack>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Delete marquee image"
                        onClick={() => removeMarqueeBanner(banner.id)}
                        sx={{
                          border: "1px solid",
                          borderColor: surfaceBorderColor,
                          "&:hover": {
                            borderColor: "error.main",
                            bgcolor: (t) => alpha(t.palette.error.main, 0.1),
                          },
                        }}
                      >
                        <TrashIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </CmsSectionAccordion>

      <CmsSectionAccordion
        id="promo"
        title="Promo banners"
        summary={`${content.banners.length} banner${content.banners.length === 1 ? "" : "s"} · ${activePromo} active`}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
        action={(
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => addBanner({ title: "New banner", subtitle: "Describe this promo." })}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.68rem" }}
          >
            + Add banner
          </Button>
        )}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            Promo cards on the homepage between the hero and product sections.
          </Typography>
          {content.banners.length === 0 ? (
            <Box sx={{ ...panelSx, p: 4, textAlign: "center", color: "text.secondary" }}>
              No banners yet. Add one to show a promo on the homepage.
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              {content.banners.map((banner) => (
                <Grid size={{ xs: 12, md: 6 }} key={banner.id}>
                  <BannerCard
                    banner={banner}
                    panelSx={panelSx}
                    surfaceBorderColor={surfaceBorderColor}
                    updateBanner={updateBanner}
                    removeBanner={removeBanner}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </CmsSectionAccordion>

      <CmsTabSaveBar surfaceBorderColor={surfaceBorderColor} />
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
    <Stack spacing={2.5}>
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
              <IconButton
                size="small"
                color="error"
                aria-label="Delete announcement"
                onClick={() => removeAnnouncement(item.id)}
                sx={{
                  border: "1px solid",
                  borderColor: surfaceBorderColor,
                  "&:hover": {
                    borderColor: "error.main",
                    bgcolor: (t) => alpha(t.palette.error.main, 0.1),
                  },
                }}
              >
                <TrashIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          ))}
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2.5 }}>
          <TextField fullWidth size="small" placeholder="New announcement…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <Button variant="contained" color="primary" onClick={add} sx={{ whiteSpace: "nowrap", fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>+ Add</Button>
        </Stack>
      </Box>
      <CmsTabSaveBar surfaceBorderColor={surfaceBorderColor} />
    </Stack>
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
                <IconButton
                  size="small"
                  color="error"
                  aria-label="Delete testimonial"
                  onClick={() => removeTestimonial(item.id)}
                  sx={{
                    border: "1px solid",
                    borderColor: surfaceBorderColor,
                    "&:hover": {
                      borderColor: "error.main",
                      bgcolor: (t) => alpha(t.palette.error.main, 0.1),
                    },
                  }}
                >
                  <TrashIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
      <CmsTabSaveBar surfaceBorderColor={surfaceBorderColor} />
    </Stack>
  );
}

function BankDetailsTab({ panelSx, surfaceBorderColor }) {
  const { content, setBankDetails, updateBankAccount, addBankAccount, removeBankAccount } = useCms();
  const bank = content.bankDetails;
  const [expanded, setExpanded] = useAccordionExpanded("section");
  const activeAccounts = bank.accounts.filter((account) => account.active !== false).length;

  const handleAccordionChange = (panel) => (_event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Stack spacing={1.5}>
      <CmsSectionAccordion
        id="section"
        title="Bank details section"
        summary={bank.enabled ? (bank.title || "Shown on homepage") : "Hidden on homepage"}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Switch checked={bank.enabled} onChange={(e) => setBankDetails({ enabled: e.target.checked })} color="primary" />
            <Typography sx={CMS_SWITCH_LABEL_SX}>{bank.enabled ? "Shown on homepage" : "Hidden"}</Typography>
          </Stack>
          <TextField label="Section title" fullWidth value={bank.title} onChange={(e) => setBankDetails({ title: e.target.value })} />
          <TextField label="Section subtitle" fullWidth multiline minRows={2} value={bank.subtitle} onChange={(e) => setBankDetails({ subtitle: e.target.value })} />
        </Stack>
      </CmsSectionAccordion>

      <CmsSectionAccordion
        id="accounts"
        title="Bank accounts"
        summary={`${bank.accounts.length} account${bank.accounts.length === 1 ? "" : "s"} · ${activeAccounts} active`}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
        action={(
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => addBankAccount({ label: "New account", accountName: "", accountNumber: "", note: "" })}
            sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.68rem" }}
          >
            + Add account
          </Button>
        )}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem" }}>
            Active accounts appear on the homepage bank section and at checkout.
          </Typography>
          {bank.accounts.length === 0 ? (
            <Box sx={{ ...panelSx, p: 4, textAlign: "center", color: "text.secondary" }}>
              No accounts yet. Add one to show payment details on the storefront.
            </Box>
          ) : (
            <Grid container spacing={2}>
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
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeBankAccount(account.id)}
                          aria-label="Delete account"
                          sx={{
                            border: "1px solid",
                            borderColor: surfaceBorderColor,
                            "&:hover": {
                              borderColor: "error.main",
                              bgcolor: (t) => alpha(t.palette.error.main, 0.1),
                            },
                          }}
                        >
                          <TrashIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </CmsSectionAccordion>

      <CmsTabSaveBar surfaceBorderColor={surfaceBorderColor} />
    </Stack>
  );
}

function SocialContactTab({ panelSx, surfaceBorderColor }) {
  const { content, setSocial, setContact, setBankDetails } = useCms();
  const social = content.social;
  const contact = content.contact;
  const bank = content.bankDetails;
  const [expanded, setExpanded] = useAccordionExpanded("social");

  const handleAccordionChange = (panel) => (_event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const linkedSocial = [social.instagram, social.facebook, social.tiktok].filter(Boolean).length;

  return (
    <Stack spacing={1.5}>
      <CmsSectionAccordion
        id="social"
        title="Social media links"
        summary={`${linkedSocial} link${linkedSocial === 1 ? "" : "s"} set · Instagram, Facebook, TikTok`}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <TextField label="Instagram URL" fullWidth value={social.instagram} onChange={(e) => setSocial({ instagram: e.target.value })} InputProps={{ startAdornment: (<InputAdornment position="start"><InstagramIcon sx={{ fontSize: 18 }} /></InputAdornment>) }} />
          <TextField label="Facebook URL" fullWidth value={social.facebook} onChange={(e) => setSocial({ facebook: e.target.value })} InputProps={{ startAdornment: (<InputAdornment position="start"><FacebookIcon sx={{ fontSize: 18 }} /></InputAdornment>) }} />
          <TextField label="TikTok URL (optional)" fullWidth value={social.tiktok} onChange={(e) => setSocial({ tiktok: e.target.value })} InputProps={{ startAdornment: (<InputAdornment position="start"><TiktokIcon sx={{ fontSize: 18 }} /></InputAdornment>) }} helperText="Leave blank to hide TikTok from the footer." />
        </Stack>
      </CmsSectionAccordion>

      <CmsSectionAccordion
        id="contact"
        title="Contact & business info"
        summary={contact.legalName || contact.email || "Business name, address, hours, footer"}
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
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
      </CmsSectionAccordion>

      <CmsSectionAccordion
        id="bir"
        title="BIR registered badge"
        summary={
          !bank.showBirSeal
            ? "Hidden on storefront"
            : [
                bank.birSealMarkImage ? "Footer" : null,
                bank.birQrImage ? "Payment section" : null,
              ].filter(Boolean).join(" · ") || "Enabled · no images yet"
        }
        expanded={expanded}
        onChange={handleAccordionChange}
        panelSx={panelSx}
        surfaceBorderColor={surfaceBorderColor}
      >
        <Stack spacing={2} sx={{ pt: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Switch
              checked={bank.showBirSeal === true}
              onChange={(e) => setBankDetails({ showBirSeal: e.target.checked })}
              color="primary"
            />
            <Typography sx={CMS_SWITCH_LABEL_SX}>
              {bank.showBirSeal ? "Shown on storefront" : "Hidden"}
            </Typography>
          </Stack>
          <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", lineHeight: 1.5 }}>
            Payment-section layout (beside headline, under copy, or below logos) is switched in{" "}
            <strong>Admin → Design → BIR badge in payment section</strong>.
          </Typography>

          <TextField
            label="BIR seal note (tooltip)"
            fullWidth
            value={bank.birSealNote}
            onChange={(e) => setBankDetails({ birSealNote: e.target.value })}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "flex-start" }}>
            <Stack spacing={0.75} sx={{ width: 112, flexShrink: 0 }}>
              <Typography
                sx={{
                  fontFamily: MONO_FONT,
                  fontSize: "0.65rem",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                BIR Seal
              </Typography>
              <Box sx={{ width: 112, height: 112 }}>
                <BankAssetUpload
                  label="BIR Seal"
                  kind="bir-seal-mark"
                  boxHeight={112}
                  boxWidth={112}
                  value={bank.birSealMarkImage ?? ""}
                  surfaceBorderColor={surfaceBorderColor}
                  onChange={(url) => setBankDetails({ birSealMarkImage: url })}
                  helperText=""
                  hideLabel
                />
              </Box>
            </Stack>
            <Stack spacing={0.75} sx={{ width: "100%", maxWidth: 280 }}>
              <Typography
                sx={{
                  fontFamily: MONO_FONT,
                  fontSize: "0.65rem",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                Full BIR badge
              </Typography>
              <Box sx={{ width: "100%", height: 112 }}>
                <BankAssetUpload
                  label="Full BIR badge"
                  kind="bir-seal"
                  boxHeight={112}
                  value={bank.birQrImage ?? ""}
                  surfaceBorderColor={surfaceBorderColor}
                  onChange={(url) => setBankDetails({ birQrImage: url })}
                  helperText=""
                  hideLabel
                />
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </CmsSectionAccordion>

      <CmsTabSaveBar surfaceBorderColor={surfaceBorderColor} />
    </Stack>
  );
}

const TABS = ["Site mode", "Homepage", "Banners", "Announcements", "Reviews", "Bank details", "Business Info"];

export default function CmsPage() {
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const [tab, setTab] = useState(0);

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      <AdminPageHeader
        eyebrow="Content"
        title="CMS"
        subtitle="Homepage, banners, announcements, and contact info. Edit on the left — preview updates on the right. Save within each tab to publish."
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
            {tab === 6 ? <SocialContactTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} /> : null}
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
