import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { wider } from "../lib/layout.js";
import { FacebookIcon, InstagramIcon, TiktokIcon } from "../components/icons.jsx";
import { useCms } from "../lib/cmsContent.jsx";
import { useInquiries } from "../lib/inquiriesStore.jsx";
import { resolveContactMapUrls } from "../data/catalogDefaults.js";

function NewsletterForm({ panelSx }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  function handleSubmit(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("sent");
    setEmail("");
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ ...panelSx, p: { xs: 3, md: 5 } }}>
      <Grid container spacing={3} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Newsletter</Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>Get the drops before they sell out.</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Restock alerts, pre-order windows, and member-only deals.</Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          {status === "sent" ? <Alert severity="success" sx={{ mb: 2 }}>You&apos;re in! Watch your inbox for the next drop.</Alert> : null}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField fullWidth type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" variant="contained" color="primary" sx={{ px: 4, whiteSpace: "nowrap", fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase" }}>Subscribe</Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

function InquiryForm({ panelSx }) {
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
    <Box component="form" onSubmit={handleSubmit} sx={{ ...panelSx, p: { xs: 3, md: 5 } }}>
      <Grid container spacing={{ xs: 3, md: 5 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Inquiry</Typography>
          <Typography variant="h4" sx={{ mt: 0.5 }}>Send us a message.</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Ask about stock, pre-orders, pickup, or anything else. Our team replies during processing hours.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={2}>
            {status === "sent" ? <Alert severity="success">Thanks! Your message was sent.</Alert> : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Name" fullWidth required value={form.name} onChange={(e) => update("name", e.target.value)} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Email" type="email" fullWidth required value={form.email} onChange={(e) => update("email", e.target.value)} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Subject (optional)" fullWidth value={form.subject} onChange={(e) => update("subject", e.target.value)} /></Grid>
              <Grid size={{ xs: 12 }}><TextField label="Message" fullWidth required multiline minRows={4} value={form.message} onChange={(e) => update("message", e.target.value)} /></Grid>
            </Grid>
            <Button type="submit" variant="contained" size="large" sx={{ alignSelf: "flex-start", fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>Send message</Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function ContactPage() {
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { content } = useCms();
  const { openUrl: mapOpenUrl, embedUrl: mapEmbedUrl } = resolveContactMapUrls(content.contact);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Contact</Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5 }}>Contact us</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, maxWidth: wider(520) }}>
            Subscribe for drops, send an inquiry, or reach us through social media and our store location.
          </Typography>
        </Box>

        <Grid container spacing={3} alignItems="stretch">
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: "flex" }}>
            <Box sx={{ ...panelSx, p: 3, flex: 1, width: "100%" }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{content.contact.legalName}</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, fontSize: "0.9rem" }}>{content.contact.blurb}</Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {content.contact.address ? <Typography sx={{ fontSize: "0.88rem" }}>{content.contact.address}</Typography> : null}
                {content.contact.phone ? (
                  <Typography component="a" href={`tel:${content.contact.phone.replace(/\s/g, "")}`} sx={{ color: "inherit", textDecoration: "none" }}>{content.contact.phone}</Typography>
                ) : null}
                <Typography component="a" href={`mailto:${content.contact.email}`} sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600 }}>{content.contact.email}</Typography>
                <Typography sx={{ fontSize: "0.88rem", color: "text.secondary" }}>{content.contact.hours}</Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                {[
                  { Icon: InstagramIcon, href: content.social.instagram },
                  { Icon: FacebookIcon, href: content.social.facebook },
                  ...(content.social.tiktok ? [{ Icon: TiktokIcon, href: content.social.tiktok }] : []),
                ]
                  .filter((s) => s.href)
                  .map(({ Icon, href }) => (
                    <IconButton key={href} component="a" href={href} target="_blank" rel="noopener noreferrer" sx={{ border: "1px solid", borderColor: surfaceBorderColor }}>
                      <Icon sx={{ fontSize: 18 }} />
                    </IconButton>
                  ))}
              </Stack>
              <Button component="a" href={mapOpenUrl} target="_blank" rel="noopener noreferrer" variant="outlined" sx={{ mt: 2, borderColor: surfaceBorderColor }}>
                Open in Google Maps
              </Button>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex" }}>
            <Box
              sx={{
                ...panelSx,
                overflow: "hidden",
                flex: 1,
                width: "100%",
                minHeight: { xs: 280, md: 0 },
                position: "relative",
              }}
            >
              <Box
                component="iframe"
                title="Store location"
                src={mapEmbedUrl}
                sx={{
                  position: { md: "absolute" },
                  inset: { md: 0 },
                  width: "100%",
                  height: { xs: 280, md: "100%" },
                  border: 0,
                  display: "block",
                }}
                loading="lazy"
                allowFullScreen
              />
            </Box>
          </Grid>
        </Grid>

        <NewsletterForm panelSx={panelSx} />
        <InquiryForm panelSx={panelSx} />
      </Stack>
    </Container>
  );
}
