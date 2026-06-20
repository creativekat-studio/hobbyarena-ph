import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";

const PAYMENT_OPTIONS = [
  "Pending Verification",
  "Paid",
  "Rejected",
  "Deposit",
  "Unpaid",
  "Refunded",
];

const STATUS_OPTIONS = [
  "Pending Verification",
  "Reserved",
  "Awaiting stock",
  "Ready for pickup",
  "Processing",
  "Packing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const PAYMENT_COLOR = {
  "Pending Verification": "warning",
  Paid: "success",
  Rejected: "error",
  Deposit: "warning",
  Unpaid: "error",
  Refunded: "default",
};

const STATUS_COLOR = {
  "Pending Verification": "warning",
  Reserved: "default",
  "Awaiting stock": "warning",
  "Ready for pickup": "secondary",
  Processing: "warning",
  Packing: "info",
  Shipped: "info",
  Delivered: "success",
  Cancelled: "error",
};

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
    </svg>
  );
}

function ProofPreview({ proof, surfaceBorderColor }) {
  if (!proof) {
    return (
      <Box sx={{ p: 3, borderRadius: 1, border: "1px dashed", borderColor: surfaceBorderColor, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">No proof of payment uploaded for this order.</Typography>
      </Box>
    );
  }

  if (proof.startsWith("data:application/pdf")) {
    return (
      <Stack spacing={1.5} alignItems="flex-start">
        <Chip label="PDF receipt" size="small" color="primary" variant="outlined" />
        <Button component="a" href={proof} download="proof-of-payment.pdf" variant="outlined" size="small">
          Download proof
        </Button>
        <Box component="iframe" src={proof} title="Proof of payment" sx={{ width: "100%", height: 360, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }} />
      </Stack>
    );
  }

  return (
    <Box
      component="img"
      src={proof}
      alt="Proof of payment"
      sx={{
        width: "100%",
        maxHeight: 420,
        objectFit: "contain",
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: alpha("#000", 0.03),
      }}
    />
  );
}

export default function OrderDetailDialog({ order, open, onClose, panelSx, surfaceBorderColor, setPayment, setStatus }) {
  if (!order) return null;

  const address = order.address
    ? [order.address.street, order.address.city, order.address.province, order.address.postal].filter(Boolean).join(", ")
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: MONO_FONT }}>{order.id}</Typography>
          <Chip label={order.type} size="small" variant="outlined" />
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {order.date} · {order.customer} · {order.email}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: "absolute", right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Proof of payment</Typography>
            <ProofPreview proof={order.proofOfPayment} surfaceBorderColor={surfaceBorderColor} />
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2.5}>
              <Box sx={{ ...panelSx, p: 2 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 1 }}>Order total</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: "primary.main" }}>{PESO.format(order.total)}</Typography>
                {order.subtotal != null ? (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                    Subtotal {PESO.format(order.subtotal)} · Shipping {order.shippingFee === 0 ? "Free" : PESO.format(order.shippingFee)}
                  </Typography>
                ) : null}
              </Box>

              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>Payment status</Typography>
                <Select
                  fullWidth
                  size="small"
                  value={order.payment}
                  onChange={(e) => setPayment(order.id, e.target.value)}
                  renderValue={(value) => <Chip label={value} size="small" color={PAYMENT_COLOR[value] || "default"} variant="outlined" />}
                >
                  {PAYMENT_OPTIONS.map((payment) => (
                    <MenuItem key={payment} value={payment}>{payment}</MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
                  Set manually after reviewing the proof above.
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>Order status</Typography>
                <Select
                  fullWidth
                  size="small"
                  value={order.status}
                  onChange={(e) => setStatus(order.id, e.target.value)}
                  renderValue={(value) => <Chip label={value} size="small" color={STATUS_COLOR[value] || "default"} variant="outlined" />}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </Box>

              <Box sx={{ ...panelSx, p: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>Items</Typography>
                <Typography sx={{ fontSize: "0.88rem", lineHeight: 1.5 }}>{order.items}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: MONO_FONT }}>Qty {order.qty}</Typography>
              </Box>

              <Box sx={{ ...panelSx, p: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", mb: 1 }}>Fulfillment</Typography>
                <Typography sx={{ fontSize: "0.88rem" }}>
                  {order.fulfillment === "pickup" ? "Store pickup" : "Delivery"}
                  {order.region ? ` · ${order.region === "provincial" ? "Provincial" : "Metro Manila"}` : ""}
                </Typography>
                {address ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{address}</Typography> : null}
                {order.phone ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{order.phone}</Typography> : null}
                {order.notes ? <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: "italic" }}>Note: {order.notes}</Typography> : null}
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}

export { PAYMENT_OPTIONS, PAYMENT_COLOR, STATUS_OPTIONS, STATUS_COLOR };
