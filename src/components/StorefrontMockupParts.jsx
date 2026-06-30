import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT, getBrand } from "../theme.js";
import { announcementBarColors, getSurfaces, productMediaSurface } from "../lib/surfaces.js";
import { OFF_WHITE } from "../lib/colors.js";
import { MOCK_LINE_FILTERS, MOCK_TYPE_TABS } from "../data/shopFilterLayout.js";
import BrandLogo from "./BrandLogo.jsx";
import { CardIcon } from "./icons.jsx";

export function truncate(text, max = 42) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function MockCountdown({ variant, primary, compact = true }) {
  if (variant === "segments") {
    return (
      <Box sx={{ px: compact ? 0.75 : 1, py: compact ? 0.5 : 0.65, borderRadius: 1, bgcolor: alpha(primary, 0.1), border: "1px solid", borderColor: alpha(primary, 0.3) }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", fontWeight: 800, letterSpacing: 0.8, color: primary, mb: 0.35 }}>
          PRE-ORDER CLOSES IN
        </Typography>
        <Stack direction="row" spacing={0.4} justifyContent="center">
          {[
            { v: "12", l: "days" },
            { v: "05", l: "hrs" },
            { v: "41", l: "min" },
            { v: "22", l: "sec" },
          ].map((part) => (
            <Box key={part.l} sx={{ textAlign: "center", minWidth: 22 }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.58rem", lineHeight: 1 }}>{part.v}</Typography>
              <Typography sx={{ fontSize: "0.42rem", color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>{part.l}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }

  if (variant === "chip") {
    return (
      <Chip
        size="small"
        label="12d left"
        sx={{
          height: 20,
          fontFamily: MONO_FONT,
          fontSize: "0.55rem",
          fontWeight: 800,
          bgcolor: alpha(primary, 0.14),
          color: primary,
          border: "1px solid",
          borderColor: alpha(primary, 0.35),
        }}
      />
    );
  }

  return (
    <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: compact ? "0.62rem" : "0.68rem", letterSpacing: 0.4, color: primary }}>
      12d 05:41:22
    </Typography>
  );
}

export function MockPricing({ variant, primary, secondary, compact = true }) {
  const deposit = "₱5,400";
  const balance = "₱12,600";

  if (variant === "split") {
    return (
      <Grid container spacing={0.5}>
        <Grid size={6}>
          <Box sx={{ p: 0.55, borderRadius: 1, bgcolor: alpha(primary, 0.12), border: "1px solid", borderColor: alpha(primary, 0.3) }}>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.45rem", fontWeight: 800, color: primary }}>30% NOW</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: compact ? "0.68rem" : "0.72rem" }}>{deposit}</Typography>
          </Box>
        </Grid>
        <Grid size={6}>
          <Box sx={{ p: 0.55, borderRadius: 1, bgcolor: alpha(secondary, 0.1), border: "1px solid", borderColor: alpha(secondary, 0.28) }}>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.45rem", fontWeight: 800, color: secondary }}>70% LATER</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: compact ? "0.68rem" : "0.72rem" }}>{balance}</Typography>
          </Box>
        </Grid>
      </Grid>
    );
  }

  if (variant === "inline") {
    return (
      <Typography sx={{ fontSize: "0.58rem", fontFamily: MONO_FONT, fontWeight: 700 }}>
        <Box component="span" sx={{ color: primary }}>30% {deposit}</Box>
        {" · "}
        <Box component="span" sx={{ color: "text.secondary" }}>70% {balance}</Box>
      </Typography>
    );
  }

  if (variant === "badges") {
    return (
      <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap>
        <Chip label={`30% · ${deposit}`} size="small" sx={{ height: 20, fontSize: "0.52rem", fontWeight: 800, bgcolor: alpha(primary, 0.14), color: primary }} />
        <Chip label={`70% · ${balance}`} size="small" sx={{ height: 20, fontSize: "0.52rem", fontWeight: 800, bgcolor: alpha(secondary, 0.12), color: secondary }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={0.15}>
      <Typography sx={{ fontWeight: 900, fontSize: compact ? "0.88rem" : "0.95rem", color: primary, lineHeight: 1.1 }}>{deposit}</Typography>
      <Typography sx={{ fontSize: "0.52rem", color: "text.secondary" }}>70% balance ({balance}) due before release</Typography>
    </Stack>
  );
}

export function MockProductCard({
  panelSx,
  isDarkMode,
  isPreorder = false,
  countdownVariant,
  pricingVariant,
  name = "Booster Box",
  line = "ONE PIECE",
  price = "₱2,499",
  compact = false,
  highlight = false,
}) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const mediaSx = productMediaSurface(isDarkMode);

  return (
    <Box
      sx={{
        ...panelSx,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...(highlight && {
          borderColor: alpha(primary, 0.5),
          boxShadow: `0 0 0 1px ${alpha(primary, 0.12)} inset`,
        }),
      }}
    >
      <Box
        sx={{
          ...mediaSx,
          aspectRatio: "4 / 3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CardIcon sx={{ fontSize: compact ? 28 : 36, color: OFF_WHITE.glyph, opacity: 0.35 }} />
        <Chip
          label={isPreorder ? "Pre-order" : "Sealed"}
          size="small"
          sx={{
            position: "absolute",
            top: 6,
            left: 6,
            height: 18,
            fontSize: "0.48rem",
            fontFamily: MONO_FONT,
            letterSpacing: 0.6,
            bgcolor: "rgba(0,0,0,0.55)",
            color: OFF_WHITE.textBright,
          }}
        />
      </Box>
      <Stack spacing={compact ? 0.35 : 0.5} sx={{ p: compact ? 0.75 : 1, flex: 1 }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", color: primary, fontWeight: 700, letterSpacing: 0.8 }}>
          {line}
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: compact ? "0.62rem" : "0.68rem", lineHeight: 1.25 }}>
          {truncate(name, compact ? 28 : 36)}
        </Typography>
        {isPreorder ? (
          <>
            {countdownVariant ? <MockCountdown variant={countdownVariant} primary={primary} compact={compact} /> : null}
            {pricingVariant ? <MockPricing variant={pricingVariant} primary={primary} secondary={secondary} compact={compact} /> : null}
          </>
        ) : (
          <Typography sx={{ fontWeight: 800, fontSize: compact ? "0.72rem" : "0.82rem", color: "primary.main" }}>{price}</Typography>
        )}
        <Box
          sx={{
            mt: "auto",
            py: 0.35,
            borderRadius: 0.75,
            bgcolor: alpha(primary, 0.16),
            border: "1px solid",
            borderColor: alpha(primary, 0.35),
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", fontWeight: 800, color: primary.contrastText ?? theme.palette.text.primary }}>
            {isPreorder ? "PRE-ORDER" : "ADD TO CART"}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export function MockStorefrontNav({ layoutId, surfaceBorderColor, compact = false }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const navItems = ["Home", "Pre-Orders", "Products", "Contact"];

  const iconRow = (
    <Stack direction="row" spacing={0.35} alignItems="center">
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            width: compact ? 14 : 16,
            height: compact ? 14 : 16,
            borderRadius: "50%",
            border: "1px solid",
            borderColor: surfaceBorderColor,
            bgcolor: alpha(theme.palette.text.primary, 0.06),
          }}
        />
      ))}
    </Stack>
  );

  if (layoutId === "dock") {
    return (
      <Stack spacing={0.75} sx={{ px: 1.25, pt: 1, pb: 0.75 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <BrandLogo sx={{ height: compact ? 22 : 26, width: "auto" }} imageSx={{ height: compact ? 22 : 26 }} />
          {iconRow}
        </Stack>
        <Box
          sx={{
            mx: "auto",
            width: "88%",
            py: 0.65,
            px: 1.25,
            borderRadius: 999,
            bgcolor: alpha(theme.palette.background.paper, 0.92),
            border: "1px solid",
            borderColor: surfaceBorderColor,
            boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.18)}`,
            display: "flex",
            justifyContent: "center",
            gap: 1,
          }}
        >
          {navItems.map((item, index) => (
            <Typography
              key={item}
              sx={{
                fontSize: "0.55rem",
                fontFamily: MONO_FONT,
                fontWeight: index === 1 ? 800 : 600,
                color: index === 1 ? primary : "text.secondary",
              }}
            >
              {item}
            </Typography>
          ))}
        </Box>
      </Stack>
    );
  }

  const links =
    layoutId === "crateDrop"
      ? ["Home", "Pre-Orders ▾", "Products ▾", "Contact"]
      : layoutId === "compact"
        ? ["Home", "Shop ▾", "Contact"]
        : navItems;

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        px: 1.25,
        py: 1,
        borderBottom: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: alpha(theme.palette.background.paper, 0.85),
      }}
    >
      <BrandLogo sx={{ height: compact ? 22 : 26, width: "auto" }} imageSx={{ height: compact ? 22 : 26 }} />
      <Stack direction="row" spacing={0.85} alignItems="center">
        {links.map((item, index) => (
          <Typography
            key={item}
            sx={{
              fontSize: "0.55rem",
              fontFamily: MONO_FONT,
              fontWeight: item.includes("Pre-Orders") || item === "Shop ▾" ? 800 : 600,
              color: item.includes("Pre-Orders") || item === "Shop ▾" ? primary : "text.secondary",
            }}
          >
            {item}
          </Typography>
        ))}
      </Stack>
      {iconRow}
    </Stack>
  );
}

export function MockAnnouncementBar({ text }) {
  const theme = useTheme();
  const colors = announcementBarColors(theme);

  return (
    <Box sx={{ bgcolor: colors.bgcolor, color: colors.color, py: 0.45, px: 1, overflow: "hidden" }}>
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: "0.52rem",
          fontWeight: 700,
          letterSpacing: 0.4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {truncate(text, 64)}
      </Typography>
    </Box>
  );
}

export function MockImageMarquee() {
  const theme = useTheme();

  return (
    <Stack direction="row" spacing={0.5} sx={{ px: 1, py: 0.65, overflow: "hidden" }}>
      {[1, 2, 3].map((i) => (
        <Box
          key={i}
          sx={{
            flexShrink: 0,
            width: 72,
            height: 32,
            borderRadius: 1,
            bgcolor: alpha(theme.palette.text.primary, 0.08),
            border: "1px solid",
            borderColor: alpha(theme.palette.text.primary, 0.12),
          }}
        />
      ))}
    </Stack>
  );
}

export function MockFeatureDropCard({ panelSx, isDarkMode, drop, productName, isPreorder = false }) {
  const theme = useTheme();
  const brand = getBrand(theme);
  const primary = theme.palette.primary.main;
  const mediaSx = productMediaSurface(isDarkMode);

  return (
    <Box sx={{ ...panelSx, p: 1, overflow: "hidden" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.65 }}>
        <Stack direction="row" spacing={0.4} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: brand.liveDot, boxShadow: `0 0 6px ${brand.liveDot}` }} />
          <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.5rem", letterSpacing: 0.8 }}>
            {isPreorder ? "PRE-ORDER ▸ LIVE" : "DROP ▸ LIVE"}
          </Typography>
        </Stack>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", color: "text.secondary" }}>{drop?.tier || "ULTRA-PREMIUM"}</Typography>
      </Stack>
      <Box sx={{ ...mediaSx, aspectRatio: "16 / 11", borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", mb: 0.65 }}>
        <Chip
          label={drop?.badge || "FEATURED DROP"}
          size="small"
          sx={{
            position: "absolute",
            top: 6,
            left: 6,
            height: 18,
            fontSize: "0.45rem",
            fontFamily: MONO_FONT,
            bgcolor: "rgba(0,0,0,0.55)",
            color: OFF_WHITE.textBright,
          }}
        />
        <CardIcon sx={{ fontSize: 32, color: OFF_WHITE.glyph, opacity: 0.35 }} />
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: "0.62rem", lineHeight: 1.25 }}>{truncate(productName, 40)}</Typography>
      <Typography sx={{ fontSize: "0.52rem", color: "text.secondary", mt: 0.15 }}>Pokémon TCG</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: "0.75rem", color: primary, mt: 0.35, textAlign: "right" }}>₱18,000</Typography>
      <Stack direction="row" spacing={0.35} justifyContent="center" sx={{ mt: 0.5 }}>
        {[0, 1].map((i) => (
          <Box key={i} sx={{ width: i === 0 ? 12 : 6, height: 3, borderRadius: 999, bgcolor: i === 0 ? primary : alpha(theme.palette.text.primary, 0.15) }} />
        ))}
      </Stack>
    </Box>
  );
}

export function MockHeroCopy({ hero }) {
  const theme = useTheme();
  const brand = getBrand(theme);

  return (
    <Stack spacing={0.65}>
      <Box
        sx={{
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 0.4,
          px: 0.75,
          py: 0.25,
          borderRadius: 0.75,
          border: "1px solid",
          borderColor: alpha(theme.palette.primary.main, 0.45),
        }}
      >
        <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: brand.liveDot }} />
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", fontWeight: 800, color: "primary.main", letterSpacing: 0.8 }}>
          {truncate(hero.tagline, 24)}
        </Typography>
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", lineHeight: 1.15 }}>{truncate(hero.headline, 52)}</Typography>
      <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", lineHeight: 1.4 }}>{truncate(hero.subtitle, 80)}</Typography>
      <Stack direction="row" spacing={0.5}>
        <Box sx={{ px: 0.85, py: 0.35, borderRadius: 0.75, bgcolor: "primary.main" }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", fontWeight: 800, color: "primary.contrastText" }}>
            ▶ {truncate(hero.cta, 16)}
          </Typography>
        </Box>
        <Box sx={{ px: 0.85, py: 0.35, borderRadius: 0.75, border: "1px solid", borderColor: alpha(theme.palette.text.primary, 0.2) }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", fontWeight: 700, color: "text.secondary" }}>View pre-orders</Typography>
        </Box>
      </Stack>
    </Stack>
  );
}

export function MockPromoBanner({ banner, isDarkMode }) {
  const theme = useTheme();
  const accent = banner.color || theme.palette.primary.main;

  return (
    <Box
      sx={{
        flex: 1,
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid",
        borderColor: alpha(accent, 0.25),
        bgcolor: isDarkMode ? alpha("#0F1D42", 0.85) : theme.palette.background.paper,
        minHeight: 52,
      }}
    >
      <Box sx={{ height: 2, background: `linear-gradient(90deg, ${accent}, ${alpha(accent, 0.15)})` }} />
      <Box sx={{ p: 0.75 }}>
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.45rem", fontWeight: 800, color: accent, letterSpacing: 0.8, mb: 0.25 }}>
          {banner.link?.includes("preorder") ? "PRE-ORDER" : "FEATURED"}
        </Typography>
        <Typography sx={{ fontWeight: 800, fontSize: "0.62rem", lineHeight: 1.2 }}>{truncate(banner.title, 26)}</Typography>
        <Typography sx={{ fontSize: "0.52rem", color: "text.secondary", mt: 0.15 }}>{truncate(banner.subtitle, 34)}</Typography>
        <Chip
          label={banner.ctaLabel || "Shop"}
          size="small"
          sx={{ mt: 0.4, height: 18, fontSize: "0.48rem", fontWeight: 700, bgcolor: alpha(accent, 0.12), color: accent, border: "1px solid", borderColor: alpha(accent, 0.3) }}
        />
      </Box>
    </Box>
  );
}

export function MockFilterSidebar({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();

  return (
    <Box sx={{ ...panelSx, p: 0.85, width: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.65 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.58rem" }}>Filter by</Typography>
        <Typography sx={{ fontSize: "0.48rem", color: "primary.main", fontWeight: 700 }}>Clear</Typography>
      </Stack>
      <Typography sx={{ fontSize: "0.5rem", fontWeight: 700, mb: 0.45 }}>Product line</Typography>
      <Stack direction="row" spacing={0.35} flexWrap="wrap" useFlexGap>
        {MOCK_LINE_FILTERS.map((line, index) => (
          <Chip
            key={line.id}
            label={line.label}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.45rem",
              fontFamily: MONO_FONT,
              fontWeight: 600,
              ...(index === 1
                ? { bgcolor: "text.primary", color: "background.paper" }
                : { bgcolor: "background.paper", border: "1px solid", borderColor: surfaceBorderColor }),
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}

function MockLineLogo({ line, size = 22 }) {
  if (line.logo) {
    return (
      <Box
        component="img"
        src={line.logo}
        alt=""
        sx={{ width: size, height: size, objectFit: "contain", display: "block" }}
      />
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 0.75,
        border: "1px dashed",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.42rem",
        fontWeight: 800,
        fontFamily: MONO_FONT,
        color: "text.secondary",
      }}
    >
      ALL
    </Box>
  );
}

/** Franchise rail — vertical logo strip (option B). */
export function MockFilterFranchiseRail({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const selectedId = "pokemon";

  return (
    <Stack spacing={0.5} sx={{ width: "100%" }}>
      {MOCK_LINE_FILTERS.map((line) => {
        const selected = line.id === selectedId;
        return (
          <Box
            key={line.id}
            sx={{
              ...panelSx,
              p: 0.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.25,
              borderColor: selected ? alpha(primary, 0.55) : surfaceBorderColor,
              boxShadow: selected ? `inset 3px 0 0 ${primary}` : "none",
              bgcolor: selected ? alpha(primary, 0.08) : undefined,
            }}
          >
            <MockLineLogo line={line} size={20} />
            <Typography
              sx={{
                fontSize: "0.38rem",
                fontWeight: selected ? 800 : 600,
                fontFamily: MONO_FONT,
                textAlign: "center",
                lineHeight: 1.1,
                color: selected ? "primary.main" : "text.secondary",
                display: { xs: "none", sm: "block" },
              }}
            >
              {line.short}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

/** Command bar — tabs + dropdown (option C). */
export function MockFilterCommandBar({ surfaceBorderColor }) {
  const theme = useTheme();

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={0.75}
      sx={{
        mx: 1.25,
        mb: 0.75,
        px: 0.75,
        py: 0.55,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: alpha(theme.palette.background.paper, 0.92),
      }}
    >
      <Stack direction="row" spacing={0.35} flexWrap="wrap" useFlexGap sx={{ flex: 1, minWidth: 0 }}>
        {MOCK_TYPE_TABS.map((tab, index) => (
          <Chip
            key={tab}
            label={tab}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.42rem",
              fontFamily: MONO_FONT,
              fontWeight: 700,
              ...(index === 1
                ? { bgcolor: "primary.main", color: "primary.contrastText" }
                : { border: "1px solid", borderColor: surfaceBorderColor }),
            }}
          />
        ))}
      </Stack>
      <Box
        sx={{
          flexShrink: 0,
          px: 0.65,
          py: 0.25,
          borderRadius: 0.75,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          display: "flex",
          alignItems: "center",
          gap: 0.35,
        }}
      >
        <Typography sx={{ fontSize: "0.42rem", fontWeight: 700, whiteSpace: "nowrap" }}>Pokémon TCG</Typography>
        <Typography sx={{ fontSize: "0.45rem", color: "text.secondary" }}>▾</Typography>
      </Box>
      <Typography sx={{ fontSize: "0.42rem", fontFamily: MONO_FONT, color: "text.secondary", flexShrink: 0 }}>4 items</Typography>
    </Stack>
  );
}

/** Franchise tiles — horizontal scroll (option D). */
export function MockFilterFranchiseTiles({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const selectedId = "pokemon";

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ px: 1.25, pb: 0.75, overflowX: "auto", flexWrap: "nowrap" }}
    >
      {MOCK_LINE_FILTERS.map((line) => {
        const selected = line.id === selectedId;
        return (
          <Box
            key={line.id}
            sx={{
              ...panelSx,
              flexShrink: 0,
              width: 72,
              p: 0.55,
              textAlign: "center",
              borderColor: selected ? alpha(primary, 0.55) : surfaceBorderColor,
              bgcolor: selected ? alpha(primary, 0.06) : undefined,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center", mb: 0.35 }}>
              <MockLineLogo line={line} size={24} />
            </Box>
            <Typography sx={{ fontSize: "0.42rem", fontWeight: selected ? 800 : 600, lineHeight: 1.15 }}>{line.short}</Typography>
            <Typography sx={{ fontSize: "0.38rem", color: "text.secondary", fontFamily: MONO_FONT }}>{line.count}</Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

/** Breadcrumb wayfinding (option E). */
export function MockFilterBreadcrumb() {
  const theme = useTheme();
  const primary = theme.palette.primary.main;

  return (
    <Stack direction="row" spacing={0.35} alignItems="center" flexWrap="wrap" useFlexGap sx={{ px: 1.25, pb: 0.65 }}>
      <Typography sx={{ fontSize: "0.52rem", fontWeight: 700, color: "text.secondary" }}>Products</Typography>
      <Typography sx={{ fontSize: "0.52rem", color: "text.secondary" }}>›</Typography>
      <Typography sx={{ fontSize: "0.52rem", fontWeight: 800, color: primary }}>Pokémon TCG</Typography>
      <Typography sx={{ fontSize: "0.48rem", fontFamily: MONO_FONT, color: "text.secondary", ml: 0.5 }}>· 4 items</Typography>
      <Chip
        label="Pokémon TCG ×"
        size="small"
        sx={{ height: 18, fontSize: "0.42rem", fontFamily: MONO_FONT, fontWeight: 700, bgcolor: alpha(primary, 0.12), color: primary }}
      />
    </Stack>
  );
}

/** Renders filter chrome + product grid for design preview. */
export function MockListingWithFilters({
  variant,
  panelSx,
  surfaceBorderColor,
  isDarkMode,
  countdownVariant,
  pricingVariant,
}) {
  const productGrid = (
    <Grid container spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
      <Grid size={6}>
        <MockProductCard panelSx={panelSx} isDarkMode={isDarkMode} compact />
      </Grid>
      <Grid size={6}>
        <MockProductCard
          panelSx={panelSx}
          isDarkMode={isDarkMode}
          isPreorder
          name="Treasure Chest Vol. 2"
          line="ONE PIECE"
          countdownVariant={countdownVariant}
          pricingVariant={pricingVariant}
          compact
          highlight
        />
      </Grid>
      <Grid size={6}>
        <MockProductCard panelSx={panelSx} isDarkMode={isDarkMode} compact />
      </Grid>
      <Grid size={6}>
        <MockProductCard panelSx={panelSx} isDarkMode={isDarkMode} isPreorder name="OP-15 Booster Box" line="ONE PIECE" countdownVariant={countdownVariant} pricingVariant={pricingVariant} compact />
      </Grid>
    </Grid>
  );

  if (variant === "commandBar") {
    return (
      <Box sx={{ pb: 1.25 }}>
        <MockFilterCommandBar surfaceBorderColor={surfaceBorderColor} />
        <Box sx={{ px: 1.25 }}>{productGrid}</Box>
      </Box>
    );
  }

  if (variant === "franchiseTiles") {
    return (
      <Box sx={{ pb: 1.25 }}>
        <MockFilterFranchiseTiles panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
        <Box sx={{ px: 1.25 }}>{productGrid}</Box>
      </Box>
    );
  }

  if (variant === "breadcrumb") {
    return (
      <Box sx={{ pb: 1.25 }}>
        <MockFilterBreadcrumb />
        <Stack direction="row" spacing={0.4} sx={{ px: 1.25, mb: 0.65 }}>
          {MOCK_TYPE_TABS.map((tab, index) => (
            <Chip
              key={tab}
              label={tab}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.42rem",
                fontFamily: MONO_FONT,
                fontWeight: 700,
                ...(index === 1 ? { bgcolor: "primary.main", color: "primary.contrastText" } : { border: "1px solid", borderColor: surfaceBorderColor }),
              }}
            />
          ))}
        </Stack>
        <Box sx={{ px: 1.25 }}>{productGrid}</Box>
      </Box>
    );
  }

  if (variant === "franchiseRail") {
    return (
      <Stack direction="row" spacing={0.75} sx={{ px: 1.25, pb: 1.25, alignItems: "flex-start" }}>
        <Box sx={{ width: 52, flexShrink: 0 }}>
          <MockFilterFranchiseRail panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
        </Box>
        {productGrid}
      </Stack>
    );
  }

  // current — sidebar + grid
  return (
    <Grid container spacing={0.75} sx={{ px: 1.25, pb: 1.25, pt: 0.75 }}>
      <Grid size={3.5}>
        <MockFilterSidebar panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
      </Grid>
      <Grid size={8.5}>{productGrid}</Grid>
    </Grid>
  );
}

export function MockListingHeader({ overline = "Pre-Orders", title = "Reserve incoming sets before they sell out." }) {
  const theme = useTheme();

  return (
    <Box sx={{ px: 1.25, pt: 1 }}>
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.52rem", fontWeight: 800, color: "primary.main", letterSpacing: 1, mb: 0.35 }}>
        {overline.toUpperCase()}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", lineHeight: 1.2 }}>{truncate(title, 48)}</Typography>
      <Stack direction="row" spacing={0.4} sx={{ mt: 0.65 }}>
        {["All Pre-orders", "Ongoing", "Closed"].map((tab, index) => (
          <Chip
            key={tab}
            label={tab}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.48rem",
              fontFamily: MONO_FONT,
              fontWeight: 700,
              ...(index === 0
                ? { bgcolor: "primary.main", color: "primary.contrastText" }
                : { bgcolor: "background.paper", border: "1px solid", borderColor: alpha(theme.palette.text.primary, 0.15) }),
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}

export function MockFooter({ contact }) {
  const theme = useTheme();

  return (
    <Box sx={{ px: 1.25, py: 1, borderTop: "1px solid", borderColor: alpha(theme.palette.text.primary, 0.1) }}>
      <Grid container spacing={1}>
        <Grid size={4}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.58rem" }}>{truncate(contact.legalName, 22)}</Typography>
          <Typography sx={{ fontSize: "0.48rem", color: "text.secondary", mt: 0.25 }}>{truncate(contact.blurb, 40)}</Typography>
        </Grid>
        <Grid size={4}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.52rem", mb: 0.25 }}>Shop</Typography>
          {["Pre-orders", "Products", "Contact"].map((link) => (
            <Typography key={link} sx={{ fontSize: "0.48rem", color: "text.secondary", display: "block" }}>{link}</Typography>
          ))}
        </Grid>
        <Grid size={4}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.52rem", mb: 0.25 }}>Reach us</Typography>
          <Typography sx={{ fontSize: "0.48rem", color: "text.secondary" }}>{truncate(contact.address, 36)}</Typography>
          <Typography sx={{ fontSize: "0.48rem", color: "primary.main", fontWeight: 700, mt: 0.15 }}>{truncate(contact.email, 24)}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export function useStorefrontMockSurfaces() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const surfaces = getSurfaces(theme, isDarkMode);
  return { theme, isDarkMode, ...surfaces };
}
