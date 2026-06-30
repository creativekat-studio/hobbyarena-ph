import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { BrowserChrome, WireSection } from "./WireframePreview.jsx";
import { useCms } from "../lib/cmsContent.jsx";
import { ALL_PRODUCTS } from "../data/mockData.js";
import {
  MockAnnouncementBar,
  MockFeatureDropCard,
  MockFooter,
  MockHeroCopy,
  MockImageMarquee,
  MockProductCard,
  MockPromoBanner,
  MockStorefrontNav,
  truncate,
  useStorefrontMockSurfaces,
} from "./StorefrontMockupParts.jsx";

export const CMS_TAB_LABELS = [
  "Homepage",
  "Banners",
  "Announcements",
  "Reviews",
  "Bank details",
  "Social & Contact",
];

const TAB_SECTIONS = {
  0: new Set(["hero", "featureDrop", "featuredProducts", "featuredPreorders"]),
  1: new Set(["promoBanners"]),
  2: new Set(["announcements"]),
  3: new Set(["reviews"]),
  4: new Set(["bankDetails"]),
  5: new Set(["footer", "contactMap"]),
};

function SectionHeader({ overline, title }) {
  return (
    <Box sx={{ mb: 0.65 }}>
      <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.5rem", fontWeight: 800, color: "primary.main", letterSpacing: 0.8 }}>
        {truncate(overline, 28).toUpperCase()}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: "0.72rem", mt: 0.2, lineHeight: 1.2 }}>{truncate(title, 44)}</Typography>
    </Box>
  );
}

function ProductRow({ panelSx, isDarkMode, count = 4 }) {
  return (
    <Grid container spacing={0.65} sx={{ mt: 0.5 }}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid size={3} key={index}>
          <MockProductCard
            panelSx={panelSx}
            isDarkMode={isDarkMode}
            compact
            isPreorder={index === 1}
            name={index === 1 ? "Pre-order SKU" : "Sealed product"}
          />
        </Grid>
      ))}
    </Grid>
  );
}

function MockContactLayout({ contact, panelSx, isDarkMode, surfaceBorderColor, active }) {
  const theme = useTheme();

  return (
    <Stack spacing={0.75} sx={{ p: 1.25 }}>
      <WireSection active={active} sx={{ p: 0.85 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "0.72rem", mb: 0.5 }}>Contact us</Typography>
        <Grid container spacing={0.75}>
          <Grid size={6}>
            <Box sx={{ ...panelSx, p: 0.85, height: "100%" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.62rem" }}>{truncate(contact.legalName, 28)}</Typography>
              <Typography sx={{ fontSize: "0.52rem", color: "text.secondary", mt: 0.35, lineHeight: 1.45 }}>{truncate(contact.blurb, 60)}</Typography>
              <Typography sx={{ fontSize: "0.52rem", mt: 0.5 }}>{truncate(contact.address, 48)}</Typography>
              <Typography sx={{ fontSize: "0.52rem", mt: 0.25 }}>{contact.phone}</Typography>
              <Typography sx={{ fontSize: "0.52rem", color: "primary.main", fontWeight: 700, mt: 0.25 }}>{contact.email}</Typography>
              <Box sx={{ mt: 0.5, px: 0.65, py: 0.35, borderRadius: 0.75, border: "1px solid", borderColor: surfaceBorderColor, display: "inline-block" }}>
                <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", fontWeight: 700, color: "primary.main" }}>Open in Google Maps</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid size={6}>
            <Box
              sx={{
                ...panelSx,
                overflow: "hidden",
                height: "100%",
                minHeight: 100,
                bgcolor: alpha(theme.palette.text.primary, 0.06),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.48rem", color: "text.secondary", fontWeight: 700 }}>MAP EMBED</Typography>
            </Box>
          </Grid>
        </Grid>
      </WireSection>
      <MockFooter contact={contact} />
    </Stack>
  );
}

export default function CmsPreviewMockup({ panelSx, surfaceBorderColor, activeTab = 0 }) {
  const theme = useTheme();
  const { content } = useCms();
  const { hero, homepageSections, featureDrops, banners, announcements, testimonials, bankDetails, contact } = content;
  const { panelSx: cardPanelSx, isDarkMode } = useStorefrontMockSurfaces();

  const activeSections = TAB_SECTIONS[activeTab] ?? new Set();
  const isActive = (section) => activeSections.has(section);

  const activeAnnouncement = announcements.find((item) => item.active)?.text ?? "No active announcements";
  const activeBanners = banners.filter((banner) => banner.active);
  const activeDrop = featureDrops.find((drop) => drop.active) ?? featureDrops[0];
  const dropProduct = activeDrop ? ALL_PRODUCTS.find((p) => p.id === activeDrop.productId) : null;
  const storefrontBg = theme.palette.background.default;
  const previewUrl = activeTab === 5 ? "hobbyarena.ph/contact" : "hobbyarena.ph/";
  const isContactView = activeTab === 5;

  return (
    <Box sx={{ ...panelSx, p: { xs: 1.5, md: 2 }, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", mb: 1 }}>Storefront preview</Typography>

      <BrowserChrome
        url={previewUrl}
        contentSx={{ bgcolor: storefrontBg, flex: 1, minHeight: 320, maxHeight: { xs: 480, lg: "calc(100dvh - 140px)" }, overflowY: "auto" }}
      >
        {isContactView ? (
          <MockContactLayout contact={contact} panelSx={cardPanelSx} isDarkMode={isDarkMode} surfaceBorderColor={surfaceBorderColor} active={isActive("footer") || isActive("contactMap")} />
        ) : (
          <>
            <WireSection active={isActive("announcements")} sx={{ m: 0 }}>
              <MockAnnouncementBar text={activeAnnouncement} />
            </WireSection>

            <MockImageMarquee />
            <MockStorefrontNav layoutId="dock" surfaceBorderColor={surfaceBorderColor} compact />

            <WireSection active={isActive("hero") || isActive("featureDrop")} sx={{ p: 1.25, mx: 1.25, mt: 0.75 }}>
              <Grid container spacing={1} alignItems="center">
                <Grid size={6}>
                  <MockHeroCopy hero={hero} />
                </Grid>
                <Grid size={6}>
                  <MockFeatureDropCard
                    panelSx={cardPanelSx}
                    isDarkMode={isDarkMode}
                    drop={activeDrop}
                    productName={dropProduct?.name}
                    isPreorder={dropProduct?.tag === "Pre-order"}
                  />
                </Grid>
              </Grid>
            </WireSection>

            <WireSection active={isActive("promoBanners")} sx={{ px: 1.25, py: 0.75, mx: 1.25, mt: 0.75 }}>
              <Stack direction="row" spacing={0.65}>
                {(activeBanners.length ? activeBanners.slice(0, 2) : [{ id: "empty", title: "Banner", subtitle: "", link: "" }]).map((banner) => (
                  <MockPromoBanner key={banner.id} banner={banner} isDarkMode={isDarkMode} />
                ))}
              </Stack>
            </WireSection>

            <WireSection active={isActive("featuredProducts")} sx={{ px: 1.25, py: 0.75, mx: 1.25, mt: 0.75 }}>
              <SectionHeader overline={homepageSections.products.overline} title={homepageSections.products.title} />
              <ProductRow panelSx={cardPanelSx} isDarkMode={isDarkMode} />
            </WireSection>

            <WireSection active={isActive("featuredPreorders")} sx={{ px: 1.25, py: 0.75, mx: 1.25, mt: 0.75 }}>
              <SectionHeader overline={homepageSections.preorders.overline} title={homepageSections.preorders.title} />
              <ProductRow panelSx={cardPanelSx} isDarkMode={isDarkMode} />
            </WireSection>

            <WireSection active={isActive("reviews")} sx={{ px: 1.25, py: 0.75, mx: 1.25, mt: 0.75 }}>
              {testimonials.enabled ? (
                <Stack spacing={0.35} alignItems="center" textAlign="center">
                  <SectionHeader overline={testimonials.overline} title={testimonials.title} />
                  <Grid container spacing={0.65} sx={{ width: "100%" }}>
                    {[1, 2].map((i) => (
                      <Grid size={6} key={i}>
                        <Box sx={{ ...cardPanelSx, p: 0.75, minHeight: 48 }}>
                          <Typography sx={{ fontSize: "0.52rem", fontStyle: "italic", color: "text.secondary" }}>&ldquo;Great pulls, fast shipping.&rdquo;</Typography>
                          <Typography sx={{ fontSize: "0.48rem", fontWeight: 800, mt: 0.35 }}>Collector name</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              ) : (
                <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", fontStyle: "italic" }}>Testimonials hidden on storefront</Typography>
              )}
              <Typography sx={{ fontSize: "0.5rem", color: "text.secondary", mt: 0.5, textAlign: "center" }}>
                Product ratings: {content.productReviews.showRatings ? "visible on cards" : "hidden"}
              </Typography>
            </WireSection>

            <WireSection active={isActive("bankDetails")} sx={{ px: 1.25, py: 0.75, mx: 1.25, mt: 0.75, mb: 0.75 }}>
              {bankDetails.enabled ? (
                <Stack spacing={0.5} alignItems="center" textAlign="center">
                  <Typography sx={{ fontWeight: 800, fontSize: "0.65rem" }}>{truncate(bankDetails.title, 52)}</Typography>
                  <Typography sx={{ fontSize: "0.52rem", color: "text.secondary" }}>{truncate(bankDetails.subtitle, 56)}</Typography>
                  <Stack direction="row" spacing={0.5} sx={{ width: "100%", mt: 0.35 }}>
                    {bankDetails.accounts.filter((a) => a.active !== false).slice(0, 4).map((account) => (
                      <Box key={account.id} sx={{ ...cardPanelSx, flex: 1, p: 0.65, minHeight: 44 }}>
                        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.45rem", fontWeight: 800, color: "primary.main" }}>{truncate(account.label, 12)}</Typography>
                        <Box sx={{ mt: 0.35, height: 24, borderRadius: 0.5, bgcolor: alpha(theme.palette.text.primary, 0.06), border: "1px dashed", borderColor: alpha(theme.palette.text.primary, 0.15) }} />
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              ) : (
                <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", fontStyle: "italic", textAlign: "center" }}>Bank details hidden</Typography>
              )}
            </WireSection>

            <WireSection active={isActive("footer")} sx={{ m: 0 }}>
              <MockFooter contact={contact} />
            </WireSection>
          </>
        )}
      </BrowserChrome>

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
        <Chip
          label={`Editing: ${CMS_TAB_LABELS[activeTab] ?? "Homepage"}`}
          size="small"
          sx={{
            fontFamily: MONO_FONT,
            fontSize: "0.62rem",
            fontWeight: 700,
            border: "1px solid",
            borderColor: surfaceBorderColor,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}
        />
        {activeTab === 0 ? (
          <Chip label={`${featureDrops.filter((d) => d.active).length} active drops`} size="small" sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", border: "1px solid", borderColor: surfaceBorderColor }} />
        ) : null}
        {activeTab === 1 ? (
          <Chip label={`${activeBanners.length} active banners`} size="small" sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", border: "1px solid", borderColor: surfaceBorderColor }} />
        ) : null}
        {activeTab === 2 ? (
          <Chip label={`${announcements.filter((a) => a.active).length} live items`} size="small" sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", border: "1px solid", borderColor: surfaceBorderColor }} />
        ) : null}
      </Stack>
    </Box>
  );
}
