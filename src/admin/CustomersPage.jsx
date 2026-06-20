import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
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
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT, getStatAccents } from "../theme.js";
import { avatarStyles } from "../lib/surfaces.js";
import { PESO } from "../components/ProductCard.jsx";
import { CardIcon, SearchIcon, SparkleIcon, UserIcon } from "../components/icons.jsx";
import { CUSTOMERS } from "../data/mockData.js";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "marketing", label: "Marketing opt-in" },
  { id: "active", label: "Active" },
  { id: "dormant", label: "Dormant" },
];

function StatCard({ panelSx, icon, label, value, accent }) {
  const theme = useTheme();
  const Icon = icon;
  const color = accent || theme.palette.primary.main;
  return (
    <Box sx={{ ...panelSx, p: 2.5, height: "100%" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 44, height: 44, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", color, bgcolor: alpha(color, 0.14) }}>
          <Icon />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.3rem" }}>{value}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{label}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function CustomersPage() {
  const theme = useTheme();
  const accents = getStatAccents(theme);
  const { surfaces } = useOutletContext();
  const { panelSx } = surfaces;
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return CUSTOMERS.filter((c) => {
      const matchesQuery =
        !query.trim() ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.email.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      switch (filter) {
        case "marketing":
          return c.marketingOptIn;
        case "active":
          return c.status === "Active";
        case "dormant":
          return c.status === "Dormant";
        default:
          return true;
      }
    });
  }, [filter, query]);

  const stats = useMemo(() => {
    const optIn = CUSTOMERS.filter((c) => c.marketingOptIn).length;
    const ltv = CUSTOMERS.reduce((sum, c) => sum + c.totalSpent, 0);
    return {
      total: CUSTOMERS.length,
      optIn,
      optInPct: Math.round((optIn / CUSTOMERS.length) * 100),
      ltv,
    };
  }, []);

  function exportMarketingList() {
    const list = CUSTOMERS.filter((c) => c.marketingOptIn);
    const csv = ["name,email", ...list.map((c) => `${c.name},${c.email}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "marketing-optin.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
        <Box>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>People</Typography>
          <Typography variant="h3">Customers</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Customer accounts and marketing consent.</Typography>
        </Box>
        <Button variant="contained" color="primary" onClick={exportMarketingList} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase", boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.4)}` }}>
          Export opt-in list
        </Button>
      </Stack>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={UserIcon} label="Customers" value={stats.total} accent={accents[0]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={SparkleIcon} label="Marketing opt-in" value={`${stats.optIn} (${stats.optInPct}%)`} accent={accents[1]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Lifetime value" value={PESO.format(stats.ltv)} accent={theme.palette.success.main} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard panelSx={panelSx} icon={CardIcon} label="Avg. spend" value={PESO.format(Math.round(stats.ltv / stats.total))} accent={accents[3]} /></Grid>
      </Grid>

      <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {FILTERS.map((item) => (
              <Chip key={item.id} label={item.label} onClick={() => setFilter(item.id)} color={filter === item.id ? "primary" : "default"} variant={filter === item.id ? "filled" : "outlined"} sx={{ fontWeight: 700 }} />
            ))}
          </Stack>
          <TextField
            size="small"
            placeholder="Search name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: { xs: "100%", md: 260 } }}
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} /></InputAdornment>) }}
          />
        </Stack>
      </Box>

      <Box sx={{ ...panelSx, overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 800, display: { xs: "none", sm: "table-cell" } }}>Joined</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Orders</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="right">Total spent</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Marketing</TableCell>
                <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, ...avatarStyles(theme) }}>
                        {customer.name.charAt(0)}
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{customer.name}</Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: "0.72rem" }}>{customer.email}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary", display: { xs: "none", sm: "table-cell" } }}>{customer.joined}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontFamily: MONO_FONT }}>{customer.orders}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{PESO.format(customer.totalSpent)}</TableCell>
                  <TableCell align="center">
                    <Chip label={customer.marketingOptIn ? "Opted in" : "No"} size="small" color={customer.marketingOptIn ? "success" : "default"} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={customer.status} size="small" color={customer.status === "Active" ? "primary" : "default"} variant="outlined" />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>No customers match your filters.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}
