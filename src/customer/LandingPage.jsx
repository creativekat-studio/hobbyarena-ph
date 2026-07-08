import {
  Box,
  Container,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import BrandLogo from "../components/BrandLogo.jsx";
import { FacebookIcon, InstagramIcon, TiktokIcon } from "../components/icons.jsx";
import { MONO_FONT } from "../theme.js";
import { heroHeadlineSx } from "../lib/surfaces.js";
import { useCms } from "../lib/cmsContent.jsx";

const LOGO_SIZE = 220;

function LandingHeadline({ text }) {
  const theme = useTheme();
  const headlineSx = heroHeadlineSx(theme);
  const match = text.match(/^(We're)\s+(.+)$/i);

  if (match) {
    return (
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: "2.35rem", md: "3.5rem" },
          lineHeight: 1.08,
          fontWeight: 800,
          maxWidth: 520,
        }}
      >
        <Box component="span" sx={{ color: "text.primary" }}>{match[1]}</Box>
        {" "}
        <Box component="span" sx={headlineSx}>{match[2]}</Box>
      </Typography>
    );
  }

  return (
    <Typography variant="h1" sx={{ ...headlineSx, maxWidth: 520 }}>
      {text}
    </Typography>
  );
}

function StayInTheLoopCard({ label, social, email, panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const socialLinks = [
    { Icon: InstagramIcon, href: social.instagram, label: "Instagram" },
    { Icon: FacebookIcon, href: social.facebook, label: "Facebook" },
    ...(social.tiktok ? [{ Icon: TiktokIcon, href: social.tiktok, label: "TikTok" }] : []),
  ].filter((item) => item.href);

  return (
    <Box
      sx={{
        ...panelSx,
        width: "100%",
        maxWidth: 420,
        px: { xs: 2.5, md: 3 },
        py: { xs: 2.25, md: 2.75 },
        bgcolor: alpha(theme.palette.background.paper, 0.55),
      }}
    >
      <Typography
        sx={{
          fontFamily: MONO_FONT,
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: theme.palette.secondary.main,
          mb: 1.75,
        }}
      >
        {label}
      </Typography>

      {socialLinks.length ? (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1.75 }}>
          {socialLinks.map(({ Icon, href, label: socialLabel }) => (
            <IconButton
              key={href}
              component="a"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={socialLabel}
              size="small"
              sx={{
                border: "1px solid",
                borderColor: surfaceBorderColor,
                color: "text.secondary",
                width: 40,
                height: 40,
                "&:hover": { color: "primary.main", borderColor: "primary.main" },
              }}
            >
              <Icon sx={{ fontSize: 20 }} />
            </IconButton>
          ))}
        </Stack>
      ) : null}

      {email ? (
        <Link
          href={`mailto:${email}`}
          underline="none"
          sx={{
            fontFamily: MONO_FONT,
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "primary.light",
            "&:hover": { color: "primary.main" },
          }}
        >
          {email}
        </Link>
      ) : null}
    </Box>
  );
}

export default function LandingPage({ surfaces }) {
  const { content } = useCms();
  const { storefront, social, contact } = content;
  const { panelSx, surfaceBorderColor } = surfaces;
  const stayLabel = (storefront.landingSocialLabel || "Stay in the loop").toUpperCase();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 6, md: 8 },
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3.5} alignItems="center" textAlign="center">
          <BrandLogo
            imageSx={{ height: LOGO_SIZE }}
            sx={{ height: LOGO_SIZE, width: "auto", fontSize: "13.75rem" }}
          />

          <Stack spacing={1.5} alignItems="center" sx={{ width: "100%" }}>
            <LandingHeadline text={storefront.landingHeadline} />
            <Typography
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.98rem", md: "1.05rem" },
                lineHeight: 1.65,
                maxWidth: 480,
              }}
            >
              {storefront.landingMessage}
            </Typography>
          </Stack>

          <StayInTheLoopCard
            label={stayLabel}
            social={social}
            email={contact.email}
            panelSx={panelSx}
            surfaceBorderColor={surfaceBorderColor}
          />

          <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
            © {new Date().getFullYear()} {contact.legalName}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
