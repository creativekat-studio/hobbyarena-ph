import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  Skeleton,
  Stack,
  Switch,
  Tab,
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
import { CardIcon, HeartIcon, SearchIcon, SparkleIcon, TrashIcon, UserIcon } from "../components/icons.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { getCustomerProfile, useCustomers } from "../lib/customersStore.jsx";
import { useOrders, getOrdersForEmail } from "../lib/ordersStore.jsx";
import { useWishlist } from "../lib/wishlistStore.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { CustomerOrderCard } from "../components/CustomerOrderCard.jsx";
import { setAuthSurface } from "../auth/authSurface.js";
import { sortOrdersByOrderNo } from "../lib/orderIds.js";
import { useClientTiers } from "../lib/clientTiersStore.jsx";
import { computeFulfilledSpendForEmail, getNextTierProgress, resolveClientTier } from "../lib/clientTier.js";
import { formatPhPhoneInput, isValidPhPhone } from "../lib/phone.js";
import PasswordField from "../components/PasswordField.jsx";

function AuthCard({ panelSx }) {
  const theme = useTheme();
  const { signInCustomer, signInWithGoogle, registerCustomer, authMode } = useAuth();
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

  async function handleGoogleSignIn() {
    setError("");
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
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
        <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} required helperText={mode === "signup" ? "At least 8 characters." : " "} autoComplete={mode === "signup" ? "new-password" : "current-password"} />

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

        {authMode === "firebase" ? (
          <Button
            type="button"
            variant="outlined"
            color="inherit"
            size="large"
            disabled={busy}
            onClick={handleGoogleSignIn}
            sx={{ py: 1.2, borderColor: "divider", fontWeight: 700 }}
          >
            Continue with Google
          </Button>
        ) : null}

        <Typography variant="body2" color="text.secondary" textAlign="center">
          {mode === "signin" ? "New to Hobby Arena? " : "Already a member? "}
          <Box component="button" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }} sx={{ background: "none", border: "none", p: 0, cursor: "pointer", color: "primary.main", fontWeight: 700, textDecoration: "underline", font: "inherit" }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </Box>
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

function TierQuestCard({ clientTier, tierProgress, fulfilledSpend }) {
  const theme = useTheme();
  const accent = tierProgress.nextTier?.badgeColor || clientTier?.badgeColor || theme.palette.primary.main;
  const pct = Math.round((tierProgress.progress || 0) * 100);

  return (
    <Box
      sx={{
        mb: 3,
        p: { xs: 2.25, md: 2.75 },
        borderRadius: 1,
        border: "1px solid",
        borderColor: alpha(accent, 0.45),
        bgcolor: alpha(accent, 0.08),
      }}
    >
      <Stack spacing={1.75}>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <SparkleIcon sx={{ color: accent, fontSize: 22 }} />
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem", fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: accent }}>
              Member rank
            </Typography>
          </Stack>
          <Chip
            label={clientTier?.name || "Member"}
            size="small"
            sx={{
              fontFamily: MONO_FONT,
              fontWeight: 800,
              letterSpacing: 0.4,
              color: clientTier?.badgeColor || "primary.main",
              border: "1px solid",
              borderColor: clientTier?.badgeColor || "primary.main",
              bgcolor: alpha(clientTier?.badgeColor || theme.palette.primary.main, 0.12),
            }}
          />
        </Stack>

        {tierProgress.atTop ? (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              You&apos;re at the top
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: "0.88rem" }}>
              Champion status unlocked. Keep pulling — the arena remembers.
            </Typography>
            <LinearProgress
              variant="determinate"
              value={100}
              sx={{
                mt: 1.75,
                height: 12,
                borderRadius: 99,
                bgcolor: alpha(accent, 0.16),
                "& .MuiLinearProgress-bar": {
                  borderRadius: 99,
                  bgcolor: accent,
                },
              }}
            />
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Next up: {tierProgress.nextTier.name}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: "0.88rem" }}>
              {PESO.format(tierProgress.remaining)} more in fulfilled orders to level up.
            </Typography>

            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 1.75, mb: 0.75 }}>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", fontWeight: 800, color: accent }}>
                {pct}% charged
              </Typography>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", color: "text.secondary" }}>
                {PESO.format(fulfilledSpend)} spent
              </Typography>
            </Stack>

            <Box sx={{ position: "relative" }}>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  height: 14,
                  borderRadius: 99,
                  bgcolor: alpha(accent, 0.14),
                  border: "1px solid",
                  borderColor: alpha(accent, 0.35),
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${alpha(accent, 0.75)} 0%, ${accent} 100%)`,
                  },
                }}
              />
            </Box>

            <Typography sx={{ mt: 1.25, fontFamily: MONO_FONT, fontSize: "0.65rem", letterSpacing: 0.6, color: "text.secondary", textTransform: "none" }}>
              Unlock {tierProgress.nextTier.name} · Goal {PESO.format(tierProgress.nextTier.minSpend ?? 0)}
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

function ProfileTab({ panelSx, surfaceBorderColor, clientTier, tierProgress, fulfilledSpend }) {
  const { user, updateCustomerProfileDetails } = useAuth();
  const { customers } = useCustomers();
  const saved = useMemo(() => {
    const fromList = customers.find(
      (row) => String(row.email || "").trim().toLowerCase() === String(user?.email || "").trim().toLowerCase(),
    );
    return fromList || getCustomerProfile(user?.email) || null;
  }, [customers, user?.email]);
  const savedAddress = saved?.address && typeof saved.address === "object" ? saved.address : {};
  const [name, setName] = useState(saved?.name || user?.displayName || "");
  const [phone, setPhone] = useState(() => formatPhPhoneInput(saved?.phone || user?.phone || ""));
  const [street, setStreet] = useState(savedAddress.street || "");
  const [city, setCity] = useState(savedAddress.city || "");
  const [province, setProvince] = useState(savedAddress.province || "");
  const [postal, setPostal] = useState(savedAddress.postal || "");
  const [marketingOptIn, setMarketingOptIn] = useState(
    Boolean(saved?.marketingOptIn ?? user?.marketingOptIn),
  );
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const profile = saved || getCustomerProfile(user?.email);
    if (!profile && !user) return;
    const address = profile?.address && typeof profile.address === "object" ? profile.address : {};
    setName(profile?.name || user?.displayName || "");
    setPhone(formatPhPhoneInput(profile?.phone || user?.phone || ""));
    setStreet(address.street || "");
    setCity(address.city || "");
    setProvince(address.province || "");
    setPostal(address.postal || "");
    setMarketingOptIn(Boolean(profile?.marketingOptIn ?? user?.marketingOptIn));
  }, [saved, user, user?.email, user?.displayName, user?.phone, user?.marketingOptIn]);

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    if (phone.trim() && !isValidPhPhone(phone)) {
      setError("Enter a valid PH mobile number (09XX XXX XXXX).");
      return;
    }
    setStatus("saving");
    try {
      await updateCustomerProfileDetails({
        name,
        phone: formatPhPhoneInput(phone),
        address: { street, city, province, postal },
        marketingOptIn,
      });
      setStatus("saved");
    } catch (err) {
      setError(err.message || "Could not save profile.");
      setStatus("idle");
    }
  }

  return (
    <Box component="form" onSubmit={handleSave} sx={{ p: { xs: 2.5, md: 3 } }}>
      <TierQuestCard
        clientTier={clientTier}
        tierProgress={tierProgress}
        fulfilledSpend={fulfilledSpend}
      />

      {status === "saved" ? <Alert severity="success" sx={{ mb: 2 }}>Profile saved.</Alert> : null}
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Contact</Typography>
            <TextField label="Full name" fullWidth value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Email" fullWidth value={user?.email || ""} disabled />
            <TextField
              label="Phone"
              fullWidth
              value={phone}
              onChange={(e) => setPhone(formatPhPhoneInput(e.target.value))}
              placeholder="09XX XXX XXXX"
              inputProps={{ inputMode: "numeric", autoComplete: "tel-national" }}
            />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Default delivery address</Typography>
            <TextField label="Street address" fullWidth value={street} onChange={(e) => setStreet(e.target.value)} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="City" fullWidth value={city} onChange={(e) => setCity(e.target.value)} />
              <TextField label="Province" fullWidth value={province} onChange={(e) => setProvince(e.target.value)} />
            </Stack>
            <TextField label="Postal code" fullWidth value={postal} onChange={(e) => setPostal(e.target.value)} sx={{ maxWidth: { sm: 220 } }} />
          </Stack>
        </Grid>
      </Grid>

      <Box
        sx={{
          mt: 3,
          p: 2,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          borderRadius: 1,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
        }}
      >
        <FormControlLabel
          sx={{ alignItems: "flex-start", m: 0, gap: 1, width: "100%" }}
          control={(
            <Switch
              checked={marketingOptIn}
              onChange={(e) => {
                setMarketingOptIn(e.target.checked);
                setStatus("idle");
              }}
              color="primary"
              inputProps={{ "aria-label": "Marketing opt-in" }}
            />
          )}
          label={(
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>
                Marketing
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.78rem", mt: 0.25, lineHeight: 1.4 }}>
                Opt in for restock alerts, pre-order windows, and member deals. Turn off anytime.
              </Typography>
            </Box>
          )}
        />
      </Box>

      <Button
        type="submit"
        variant="contained"
        disabled={status === "saving"}
        sx={{ mt: 3, fontFamily: MONO_FONT, letterSpacing: 0.5 }}
      >
        {status === "saving" ? "Saving…" : "Save details"}
      </Button>
    </Box>
  );
}

function Dashboard({ panelSx, surfaceBorderColor, authLoading = false }) {
  const theme = useTheme();
  const accents = getStatAccents(theme);
  const { user, signOutCustomer } = useAuth();
  const { orders: allOrders, ordersReady } = useOrders();
  const { items: wishlistItems, remove: removeFromWishlist } = useWishlist();
  const { addItem } = useCart();
  const { tiers } = useClientTiers();
  const [tab, setTab] = useState(0);
  const [orderQuery, setOrderQuery] = useState("");

  const customerOrders = useMemo(() => getOrdersForEmail(allOrders, user?.email), [allOrders, user?.email]);
  const filteredCustomerOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    const list = !q
      ? customerOrders
      : customerOrders.filter((o) =>
        o.id.toLowerCase().includes(q)
        || (o.items || "").toLowerCase().includes(q)
        || (o.lineItems || []).some((item) => (item.name || "").toLowerCase().includes(q)),
      );
    return sortOrdersByOrderNo(list);
  }, [customerOrders, orderQuery]);
  const fulfilledSpend = useMemo(
    () => computeFulfilledSpendForEmail(allOrders, user?.email),
    [allOrders, user?.email],
  );
  const clientTier = useMemo(() => resolveClientTier(fulfilledSpend, tiers), [fulfilledSpend, tiers]);
  const tierProgress = useMemo(() => getNextTierProgress(fulfilledSpend, tiers), [fulfilledSpend, tiers]);
  const displayName = user?.displayName || "Collector";
  const email = user?.email || "";
  const profileLoading = authLoading && !user;

  return (
    <Stack
      spacing={2.5}
      sx={{
        flex: 1,
        minHeight: 0,
        overflow: { xs: "visible", md: "hidden" },
      }}
    >
      <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, flexShrink: 0 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.35rem", flexShrink: 0, ...avatarStyles(theme) }}>
              {profileLoading ? "" : displayName.charAt(0).toUpperCase()}
            </Box>
            {profileLoading ? (
              <Box>
                <Skeleton variant="text" width={160} sx={{ fontSize: "1.5rem" }} />
                <Skeleton variant="text" width={200} sx={{ fontSize: "0.88rem" }} />
                <Skeleton variant="rounded" width={110} height={24} sx={{ mt: 0.75 }} />
              </Box>
            ) : (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{displayName}</Typography>
                <Typography color="text.secondary" sx={{ fontSize: "0.88rem" }}>{email}</Typography>
                <Chip
                  label={clientTier?.name || "Member"}
                  size="small"
                  variant="outlined"
                  sx={{
                    mt: 0.75,
                    fontFamily: MONO_FONT,
                    letterSpacing: 0.5,
                    color: clientTier?.badgeColor || "primary.main",
                    borderColor: clientTier?.badgeColor || "primary.main",
                    bgcolor: clientTier?.badgeColor ? alpha(clientTier.badgeColor, 0.12) : undefined,
                  }}
                />
              </Box>
            )}
          </Stack>
          <Button variant="outlined" color="inherit" onClick={signOutCustomer} disabled={profileLoading} sx={{ borderColor: surfaceBorderColor, flexShrink: 0 }}>Sign out</Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ flexShrink: 0 }}>
        <Grid size={{ xs: 6, sm: 6 }}>
          <StatCard panelSx={panelSx} icon={CardIcon} label="Total orders" value={customerOrders.length} accent={accents[0]} />
        </Grid>
        <Grid size={{ xs: 6, sm: 6 }}>
          <StatCard panelSx={panelSx} icon={HeartIcon} label="Wishlist" value={wishlistItems.length} accent={accents[3]} />
        </Grid>
      </Grid>

      <Box
        sx={{
          ...panelSx,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: { xs: "visible", md: "hidden" },
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{ px: 2, flexShrink: 0, borderBottom: "1px solid", borderColor: surfaceBorderColor }}
        >
          <Tab label={`Orders (${customerOrders.length})`} />
          <Tab label={`Wishlist (${wishlistItems.length})`} />
          <Tab label="Profile" />
        </Tabs>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: { xs: "visible", md: "auto" },
            overscrollBehavior: "contain",
          }}
        >
          {tab === 0 ? (
            <Stack spacing={2} sx={{ p: 3 }}>
              {customerOrders.length > 0 ? (
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search order or item…"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              ) : null}
              {!ordersReady ? (
                <Stack spacing={1.5} alignItems="center" sx={{ py: 5, color: "text.secondary" }}>
                  <CircularProgress size={28} />
                  <Typography variant="body2">Loading your orders…</Typography>
                </Stack>
              ) : customerOrders.length === 0 ? (
                <Stack spacing={1.5} alignItems="center" sx={{ py: 5, textAlign: "center", color: "text.secondary" }}>
                  <CardIcon sx={{ fontSize: 40, color: "text.secondary" }} />
                  <Typography>No orders yet.</Typography>
                  <Typography variant="body2">Your order history will appear here after checkout.</Typography>
                </Stack>
              ) : filteredCustomerOrders.length === 0 ? (
                <Stack spacing={1.5} alignItems="center" sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                  <Typography>No orders match your search.</Typography>
                </Stack>
              ) : filteredCustomerOrders.map((order) => (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  surfaceBorderColor={surfaceBorderColor}
                />
              ))}
            </Stack>
          ) : tab === 1 ? (
            wishlistItems.length === 0 ? (
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
                        <IconButton size="small" color="error" aria-label="Remove from wishlist" onClick={() => removeFromWishlist(item.id)}>
                          <TrashIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            )
          ) : (
            <ProfileTab
              panelSx={panelSx}
              surfaceBorderColor={surfaceBorderColor}
              clientTier={clientTier}
              tierProgress={tierProgress}
              fulfilledSpend={fulfilledSpend}
            />
          )}
        </Box>
      </Box>
    </Stack>
  );
}

export default function AccountPage() {
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { isCustomer, loading, reconcileCustomerSession } = useAuth();

  useEffect(() => {
    setAuthSurface("customer");
    reconcileCustomerSession();
  }, [reconcileCustomerSession]);

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 2.5, md: 3 },
        flex: 1,
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: { xs: "visible", md: "hidden" },
      }}
    >
      {isCustomer || loading ? (
        <Dashboard panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} authLoading={loading && !isCustomer} />
      ) : (
        <Stack spacing={4} alignItems="center" sx={{ py: { xs: 3, md: 5 } }}>
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
