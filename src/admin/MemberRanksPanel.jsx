import { useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { TrashIcon } from "../components/icons.jsx";
import { PESO } from "../components/ProductCard.jsx";
import AdminColorPicker from "../components/AdminColorPicker.jsx";
import { AdminTableHeaderCell } from "./adminTableHeader.jsx";
import { useClientTiers } from "../lib/clientTiersStore.jsx";
import { resolveClientTier } from "../lib/clientTier.js";

const FALLBACK_COLORS = ["#64748b", "#2563EB", "#C9A227", "#22c55e", "#f43f5e", "#7c3aed", "#ec4899", "#06b6d4"];

function MemberRanksSaveBar({ surfaceBorderColor }) {
  const { dirty, saving, saveError, saveOk, hydrated, discardChanges, saveTiers } = useClientTiers();
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        mt: 2.5,
        px: 1.75,
        py: 1.25,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.02),
      }}
    >
      <Typography
        sx={{
          color: saveError ? "error.main" : dirty ? "warning.main" : saveOk ? "success.main" : "text.secondary",
          fontSize: "0.78rem",
          fontWeight: dirty || saveError || saveOk ? 600 : 500,
          lineHeight: 1.4,
        }}
      >
        {saveError
          ? saveError
          : dirty
            ? "Unsaved changes"
            : saveOk
              ? "Saved"
              : "Edits stay local until you save"}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          color="inherit"
          disabled={saving || !dirty}
          onClick={discardChanges}
          sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!hydrated || !dirty || saving}
          onClick={() => saveTiers()}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.72rem" }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </Stack>
    </Box>
  );
}

function nextRankDefaults(tiers) {
  const sorted = [...tiers].sort((a, b) => (a.minSpend ?? 0) - (b.minSpend ?? 0));
  const last = sorted[sorted.length - 1];
  const floor = last
    ? (last.maxSpend == null ? (last.minSpend ?? 0) + 10000 : Number(last.maxSpend) + 1)
    : 0;
  const used = new Set(tiers.map((t) => (t.badgeColor || "").toLowerCase()));
  const badgeColor = FALLBACK_COLORS.find((c) => !used.has(c.toLowerCase()))
    || FALLBACK_COLORS[tiers.length % FALLBACK_COLORS.length];
  return {
    name: "New rank",
    badgeColor,
    minSpend: floor,
    maxSpend: null,
  };
}

function ActiveSwitch({ checked, onChange }) {
  return (
    <Switch
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      size="small"
      color="primary"
    />
  );
}

/** Member ranks editor — matches Product lines layout inside Classifications. */
export function MemberRanksPanel({ panelSx, surfaceBorderColor }) {
  const { tiers, addTier, updateTier, removeTier } = useClientTiers();
  const [previewSpend, setPreviewSpend] = useState("15000");

  const sorted = useMemo(
    () => [...tiers].sort((a, b) => (a.minSpend ?? 0) - (b.minSpend ?? 0)),
    [tiers],
  );

  const previewTier = useMemo(
    () => resolveClientTier(Number(previewSpend) || 0, tiers),
    [previewSpend, tiers],
  );

  const activeCount = tiers.filter((tier) => tier.active !== false).length;

  function handleAdd() {
    const defaults = nextRankDefaults(tiers);
    const openTop = sorted.find((t) => t.maxSpend == null);
    if (openTop && defaults.minSpend > (openTop.minSpend ?? 0)) {
      updateTier(openTop.id, { maxSpend: defaults.minSpend - 1 });
    }
    addTier(defaults);
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2, gap: 1.5, flexWrap: "wrap" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.3 }}>Member ranks</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mt: 0.35, lineHeight: 1.4 }}>
            {tiers.length} rank{tiers.length === 1 ? "" : "s"} · {activeCount} active
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={handleAdd}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.68rem", flexShrink: 0 }}
        >
          + Add rank
        </Button>
      </Stack>

      <Typography sx={{ fontSize: "0.84rem", color: "text.secondary", lineHeight: 1.55, mb: 2 }}>
        Loyalty badges based on total <strong>fulfilled</strong> order spend.
        Shoppers see their rank on Account; admins see it on Customers.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 2.5 }}>
        <TextField
          size="small"
          label="Preview spend (₱)"
          value={previewSpend}
          onChange={(e) => setPreviewSpend(e.target.value)}
          sx={{ maxWidth: 200 }}
        />
        <Typography sx={{ fontSize: "0.88rem" }}>
          Resolves to{" "}
          <strong style={{ color: previewTier?.badgeColor || "inherit" }}>
            {previewTier?.name || "—"}
          </strong>
          {previewTier
            ? ` (${PESO.format(previewTier.minSpend)}–${previewTier.maxSpend == null ? "∞" : PESO.format(previewTier.maxSpend)})`
            : ""}
        </Typography>
      </Stack>

      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <AdminTableHeaderCell sx={{ width: "22%" }}>Rank</AdminTableHeaderCell>
              <AdminTableHeaderCell sx={{ width: 120 }}>Floor</AdminTableHeaderCell>
              <AdminTableHeaderCell sx={{ width: 120 }}>Ceiling</AdminTableHeaderCell>
              <AdminTableHeaderCell sx={{ width: 160 }}>Badge</AdminTableHeaderCell>
              <AdminTableHeaderCell sx={{ width: 88 }} align="center">Active</AdminTableHeaderCell>
              <AdminTableHeaderCell sx={{ width: 88 }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((tier) => (
              <TableRow key={tier.id} sx={{ opacity: tier.active !== false ? 1 : 0.55 }}>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={tier.name}
                    onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                    placeholder="Elite Trainer"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    value={tier.minSpend ?? 0}
                    onChange={(e) => updateTier(tier.id, { minSpend: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Leave blank for no upper limit" placement="top">
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={tier.maxSpend ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateTier(tier.id, { maxSpend: raw === "" ? null : Math.max(0, Number(raw) || 0) });
                      }}
                      placeholder="∞"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <AdminColorPicker
                    value={tier.badgeColor}
                    onChange={(badgeColor) => updateTier(tier.id, { badgeColor })}
                    ariaLabel="Pick badge color"
                    size="table"
                  />
                </TableCell>
                <TableCell align="center">
                  <ActiveSwitch
                    checked={tier.active !== false}
                    onChange={(active) => updateTier(tier.id, { active })}
                  />
                </TableCell>
                <TableCell align="right" sx={{ width: 88 }}>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={tiers.length <= 1}
                    aria-label="Remove rank"
                    onClick={() => removeTier(tier.id)}
                  >
                    <TrashIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
        {sorted.map((tier) => (
          <Box key={tier.id} sx={{ p: 1.5, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1, opacity: tier.active !== false ? 1 : 0.55 }}>
            <TextField size="small" fullWidth label="Rank" value={tier.name} onChange={(e) => updateTier(tier.id, { name: e.target.value })} sx={{ mb: 1.5 }} />
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <TextField size="small" type="number" fullWidth label="Floor" value={tier.minSpend ?? 0} onChange={(e) => updateTier(tier.id, { minSpend: Math.max(0, Number(e.target.value) || 0) })} />
              <TextField
                size="small"
                type="number"
                fullWidth
                label="Ceiling"
                value={tier.maxSpend ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateTier(tier.id, { maxSpend: raw === "" ? null : Math.max(0, Number(raw) || 0) });
                }}
                placeholder="∞"
              />
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <AdminColorPicker value={tier.badgeColor} onChange={(badgeColor) => updateTier(tier.id, { badgeColor })} />
              <Stack direction="row" alignItems="center" spacing={1}>
                <ActiveSwitch checked={tier.active !== false} onChange={(active) => updateTier(tier.id, { active })} />
                <Typography sx={{ fontSize: "0.82rem" }}>Active</Typography>
              </Stack>
            </Stack>
            <IconButton size="small" color="error" disabled={tiers.length <= 1} aria-label="Remove rank" onClick={() => removeTier(tier.id)}>
              <TrashIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        ))}
      </Stack>

      {tiers.length === 0 ? (
        <Box sx={{ py: 4, textAlign: "center", color: "text.secondary", fontSize: "0.88rem" }}>
          No ranks yet. Click + Add rank to create one.
        </Box>
      ) : null}

      <MemberRanksSaveBar surfaceBorderColor={surfaceBorderColor} />
    </Box>
  );
}
