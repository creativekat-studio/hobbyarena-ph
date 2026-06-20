import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { BellIcon, BoxIcon, MailIcon } from "../components/icons.jsx";
import { INQUIRY_STATUS, useInquiries } from "../lib/inquiriesStore.jsx";
import { isUnseenOrder, useOrders } from "../lib/ordersStore.jsx";

function formatWhen(value) {
  try {
    const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`);
    return date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return value;
  }
}

function SectionHeader({ icon: Icon, label, count }) {
  return (
    <Box sx={{ px: 2, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
      <Icon sx={{ fontSize: 16, color: "text.secondary" }} />
      <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "text.secondary", flexGrow: 1 }}>
        {label}
      </Typography>
      {count > 0 ? <Chip label={count} size="small" color="error" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} /> : null}
    </Box>
  );
}

export default function AdminNotificationBell({ surfaceBorderColor }) {
  const navigate = useNavigate();
  const { inquiries, unreadCount, setStatus, markAllNewAsRead } = useInquiries();
  const { orders, notificationCount, markOrderSeen, markAllOrdersSeen } = useOrders();
  const [anchor, setAnchor] = useState(null);
  const [menuSnapshot, setMenuSnapshot] = useState({ orders: [], inquiries: [] });

  const unseenOrders = useMemo(
    () => orders.filter(isUnseenOrder).slice(0, 5),
    [orders],
  );

  const newInquiries = useMemo(
    () => inquiries.filter((q) => q.status === INQUIRY_STATUS.NEW).slice(0, 5),
    [inquiries],
  );

  const totalCount = unreadCount + notificationCount;
  const isEmpty = totalCount === 0;

  const menuOrders = anchor ? menuSnapshot.orders : unseenOrders;
  const menuInquiries = anchor ? menuSnapshot.inquiries : newInquiries;

  function tooltipLabel() {
    if (isEmpty) return "Notifications";
    const parts = [];
    if (notificationCount) parts.push(`${notificationCount} new order${notificationCount === 1 ? "" : "s"}`);
    if (unreadCount) parts.push(`${unreadCount} new inquir${unreadCount === 1 ? "y" : "ies"}`);
    return parts.join(", ");
  }

  function openMenu(event) {
    setMenuSnapshot({ orders: unseenOrders, inquiries: newInquiries });
    markAllOrdersSeen();
    markAllNewAsRead();
    setAnchor(event.currentTarget);
  }

  function goToOrder(orderId) {
    markOrderSeen(orderId);
    setAnchor(null);
    navigate("/admin/orders", { state: { openOrderId: orderId } });
  }

  function goToInquiry(inquiryId) {
    setStatus(inquiryId, INQUIRY_STATUS.READ);
    setAnchor(null);
    navigate("/admin/inquiries", { state: { openInquiryId: inquiryId } });
  }

  function goTo(path) {
    setAnchor(null);
    navigate(path);
  }

  return (
    <>
      <Tooltip title={tooltipLabel()}>
        <IconButton color="inherit" onClick={openMenu} aria-label="Notifications">
          <Badge badgeContent={totalCount} color="error" invisible={isEmpty}>
            <BellIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: {
              width: 340,
              maxWidth: "92vw",
              mt: 1,
              border: "1px solid",
              borderColor: surfaceBorderColor,
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 800 }}>Notifications</Typography>
          <Typography variant="caption" color="text.secondary">
            {isEmpty
              ? "You're all caught up"
              : "Tap an item to review — opening this panel clears the badge"}
          </Typography>
        </Box>
        <Divider />

        <SectionHeader icon={BoxIcon} label="New orders" count={menuOrders.length} />
        {menuOrders.length === 0 ? (
          <MenuItem disabled sx={{ whiteSpace: "normal", py: 1.5, opacity: 0.7 }}>
            <Typography variant="body2" color="text.secondary">No new order alerts.</Typography>
          </MenuItem>
        ) : (
          menuOrders.map((order) => (
            <MenuItem key={order.id} onClick={() => goToOrder(order.id)} sx={{ whiteSpace: "normal", alignItems: "flex-start", py: 1.5 }}>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", fontFamily: MONO_FONT }}>{order.id}</Typography>
                <Typography sx={{ fontSize: "0.82rem" }}>{order.customer} · {PESO.format(order.total)}</Typography>
                <Typography variant="caption" color="text.secondary">{formatWhen(order.date)}</Typography>
              </Stack>
            </MenuItem>
          ))
        )}

        <Divider sx={{ my: 0.5 }} />

        <SectionHeader icon={MailIcon} label="New inquiries" count={menuInquiries.length} />
        {menuInquiries.length === 0 ? (
          <MenuItem disabled sx={{ whiteSpace: "normal", py: 1.5, opacity: 0.7 }}>
            <Typography variant="body2" color="text.secondary">No new inquiries.</Typography>
          </MenuItem>
        ) : (
          menuInquiries.map((inquiry) => (
            <MenuItem key={inquiry.id} onClick={() => goToInquiry(inquiry.id)} sx={{ whiteSpace: "normal", alignItems: "flex-start", py: 1.5 }}>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>{inquiry.subject || "(no subject)"}</Typography>
                <Typography variant="caption" color="text.secondary">{inquiry.name} · {formatWhen(inquiry.date)}</Typography>
              </Stack>
            </MenuItem>
          ))
        )}

        <Divider />
        <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            color="inherit"
            onClick={() => goTo("/admin/orders")}
            sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.68rem" }}
          >
            All orders
          </Button>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            color="inherit"
            onClick={() => goTo("/admin/inquiries")}
            sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.68rem" }}
          >
            All inquiries
          </Button>
        </Stack>
      </Menu>
    </>
  );
}
