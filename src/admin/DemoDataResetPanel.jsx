import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import TypeConfirmDialog from "../components/TypeConfirmDialog.jsx";
import { resetDemoOrdersAndCustomers } from "../lib/firebase/repositories/demoReset.js";

/**
 * Localhost / Vercel preview wipe of sales demo data: restock from orders,
 * then delete orders / stock holds. Leaves customers, products (aside from stock),
 * CMS, classifications, emails, and design alone. Hidden in production.
 */
export default function DemoDataResetPanel({ panelSx, surfaceBorderColor }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function handleConfirm() {
    setBusy(true);
    setResult(null);
    try {
      const summary = await resetDemoOrdersAndCustomers();
      setResult({ ok: true, summary });
    } catch (error) {
      setResult({
        ok: false,
        message: error?.message || "Reset failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <Stack spacing={1.75}>
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
            Reset demo orders
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.85rem", mt: 0.75, lineHeight: 1.5, maxWidth: 640 }}>
            Available on localhost and the Vercel preview site only — not in production. Returns committed in-stock quantities to inventory, then deletes all{" "}
            <strong>orders</strong> and checkout <strong>stock holds</strong>.{" "}
            <strong>Customers</strong>, inventory products, CMS, classifications,
            emails, and design are left untouched (stock numbers only increase
            where orders had reserved units).
          </Typography>
        </Box>

        <Button
          variant="outlined"
          color="error"
          disabled={busy}
          onClick={() => setOpen(true)}
          sx={{
            alignSelf: "flex-start",
            fontFamily: MONO_FONT,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            fontSize: "0.72rem",
          }}
        >
          {busy ? "Resetting…" : "Reset demo data"}
        </Button>

        {result?.ok ? (
          <Alert severity="success">
            Restocked {result.summary.unitsRestocked} unit
            {result.summary.unitsRestocked === 1 ? "" : "s"} across{" "}
            {result.summary.productsRestocked} product
            {result.summary.productsRestocked === 1 ? "" : "s"}. Deleted{" "}
            {result.summary.ordersDeleted} order
            {result.summary.ordersDeleted === 1 ? "" : "s"} and{" "}
            {result.summary.holdsDeleted} stock hold
            {result.summary.holdsDeleted === 1 ? "" : "s"}. Customers were kept.
          </Alert>
        ) : null}

        {result && !result.ok ? (
          <Alert severity="error">{result.message}</Alert>
        ) : null}
      </Stack>

      <TypeConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        title="Reset demo orders"
        description="This restocks in-stock units from open orders, then permanently deletes all orders and stock holds. Customers, products, CMS, classifications, emails, and design stay. Type delete to continue."
        confirmLabel="Reset demo data"
        confirmWord="delete"
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}
