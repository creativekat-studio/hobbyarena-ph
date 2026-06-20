import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { getSurfaces } from "../lib/surfaces.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { useAuth, ADMIN_HINT } from "../auth/AuthProvider.jsx";
import { ShieldIcon } from "../components/icons.jsx";
import BrandLogo from "../components/BrandLogo.jsx";

export default function AdminLogin() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useColorMode();
  const isDarkMode = mode === "dark";
  const surfaces = getSurfaces(theme, isDarkMode);
  const { panelSx, surfaceBorderColor } = surfaces;
  const { signInAdmin, isAdmin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAdmin) {
    return <Navigate to={location.state?.from?.pathname || "/admin"} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInAdmin(email, password);
      navigate(location.state?.from?.pathname || "/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", bgcolor: "background.default", color: "text.primary", backgroundImage: surfaces.pageBackground }}>
      <Container maxWidth="sm">
        <Stack spacing={3} alignItems="center">
          <Stack spacing={1} alignItems="center" textAlign="center">
            <BrandLogo sx={{ fontSize: 44, color: "primary.main", filter: theme.ha?.useImageLogo ? undefined : `drop-shadow(0 0 14px ${alpha(theme.palette.primary.main, 0.5)})` }} imageSx={{ height: 72 }} />
            <Typography variant="h3">Admin portal</Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: "text.secondary" }}>
              <ShieldIcon sx={{ fontSize: 18 }} />
              <Typography variant="body2">Authorized staff only — separate from customer accounts.</Typography>
            </Stack>
          </Stack>

          <Box component="form" onSubmit={handleSubmit} sx={{ ...panelSx, p: { xs: 3, md: 5 }, width: "100%" }}>
            <Stack spacing={2.5}>
              <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>
                ▣ Secure sign in
              </Typography>
              {error ? <Alert severity="error">{error}</Alert> : null}
              <TextField label="Admin email" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
              <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              <Button type="submit" variant="contained" color="primary" size="large" disabled={busy} sx={{ py: 1.3, fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase", boxShadow: `0 12px 36px ${alpha(theme.palette.primary.main, 0.45)}` }}>
                {busy ? "Verifying…" : "▶ Sign in"}
              </Button>
              <Box sx={{ p: 1.5, borderRadius: 1, border: "1px dashed", borderColor: surfaceBorderColor }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: MONO_FONT }}>
                  Demo admin → {ADMIN_HINT.email} / {ADMIN_HINT.password}
                </Typography>
              </Box>
              <Button variant="text" color="inherit" onClick={() => navigate("/")} sx={{ color: "text.secondary" }}>
                ← Back to storefront
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
