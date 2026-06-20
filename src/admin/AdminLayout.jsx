import {
  AppBar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
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
import { getSurfaces } from "../lib/surfaces.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { useInquiries } from "../lib/inquiriesStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import AdminNotificationBell from "./AdminNotificationBell.jsx";
import {
  BoxIcon,
  BrandMark,
  CardIcon,
  InventoryIcon,
  MailIcon,
  MoonIcon,
  SparkleIcon,
  SunIcon,
  UserIcon,
} from "../components/icons.jsx";

const DRAWER_WIDTH = 248;

const NAV = [
  { label: "Dashboard", to: "/admin", end: true, icon: SparkleIcon },
  { label: "Orders", to: "/admin/orders", icon: BoxIcon, badgeKey: "orders" },
  { label: "Customers", to: "/admin/customers", icon: UserIcon },
  { label: "Inquiries", to: "/admin/inquiries", icon: MailIcon, badgeKey: "inquiries" },
  { label: "Inventory", to: "/admin/inventory", icon: InventoryIcon },
  { label: "CMS", to: "/admin/cms", icon: CardIcon },
];

export default function AdminLayout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const { unreadCount } = useInquiries();
  const { pendingCount: notificationCount } = useOrders();
  const { user, signOut } = useAuth();
  const isDarkMode = mode === "dark";
  const surfaces = getSurfaces(theme, isDarkMode);
  const { surfaceBorderColor, navbarBackground } = surfaces;

  async function handleSignOut() {
    await signOut();
    navigate("/admin/login", { replace: true });
  }

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 1, py: 1.5, mb: 1 }}>
        <BrandMark sx={{ fontSize: 32, color: "primary.main" }} />
        <Box>
          <Typography sx={{ fontWeight: 800, lineHeight: 1, fontFamily: theme.typography.h5.fontFamily }}>Hobby Arena</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: MONO_FONT, letterSpacing: 1, fontSize: "0.58rem" }}>
            ADMIN PORTAL
          </Typography>
        </Box>
      </Stack>

      <List sx={{ flexGrow: 1 }}>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.label}
              component={NavLink}
              to={item.to}
              end={item.end}
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

      <Box sx={{ ...surfaces.panelSx, p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, background: `linear-gradient(135deg, ${theme.palette.primary.main}, #06b6d4)` }}>
            {user?.displayName?.charAt(0) || "A"}
          </Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.displayName || "Admin"}
            </Typography>
            <Chip label="ADMIN" size="small" color="primary" sx={{ height: 18, fontSize: "0.6rem", fontFamily: MONO_FONT, mt: 0.25 }} />
          </Box>
        </Stack>
        <Button fullWidth size="small" variant="outlined" color="inherit" onClick={handleSignOut} sx={{ mt: 1.5, borderColor: surfaceBorderColor }}>
          Sign out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", color: "text.primary", backgroundImage: surfaces.pageBackground, backgroundAttachment: { xs: "scroll", md: "fixed" } }}>
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
        {drawerContent}
      </Drawer>

      <Box sx={{ ml: { md: `${DRAWER_WIDTH}px` } }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ bgcolor: navbarBackground, backdropFilter: "blur(20px)", borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
          <Toolbar sx={{ gap: 1.5 }}>
            <Typography sx={{ fontWeight: 800, flexGrow: 1, fontFamily: theme.typography.h6.fontFamily }}>
              Admin
            </Typography>
            <AdminNotificationBell surfaceBorderColor={surfaceBorderColor} />
            <Tooltip title="View storefront">
              <Button size="small" variant="outlined" color="inherit" onClick={() => navigate("/")} sx={{ borderColor: surfaceBorderColor }}>
                Storefront ↗
              </Button>
            </Tooltip>
            <Tooltip title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton onClick={toggle} color="inherit">{isDarkMode ? <SunIcon /> : <MoonIcon />}</IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, sm: 3, lg: 4, xl: 5 } }}>
          <Outlet context={{ surfaces, isDarkMode }} />
        </Container>
      </Box>
    </Box>
  );
}
