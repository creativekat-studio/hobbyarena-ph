import { useEffect, useState } from "react";
import { Box, Container } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Outlet, useLocation } from "react-router-dom";
import { getSurfaces } from "../lib/surfaces.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { useCms } from "../lib/cmsContent.jsx";
import { shouldShowLandingPage } from "../lib/siteAccess.js";
import { useCart } from "../lib/cartStore.jsx";
import StorefrontNavbar from "../components/StorefrontNavbar.jsx";
import CartDrawer from "./CartDrawer.jsx";
import SearchDialog from "../components/SearchDialog.jsx";
import StorefrontFooter from "../components/StorefrontFooter.jsx";
import LandingPage from "./LandingPage.jsx";

export default function CustomerLayout() {
  const theme = useTheme();
  const { mode } = useColorMode();
  const isDarkMode = mode === "dark";
  const { content, hydrated } = useCms();
  const location = useLocation();
  const surfaces = getSurfaces(theme, isDarkMode);
  const { drawerOpen, openCart, closeCart } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const showLanding = hydrated && shouldShowLandingPage(content.storefront?.landingMode, location.search, location.pathname);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  const isAccount = location.pathname === "/account" || location.pathname.startsWith("/account/");
  const isCheckout = location.pathname === "/checkout";
  const showGlobalFooter = !isCheckout && !isAccount;

  if (!hydrated) {
    return (
      <Box
        sx={{
          minHeight: "100dvh",
          bgcolor: "background.default",
          backgroundImage: surfaces.pageBackground,
          backgroundAttachment: { xs: "scroll", md: "fixed" },
        }}
      />
    );
  }

  if (showLanding) {
    return (
      <Box
        sx={{
          minHeight: "100dvh",
          bgcolor: "background.default",
          color: "text.primary",
          backgroundImage: surfaces.pageBackground,
          backgroundAttachment: { xs: "scroll", md: "fixed" },
        }}
      >
        <LandingPage surfaces={surfaces} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        color: "text.primary",
        backgroundImage: surfaces.pageBackground,
        backgroundAttachment: { xs: "scroll", md: "fixed" },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <StorefrontNavbar surfaces={surfaces} onOpenCart={openCart} onOpenSearch={() => setSearchOpen(true)} />
      <CartDrawer open={drawerOpen} onClose={closeCart} surfaceBorderColor={surfaces.surfaceBorderColor} isDarkMode={isDarkMode} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} surfaceBorderColor={surfaces.surfaceBorderColor} />
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Outlet context={{ surfaces, isDarkMode }} />
      </Box>
      {showGlobalFooter ? (
        <Container maxWidth="lg" sx={{ pb: 4 }}>
          <StorefrontFooter surfaceBorderColor={surfaces.surfaceBorderColor} heroTagline={content.hero?.tagline} />
        </Container>
      ) : null}
    </Box>
  );
}
