import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";
import { AdminTableHeaderCell } from "./adminTableHeader.jsx";
import { useCustomers } from "../lib/customersStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { sortOrdersByOrderNo } from "../lib/orderIds.js";
import { PESO } from "../components/ProductCard.jsx";
import {
  deleteCustomersByIds,
  deleteOrdersAndRestock,
} from "../lib/firebase/repositories/demoReset.js";

/**
 * Localhost / Vercel preview danger zone: selectively delete demo customers or
 * orders. Deleting an order restores committed in-stock quantities. No wipe-all.
 */
export default function DemoDataResetPanel({ panelSx, surfaceBorderColor }) {
  const { customers } = useCustomers();
  const { orders } = useOrders();

  const [customerQuery, setCustomerQuery] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(() => new Set());
  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set());
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const customerRows = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const rows = (customers || []).map((customer) => ({
      id: String(customer.uid || customer.id || customer.email || "").trim(),
      name: customer.name || "—",
      email: customer.email || "—",
      joined: customer.joined || "—",
    })).filter((row) => row.id);
    if (!q) return rows;
    return rows.filter((row) => (
      row.name.toLowerCase().includes(q)
      || row.email.toLowerCase().includes(q)
      || row.id.toLowerCase().includes(q)
    ));
  }, [customers, customerQuery]);

  const orderRows = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    const rows = sortOrdersByOrderNo(orders || []).map((order) => ({
      id: String(order.id || "").trim(),
      customer: order.customer || "—",
      email: order.email || "—",
      total: Number(order.total) || 0,
    })).filter((row) => row.id);
    if (!q) return rows;
    return rows.filter((row) => (
      row.id.toLowerCase().includes(q)
      || row.customer.toLowerCase().includes(q)
      || row.email.toLowerCase().includes(q)
    ));
  }, [orders, orderQuery]);

  function toggleId(setter, id) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(setter, ids, checked) {
    setter(() => (checked ? new Set(ids) : new Set()));
  }

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    setResult(null);
    try {
      if (confirm.kind === "orders") {
        const summary = await deleteOrdersAndRestock([...selectedOrderIds]);
        setSelectedOrderIds(new Set());
        setResult({
          ok: true,
          message: `Deleted ${summary.ordersDeleted} order${summary.ordersDeleted === 1 ? "" : "s"}. Restocked ${summary.unitsRestocked} unit${summary.unitsRestocked === 1 ? "" : "s"} across ${summary.productsRestocked} product${summary.productsRestocked === 1 ? "" : "s"}.`,
        });
      } else {
        const summary = await deleteCustomersByIds([...selectedCustomerIds]);
        setSelectedCustomerIds(new Set());
        setResult({
          ok: true,
          message: `Deleted ${summary.customersDeleted} customer${summary.customersDeleted === 1 ? "" : "s"}. Their orders were not removed — delete those separately to restock.`,
        });
      }
    } catch (error) {
      setResult({
        ok: false,
        message: error?.message || "Delete failed.",
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const customerIds = customerRows.map((row) => row.id);
  const orderIds = orderRows.map((row) => row.id);
  const allCustomersSelected = customerIds.length > 0
    && customerIds.every((id) => selectedCustomerIds.has(id));
  const allOrdersSelected = orderIds.length > 0
    && orderIds.every((id) => selectedOrderIds.has(id));

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography
            sx={{
              fontFamily: MONO_FONT,
              fontWeight: 800,
              fontSize: "0.72rem",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: "error.main",
            }}
          >
            Danger zone
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", mt: 0.5 }}>
            Delete demo customers & orders
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mt: 0.75, lineHeight: 1.5, maxWidth: 720 }}>
            Localhost and Vercel preview only. Pick rows to delete — there is no wipe-all.
            Deleting an <strong>order</strong> restores its committed in-stock units.
            Deleting a <strong>customer</strong> removes the profile only (orders stay until you delete them).
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack spacing={1.25}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <Typography sx={{ fontWeight: 800, flex: 1 }}>Customers</Typography>
                <TextField
                  size="small"
                  placeholder="Filter name / email…"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  sx={{ minWidth: { sm: 200 } }}
                />
                <Button
                  variant="outlined"
                  color="error"
                  disabled={busy || selectedCustomerIds.size === 0}
                  onClick={() => setConfirm({
                    kind: "customers",
                    title: "Delete selected customers",
                    description: `Permanently delete ${selectedCustomerIds.size} customer profile${selectedCustomerIds.size === 1 ? "" : "s"}. Orders are not deleted. Type delete to continue.`,
                  })}
                  sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4, textTransform: "uppercase" }}
                >
                  Delete selected ({selectedCustomerIds.size})
                </Button>
              </Stack>

              <TableContainer sx={{ maxHeight: 360, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={allCustomersSelected}
                          indeterminate={selectedCustomerIds.size > 0 && !allCustomersSelected}
                          onChange={(event) => toggleAll(setSelectedCustomerIds, customerIds, event.target.checked)}
                          inputProps={{ "aria-label": "Select all filtered customers" }}
                        />
                      </TableCell>
                      <AdminTableHeaderCell>Customer</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Joined</AdminTableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerRows.length ? customerRows.map((row) => (
                      <TableRow key={row.id} hover selected={selectedCustomerIds.has(row.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selectedCustomerIds.has(row.id)}
                            onChange={() => toggleId(setSelectedCustomerIds, row.id)}
                            inputProps={{ "aria-label": `Select ${row.email}` }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{row.name}</Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{row.email}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", fontFamily: MONO_FONT, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          {row.joined}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", py: 2 }}>
                            No customers match.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack spacing={1.25}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <Typography sx={{ fontWeight: 800, flex: 1 }}>Orders</Typography>
                <TextField
                  size="small"
                  placeholder="Filter order no. / customer…"
                  value={orderQuery}
                  onChange={(event) => setOrderQuery(event.target.value)}
                  sx={{ minWidth: { sm: 200 } }}
                />
                <Button
                  variant="outlined"
                  color="error"
                  disabled={busy || selectedOrderIds.size === 0}
                  onClick={() => setConfirm({
                    kind: "orders",
                    title: "Delete selected orders",
                    description: `Permanently delete ${selectedOrderIds.size} order${selectedOrderIds.size === 1 ? "" : "s"} and restore committed in-stock units to inventory. Type delete to continue.`,
                  })}
                  sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4, textTransform: "uppercase" }}
                >
                  Delete selected ({selectedOrderIds.size})
                </Button>
              </Stack>

              <TableContainer sx={{ maxHeight: 360, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={allOrdersSelected}
                          indeterminate={selectedOrderIds.size > 0 && !allOrdersSelected}
                          onChange={(event) => toggleAll(setSelectedOrderIds, orderIds, event.target.checked)}
                          inputProps={{ "aria-label": "Select all filtered orders" }}
                        />
                      </TableCell>
                      <AdminTableHeaderCell>Order</AdminTableHeaderCell>
                      <AdminTableHeaderCell>Customer</AdminTableHeaderCell>
                      <AdminTableHeaderCell align="right">Total</AdminTableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orderRows.length ? orderRows.map((row) => (
                      <TableRow key={row.id} hover selected={selectedOrderIds.has(row.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selectedOrderIds.has(row.id)}
                            onChange={() => toggleId(setSelectedOrderIds, row.id)}
                            inputProps={{ "aria-label": `Select ${row.id}` }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                          {row.id}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{row.customer}</Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{row.email}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                          {PESO.format(row.total)}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", py: 2 }}>
                            No orders match.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Grid>
        </Grid>

        {result?.ok ? <Alert severity="success">{result.message}</Alert> : null}
        {result && !result.ok ? <Alert severity="error">{result.message}</Alert> : null}
      </Stack>

      <TypeConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={confirm?.title || "Confirm delete"}
        description={confirm?.description}
        confirmLabel={busy ? "Deleting…" : "Delete"}
        confirmWord="delete"
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}
