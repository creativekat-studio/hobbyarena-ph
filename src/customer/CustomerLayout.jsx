import { useState } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Outlet } from "react-router-dom";
import { getSurfaces } from "../lib/surfaces.js";
import { useColorMode } from "../lib/colorMode.jsx";
import CustomerNavbar from "./CustomerNavbar.jsx";
import CartDrawer from "./CartDrawer.jsx";

export default function CustomerLayout() {
  const theme = useTheme();
  const { mode } = useColorMode();
  const isDarkMode = mode === "dark";
  const surfaces = getSurfaces(theme, isDarkMode);
  const [cartOpen, setCartOpen] = useState(false);

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
      <CustomerNavbar surfaces={surfaces} onOpenCart={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} surfaceBorderColor={surfaces.surfaceBorderColor} />
      <Outlet context={{ surfaces, isDarkMode }} />
    </Box>
  );
}
