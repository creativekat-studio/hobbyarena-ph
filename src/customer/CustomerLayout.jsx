import { useEffect, useState } from "react";
import { Box, Container } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Outlet, useLocation } from "react-router-dom";
import { getSurfaces } from "../lib/surfaces.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { useCms } from "../lib/cmsContent.jsx";
import StorefrontNavbar from "../components/StorefrontNavbar.jsx";
import CartDrawer from "./CartDrawer.jsx";
import SearchDialog from "../components/SearchDialog.jsx";
import StorefrontFooter from "../components/StorefrontFooter.jsx";

export default function CustomerLayout() {
  const theme = useTheme();
  const { mode } = useColorMode();
  const isDarkMode = mode === "dark";
  const { content } = useCms();
  const location = useLocation();
  const surfaces = getSurfaces(theme, isDarkMode);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setSearchOpen(false);
  }, [location.pathname]);

  const showGlobalFooter = !["/checkout"].includes(location.pathname);

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
      <StorefrontNavbar surfaces={surfaces} onOpenCart={() => setCartOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} surfaceBorderColor={surfaces.surfaceBorderColor} isDarkMode={isDarkMode} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} surfaceBorderColor={surfaces.surfaceBorderColor} />
      <Box sx={{ flexGrow: 1 }}>
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
