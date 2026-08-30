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
import AdminSectionTitle from "../components/AdminSectionTitle.jsx";
import { BellIcon, BoxIcon, MailIcon } from "../components/icons.jsx";
import { INQUIRY_STATUS, useInquiries } from "../lib/inquiriesStore.jsx";
import { isUnseenOrder, useOrders } from "../lib/ordersStore.jsx";
import { sortOrdersByOrderNo } from "../lib/orderIds.js";
import { formatDateTime, resolveOrderPlacedAt } from "../lib/orderTimestamps.js";

function formatWhen(value) {
  return formatDateTime(value, { withSeconds: false, fallback: value || "—" });
}

function formatOrderWhen(order) {
  const latest = [...(order.trail ?? [])].sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  return formatWhen(latest?.at || resolveOrderPlacedAt(order) || order.createdAt || order.date);
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
  const { inquiries, unreadCount, setStatus } = useInquiries();
  const { orders, notificationCount, markOrderSeen } = useOrders();
  const [anchor, setAnchor] = useState(null);

  const unseenOrders = useMemo(
    () => sortOrdersByOrderNo(orders.filter(isUnseenOrder)).slice(0, 5),
    [orders],
  );

  const newInquiries = useMemo(
    () => inquiries.filter((q) => q.status === INQUIRY_STATUS.NEW).slice(0, 5),
    [inquiries],
  );

  const totalCount = unreadCount + notificationCount;
  const isEmpty = totalCount === 0;

  function tooltipLabel() {
    if (isEmpty) return "Notifications";
    const parts = [];
    if (notificationCount) parts.push(`${notificationCount} order alert${notificationCount === 1 ? "" : "s"}`);
    if (unreadCount) parts.push(`${unreadCount} new inquir${unreadCount === 1 ? "y" : "ies"}`);
    return parts.join(", ");
  }

  function openMenu(event) {
    setAnchor(event.currentTarget);
  }

  function goToOrder(orderId) {
    markOrderSeen(orderId);
    setAnchor(null);
    navigate(`/admin/orders/${encodeURIComponent(orderId)}`);
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
          <AdminSectionTitle>Notifications</AdminSectionTitle>
          <Typography variant="caption" color="text.secondary">
            {isEmpty
              ? "You're all caught up"
              : "Tap an item to review — other alerts stay until you open them"}
          </Typography>
        </Box>
        <Divider />

        <SectionHeader icon={BoxIcon} label="Order alerts" count={unseenOrders.length} />
        {unseenOrders.length === 0 ? (
          <MenuItem disabled sx={{ whiteSpace: "normal", py: 1.5, opacity: 0.7 }}>
            <Typography variant="body2" color="text.secondary">No order alerts.</Typography>
          </MenuItem>
        ) : (
          unseenOrders.map((order) => {
            const latest = [...(order.trail ?? [])].sort((a, b) => new Date(b.at) - new Date(a.at))[0];
            const hint = latest?.title?.includes("proof") || latest?.title === "Refund details submitted"
              ? latest.title
              : (order.payment === "Pending Verification" ? "New order — verify payment" : "Customer update");
            return (
            <MenuItem key={order.id} onClick={() => goToOrder(order.id)} sx={{ whiteSpace: "normal", alignItems: "flex-start", py: 1.5 }}>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", fontFamily: MONO_FONT }}>{order.id}</Typography>
                <Typography sx={{ fontSize: "0.82rem" }}>{order.customer} · {PESO.format(order.total)}</Typography>
                <Typography variant="caption" color="text.secondary">{hint} · {formatOrderWhen(order)}</Typography>
              </Stack>
            </MenuItem>
            );
          })
        )}

        <Divider sx={{ my: 0.5 }} />

        <SectionHeader icon={MailIcon} label="New inquiries" count={newInquiries.length} />
        {newInquiries.length === 0 ? (
          <MenuItem disabled sx={{ whiteSpace: "normal", py: 1.5, opacity: 0.7 }}>
            <Typography variant="body2" color="text.secondary">No new inquiries.</Typography>
          </MenuItem>
        ) : (
          newInquiries.map((inquiry) => (
            <MenuItem key={inquiry.id} onClick={() => goToInquiry(inquiry.id)} sx={{ whiteSpace: "normal", alignItems: "flex-start", py: 1.5 }}>
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>{inquiry.subject || "(no subject)"}</Typography>
                <Typography variant="caption" color="text.secondary">{inquiry.name} · {formatWhen(inquiry.date || inquiry.createdAt)}</Typography>
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
