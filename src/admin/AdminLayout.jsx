import { useState } from "react";
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
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { avatarStyles } from "../lib/surfaces.js";
import BrandLogo from "../components/BrandLogo.jsx";
import {
  BoxIcon,
  CardIcon,
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

const DRAWER_WIDTH = 248;

const NAV = [
  { label: "Dashboard", to: "/admin", end: true, icon: SparkleIcon },
  { label: "Orders", to: "/admin/orders", icon: BoxIcon, badgeKey: "orders" },
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
  const { mode, toggle } = useColorMode();
  const { unreadCount } = useInquiries();
  const { pendingCount: notificationCount } = useOrders();
  const { admin, signOutAdmin } = useAuth();
  const isDarkMode = mode === "dark";
  const surfaces = getSurfaces(theme, isDarkMode);
  const { surfaceBorderColor, navbarBackground } = surfaces;
  const [healthOpen, setHealthOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleSignOut() {
    await signOutAdmin();
    navigate("/admin/login", { replace: true });
  }

  function renderNav(onNavigate) {
    return (
      <List sx={{ flexGrow: 1 }}>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.label}
              component={NavLink}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                color: "text.secondary",
                "&.active": {
                  color: "primary.main",
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  fontWeight: 700,
                },
                "&:hover": { color: "text.primary" },
              }}
            >
              <Icon sx={{ fontSize: 20, mr: 1.5 }} />
              <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", flexGrow: 1 }}>{item.label}</Typography>
              {item.badgeKey === "inquiries" && unreadCount > 0 ? (
                <Badge badgeContent={unreadCount} color="primary" sx={{ mr: 1.5 }} />
              ) : null}
              {item.badgeKey === "orders" && notificationCount > 0 ? (
                <Badge badgeContent={notificationCount} color="error" sx={{ mr: 1.5 }} />
              ) : null}
            </ListItemButton>
          );
        })}
      </List>
    );
  }

  const drawerContent = (onNavigate) => (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2 }}>
      <Stack alignItems="center" justifyContent="center" sx={{ px: 1, py: 2.5, mb: 1.5 }}>
        <BrandLogo sx={{ fontSize: 62, color: "primary.main" }} imageSx={{ height: 83 }} />
      </Stack>

      {renderNav(onNavigate)}

      <Box sx={{ ...surfaces.panelSx, p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, ...avatarStyles(theme) }}>
            {admin?.displayName?.charAt(0) || "A"}
          </Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {admin?.displayName || "Admin"}
            </Typography>
            <Chip label="ADMIN" size="small" color="primary" sx={{ height: 18, fontSize: "0.6rem", fontFamily: MONO_FONT, mt: 0.25 }} />
          </Box>
        </Stack>
        <Button fullWidth size="small" variant="outlined" color="inherit" onClick={handleSignOut} sx={{ mt: 1.5, borderColor: surfaceBorderColor }}>
          Sign out
        </Button>
        <AdminStorefrontButton
          fullWidth
          sx={{ mt: 1 }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: "100dvh", display: "flex", overflow: "hidden", bgcolor: "background.default", color: "text.primary", backgroundImage: surfaces.pageBackground, backgroundAttachment: { xs: "scroll", md: "fixed" } }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            border: "none",
            borderRight: "1px solid",
            borderColor: surfaceBorderColor,
            bgcolor: navbarBackground,
            backdropFilter: "blur(20px)",
          },
        }}
        open
      >
        {drawerContent()}
      </Drawer>

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
              <Outlet context={{ surfaces, isDarkMode }} />
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
