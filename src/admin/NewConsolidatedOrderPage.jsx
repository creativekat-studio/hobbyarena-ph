import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import AdminPageHeader from "../components/AdminPageHeader.jsx";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";
import { resolveOrderStatusForPayment } from "../data/orderWorkflow.js";
import { compareOrdersByOrderNo } from "../lib/orderIds.js";
import { useCustomers } from "../lib/customersStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import {
  allocationRecordFromWorkbook,
  applyMergeSimulationToOrder,
  buildMergeWorkbook,
  buildMergeSourceRows,
  createMergedSetId,
  describeMergeSelection,
  evaluateMergeSelection,
} from "../lib/orderMergeSimulation.js";
import { ADMIN_STATUS_CHIP_SX } from "./adminChipSx.js";
import {
  customerContactFromOrders,
  MergeWorkbookView,
  mergeStatusesNeedUpdate,
  sendMergedOrderEmails,
  totalItemQty,
} from "./MergeOrdersGrid.jsx";
import { ConsolidatedAccountTab, ConsolidatedTrailTab } from "./consolidatedMemberPanels.jsx";
import { rememberOrdersView, useGoToOrdersList } from "./ordersListNavigation.js";

const TABS = [
  { id: "details", label: "Order details" },
  { id: "trail", label: "Transaction history" },
  { id: "account", label: "Customer account" },
];

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
    </svg>
  );
}

export default function NewConsolidatedOrderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const goToOrdersList = useGoToOrdersList();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { orders, ordersReady, updateOrder, sendConsolidatedAllocationEmail, addTrailEntry, uploadTrailProof } = useOrders();
  const { customers } = useCustomers();

  const orderIds = useMemo(
    () => (Array.isArray(location.state?.orderIds) ? location.state.orderIds.map(String) : []),
    [location.state],
  );
  const selectedOrders = useMemo(
    () => orderIds.map((id) => (orders || []).find((order) => order.id === id)).filter(Boolean),
    [orders, orderIds],
  );

  const mergeGate = useMemo(() => evaluateMergeSelection(selectedOrders), [selectedOrders]);
  const sourceRows = useMemo(() => buildMergeSourceRows(selectedOrders), [selectedOrders]);
  const summary = useMemo(
    () => describeMergeSelection(selectedOrders, sourceRows),
    [selectedOrders, sourceRows],
  );
  const contact = customerContactFromOrders(selectedOrders);
  const { customer, email } = contact;
  const customerRecord = useMemo(() => {
    const key = String(email || "").trim().toLowerCase();
    if (!key) return null;
    return (customers || []).find((row) => String(row.email || "").trim().toLowerCase() === key) || null;
  }, [customers, email]);
  const memberOrders = useMemo(
    () => [...selectedOrders].sort(compareOrdersByOrderNo),
    [selectedOrders],
  );

  const [tab, setTab] = useState("details");
  const [trailOrderId, setTrailOrderId] = useState("");
  const [percentByProduct, setPercentByProduct] = useState({});
  const [newQtyByProduct, setNewQtyByProduct] = useState({});
  const [statusByRow, setStatusByRow] = useState({});
  const [paymentByRow, setPaymentByRow] = useState({});
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const selectionKey = sourceRows.map((row) => row.key).join("|");
  const applyLabel = `Apply to order${summary.orderCount === 1 ? "" : "s"} (${summary.orderCount})`;

  useEffect(() => {
    setPercentByProduct({});
    setNewQtyByProduct({});
    setStatusByRow({});
    setPaymentByRow({});
    setSelectedKeys(new Set(sourceRows.map((row) => row.key)));
    setNote("");
    setAttachment(null);
    setAttachmentError("");
  }, [selectionKey]);

  useEffect(() => {
    setTrailOrderId((current) => (
      memberOrders.some((order) => order.id === current) ? current : (memberOrders[0]?.id || "")
    ));
  }, [memberOrders]);

  const detailWorkbook = useMemo(
    () => buildMergeWorkbook(selectedOrders, { percentByProduct, newQtyByProduct, statusByRow, paymentByRow }),
    [selectedOrders, percentByProduct, newQtyByProduct, statusByRow, paymentByRow],
  );
  const workbook = useMemo(
    () => buildMergeWorkbook(selectedOrders, {
      percentByProduct,
      newQtyByProduct,
      statusByRow,
      paymentByRow,
      includeKeys: selectedKeys,
    }),
    [selectedOrders, percentByProduct, newQtyByProduct, statusByRow, paymentByRow, selectedKeys],
  );
  const statusesNeedUpdate = useMemo(
    () => mergeStatusesNeedUpdate(workbook.orderDetails, sourceRows),
    [workbook.orderDetails, sourceRows],
  );

  function goBackToOrders() {
    goToOrdersList("individual");
  }

  function goToCreatedSet(mergedSetId) {
    rememberOrdersView("merged");
    navigate(`/admin/orders/consolidated/${encodeURIComponent(mergedSetId)}`, {
      replace: true,
      state: { backTo: { path: "/admin/orders", label: "orders", ordersView: "merged" } },
    });
  }

  function setProductPercent(productKey, value) {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    setPercentByProduct((prev) => ({ ...prev, [productKey]: value }));
    setNewQtyByProduct((prev) => {
      const next = { ...prev };
      delete next[productKey];
      return next;
    });
  }

  function writeSimulation() {
    const mergedSetId = createMergedSetId(orders?.length ? orders : selectedOrders);
    const mergedAllocation = allocationRecordFromWorkbook(workbook);
    const patched = [];
    for (const order of selectedOrders) {
      const patch = applyMergeSimulationToOrder(order, workbook.orderDetails, {
        mergedSetId,
        mergedAllocation,
      });
      if (!patch) continue;
      updateOrder(order.id, patch);
      patched.push({ ...order, ...patch });
    }
    return { patched, mergedSetId };
  }

  function applySimulation() {
    if (statusesNeedUpdate) {
      setConfirmApply(false);
      return;
    }
    const { mergedSetId } = writeSimulation();
    setConfirmApply(false);
    goToCreatedSet(mergedSetId);
  }

  async function applyAndSend() {
    if (statusesNeedUpdate) {
      setConfirmSend(false);
      return;
    }
    setSendError("");
    setSending(true);
    try {
      const { patched, mergedSetId } = writeSimulation();
      await sendMergedOrderEmails(patched, sendConsolidatedAllocationEmail, { note, attachment, workbook });
      setConfirmSend(false);
      goToCreatedSet(mergedSetId);
    } catch (error) {
      setSendError(error?.message || "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  if (!ordersReady) {
    return (
      <Stack spacing={1.5} alignItems="center" sx={{ py: 6, color: "text.secondary" }}>
        <CircularProgress size={26} />
        <Typography variant="body2">Loading orders…</Typography>
      </Stack>
    );
  }

  if (!orderIds.length || selectedOrders.length !== orderIds.length) {
    return (
      <Stack spacing={1.25}>
        <Button
          startIcon={<BackIcon />}
          onClick={goBackToOrders}
          sx={{ alignSelf: "flex-start", fontFamily: MONO_FONT, fontSize: "0.82rem", color: "text.secondary" }}
        >
          Back to orders
        </Button>
        <Box sx={{ ...panelSx, p: 4, textAlign: "center" }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>No orders selected</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Select orders on the Individual orders tab, then choose Merge Orders.
          </Typography>
          <Button variant="contained" onClick={goBackToOrders}>
            View orders
          </Button>
        </Box>
      </Stack>
    );
  }

  const canApply = mergeGate.canMerge && !sending && !statusesNeedUpdate && selectedKeys.size > 0;

  return (
    <Stack
      spacing={1.25}
      sx={{
        flex: 1,
        minHeight: 0,
        height: { xs: "auto", md: "100%" },
        overflow: "hidden",
      }}
    >
      <Button
        startIcon={<BackIcon />}
        onClick={goBackToOrders}
        sx={{ alignSelf: "flex-start", flexShrink: 0, fontFamily: MONO_FONT, fontSize: "0.82rem", color: "text.secondary" }}
      >
        Back to orders
      </Button>

      <AdminPageHeader
        eyebrow="New consolidated order"
        title={customer || "Draft"}
        subtitle={[
          email,
          selectedKeys.size && sourceRows.length
            ? (selectedKeys.size !== sourceRows.length
              ? `${selectedKeys.size} of ${sourceRows.length} items selected · ${totalItemQty(sourceRows.filter((row) => selectedKeys.has(row.key)))} qty`
              : `${selectedKeys.size} item${selectedKeys.size === 1 ? "" : "s"} selected · ${totalItemQty(sourceRows.filter((row) => selectedKeys.has(row.key)))} qty`)
            : null,
        ].filter(Boolean).join(" · ")}
        action={(
          <Chip
            label="Pending email"
            color="warning"
            sx={{
              ...ADMIN_STATUS_CHIP_SX,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          />
        )}
      />

      <Tabs
        value={tab}
        onChange={(_, value) => { if (value) setTab(value); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          flexShrink: 0,
          borderBottom: "1px solid",
          borderColor: surfaceBorderColor,
          minHeight: 44,
          "& .MuiTab-root": {
            fontFamily: MONO_FONT,
            fontWeight: 800,
            fontSize: "0.7rem",
            letterSpacing: 0.5,
            textTransform: "uppercase",
            minHeight: 44,
          },
        }}
      >
        {TABS.map((item) => (
          <Tab key={item.id} value={item.id} label={item.label} />
        ))}
      </Tabs>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: tab === "details" || tab === "trail" ? "hidden" : "auto",
          display: "flex",
          flexDirection: "column",
          ...panelSx,
          p: { xs: 2, md: 2.5 },
        }}
      >
        <Box
          sx={{
            display: tab === "details" ? "flex" : "none",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
          aria-hidden={tab !== "details"}
        >
          {mergeGate.mixedCustomers || !sourceRows.length ? (
            <Alert severity={mergeGate.mixedCustomers ? "warning" : "info"}>
              {mergeGate.blockReason || "Selected orders have no line items to merge."}
            </Alert>
          ) : (
            <MergeWorkbookView
              workbook={detailWorkbook}
              gridWorkbook={workbook}
              orders={selectedOrders}
              selectedKeys={selectedKeys}
              onSelectedKeysChange={setSelectedKeys}
              editable
              percentByProduct={percentByProduct}
              newQtyByProduct={newQtyByProduct}
              onPercentChange={setProductPercent}
              onNewQtyChange={(productKey, value) => {
                setNewQtyByProduct((prev) => ({ ...prev, [productKey]: value }));
              }}
              onPaymentChange={(row, payment) => {
                const kind = row.tag === "Pre-order" ? "Pre-order" : "In-stock";
                setPaymentByRow((prev) => ({ ...prev, [row.key]: payment }));
                setStatusByRow((prev) => ({
                  ...prev,
                  [row.key]: resolveOrderStatusForPayment(payment, row.status, kind),
                }));
              }}
              onStatusChange={(row, status) => {
                setStatusByRow((prev) => ({ ...prev, [row.key]: status }));
              }}
              statusWarning={statusesNeedUpdate}
              note={note}
              attachment={attachment}
              attachmentError={attachmentError}
              onNoteChange={setNote}
              onAttachmentChange={(next, error) => {
                setAttachment(next);
                setAttachmentError(error || "");
              }}
              detailsMaxHeight={null}
              layout="split"
            />
          )}
        </Box>

        {tab === "trail" ? (
          <ConsolidatedTrailTab
            memberOrders={memberOrders}
            trailOrderId={trailOrderId}
            onTrailOrderIdChange={setTrailOrderId}
            surfaceBorderColor={surfaceBorderColor}
            addTrailEntry={addTrailEntry}
            uploadTrailProof={uploadTrailProof}
          />
        ) : null}

        {tab === "account" ? (
          <ConsolidatedAccountTab
            memberOrders={memberOrders}
            contact={contact}
            customerRecord={customerRecord}
            surfaceBorderColor={surfaceBorderColor}
            orderBackTo={{
              path: "/admin/orders/consolidated/new",
              label: "consolidated order",
              ordersView: "individual",
              orderIds,
            }}
          />
        ) : null}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          position: "sticky",
          bottom: 0,
          zIndex: 4,
          px: { xs: 2, md: 2.5 },
          py: 1.5,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          bgcolor: "background.paper",
          ...panelSx,
        }}
      >
        {sendError ? <Alert severity="error" sx={{ mb: 1.25 }}>{sendError}</Alert> : null}
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.25}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
        >
          <Button
            color="inherit"
            onClick={goBackToOrders}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4, alignSelf: { md: "flex-start" } }}
          >
            Cancel
          </Button>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              disabled={!canApply || !sendConsolidatedAllocationEmail}
              onClick={() => setConfirmSend(true)}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
            >
              {sending ? "Sending…" : "Send email"}
            </Button>
            <Button
              variant="contained"
              disabled={!canApply}
              onClick={() => setConfirmApply(true)}
              sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4 }}
            >
              {applyLabel}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <TypeConfirmDialog
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        onConfirm={applySimulation}
        title="Apply merged allocation"
        description={`Write the allocation and the Order Details status onto each of the ${summary.orderCount} source order${summary.orderCount === 1 ? "" : "s"}. Each order keeps its own number. Emails are not sent.`}
        confirmLabel={applyLabel}
        confirmWord="apply"
        surfaceBorderColor={surfaceBorderColor}
      />
      <TypeConfirmDialog
        open={confirmSend}
        onClose={() => !sending && setConfirmSend(false)}
        onConfirm={applyAndSend}
        title="Apply and send email"
        description={`Write the allocation onto ${summary.orderCount} order${summary.orderCount === 1 ? "" : "s"} and send one consolidated email to ${customer}.`}
        confirmLabel="Send email"
        confirmWord="send"
        surfaceBorderColor={surfaceBorderColor}
      />
    </Stack>
  );
}
