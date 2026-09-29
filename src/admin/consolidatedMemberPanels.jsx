import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { formatOrderTimestamp } from "../lib/orderTimestamps.js";
import ProofImage from "../components/ProofImage.jsx";
import { useCustomers } from "../lib/customersStore.jsx";
import { formatPayoutMethodCopy, payoutMethodHasBank, resolvePrimaryPayoutMethod } from "../lib/customerPayoutMethods.js";
import {
  getOrderLineItems,
  lineItemTrailLabel,
  migrateOrderStatus,
  migratePaymentStatus,
  orderStatusLabel,
  PAYMENT_COLOR,
  STATUS_COLOR,
} from "../data/orderWorkflow.js";
import { PESO } from "../components/ProductCard.jsx";
import { orderCustomerTotal } from "../lib/orderRevenue.js";
import { buildLiveMergeWorkbook } from "../lib/orderMergeSimulation.js";
import { ADMIN_ACTION_BUTTON_SX, ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import { AdminTableHeaderCell } from "./adminTableHeader.jsx";
import { OrderTrailPanel } from "./orderDetailShared.jsx";

function CopyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  );
}

function AccountSection({ title, subtitle, headerAction, surfaceBorderColor, children }) {
  return (
    <Box
      sx={{
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        overflow: "hidden",
      }}
    >
      <Box
        component="header"
        sx={{
          px: 2,
          pt: 1.5,
          pb: 1.25,
          borderBottom: "1px solid",
          borderColor: surfaceBorderColor,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
          <Typography
            component="h2"
            sx={{
              fontFamily: MONO_FONT,
              fontWeight: 800,
              fontSize: "0.82rem",
              letterSpacing: 1,
              textTransform: "uppercase",
              lineHeight: 1.3,
              minWidth: 0,
            }}
          >
            {title}
          </Typography>
          {headerAction}
        </Stack>
        {subtitle ? (
          <Typography sx={{ color: "text.secondary", fontSize: "0.75rem", mt: 0.4 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}

function FieldLabel({ children }) {
  return (
    <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.62rem", fontWeight: 800, letterSpacing: 1, color: "text.secondary", textTransform: "uppercase" }}>
      {children}
    </Typography>
  );
}

function DetailField({ label, value, onCopy }) {
  const text = String(value || "").trim();
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mb: 0.35, minHeight: 22 }}>
        <FieldLabel>{label}</FieldLabel>
        {text && onCopy ? (
          <Tooltip title={`Copy ${label.toLowerCase()}`}>
            <IconButton
              size="small"
              onClick={() => onCopy(text, label)}
              aria-label={`Copy ${label}`}
              sx={{ ml: 0.25, p: 0.35 }}
            >
              <CopyIcon style={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
      <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", wordBreak: "break-word", userSelect: "text" }}>
        {text || "—"}
      </Typography>
    </Box>
  );
}

function formatAddress(address) {
  if (!address || typeof address !== "object") return "";
  return [address.street, address.city, address.province, address.postal].filter(Boolean).join(", ");
}

function mixedBreakdownTitle(order, kind) {
  const items = getOrderLineItems(order);
  if (!items.length) return kind === "payment" ? "Mixed payment" : "Mixed status";
  return (
    <Box sx={{ py: 0.25, maxWidth: 280 }}>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, mb: 0.5 }}>
        {kind === "payment" ? "Payment by item" : "Status by item"}
      </Typography>
      <Stack spacing={0.35}>
        {items.map((item) => {
          const payment = migratePaymentStatus(item.payment);
          const status = migrateOrderStatus(item.status);
          const value = kind === "payment" ? (payment || "—") : orderStatusLabel(status);
          return (
            <Typography key={item.id || item.name} sx={{ fontSize: "0.68rem", lineHeight: 1.35 }}>
              {lineItemTrailLabel(item)} — {value}
            </Typography>
          );
        })}
      </Stack>
    </Box>
  );
}

function OrderMetaChip({ label, color, mixedTitle }) {
  const chip = (
    <Chip
      label={label || "—"}
      color={color || "default"}
      variant="outlined"
      sx={{
        ...ADMIN_STATUS_CHIP_SX,
        ...(mixedTitle ? { cursor: "help" } : {}),
      }}
    />
  );
  if (!mixedTitle) return chip;
  return (
    <Tooltip arrow title={mixedTitle}>
      <span>{chip}</span>
    </Tooltip>
  );
}

export function ConsolidatedTrailTab({
  memberOrders,
  trailOrderId,
  onTrailOrderIdChange,
  surfaceBorderColor,
  addTrailEntry,
  uploadTrailProof,
}) {
  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, height: "100%", overflow: "hidden" }}>
      <Tabs
        value={trailOrderId || memberOrders[0]?.id || false}
        onChange={(_, value) => { if (value) onTrailOrderIdChange(value); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          flexShrink: 0,
          minHeight: 40,
          "& .MuiTab-root": {
            fontFamily: MONO_FONT,
            fontWeight: 800,
            fontSize: "0.68rem",
            letterSpacing: 0.4,
            textTransform: "uppercase",
            minHeight: 40,
          },
        }}
      >
        {memberOrders.map((order) => (
          <Tab key={order.id} value={order.id} label={order.id} />
        ))}
      </Tabs>
      {memberOrders.filter((order) => order.id === (trailOrderId || memberOrders[0]?.id)).map((order) => (
        <Box key={order.id} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <OrderTrailPanel
            order={order}
            scrollable
            panelSx={{ border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}
            surfaceBorderColor={surfaceBorderColor}
            addTrailEntry={addTrailEntry}
            uploadTrailProof={uploadTrailProof}
          />
        </Box>
      ))}
    </Stack>
  );
}

function PendingDash() {
  return (
    <Typography component="span" sx={{ fontFamily: MONO_FONT, fontWeight: 700, color: "text.secondary" }}>
      —
    </Typography>
  );
}

function MemberOrderDialog({ order, surfaceBorderColor, onClose }) {
  const workbook = useMemo(() => (order ? buildLiveMergeWorkbook([order]) : null), [order]);
  const lines = workbook?.orderDetails || [];
  const summary = workbook?.consolidated || [];
  const known = summary.filter((row) => row.allocationMode !== "pending");
  const allPending = summary.length > 0 && known.length === 0;
  const mixed = known.length > 0 && known.length < summary.length;
  const knownNew = known.reduce((sum, row) => sum + (Number(row.newAmount) || 0), 0);
  const knownNet = knownNew - known.reduce((sum, row) => sum + (Number(row.totalDp) || 0), 0);
  const net = mixed ? knownNet : (workbook?.totals?.net || 0);
  const netLabel = mixed
    ? (knownNet < 0 ? "Refund" : knownNet > 0 ? "Balance due" : "Settled")
    : (workbook?.totals?.netLabel || "Settled");
  const newTotal = mixed ? knownNew : (workbook?.totals?.newTotal || 0);

  return (
    <Dialog fullWidth maxWidth="md" open={Boolean(order)} onClose={onClose}>
      <DialogTitle sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, pr: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.95rem" }}>
            {order?.id}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontFamily: MONO_FONT, fontSize: "0.72rem", mt: 0.25 }}>
            {order ? formatOrderTimestamp(order) : ""}
          </Typography>
        </Box>
        <Button color="inherit" onClick={onClose} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, flexShrink: 0 }}>
          Close
        </Button>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <TableContainer sx={{ border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1, mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <AdminTableHeaderCell>Product</AdminTableHeaderCell>
                <AdminTableHeaderCell align="center">Qty</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">Downpayment</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">Balance</AdminTableHeaderCell>
                <AdminTableHeaderCell>Payment</AdminTableHeaderCell>
                <AdminTableHeaderCell>Status</AdminTableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((row) => {
                const payment = migratePaymentStatus(row.payment);
                const status = migrateOrderStatus(row.status);
                return (
                  <TableRow key={row.key}>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{row.name}</TableCell>
                    <TableCell align="center" sx={{ fontFamily: MONO_FONT }}>{row.qty}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: MONO_FONT, whiteSpace: "nowrap" }}>{PESO.format(row.dpAmount)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: MONO_FONT, whiteSpace: "nowrap" }}>{PESO.format(row.balanceAmount || 0)}</TableCell>
                    <TableCell>
                      <OrderMetaChip label={payment} color={PAYMENT_COLOR[payment] || "default"} />
                    </TableCell>
                    <TableCell>
                      <OrderMetaChip label={orderStatusLabel(status)} color={STATUS_COLOR[status] || "default"} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.68rem", letterSpacing: 0.8, mb: 1 }}>
          SUMMARY
        </Typography>
        <TableContainer sx={{ border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <AdminTableHeaderCell>Product</AdminTableHeaderCell>
                <AdminTableHeaderCell align="center">Qty</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">Downpayment</AdminTableHeaderCell>
                <AdminTableHeaderCell align="center">Alloc %</AdminTableHeaderCell>
                <AdminTableHeaderCell align="center">New qty</AdminTableHeaderCell>
                <AdminTableHeaderCell align="right">New amount</AdminTableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((row) => {
                const pending = row.allocationMode === "pending";
                return (
                  <TableRow key={row.productKey}>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.82rem" }}>{row.name}</TableCell>
                    <TableCell align="center" sx={{ fontFamily: MONO_FONT }}>{row.totalQty}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: MONO_FONT, whiteSpace: "nowrap" }}>{PESO.format(row.totalDp)}</TableCell>
                    <TableCell align="center" sx={{ fontFamily: MONO_FONT }}>
                      {pending ? <PendingDash /> : `${Number(row.allocationPercent || 0).toFixed(2)}%`}
                    </TableCell>
                    <TableCell align="center" sx={{ fontFamily: MONO_FONT }}>
                      {pending ? <PendingDash /> : row.newQty}
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: MONO_FONT, whiteSpace: "nowrap" }}>
                      {pending ? <PendingDash /> : PESO.format(row.newAmount)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={5} align="right" sx={{ fontWeight: 700, color: "text.secondary" }}>New total</TableCell>
                <TableCell align="right" sx={{ fontFamily: MONO_FONT, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {allPending ? <PendingDash /> : PESO.format(newTotal)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={5} align="right" sx={{ fontWeight: 700, color: "text.secondary" }}>Total downpayment</TableCell>
                <TableCell align="right" sx={{ fontFamily: MONO_FONT, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {PESO.format(workbook?.totals?.totalDp || 0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={5} align="right" sx={{ fontWeight: 700, color: "text.secondary" }}>
                  {allPending ? "Settlement" : netLabel}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: MONO_FONT, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {allPending ? <PendingDash /> : PESO.format(Math.abs(net))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
}

export function ConsolidatedAccountTab({
  memberOrders,
  contact,
  customerRecord,
  surfaceBorderColor,
}) {
  const navigate = useNavigate();
  const { customers, getCustomerProfile } = useCustomers();
  const [copied, setCopied] = useState("");
  const [qrPreview, setQrPreview] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const displayName = customerRecord?.name || contact.customer;
  const displayEmail = customerRecord?.email || contact.email;
  const address = formatAddress(customerRecord?.address)
    || formatAddress(memberOrders.find((order) => order.address)?.address);
  const phone = customerRecord?.phone || memberOrders.find((order) => order.phone)?.phone || contact.phone;
  const payoutProfile = useMemo(() => {
    const key = String(displayEmail || "").trim().toLowerCase();
    if (!key) return customerRecord;
    return getCustomerProfile(key)
      || (customers || []).find((row) => String(row.email || "").trim().toLowerCase() === key)
      || customerRecord;
  }, [customers, customerRecord, displayEmail, getCustomerProfile]);
  const primaryPayout = resolvePrimaryPayoutMethod(payoutProfile);

  function copyText(text, label) {
    const value = String(text || "").trim();
    if (!value) return;
    try {
      const field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      field.remove();
      if (!ok) throw new Error("Copy command failed");
      setCopied(`${label} copied`);
    } catch {
      setCopied("Could not copy");
    }
    navigator.clipboard?.writeText?.(value).catch(() => {});
  }

  return (
    <>
      <Snackbar
        open={Boolean(copied)}
        autoHideDuration={2200}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          setCopied("");
        }}
        message={copied}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />

      <Stack spacing={2}>
        <AccountSection
          title="Customer info"
          subtitle="Contact and account details for this consolidation."
          surfaceBorderColor={surfaceBorderColor}
          headerAction={contact.email ? (
            <Button
              variant="outlined"
              onClick={() => navigate("/admin/customers", {
                state: { reopenCustomerKey: String(contact.email).trim().toLowerCase() },
              })}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", letterSpacing: 0.4, flexShrink: 0 }}
            >
              View in Customers
            </Button>
          ) : null}
        >
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DetailField label="Name" value={displayName} onCopy={copyText} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DetailField label="Email" value={displayEmail} onCopy={copyText} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DetailField label="Phone" value={phone} onCopy={copyText} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DetailField label="Sign-in" value={customerRecord?.signInMethod} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DetailField label="Joined" value={customerRecord?.joined} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <DetailField label="Marketing" value={customerRecord ? (customerRecord.marketingOptIn ? "Opted in" : "Not opted in") : ""} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <DetailField label="Address" value={address} onCopy={copyText} />
            </Grid>
          </Grid>
          {customerRecord?.tier?.name ? (
            <Chip
              label={customerRecord.tier.name}
              variant="outlined"
              sx={{ ...ADMIN_STATUS_CHIP_SX, alignSelf: "flex-start", fontWeight: 800, mt: 1.5 }}
            />
          ) : null}
        </AccountSection>

        <AccountSection
          title="Payout details"
          subtitle="Primary bank or QR saved on this customer account."
          surfaceBorderColor={surfaceBorderColor}
        >
          {primaryPayout ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "flex-start" }}>
              {primaryPayout.qrUrl ? (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setQrPreview(primaryPayout)}
                  aria-label="View QR code"
                  sx={{
                    width: 88,
                    height: 88,
                    p: 0,
                    flexShrink: 0,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: surfaceBorderColor,
                    overflow: "hidden",
                    cursor: "zoom-in",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "action.hover",
                  }}
                >
                  {primaryPayout.isPdf ? (
                    <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 800 }}>
                      PDF
                    </Typography>
                  ) : (
                    <Box
                      component="img"
                      src={primaryPayout.qrUrl}
                      alt="Primary QR code"
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  )}
                </Box>
              ) : null}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Chip
                    size="small"
                    color="primary"
                    label="Primary"
                    sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "0.62rem", letterSpacing: 0.5 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => copyText(
                      formatPayoutMethodCopy(primaryPayout, { name: displayName, email: displayEmail }),
                      "Payout details",
                    )}
                    sx={{ fontFamily: MONO_FONT, fontSize: "0.66rem", letterSpacing: 0.4 }}
                  >
                    Copy details
                  </Button>
                </Stack>
                {payoutMethodHasBank(primaryPayout) ? (
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <DetailField label="Bank / e-wallet" value={primaryPayout.bankName} onCopy={copyText} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <DetailField label="Account name" value={primaryPayout.accountName} onCopy={copyText} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <DetailField label="Account number" value={primaryPayout.accountNumber} onCopy={copyText} />
                    </Grid>
                    {primaryPayout.note ? (
                      <Grid size={{ xs: 12 }}>
                        <DetailField label="Note" value={primaryPayout.note} onCopy={copyText} />
                      </Grid>
                    ) : null}
                  </Grid>
                ) : (
                  <DetailField label="Method" value="QR code" />
                )}
              </Box>
            </Stack>
          ) : (
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
              No primary payout method yet. Add bank or QR details on the customer record.
            </Typography>
          )}
        </AccountSection>

        <AccountSection
          title={`Included orders (${memberOrders.length})`}
          subtitle="Individual orders rolled into this consolidation."
          surfaceBorderColor={surfaceBorderColor}
        >
          <TableContainer sx={{ border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
            <Table stickyHeader size="small" sx={{ minWidth: { xs: 420, sm: 560 } }}>
              <TableHead>
                <TableRow>
                  <AdminTableHeaderCell>Order</AdminTableHeaderCell>
                  <AdminTableHeaderCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell align="right">Final</AdminTableHeaderCell>
                  <AdminTableHeaderCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {memberOrders.map((order) => {
                  const payment = migratePaymentStatus(order.payment);
                  const status = migrateOrderStatus(order.status);
                  return (
                    <TableRow key={order.id} hover>
                      <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700, whiteSpace: "nowrap", color: "primary.main" }}>
                        {order.id}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary", display: { xs: "none", sm: "table-cell" }, whiteSpace: "nowrap", fontFamily: MONO_FONT, fontSize: "0.75rem" }}>
                        {formatOrderTimestamp(order)}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexWrap: "wrap", rowGap: 0.5 }}>
                          <OrderMetaChip
                            label={payment}
                            color={PAYMENT_COLOR[payment] || "default"}
                            mixedTitle={payment === "Mixed" ? mixedBreakdownTitle(order, "payment") : null}
                          />
                          <OrderMetaChip
                            label={orderStatusLabel(status)}
                            color={STATUS_COLOR[status] || "default"}
                            mixedTitle={status === "Mixed" ? mixedBreakdownTitle(order, "status") : null}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: "primary.main", whiteSpace: "nowrap" }}>
                        {PESO.format(orderCustomerTotal(order))}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => setViewOrder(order)}
                          sx={ADMIN_ACTION_BUTTON_SX}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </AccountSection>
      </Stack>

      <MemberOrderDialog
        order={viewOrder}
        surfaceBorderColor={surfaceBorderColor}
        onClose={() => setViewOrder(null)}
      />

      <Dialog
        fullWidth
        maxWidth="md"
        open={Boolean(qrPreview?.qrUrl)}
        onClose={() => setQrPreview(null)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          Primary QR code
          <Button color="inherit" onClick={() => setQrPreview(null)} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4 }}>
            Close
          </Button>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", p: { xs: 1.5, md: 3 } }}>
          {qrPreview?.isPdf ? (
            <Box
              component="iframe"
              title="Primary QR code"
              src={qrPreview.qrUrl}
              sx={{ width: "100%", minHeight: "70vh", border: 0, bgcolor: "background.paper" }}
            />
          ) : qrPreview?.qrUrl ? (
            <ProofImage src={qrPreview.qrUrl} alt="Primary QR code" surfaceBorderColor={surfaceBorderColor} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
