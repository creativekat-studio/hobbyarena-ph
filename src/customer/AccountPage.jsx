import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  Link,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT, getStatAccents } from "../theme.js";
import { avatarStyles } from "../lib/surfaces.js";
import { wider } from "../lib/layout.js";
import { PESO } from "../components/ProductCard.jsx";
import { BoltIcon, CardIcon, HeartIcon, SparkleIcon, UserIcon } from "../components/icons.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useOrders, getOrdersForEmail } from "../lib/ordersStore.jsx";
import { useWishlist } from "../lib/wishlistStore.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { ACCOUNT } from "../data/mockData.js";

const STATUS_COLOR = {
  "Pending Verification": "warning",
  Processing: "warning",
  Shipped: "info",
  Delivered: "success",
  Cancelled: "error",
};

function AuthCard({ panelSx }) {
  const theme = useTheme();
  const { signInCustomer, registerCustomer } = useAuth();
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInCustomer(email, password);
      } else {
        await registerCustomer({ name, email, password, acceptedTerms, marketingOptIn });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 3, md: 5 }, maxWidth: wider(460), width: "100%" }} component="form" onSubmit={handleSubmit}>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>
            ▣ {mode === "signin" ? "Member access" : "Create account"}
          </Typography>
          <Typography variant="h4">{mode === "signin" ? "Welcome back, Trainer." : "Join the Arena."}</Typography>
          <Typography color="text.secondary">
            {mode === "signin"
              ? "Sign in to track orders, secure pre-orders, and spend store credit."
              : "Create an account to start collecting, earn points, and lock in drops."}
          </Typography>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {mode === "signup" ? (
          <TextField label="Full name" fullWidth value={name} onChange={(e) => setName(e.target.value)} required />
        ) : null}
        <TextField label="Email" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} required helperText={mode === "signup" ? "At least 8 characters." : " "} />

        {mode === "signup" ? (
          <Stack spacing={0.5}>
            <FormControlLabel
              control={<Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} size="small" />}
              label={
                <Typography variant="body2" color="text.secondary">
                  I agree to the{" "}
                  <Link href="#" onClick={(e) => e.preventDefault()} sx={{ fontWeight: 700 }}>Terms of Service</Link>{" "}and{" "}
                  <Link href="#" onClick={(e) => e.preventDefault()} sx={{ fontWeight: 700 }}>Privacy Policy</Link>.
                </Typography>
              }
            />
            <FormControlLabel
              control={<Checkbox checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} size="small" />}
              label={<Typography variant="body2" color="text.secondary">Send me drops, restocks &amp; deals (optional).</Typography>}
            />
          </Stack>
        ) : null}

        <Button type="submit" variant="contained" color="primary" size="large" disabled={busy} sx={{ py: 1.3, fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase" }}>
          {busy ? "Please wait…" : mode === "signin" ? "▶ Sign in" : "▶ Create account"}
        </Button>

        <Divider sx={{ color: "text.secondary", fontSize: "0.75rem" }}>or</Divider>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          {mode === "signin" ? "New to Hobby Arena? " : "Already a member? "}
          <Box component="button" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }} sx={{ background: "none", border: "none", p: 0, cursor: "pointer", color: "primary.main", fontWeight: 700, textDecoration: "underline", font: "inherit" }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </Box>
        </Typography>
        <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ fontFamily: MONO_FONT }}>
          Demo only — any details sign you in as a customer.
        </Typography>
      </Stack>
    </Box>
  );
}

function StatCard({ panelSx, icon, label, value, accent }) {
  const theme = useTheme();
  const Icon = icon;
  const color = accent || theme.palette.primary.main;
  return (
    <Box sx={{ ...panelSx, p: 2.5, height: "100%" }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 42, height: 42, borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", color, bgcolor: alpha(color, 0.14) }}>
          <Icon />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: "1.25rem" }}>{value}</Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.78rem" }}>{label}</Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function Dashboard({ panelSx, surfaceBorderColor }) {
  const theme = useTheme();
  const accents = getStatAccents(theme);
  const { user, signOut } = useAuth();
  const { orders: allOrders } = useOrders();
  const { items: wishlistItems, remove: removeFromWishlist } = useWishlist();
  const { addItem } = useCart();
  const [tab, setTab] = useState(0);

  const customerOrders = useMemo(() => {
    const fromStore = getOrdersForEmail(allOrders, user?.email);
    if (fromStore.length) return fromStore;
    return ACCOUNT.orders;
  }, [allOrders, user?.email]);
  const displayName = user?.displayName || ACCOUNT.name;
  const email = user?.email || ACCOUNT.email;

  return (
    <Stack spacing={3}>
      <Box sx={{ ...panelSx, p: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.5rem", ...avatarStyles(theme) }}>
              {displayName.charAt(0).toUpperCase()}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{displayName}</Typography>
              <Typography color="text.secondary" sx={{ fontSize: "0.88rem" }}>{email}</Typography>
              <Chip label={ACCOUNT.tier} size="small" color="primary" sx={{ mt: 0.75, fontFamily: MONO_FONT, letterSpacing: 0.5 }} />
            </Box>
          </Stack>
          <Button variant="outlined" color="inherit" onClick={signOut} sx={{ borderColor: surfaceBorderColor }}>Sign out</Button>
        </Stack>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard panelSx={panelSx} icon={SparkleIcon} label="Store credit" value={PESO.format(ACCOUNT.storeCredit)} accent={accents[1]} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard panelSx={panelSx} icon={BoltIcon} label="Loyalty points" value={ACCOUNT.loyaltyPoints.toLocaleString()} accent={accents[2]} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard panelSx={panelSx} icon={CardIcon} label="Total orders" value={customerOrders.length} accent={accents[0]} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard panelSx={panelSx} icon={HeartIcon} label="Wishlist" value={wishlistItems.length} accent={accents[3]} />
        </Grid>
      </Grid>

      <Box sx={{ ...panelSx, overflow: "hidden" }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ px: 2, borderBottom: "1px solid", borderColor: surfaceBorderColor }}>
          <Tab label={`Orders (${customerOrders.length})`} sx={{ fontWeight: 700, textTransform: "none" }} />
          <Tab label={`Wishlist (${wishlistItems.length})`} sx={{ fontWeight: 700, textTransform: "none" }} />
        </Tabs>

        {tab === 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
                  <TableCell sx={{ fontWeight: 800, display: { xs: "none", sm: "table-cell" } }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Total</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customerOrders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell sx={{ fontFamily: MONO_FONT, fontWeight: 700 }}>{order.id}</TableCell>
                    <TableCell sx={{ color: "text.secondary", display: { xs: "none", sm: "table-cell" } }}>{order.date}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>{order.items}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{PESO.format(order.total)}</TableCell>
                    <TableCell align="right"><Chip label={order.status} size="small" color={STATUS_COLOR[order.status] || "default"} variant="outlined" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : wishlistItems.length === 0 ? (
          <Stack spacing={1.5} alignItems="center" sx={{ p: 5, textAlign: "center", color: "text.secondary" }}>
            <HeartIcon sx={{ fontSize: 40, color: "text.secondary" }} />
            <Typography>Your wishlist is empty.</Typography>
            <Typography variant="body2">Tap the heart on any product while signed in to save it here.</Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5} sx={{ p: 3 }}>
            {wishlistItems.map((item) => {
              const isPreorder = item.tag === "Pre-order";
              const soldOut = !isPreorder && item.stock <= 0;
              return (
                <Stack
                  key={item.id}
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  justifyContent="space-between"
                  spacing={1.5}
                  sx={{ p: 2, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <CardIcon sx={{ color: item.accent || "primary.main", flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, lineHeight: 1.3 }}>{item.name}</Typography>
                      <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", fontFamily: MONO_FONT }}>
                        {item.tag} · {PESO.format(item.price)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    {!soldOut ? (
                      <Button size="small" variant="contained" color="primary" onClick={() => addItem(item)}>
                        Add to cart
                      </Button>
                    ) : (
                      <Button size="small" variant="outlined" color="inherit" disabled sx={{ borderColor: surfaceBorderColor }}>
                        Out of stock
                      </Button>
                    )}
                    <Button size="small" color="error" onClick={() => removeFromWishlist(item.id)}>
                      Remove
                    </Button>
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

export default function AccountPage() {
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { isCustomer } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
      {isCustomer ? (
        <Dashboard panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
      ) : (
        <Stack spacing={4} alignItems="center">
          <Stack spacing={1} alignItems="center" textAlign="center">
            <UserIcon sx={{ fontSize: 40, color: "primary.main" }} />
            <Typography variant="h3">Your account</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: wider(460) }}>
              Sign in to manage orders, pre-orders, store credit, and your wishlist.
            </Typography>
          </Stack>
          <AuthCard panelSx={panelSx} />
        </Stack>
      )}
    </Container>
  );
}
