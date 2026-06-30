import { useState } from "react";
import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { useCms } from "../lib/cmsContent.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import ShopNav, { ShopNavMobileItems } from "../components/ShopNav.jsx";
import {
  CartIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from "../components/icons.jsx";

function MenuIcon(props) {
  return (
    <Box component="svg" viewBox="0 0 24 24" width={22} height={22} fill="currentColor" {...props}>
      <path d="M4 7h16v2H4V7zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
    </Box>
  );
}

export default function CustomerNavbar({ surfaces, onOpenCart, onOpenSearch }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useColorMode();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { content } = useCms();
  const tagline = content.hero.tagline;
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDarkMode = mode === "dark";
  const { navbarBackground, surfaceBorderColor } = surfaces;
  const useImageLogo = theme.ha?.useImageLogo;

  function handleSectionNav(section) {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      navigate("/", { state: { scrollTo: section } });
      return;
    }
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
  }

  function handleMobileNav(item) {
    if (item.section) {
      handleSectionNav(item.section);
      return;
    }
    navigate(item.to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: navbarBackground,
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid",
          borderColor: theme.ha?.brand?.navbarBorder ?? surfaceBorderColor,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: { xs: 62, md: 72 }, gap: 1.5 }}>
            <IconButton
              color="inherit"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { xs: "inline-flex", lg: "none" }, mr: 0.5 }}
              aria-label="Open menu"
            >
              <MenuIcon />
            </IconButton>

            <Stack
              direction="row"
              spacing={1.25}
              alignItems="center"
              onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              sx={{ minWidth: 0, cursor: "pointer" }}
            >
              <BrandLogo
                sx={{
                  fontSize: { xs: 30, md: 36 },
                  color: "primary.main",
                  filter: useImageLogo ? undefined : `drop-shadow(0 0 12px ${alpha(theme.palette.primary.main, 0.5)})`,
                }}
              />
              {!useImageLogo ? (
                <Stack sx={{ minWidth: 0, display: { xs: "none", sm: "flex" } }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
                    Hobby Arena
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: MONO_FONT, letterSpacing: 0.8, fontSize: "0.58rem", lineHeight: 1.3, maxWidth: 220 }}>
                    {tagline}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: MONO_FONT, letterSpacing: 0.8, fontSize: "0.58rem", lineHeight: 1.3, display: { xs: "none", md: "block" }, maxWidth: 220 }}>
                  {tagline}
                </Typography>
              )}
            </Stack>

            <ShopNav onSectionNav={handleSectionNav} />

            <Box sx={{ flexGrow: 1 }} />

            <TextField
              size="small"
              placeholder="Search products…"
              onClick={onOpenSearch}
              readOnly
              sx={{ display: { xs: "none", xl: "block" }, width: 220, cursor: "pointer" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton onClick={toggle} color="inherit">
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Cart">
              <IconButton color="inherit" onClick={onOpenCart}>
                <Badge badgeContent={itemCount} color="primary" invisible={itemCount === 0}>
                  <CartIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              color="primary"
              startIcon={<UserIcon />}
              onClick={() => navigate("/account")}
              sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.78rem", display: { xs: "none", sm: "inline-flex" } }}
            >
              {user ? user.displayName?.split(" ")[0] || "Account" : "Account"}
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { width: 280, p: 2 } }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: MONO_FONT, letterSpacing: 0.8, mb: 2, display: "block" }}>
          {tagline}
        </Typography>
        <Stack spacing={0.5}>
          <ShopNavMobileItems onNavigate={handleMobileNav} onClose={() => setMobileOpen(false)} />
        </Stack>
      </Drawer>
    </>
  );
}
