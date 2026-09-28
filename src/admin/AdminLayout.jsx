import { useEffect, useState } from "react";
import {
  AppBar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { avatarStyles } from "../lib/surfaces.js";
import BrandLogo from "../components/BrandLogo.jsx";
import {
  BoxIcon,
  CardIcon,
  ChevronLeftIcon,
  CogIcon,
  InventoryIcon,
  MailIcon,
  MenuIcon,
  MoonIcon,
  SparkleIcon,
  SunIcon,
  UserIcon,
} from "../components/icons.jsx";
import FirebaseStatusCard from "../components/FirebaseStatusCard.jsx";
import { getSurfaces } from "../lib/surfaces.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { useInquiries } from "../lib/inquiriesStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import AdminNotificationBell from "./AdminNotificationBell.jsx";
import AdminStorefrontButton from "../components/AdminStorefrontButton.jsx";
import { AdminPageHeaderProvider, AdminPageHeaderToolbar, AdminPageHeaderMobileMeta } from "../components/AdminPageHeader.jsx";
import OrdersPage from "./OrdersPage.jsx";
import {
  isOrdersListPath,
  SHOW_ORDERS_LIST_EVENT,
  useGoToOrdersList,
} from "./ordersListNavigation.js";

const DRAWER_WIDTH = 248;
const RAIL_WIDTH = 72;
const NAV_COLLAPSED_KEY = "ha-admin-nav-collapsed";

function readNavCollapsed() {
  try {
    return window.sessionStorage.getItem(NAV_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

const NAV = [
  { label: "Dashboard", to: "/admin", end: true, icon: SparkleIcon },
  { label: "Orders", to: "/admin/orders", end: true, icon: BoxIcon, badgeKey: "orders" },
  { label: "Customers", to: "/admin/customers", icon: UserIcon },
  { label: "Inquiries", to: "/admin/inquiries", icon: MailIcon, badgeKey: "inquiries" },
  { label: "Inventory", to: "/admin/inventory", icon: InventoryIcon },
  { label: "Classifications", to: "/admin/catalog", icon: CardIcon },
  { label: "Design", to: "/admin/design", icon: SparkleIcon },
  { label: "CMS", to: "/admin/cms", icon: CardIcon },
  { label: "Emails", to: "/admin/emails", icon: MailIcon },
];

export default function AdminLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const goToOrdersList = useGoToOrdersList();
  const { mode, toggle } = useColorMode();
  const { unreadCount } = useInquiries();
  const { pendingCount: notificationCount } = useOrders();
  const { admin, signOutAdmin } = useAuth();
  const isDarkMode = mode === "dark";
  const surfaces = getSurfaces(theme, isDarkMode);
  const { surfaceBorderColor, navbarBackground } = surfaces;
  const [healthOpen, setHealthOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(readNavCollapsed);
  const [forceOrdersList, setForceOrdersList] = useState(false);

  useEffect(() => {
    function onShowOrdersList() {
      setForceOrdersList(true);
    }
    window.addEventListener(SHOW_ORDERS_LIST_EVENT, onShowOrdersList);
    return () => window.removeEventListener(SHOW_ORDERS_LIST_EVENT, onShowOrdersList);
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith("/admin/orders/") && !isOrdersListPath(location.pathname)) {
      setForceOrdersList(false);
    }
  }, [location.pathname]);

  const showOrdersList = forceOrdersList
    || isOrdersListPath(location.pathname)
    || isOrdersListPath(window.location.pathname);

  function toggleDesktopNav() {
    setNavCollapsed((prev) => {
      const next = !prev;
      try {
        window.sessionStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function handleSignOut() {
    await signOutAdmin();
    navigate("/admin/login", { replace: true });
  }

  function renderNav(onNavigate, collapsed = false) {
    return (
      <List sx={{ flexGrow: 1, px: collapsed ? 0.5 : 0, overflow: "visible" }}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const inquiryBadge = item.badgeKey === "inquiries" ? unreadCount : 0;
          const orderBadge = item.badgeKey === "orders" ? notificationCount : 0;
          const badgeCount = inquiryBadge || orderBadge;
          const button = (
            <ListItemButton
              key={item.label}
              component={NavLink}
              to={item.to}
              end={item.end}
              onClick={(event) => {
                onNavigate?.();
                if (item.to !== "/admin/orders") return;
                const onOrdersDetail = location.pathname.startsWith("/admin/orders/");
                const hrefIsList = isOrdersListPath(window.location.pathname);
                const routerIsList = isOrdersListPath(location.pathname);
                if (onOrdersDetail || (hrefIsList && !routerIsList)) {
                  event.preventDefault();
                  goToOrdersList(
                    location.pathname.includes("/consolidated/") ? "merged" : "individual",
                  );
                }
              }}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                px: collapsed ? 0 : 2,
                minHeight: collapsed ? 44 : undefined,
                justifyContent: collapsed ? "center" : "flex-start",
                alignItems: "center",
                color: "text.secondary",
                "& .MuiSvgIcon-root": { display: "block" },
                "&.active": {
                  color: "primary.main",
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  fontWeight: 700,
                },
                "&:hover": { color: "text.primary" },
              }}
            >
              {collapsed && badgeCount > 0 ? (
                <Badge
                  variant="dot"
                  color="warning"
                  overlap="circular"
                  sx={{ "& .MuiBadge-dot": { width: 8, height: 8, borderRadius: "50%" } }}
                >
                  <Icon sx={{ fontSize: 20 }} />
                </Badge>
              ) : (
                <Icon sx={{ fontSize: 20, mr: collapsed ? 0 : 1.5 }} />
              )}
              {!collapsed ? (
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.92rem",
                    flexGrow: 1,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </Typography>
              ) : null}
              {!collapsed && badgeCount > 0 ? (
                <Badge badgeContent={badgeCount} color="error" sx={{ mr: 1.5 }} />
              ) : null}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip key={item.label} title={item.label} placement="right">
              {button}
            </Tooltip>
          ) : button;
        })}
      </List>
    );
  }

  const drawerContent = (onNavigate, collapsed = false) => (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: collapsed ? 1 : 2 }}>
      <Stack alignItems="center" justifyContent="center" sx={{ px: collapsed ? 0 : 1, py: collapsed ? 1.5 : 2.5, mb: collapsed ? 1 : 1.5 }}>
        <BrandLogo
          sx={{ fontSize: collapsed ? 28 : 62, color: "primary.main" }}
          imageSx={{ height: collapsed ? 28 : 83 }}
        />
      </Stack>

      {renderNav(onNavigate, collapsed)}

      <Box sx={{ ...surfaces.panelSx, p: collapsed ? 0.75 : 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent={collapsed ? "center" : "flex-start"}>
          <Tooltip title={collapsed ? (admin?.displayName || "Admin") : ""} placement="right">
            <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0, ...avatarStyles(theme) }}>
              {admin?.displayName?.charAt(0) || "A"}
            </Box>
          </Tooltip>
          {!collapsed ? (
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {admin?.displayName || "Admin"}
              </Typography>
              <Chip label="ADMIN" size="small" color="primary" sx={{ height: 18, fontSize: "0.6rem", fontFamily: MONO_FONT, mt: 0.25 }} />
            </Box>
          ) : null}
        </Stack>
        {!collapsed ? (
          <>
            <Button fullWidth size="small" variant="outlined" color="inherit" onClick={handleSignOut} sx={{ mt: 1.5, borderColor: surfaceBorderColor }}>
              Sign out
            </Button>
            <AdminStorefrontButton
              fullWidth
              sx={{ mt: 1 }}
            />
          </>
        ) : null}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: "100dvh", display: "flex", overflow: "hidden", bgcolor: "background.default", color: "text.primary", backgroundImage: surfaces.pageBackground, backgroundAttachment: { xs: "scroll", md: "fixed" } }}>
      <Box
        component="nav"
        aria-label="Admin"
        sx={{
          display: { xs: "none", md: "block" },
          width: navCollapsed ? RAIL_WIDTH : DRAWER_WIDTH,
          minWidth: 0,
          flex: navCollapsed ? `0 0 ${RAIL_WIDTH}px` : `0 0 ${DRAWER_WIDTH}px`,
          overflow: "visible",
          transition: theme.transitions.create(["width", "flex-basis"], {
            duration: 280,
            easing: theme.transitions.easing.sharp,
          }),
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            borderRight: "1px solid",
            borderColor: surfaceBorderColor,
            bgcolor: navbarBackground,
            backdropFilter: "blur(20px)",
          }}
        >
          {drawerContent(undefined, navCollapsed)}
        </Box>
      </Box>

      <Drawer
        variant="temporary"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: Math.min(DRAWER_WIDTH, 300),
            boxSizing: "border-box",
            border: "none",
            bgcolor: navbarBackground,
            backdropFilter: "blur(20px)",
          },
        }}
      >
        {drawerContent(() => setMobileNavOpen(false))}
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AdminPageHeaderProvider>
          <AppBar position="static" color="transparent" elevation={0} sx={{ flexShrink: 0, bgcolor: navbarBackground, backdropFilter: "blur(20px)", borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
            <Toolbar disableGutters sx={{ px: { xs: 1.5, md: 2.5 }, minHeight: { xs: 64, md: 76 } }}>
              <IconButton
                size="small"
                color="inherit"
                aria-label="Open admin menu"
                onClick={() => setMobileNavOpen(true)}
                sx={{ display: { xs: "inline-flex", md: "none" }, mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
              <Tooltip title={navCollapsed ? "Expand navigation" : "Collapse navigation"}>
                <IconButton
                  size="small"
                  color="inherit"
                  aria-label={navCollapsed ? "Expand navigation" : "Collapse navigation"}
                  onClick={toggleDesktopNav}
                  sx={{ display: { xs: "none", md: "inline-flex" }, mr: 1 }}
                >
                  <ChevronLeftIcon
                    sx={{
                      transition: "transform 0.28s ease",
                      transform: navCollapsed ? "rotate(180deg)" : "none",
                    }}
                  />
                </IconButton>
              </Tooltip>
              <AdminPageHeaderToolbar
                surfaceBorderColor={surfaceBorderColor}
                notificationBell={<AdminNotificationBell surfaceBorderColor={surfaceBorderColor} />}
                themeToggle={(
                  <Tooltip title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
                    <IconButton size="small" onClick={toggle} color="inherit">{isDarkMode ? <SunIcon /> : <MoonIcon />}</IconButton>
                  </Tooltip>
                )}
                healthButton={(
                  <Tooltip title="System health & connection">
                    <IconButton size="small" onClick={() => setHealthOpen(true)} color="inherit"><CogIcon /></IconButton>
                  </Tooltip>
                )}
              />
            </Toolbar>
          </AppBar>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              py: { xs: 1, md: 1.5 },
              px: { xs: 1.25, md: 2.5 },
            }}
          >
            <AdminPageHeaderMobileMeta />
            {/*
              flex: 1 + minHeight: 0 + overflow: auto:
              - List pages (Orders / Inventory / Customers) fill this pane and
                scroll only their grid; header/filters stay put.
              - Content pages (Dashboard, CMS, …) keep natural height and scroll
                here when they overflow.
            */}
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                width: "100%",
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "auto",
              }}
            >
              {showOrdersList ? (
                <OrdersPage key={location.key} />
              ) : (
                <Outlet key={location.pathname} context={{ surfaces, isDarkMode }} />
              )}
            </Box>
          </Box>
        </AdminPageHeaderProvider>
      </Box>

      <Dialog open={healthOpen} onClose={() => setHealthOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>System health</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FirebaseStatusCard panelSx={surfaces.panelSx} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
