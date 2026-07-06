import { Box, Container, IconButton, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import BrandLogo from "../components/BrandLogo.jsx";
import { FacebookIcon, InstagramIcon, TiktokIcon } from "../components/icons.jsx";
import { MONO_FONT } from "../theme.js";
import { heroHeadlineSx } from "../lib/surfaces.js";
import { useCms } from "../lib/cmsContent.jsx";

const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
`;

const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
`;

const driftTopRight = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.55; }
  25%      { transform: translate(-48px, 36px) scale(1.12); opacity: 0.75; }
  50%      { transform: translate(24px, -32px) scale(0.94); opacity: 0.5; }
  75%      { transform: translate(-20px, -48px) scale(1.06); opacity: 0.7; }
`;

const driftBottomLeft = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
  25%      { transform: translate(42px, -28px) scale(1.1); opacity: 0.72; }
  50%      { transform: translate(-32px, 40px) scale(0.9); opacity: 0.45; }
  75%      { transform: translate(28px, 24px) scale(1.04); opacity: 0.65; }
`;

const driftCenter = keyframes`
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.35; }
  33%      { transform: translate(calc(-50% + 60px), calc(-50% - 40px)) scale(1.15); opacity: 0.55; }
  66%      { transform: translate(calc(-50% - 50px), calc(-50% + 30px)) scale(0.88); opacity: 0.4; }
`;

const LOGO_SIZE = 220;

export default function LandingPage({ surfaces }) {
  const theme = useTheme();
  const { content } = useCms();
  const { storefront, social, contact } = content;
  const { panelSx, surfaceBorderColor } = surfaces;
  const headlineSx = heroHeadlineSx(theme);

  const socialLinks = [
    { Icon: InstagramIcon, href: social.instagram, label: "Instagram" },
    { Icon: FacebookIcon, href: social.facebook, label: "Facebook" },
    ...(social.tiktok ? [{ Icon: TiktokIcon, href: social.tiktok, label: "TikTok" }] : []),
  ].filter((item) => item.href);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        py: { xs: 6, md: 8 },
        px: 2,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.1)}, ${alpha(theme.palette.primary.main, 0.08)})`,
          backgroundSize: "200% 200%",
          animation: `${gradientShift} 12s ease infinite`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "12%",
          right: "8%",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.24)}, transparent 70%)`,
          filter: "blur(2px)",
          animation: `${driftTopRight} 14s ease-in-out infinite`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          bottom: "18%",
          left: "6%",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.2)}, transparent 70%)`,
          filter: "blur(2px)",
          animation: `${driftBottomLeft} 18s ease-in-out infinite`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)}, transparent 68%)`,
          filter: "blur(24px)",
          animation: `${driftCenter} 22s ease-in-out infinite`,
        }}
      />

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Stack spacing={4} alignItems="center" textAlign="center">
          <Box sx={{ animation: `${floatY} 5s ease-in-out infinite` }}>
            <BrandLogo
              imageSx={{ height: LOGO_SIZE }}
              sx={{ height: LOGO_SIZE, width: "auto", fontSize: "13.75rem" }}
            />
          </Box>

          <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
            <Typography variant="h1" sx={headlineSx}>
              {storefront.landingHeadline}
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: { xs: "1rem", md: "1.1rem" },
                lineHeight: 1.65,
                maxWidth: 440,
              }}
            >
              {storefront.landingMessage}
            </Typography>
          </Stack>

          <Box sx={{ ...panelSx, px: 3, py: 2.5, width: "100%", maxWidth: 400 }}>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 800, letterSpacing: 0.8, color: "primary.main", mb: 1.5, textTransform: "uppercase" }}>
              {storefront.landingCtaLabel}
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
              {socialLinks.map(({ Icon, href, label }) => (
                <IconButton
                  key={href}
                  component="a"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  sx={{
                    border: "1px solid",
                    borderColor: surfaceBorderColor,
                    color: "text.secondary",
                    "&:hover": { color: "primary.main", borderColor: "primary.main" },
                  }}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </IconButton>
              ))}
            </Stack>
            {contact.email ? (
              <Typography
                component="a"
                href={`mailto:${contact.email}`}
                sx={{
                  display: "block",
                  mt: 2,
                  color: "text.secondary",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  "&:hover": { color: "primary.main" },
                }}
              >
                {contact.email}
              </Typography>
            ) : null}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
            © {new Date().getFullYear()} {contact.legalName}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
