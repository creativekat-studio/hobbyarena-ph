import { IconButton, Stack, Typography } from "@mui/material";
import { Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { wider } from "../lib/layout.js";
import { useCms } from "../lib/cmsContent.jsx";
import { FacebookIcon, InstagramIcon, TiktokIcon } from "./icons.jsx";
import BirSealBadge, { useBirSealVisible } from "./BirSealBadge.jsx";

export default function StorefrontFooter({ panelSx, surfaceBorderColor, heroTagline }) {
  const { content } = useCms();
  const showBirInFooter = useBirSealVisible("footer");

  return (
    <Box sx={{ borderTop: "1px solid", borderColor: surfaceBorderColor, pt: 4, mt: 4 }}>
      <Box sx={{ ...(panelSx ? {} : {}), px: 0 }}>
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto minmax(0, 1fr)" },
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0, maxWidth: { md: wider(420) } }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{content.contact.legalName}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: "0.9rem", mt: 1, maxWidth: wider(360) }}>{content.contact.blurb}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {[
                { Icon: InstagramIcon, href: content.social.instagram },
                { Icon: FacebookIcon, href: content.social.facebook },
                ...(content.social.tiktok ? [{ Icon: TiktokIcon, href: content.social.tiktok }] : []),
              ]
                .filter((s) => s.href)
                .map(({ Icon, href }) => (
                  <IconButton key={href} size="small" component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ border: "1px solid", borderColor: surfaceBorderColor, color: "text.secondary", "&:hover": { color: "primary.main", borderColor: "primary.main" } }}>
                    <Icon sx={{ fontSize: 18 }} />
                  </IconButton>
                ))}
            </Stack>
            {showBirInFooter ? (
              <Box sx={{ mt: 2.5 }}>
                <BirSealBadge placement="footer" maxWidth={64} />
              </Box>
            ) : null}
          </Box>
          <Box sx={{ justifySelf: { md: "center" }, px: { md: 1 } }}>
            <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Shop</Typography>
            <Stack spacing={1}>
              {[
                { label: "Pre-orders", to: "/preorders" },
                { label: "Products", to: "/products" },
                { label: "Contact us", to: "/contact" },
              ].map((link) => (
                <Typography key={link.to} component={RouterLink} to={link.to} sx={{ color: "text.secondary", fontSize: "0.88rem", textDecoration: "none", "&:hover": { color: "primary.main" } }}>{link.label}</Typography>
              ))}
            </Stack>
          </Box>
          <Box sx={{ justifySelf: { md: "end" }, maxWidth: { md: wider(320) } }}>
            <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Reach us</Typography>
            <Stack spacing={1}>
              {content.contact.address ? (
                <Typography sx={{ color: "text.secondary", fontSize: "0.88rem", lineHeight: 1.45 }}>{content.contact.address}</Typography>
              ) : null}
              {content.contact.phone ? (
                <Typography component="a" href={`tel:${content.contact.phone.replace(/\s/g, "")}`} sx={{ color: "text.secondary", fontSize: "0.88rem", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  {content.contact.phone}
                </Typography>
              ) : null}
              <Typography component={RouterLink} to="/contact" sx={{ color: "primary.main", fontSize: "0.88rem", fontWeight: 700, textDecoration: "none" }}>
                Contact us →
              </Typography>
              <Typography component="a" href={`mailto:${content.contact.email}`} sx={{ color: "text.secondary", fontSize: "0.88rem", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                {content.contact.email}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.88rem" }}>{content.contact.hours}</Typography>
            </Stack>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", pt: 4, mt: 4, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
          © {new Date().getFullYear()} {content.contact.legalName}{heroTagline ? ` · ${heroTagline}` : ""}
        </Typography>
      </Box>
    </Box>
  );
}
