import { useMemo, useState } from "react";
import {
  Box,
  Button,
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
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import AdminColorPicker, { normalizeHex } from "../components/AdminColorPicker.jsx";
import { useClientTiers } from "../lib/clientTiersStore.jsx";
import { resolveClientTier } from "../lib/clientTier.js";

const FALLBACK_COLORS = ["#64748b", "#2563EB", "#C9A227", "#22c55e", "#f43f5e", "#7c3aed", "#ec4899", "#06b6d4"];

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
    name: "",
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
  const { tiers, addTier, updateTier, removeTier, resetTiers } = useClientTiers();
  const [previewSpend, setPreviewSpend] = useState("15000");
  const [newName, setNewName] = useState("");
  const [newFloor, setNewFloor] = useState("");
  const [newCeiling, setNewCeiling] = useState("");
  const [newColor, setNewColor] = useState("#7c3aed");

  const sorted = useMemo(
    () => [...tiers].sort((a, b) => (a.minSpend ?? 0) - (b.minSpend ?? 0)),
    [tiers],
  );

  const previewTier = useMemo(
    () => resolveClientTier(Number(previewSpend) || 0, tiers),
    [previewSpend, tiers],
  );

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    const defaults = nextRankDefaults(tiers);
    const minSpend = newFloor === "" ? defaults.minSpend : Math.max(0, Number(newFloor) || 0);
    const maxSpend = newCeiling === "" ? null : Math.max(0, Number(newCeiling) || 0);
    const openTop = sorted.find((t) => t.maxSpend == null);
    if (openTop && minSpend > (openTop.minSpend ?? 0)) {
      updateTier(openTop.id, { maxSpend: minSpend - 1 });
    }
    addTier({
      name,
      badgeColor: normalizeHex(newColor) || defaults.badgeColor,
      minSpend,
      maxSpend,
    });
    setNewName("");
    setNewFloor("");
    setNewCeiling("");
    setNewColor(FALLBACK_COLORS[(tiers.length + 1) % FALLBACK_COLORS.length]);
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <Typography sx={{ fontSize: "0.84rem", color: "text.secondary", lineHeight: 1.55, mb: 2 }}>
        Member ranks are loyalty badges based on total <strong>fulfilled</strong> order spend.
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
              <TableCell sx={{ fontWeight: 800, width: "22%" }}>Rank</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 120 }}>Floor</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 120 }}>Ceiling</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 160 }}>Badge</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="center">Active</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="right" />
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
                  <Button
                    size="small"
                    color="inherit"
                    disabled={tiers.length <= 1}
                    onClick={() => removeTier(tier.id)}
                    sx={{ fontSize: "0.72rem", minWidth: 0 }}
                  >
                    Remove
                  </Button>
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
            <Button size="small" color="inherit" disabled={tiers.length <= 1} onClick={() => removeTier(tier.id)} sx={{ fontSize: "0.72rem" }}>
              Remove
            </Button>
          </Box>
        ))}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2.5 }} alignItems={{ sm: "flex-start" }}>
        <TextField
          size="small"
          label="New rank name"
          placeholder="Arena Legend"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          sx={{ flex: 1.2 }}
        />
        <TextField
          size="small"
          type="number"
          label="Floor"
          placeholder="Auto"
          value={newFloor}
          onChange={(e) => setNewFloor(e.target.value)}
          sx={{ width: { sm: 110 } }}
        />
        <TextField
          size="small"
          type="number"
          label="Ceiling"
          placeholder="∞"
          value={newCeiling}
          onChange={(e) => setNewCeiling(e.target.value)}
          sx={{ width: { sm: 110 } }}
        />
        <Box sx={{ pt: { sm: 0.5 } }}>
          <AdminColorPicker value={newColor} onChange={setNewColor} />
        </Box>
        <Button
          variant="contained"
          onClick={handleAdd}
          sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}
        >
          Add rank
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          onClick={resetTiers}
          sx={{ borderColor: surfaceBorderColor, flexShrink: 0 }}
        >
          Reset defaults
        </Button>
      </Stack>
    </Box>
  );
}
