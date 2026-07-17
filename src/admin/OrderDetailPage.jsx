import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { ArchiveIcon, RestoreIcon } from "../components/icons.jsx";
import { isArchivedOrder, useOrders } from "../lib/ordersStore.jsx";
import { ORDER_STATUS_EMAIL_LABELS } from "../lib/orderEmailTriggers.js";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";
import {
  OrderDetailLayout,
} from "./orderDetailShared.jsx";

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const {
    orders,
    setPaymentAndStatus,
    setAllocation,
    markOrderSeen,
    addTrailEntry,
    uploadTrailProof,
    sendOrderStatusEmail,
    archiveOrders,
    restoreOrders,
  } = useOrders();
  const [emailNotice, setEmailNotice] = useState(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const order = orders.find((row) => row.id === orderId) ?? null;
  const archived = order ? isArchivedOrder(order) : false;

  useEffect(() => {
    if (orderId) markOrderSeen(orderId);
  }, [orderId, markOrderSeen]);

  useEffect(() => {
    function onEmailSent(event) {
      setEmailNotice(event.detail || null);
    }
    window.addEventListener("hobbyarena:email-sent", onEmailSent);
    return () => window.removeEventListener("hobbyarena:email-sent", onEmailSent);
  }, []);

  if (!order) {
    return (
      <Stack spacing={ADMIN_PAGE_SPACING}>
        <Button
          component={RouterLink}
          to="/admin/orders"
          startIcon={<BackIcon />}
          sx={{ alignSelf: "flex-start", fontFamily: MONO_FONT, fontSize: "0.82rem" }}
        >
          Back to orders
        </Button>
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>Order not found</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>This order may have been removed or the link is invalid.</Typography>
          <Button variant="contained" onClick={() => navigate("/admin/orders")}>View all orders</Button>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      <Snackbar
        open={Boolean(emailNotice)}
        autoHideDuration={8000}
        onClose={() => setEmailNotice(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setEmailNotice(null)}
          severity={emailNotice?.ok && !emailNotice?.skipped ? "success" : emailNotice?.skipped ? "warning" : "error"}
          sx={{ width: "100%" }}
        >
          {emailNotice?.ok && !emailNotice?.skipped
            ? `Email sent to ${emailNotice.to} (${ORDER_STATUS_EMAIL_LABELS[emailNotice.emailType] || emailNotice.emailType}).`
            : emailNotice?.skipped
              ? `Email not delivered: ${emailNotice.skipReason || "Resend test mode."}`
              : `Email failed: ${emailNotice?.error || "Unknown error"}`}
        </Alert>
      </Snackbar>

      <Button
        component={RouterLink}
        to="/admin/orders"
        startIcon={<BackIcon />}
        sx={{ alignSelf: "flex-start", fontFamily: MONO_FONT, fontSize: "0.82rem", color: "text.secondary" }}
      >
        Back to orders
      </Button>

      <AdminPageHeader
        eyebrow={archived ? "Archived order" : "Order detail"}
        title={order.id}
        subtitle={`${order.date} · ${order.customer} · ${order.email}`}
        action={(
          archived ? (
            <Tooltip title="Restore">
              <IconButton aria-label="Restore order" color="primary" onClick={() => restoreOrders([order.id])}>
                <RestoreIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Archive">
              <IconButton aria-label="Archive order" onClick={() => setArchiveConfirmOpen(true)} sx={{ color: "text.secondary" }}>
                <ArchiveIcon />
              </IconButton>
            </Tooltip>
          )
        )}
      />

      <Box
        sx={{
          height: { xs: "auto", lg: "calc(100dvh - 220px)" },
          minHeight: { lg: 480 },
        }}
      >
        <OrderDetailLayout
          order={order}
          panelSx={panelSx}
          surfaceBorderColor={surfaceBorderColor}
          addTrailEntry={addTrailEntry}
          setPaymentAndStatus={setPaymentAndStatus}
          setAllocation={setAllocation}
          uploadTrailProof={uploadTrailProof}
          sendOrderStatusEmail={sendOrderStatusEmail}
        />
      </Box>

      <TypeConfirmDialog
        open={archiveConfirmOpen}
        onClose={() => setArchiveConfirmOpen(false)}
        onConfirm={() => archiveOrders([order.id])}
        title="Archive order"
        description="Archive this order. It will be hidden from active queues and dashboard stats, but can be restored from the Archived filter."
        confirmLabel="Archive"
        confirmWord="archive"
        surfaceBorderColor={surfaceBorderColor}
      />
    </Stack>
  );
}
