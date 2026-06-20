import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
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
import {
  BrandMark,
  CartIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  UserIcon,
} from "../components/icons.jsx";

const SECTIONS = [
  { label: "Home", to: "/" },
  { label: "Sealed", to: "/", section: "sealed" },
  { label: "Pre-orders", to: "/", section: "preorders" },
  { label: "Contact", to: "/", section: "contact" },
];

export default function CustomerNavbar({ surfaces, onOpenCart }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useColorMode();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const isDarkMode = mode === "dark";
  const { navbarBackground, surfaceBorderColor } = surfaces;

  function handleNav(item) {
    if (item.section) {
      if (location.pathname !== "/") {
        navigate("/", { state: { scrollTo: item.section } });
      } else {
        document.getElementById(item.section)?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    navigate(item.to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        bgcolor: navbarBackground,
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid",
        borderColor: surfaceBorderColor,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: { xs: 62, md: 72 }, gap: 1.5 }}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            onClick={() => handleNav({ to: "/" })}
            sx={{ minWidth: 0, cursor: "pointer" }}
          >
            <BrandMark sx={{ fontSize: { xs: 30, md: 36 }, color: "primary.main", filter: `drop-shadow(0 0 12px ${alpha(theme.palette.primary.main, 0.5)})` }} />
            <Stack sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>
                Hobby Arena
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: MONO_FONT, letterSpacing: 1.2, textTransform: "uppercase", fontSize: "0.6rem" }}>
                Premium TCG
              </Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 2, display: { xs: "none", md: "flex" } }}>
            {SECTIONS.map((item) => (
              <Button
                key={item.label}
                color="inherit"
                onClick={() => handleNav(item)}
                sx={{ fontWeight: 700, color: "text.secondary", "&:hover": { color: "text.primary" } }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <TextField
            size="small"
            placeholder="Search sealed, pre-orders…"
            sx={{ display: { xs: "none", lg: "block" }, width: 240 }}
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
            sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.78rem" }}
          >
            {user ? user.displayName?.split(" ")[0] || "Account" : "Account"}
          </Button>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
