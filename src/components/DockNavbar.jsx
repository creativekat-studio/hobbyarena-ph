import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Drawer,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { groupIsActive, NAV_GROUPS, NAV_DESTINATIONS } from "../data/navDestinations.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCart } from "../lib/cartStore.jsx";
import BrandLogo from "./BrandLogo.jsx";
import {
  BoxIcon,
  CartIcon,
  MoonIcon,
  SearchIcon,
  SparkleIcon,
  SunIcon,
  UserIcon,
} from "./icons.jsx";

function MenuIcon(props) {
  return (
    <Box component="svg" viewBox="0 0 24 24" width={22} height={22} fill="currentColor" {...props}>
      <path d="M4 7h16v2H4V7zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
    </Box>
  );
}

function groupIcon(id) {
  if (id === "preorders") return SparkleIcon;
  return BoxIcon;
}

function MegaPanel({ group, onNavigate, onClose, surfaceBorderColor }) {
  const theme = useTheme();
  const Icon = groupIcon(group.id);
  const accent = group.accent || theme.palette.primary.main;

  return (
    <Box
      sx={{
        position: "absolute",
        top: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        width: { md: 480, lg: 520 },
        zIndex: 20,
        borderRadius: 2,
        border: "1px solid",
        borderColor: alpha(accent, 0.35),
        bgcolor: alpha(theme.palette.background.paper, 0.96),
        backdropFilter: "blur(20px)",
        boxShadow: `0 28px 64px ${alpha(theme.palette.common.black, 0.45)}, 0 0 0 1px ${alpha(accent, 0.12)}`,
        overflow: "hidden",
        animation: "dockPanelIn 220ms ease-out",
        "@keyframes dockPanelIn": {
          from: { opacity: 0, transform: "translateX(-50%) translateY(-8px)" },
          to: { opacity: 1, transform: "translateX(-50%) translateY(0)" },
        },
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: "1px solid",
          borderColor: surfaceBorderColor,
          background: `linear-gradient(135deg, ${alpha(accent, 0.14)} 0%, transparent 70%)`,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(accent, 0.16),
              color: accent,
            }}
          >
            <Icon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: "1.05rem" }}>{group.label}</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{group.tagline}</Typography>
          </Box>
        </Stack>
      </Box>
      <Grid container sx={{ p: 1.5 }}>
        {(group.items ?? []).map((item) => (
          <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
            <Button
              fullWidth
              onClick={() => {
                onNavigate(item);
                onClose();
              }}
              sx={{
                justifyContent: "flex-start",
                textAlign: "left",
                py: 1.5,
                px: 2,
                borderRadius: 1.5,
                color: "text.primary",
                "&:hover": { bgcolor: alpha(accent, 0.1) },
              }}
            >
              <Stack spacing={0.25} alignItems="flex-start">
                <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>{item.label}</Typography>
                {item.hint ? (
                  <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{item.hint}</Typography>
                ) : null}
              </Stack>
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function CatalogOverlay({ open, onClose, onNavigate, surfaceBorderColor }) {
  const theme = useTheme();

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: { xs: "88dvh", sm: "auto" },
          maxHeight: "92dvh",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          bgcolor: alpha(theme.palette.background.paper, 0.98),
          backdropFilter: "blur(24px)",
          borderTop: "1px solid",
          borderColor: surfaceBorderColor,
        },
      }}
    >
      <Box sx={{ p: { xs: 2.5, sm: 3 }, pb: 4 }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 99, bgcolor: "divider", mx: "auto", mb: 2.5 }} />
        <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.65rem", letterSpacing: 2, textTransform: "uppercase", color: "primary.main", fontWeight: 800, mb: 0.5 }}>
          Browse catalog
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Where are we headed?</Typography>

        <Stack spacing={3}>
          {NAV_GROUPS.map((group) => {
            const Icon = groupIcon(group.id);
            const accent = group.accent || theme.palette.primary.main;
            return (
              <Box key={group.id}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Icon sx={{ color: accent, fontSize: 20 }} />
                  <Typography sx={{ fontWeight: 800 }}>{group.label}</Typography>
                </Stack>
                <Grid container spacing={1}>
                  {(group.items ?? []).map((item) => (
                    <Grid size={{ xs: 6 }} key={item.label}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                          onNavigate(item);
                          onClose();
                        }}
                        sx={{
                          py: 1.75,
                          borderColor: surfaceBorderColor,
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          "&:hover": { borderColor: accent, bgcolor: alpha(accent, 0.08) },
                        }}
                      >
                        {item.label}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })}

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => {
                onNavigate(NAV_DESTINATIONS.home);
                onClose();
              }}
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
            >
              Home
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                onNavigate(NAV_DESTINATIONS.contact);
                onClose();
              }}
              sx={{ borderColor: surfaceBorderColor, fontWeight: 700 }}
            >
              Contact
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}

function DockSegment({ label, active, onClick, chevron, open }) {
  const theme = useTheme();

  return (
    <Button
      onClick={onClick}
      sx={{
        borderRadius: 999,
        px: { md: 2.25, lg: 2.75 },
        py: 1,
        minWidth: 0,
        color: active ? "primary.contrastText" : "text.secondary",
        bgcolor: active ? "primary.main" : "transparent",
        boxShadow: active ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.35)}` : "none",
        "&:hover": {
          bgcolor: active ? "primary.main" : alpha(theme.palette.primary.main, 0.08),
          color: active ? "primary.contrastText" : "text.primary",
        },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", letterSpacing: 0.2 }}>{label}</Typography>
        {chevron ? (
          <Typography sx={{ fontSize: "0.65rem", opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform 180ms ease" }}>
            ▾
          </Typography>
        ) : null}
      </Stack>
    </Button>
  );
}

export default function DockNavbar({ surfaces, onOpenCart, onOpenSearch }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useColorMode();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const [openGroup, setOpenGroup] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const dockRef = useRef(null);
  const isDarkMode = mode === "dark";
  const { surfaceBorderColor } = surfaces;
  const useImageLogo = theme.ha?.useImageLogo;
  const gold = theme.palette.primary.main;

  useEffect(() => {
    setOpenGroup(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dockRef.current && !dockRef.current.contains(event.target)) {
        setOpenGroup(null);
      }
    }
    if (openGroup) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [openGroup]);

  function handleItem(item) {
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

  function homeActive() {
    return location.pathname === "/" && !location.search;
  }

  function contactActive() {
    return location.pathname === "/contact";
  }

  return (
    <>
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          pt: { xs: 1.25, md: 1.75 },
          pb: { xs: 1.25, md: 1.5 },
          px: { xs: 1.5, md: 0 },
          bgcolor: alpha(theme.palette.background.default, 0.72),
          backdropFilter: "blur(16px)",
        }}
      >
        <Container maxWidth="lg">
          {/* Desktop — logo, dock, and utilities in one row */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ display: { xs: "none", lg: "flex" }, minHeight: 56 }}
          >
            <Stack
              direction="row"
              alignItems="center"
              onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              sx={{ cursor: "pointer", flexShrink: 0 }}
            >
              <BrandLogo
                sx={{
                  fontSize: 34,
                  color: "primary.main",
                  filter: useImageLogo ? undefined : `drop-shadow(0 0 12px ${alpha(gold, 0.5)})`,
                }}
                imageSx={{ height: 48 }}
              />
            </Stack>

            <Box ref={dockRef} sx={{ position: "relative", flex: 1, display: "flex", justifyContent: "center" }}>
              <Stack
                direction="row"
                alignItems="center"
                sx={{
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: alpha(gold, 0.28),
                  bgcolor: alpha(theme.palette.background.paper, 0.82),
                  backdropFilter: "blur(20px)",
                  boxShadow: isDarkMode
                    ? `0 16px 48px ${alpha("#000", 0.4)}, inset 0 1px 0 ${alpha(gold, 0.12)}`
                    : `0 12px 32px ${alpha("#1E3A8A", 0.1)}, inset 0 1px 0 ${alpha("#fff", 0.8)}`,
                  px: 0.75,
                  py: 0.75,
                }}
              >
                <DockSegment label="Home" active={homeActive()} onClick={() => handleItem(NAV_DESTINATIONS.home)} />
                {NAV_GROUPS.map((group) => (
                  <Box key={group.id} sx={{ position: "relative" }}>
                    <DockSegment
                      label={group.label}
                      active={openGroup === group.id || groupIsActive(location.pathname, location.search, group)}
                      onClick={() => setOpenGroup((prev) => (prev === group.id ? null : group.id))}
                      chevron
                      open={openGroup === group.id}
                    />
                    {openGroup === group.id ? (
                      <MegaPanel group={group} onNavigate={handleItem} onClose={() => setOpenGroup(null)} surfaceBorderColor={surfaceBorderColor} />
                    ) : null}
                  </Box>
                ))}
                <DockSegment label="Contact" active={contactActive()} onClick={() => handleItem(NAV_DESTINATIONS.contact)} />
              </Stack>
            </Box>

            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
              <Tooltip title="Search">
                <IconButton color="inherit" aria-label="Search" onClick={onOpenSearch}>
                  <SearchIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={isDarkMode ? "Light mode" : "Dark mode"}>
                <IconButton onClick={toggle} color="inherit" size="small">
                  {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Cart">
                <IconButton color="inherit" onClick={onOpenCart} size="small">
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
                sx={{
                  borderColor: surfaceBorderColor,
                  fontFamily: MONO_FONT,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  fontSize: "0.72rem",
                  py: 0.65,
                }}
              >
                {user ? user.displayName?.split(" ")[0] || "Account" : "Account"}
              </Button>
            </Stack>
          </Stack>

          {/* Mobile — logo + utilities, then browse */}
          <Stack spacing={1.25} sx={{ display: { xs: "flex", lg: "none" } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack
                direction="row"
                alignItems="center"
                onClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                sx={{ cursor: "pointer" }}
              >
                <BrandLogo
                  sx={{
                    fontSize: 28,
                    color: "primary.main",
                    filter: useImageLogo ? undefined : `drop-shadow(0 0 12px ${alpha(gold, 0.5)})`,
                  }}
                  imageSx={{ height: 40 }}
                />
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconButton onClick={toggle} color="inherit" size="small">
                  {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </IconButton>
                <IconButton color="inherit" onClick={onOpenCart} size="small">
                  <Badge badgeContent={itemCount} color="primary" invisible={itemCount === 0}>
                    <CartIcon />
                  </Badge>
                </IconButton>
                <IconButton color="inherit" onClick={() => navigate("/account")} size="small">
                  <UserIcon />
                </IconButton>
              </Stack>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => setCatalogOpen(true)}
              startIcon={<MenuIcon />}
              sx={{
                borderRadius: 999,
                py: 1.15,
                fontFamily: MONO_FONT,
                letterSpacing: 1,
                textTransform: "uppercase",
                fontSize: "0.78rem",
                boxShadow: `0 12px 32px ${alpha(gold, 0.25)}`,
              }}
            >
              Browse catalog
            </Button>
          </Stack>
        </Container>
      </Box>

      <CatalogOverlay open={catalogOpen} onClose={() => setCatalogOpen(false)} onNavigate={handleItem} surfaceBorderColor={surfaceBorderColor} />
    </>
  );
}
