import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "./ProductCard.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { openOrdersByProductId } from "../data/orderWorkflow.js";
import { useMemo } from "react";

function DetailRow({ label, value, mono = false, strong = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="baseline">
      <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: "0.88rem",
          fontWeight: strong ? 800 : 600,
          fontFamily: mono ? MONO_FONT : undefined,
          textAlign: "right",
          color: strong ? "primary.main" : "text.primary",
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Read-only inventory snapshot for a product referenced by an order line.
 */
export default function ProductStockDetailsDialog({
  open,
  productId,
  productName,
  onClose,
}) {
  const theme = useTheme();
  const { inventoryById, items } = useInventory();
  const { orders } = useOrders();

  const row = useMemo(() => {
    if (!productId) return null;
    const direct = inventoryById.get(productId);
    if (direct) return direct;
    return items.find((entry) => entry.sku === productId || entry.id === productId) ?? null;
  }, [inventoryById, items, productId]);

  const openOrderIds = useMemo(() => {
    if (!row?.id) return [];
    return openOrdersByProductId(orders).get(row.id) ?? [];
  }, [orders, row?.id]);

  const price = Number(row?.price) || 0;
  const cost = Number(row?.cost) || 0;
  const margin = price - cost;
  const stock = Number(row?.stock) || 0;
  const type = row?.type || row?.tag || "—";
  const isPreorder = type === "Pre-order";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "1rem", lineHeight: 1.3 }}>
          Stock details
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mt: 0.35 }}>
          {row?.name || productName || "Product"}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {!row ? (
          <Typography sx={{ color: "text.secondary", fontSize: "0.88rem" }}>
            No matching inventory record for this line item
            {productId ? ` (${productId})` : ""}.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 1,
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {row.image ? (
                  <Box
                    component="img"
                    src={row.image}
                    alt=""
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", fontFamily: MONO_FONT }}>
                    NO IMG
                  </Typography>
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.85rem" }}>
                  {row.sku || row.id}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                  <Chip
                    size="small"
                    label={type}
                    color={isPreorder ? "secondary" : "default"}
                    variant="outlined"
                    sx={{ height: 22, fontSize: "0.65rem" }}
                  />
                  <Chip
                    size="small"
                    label={row.published ? "Live" : "Hidden"}
                    color={row.published ? "success" : "default"}
                    variant="outlined"
                    sx={{ height: 22, fontSize: "0.65rem" }}
                  />
                </Stack>
              </Box>
            </Stack>

            <Divider />

            <Stack spacing={0.85}>
              <DetailRow label="Line" value={row.line || "—"} />
              <DetailRow label="Unit price" value={PESO.format(price)} />
              <DetailRow label="Unit cost" value={PESO.format(cost)} />
              <DetailRow
                label="Margin / unit"
                value={PESO.format(margin)}
                strong
              />
              <DetailRow label="Stock on hand" value={String(stock)} mono strong />
              <DetailRow
                label="Stock value (cost)"
                value={PESO.format(stock * cost)}
                mono
              />
              <DetailRow
                label="Open orders"
                value={openOrderIds.length ? String(openOrderIds.length) : "None"}
                mono
              />
            </Stack>

            {openOrderIds.length ? (
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                }}
              >
                <Typography
                  sx={{
                    fontFamily: MONO_FONT,
                    fontSize: "0.65rem",
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: "text.secondary",
                    mb: 0.75,
                  }}
                >
                  Holding this SKU
                </Typography>
                <Stack spacing={0.35}>
                  {openOrderIds.slice(0, 8).map((orderId) => (
                    <Typography
                      key={orderId}
                      component={RouterLink}
                      to={`/admin/orders/${encodeURIComponent(orderId)}`}
                      onClick={onClose}
                      sx={{
                        fontFamily: MONO_FONT,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: "primary.main",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {orderId}
                    </Typography>
                  ))}
                  {openOrderIds.length > 8 ? (
                    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                      +{openOrderIds.length - 8} more
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {row ? (
          <Button
            component={RouterLink}
            to="/admin/inventory"
            onClick={onClose}
            size="small"
            sx={{ fontFamily: MONO_FONT, textTransform: "uppercase", letterSpacing: 0.4 }}
          >
            Open inventory
          </Button>
        ) : null}
        <Button
          onClick={onClose}
          variant="contained"
          size="small"
          sx={{ fontFamily: MONO_FONT, textTransform: "uppercase", letterSpacing: 0.4 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
