import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink, useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import { OrderSummaryPanel } from "../components/OrderSummaryPanel.jsx";
import CheckoutConfirmation from "./CheckoutConfirmation.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useColorMode } from "../lib/colorMode.jsx";
import { getSurfaces } from "../lib/surfaces.js";
import { useCart, cartItemDueNow } from "../lib/cartStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import {
  BANK_ACCOUNTS,
  PROCESSING_HOURS,
  SHIPPING_DISCLAIMER,
  STORE_PICKUP_INFO,
  calcShipping,
} from "../data/checkoutSettings.js";
import { useCheckoutConfirmation, writeCheckoutConfirmation } from "../lib/checkoutConfirmation.js";

const STEPS = ["Account", "Details", "Payment"];
const QR_TILE_SIZE = 168;
const QR_TILE_SIZE_COMPACT = 112;

function CheckoutStepShell({ panelSx, children, sx }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 2.5, md: 3 }, ...sx }}>
      {children}
    </Box>
  );
}

function StepHeading({ step, title, subtitle, action }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5} sx={{ mb: 2.5 }}>
      <Box>
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT, display: "block" }}>
          {step}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.25, lineHeight: 1.2 }}>{title}</Typography>
        {subtitle ? (
          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: "0.88rem", lineHeight: 1.45, maxWidth: 520 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action ?? null}
    </Stack>
  );
}

function ZoomInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
      <path d="M12 10h-2v1.5H9V10H7.5V8.5H9V7h1.5v1.5H12z" />
    </svg>
  );
}

function QrCodeTile({ label, imageUrl, surfaceBorderColor, size = "default" }) {
  const theme = useTheme();
  const [zoomOpen, setZoomOpen] = useState(false);
  const tileSize = size === "compact" ? QR_TILE_SIZE_COMPACT : QR_TILE_SIZE;

  const tileSx = {
    width: tileSize,
    height: tileSize,
    maxWidth: "100%",
    mx: "auto",
    position: "relative",
    borderRadius: 1,
    border: "1px solid",
    borderColor: surfaceBorderColor,
    bgcolor: "#fff",
    overflow: "hidden",
  };

  if (!imageUrl) {
    return (
      <Box
        sx={{
          ...tileSx,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          fontFamily: MONO_FONT,
          fontSize: "0.72rem",
          color: "text.secondary",
          textAlign: "center",
          px: 1,
        }}
      >
        QR code coming soon
      </Box>
    );
  }

  return (
    <>
      <Box sx={tileSx}>
        <Box
          component="img"
          src={imageUrl}
          alt={`${label} QR code`}
          sx={{ width: "100%", height: "100%", objectFit: "contain", p: 0.75, display: "block" }}
        />
        <IconButton
          size="small"
          onClick={() => setZoomOpen(true)}
          aria-label={`Zoom ${label} QR code`}
          sx={{
            position: "absolute",
            right: 6,
            bottom: 6,
            bgcolor: alpha(theme.palette.background.paper, 0.94),
            border: "1px solid",
            borderColor: surfaceBorderColor,
            boxShadow: 1,
            "&:hover": { bgcolor: "background.paper" },
          }}
        >
          <ZoomInIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Dialog open={zoomOpen} onClose={() => setZoomOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{label} QR code</DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center", pb: 3 }}>
          <Box
            component="img"
            src={imageUrl}
            alt={`${label} QR code`}
            sx={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 1 }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

const EMPTY_DETAILS = {
  name: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  province: "",
  postal: "",
  notes: "",
};

function CheckoutEmptyLanding({ panelSx }) {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 8, md: 12 } }}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>
          Checkout
        </Typography>
        <Box sx={{ ...panelSx, p: { xs: 4, md: 5 }, width: "100%" }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Your cart is empty</Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, mb: 3, lineHeight: 1.6 }}>
            Add items from the shop before checking out. You can keep browsing and come back when you&apos;re ready.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
            <Button
              component={RouterLink}
              to="/shop"
              variant="contained"
              size="large"
              sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
            >
              Browse shop
            </Button>
            <Button component={RouterLink} to="/" variant="outlined" color="inherit" size="large">
              Back to home
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}

function AccountStep({ panelSx, surfaceBorderColor, onContinue, isGuest, setIsGuest }) {
  const theme = useTheme();
  const { user, isCustomer, signInCustomer, registerCustomer } = useAuth();
  const [mode, setMode] = useState("guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isCustomer && user) {
    return (
      <Box sx={{ ...panelSx, p: { xs: 3, md: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Signed in</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
          Continuing as <strong>{user.displayName}</strong> ({user.email})
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => onContinue({ name: user.displayName, email: user.email, guest: false })}
          sx={{ mt: 3, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
        >
          Continue to details
        </Button>
      </Box>
    );
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") {
        const signedIn = await signInCustomer(email, password);
        onContinue({ name: signedIn.displayName, email: signedIn.email, guest: false });
      } else if (mode === "signup") {
        const registered = await registerCustomer({ name, email, password, acceptedTerms, marketingOptIn: false });
        onContinue({ name: registered.displayName, email: registered.email, guest: false });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function handleGuestContinue() {
    setIsGuest(true);
    onContinue({ guest: true });
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 3, md: 4 } }}>
      <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Step 1</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>How would you like to checkout?</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Create an account to track orders, or continue as a guest — either way works.
      </Typography>

      <Stack spacing={2}>
        <Button
          fullWidth
          variant={mode === "guest" ? "contained" : "outlined"}
          color={mode === "guest" ? "primary" : "inherit"}
          onClick={() => { setMode("guest"); setError(""); }}
          sx={{ py: 1.5, justifyContent: "flex-start", borderColor: surfaceBorderColor }}
        >
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontWeight: 800 }}>Continue as guest</Typography>
            <Typography variant="body2" color={mode === "guest" ? "inherit" : "text.secondary"} sx={{ opacity: 0.9 }}>
              No account needed — enter your details on the next step.
            </Typography>
          </Box>
        </Button>

        <Button
          fullWidth
          variant={mode === "signup" ? "contained" : "outlined"}
          color={mode === "signup" ? "primary" : "inherit"}
          onClick={() => { setMode("signup"); setError(""); }}
          sx={{ py: 1.5, justifyContent: "flex-start", borderColor: surfaceBorderColor }}
        >
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontWeight: 800 }}>Create an account</Typography>
            <Typography variant="body2" color={mode === "signup" ? "inherit" : "text.secondary"}>
              Track orders and checkout faster next time.
            </Typography>
          </Box>
        </Button>

        <Button
          fullWidth
          variant={mode === "signin" ? "contained" : "outlined"}
          color={mode === "signin" ? "primary" : "inherit"}
          onClick={() => { setMode("signin"); setError(""); }}
          sx={{ py: 1.5, justifyContent: "flex-start", borderColor: surfaceBorderColor }}
        >
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontWeight: 800 }}>Sign in</Typography>
            <Typography variant="body2" color={mode === "signin" ? "inherit" : "text.secondary"}>
              Already have an account? Sign in to continue.
            </Typography>
          </Box>
        </Button>
      </Stack>

      {mode === "guest" ? (
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleGuestContinue}
          sx={{ mt: 3, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
        >
          Continue as guest
        </Button>
      ) : (
        <Box component="form" onSubmit={handleAuthSubmit} sx={{ mt: 3 }}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <Stack spacing={2}>
            {mode === "signup" ? (
              <TextField label="Full name" fullWidth value={name} onChange={(e) => setName(e.target.value)} required />
            ) : null}
            <TextField label="Email" type="email" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField label="Password" type="password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} required helperText={mode === "signup" ? "At least 8 characters." : " "} />
            {mode === "signup" ? (
              <FormControlLabel
                control={<Checkbox checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} size="small" />}
                label={
                  <Typography variant="body2" color="text.secondary">
                    I agree to the Terms of Service and Privacy Policy.
                  </Typography>
                }
              />
            ) : null}
            <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in & continue" : "Create account & continue"}
            </Button>
          </Stack>
        </Box>
      )}

      {isGuest ? (
        <Chip label="Guest checkout" size="small" color="secondary" sx={{ mt: 2, fontWeight: 700 }} />
      ) : null}
    </Box>
  );
}

function DetailsStep({ panelSx, surfaceBorderColor, details, setDetails, onBack, onContinue }) {
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!details.name.trim() || !details.email.trim() || !details.phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }
    if (!details.street.trim() || !details.city.trim() || !details.province.trim()) {
      setError("Please complete your delivery address.");
      return;
    }
    onContinue();
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <CheckoutStepShell panelSx={panelSx}>
      <StepHeading
        step="Step 2"
        title="Contact & delivery"
        subtitle="Where should we send your order?"
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Full name" fullWidth required size="small" value={details.name} onChange={(e) => setDetails({ name: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Phone" fullWidth required size="small" value={details.phone} onChange={(e) => setDetails({ phone: e.target.value })} placeholder="09XX XXX XXXX" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Email" type="email" fullWidth required size="small" value={details.email} onChange={(e) => setDetails({ email: e.target.value })} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              border: "1px solid",
              borderColor: surfaceBorderColor,
              bgcolor: (theme) => alpha(theme.palette.info.main, 0.06),
            }}
          >
            <Typography variant="body2" sx={{ lineHeight: 1.5, fontSize: "0.82rem" }}>
              {SHIPPING_DISCLAIMER} {STORE_PICKUP_INFO} {PROCESSING_HOURS}
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField label="Street address" fullWidth required size="small" value={details.street} onChange={(e) => setDetails({ street: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField label="City" fullWidth required size="small" value={details.city} onChange={(e) => setDetails({ city: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField label="Province" fullWidth required size="small" value={details.province} onChange={(e) => setDetails({ province: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField label="Postal code" fullWidth size="small" value={details.postal} onChange={(e) => setDetails({ postal: e.target.value })} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <TextField label="Order notes (optional)" fullWidth multiline minRows={2} size="small" value={details.notes} onChange={(e) => setDetails({ notes: e.target.value })} />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
        <Button variant="outlined" color="inherit" onClick={onBack} sx={{ borderColor: surfaceBorderColor }}>Back</Button>
        <Button type="submit" variant="contained" sx={{ flexGrow: 1, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Continue to payment
        </Button>
      </Stack>
      </CheckoutStepShell>
    </Box>
  );
}

function PaymentStep({ panelSx, surfaceBorderColor, total, orderIdPreview, proofFile, setProofFile, confirmedTransfer, setConfirmedTransfer, onBack, onPlaceOrder, busy, error }) {
  const theme = useTheme();
  const banks = useMemo(() => BANK_ACCOUNTS.filter((bank) => bank.active !== false), []);
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id ?? "");
  const selectedBank = banks.find((bank) => bank.id === selectedBankId) ?? banks[0];

  useEffect(() => {
    if (banks.length && !banks.some((bank) => bank.id === selectedBankId)) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofFile({ name: file.name, dataUrl: reader.result });
    reader.readAsDataURL(file);
  }

  return (
    <CheckoutStepShell panelSx={panelSx}>
      <StepHeading
        step="Step 3"
        title="Pay & confirm"
        subtitle="Transfer to one account below, upload proof, then place your order."
        action={(
          <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", color: "primary.main", fontFamily: MONO_FONT, whiteSpace: "nowrap" }}>
            {PESO.format(total)}
          </Typography>
        )}
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {banks.map((bank) => (
          <Chip
            key={bank.id}
            label={bank.label}
            onClick={() => setSelectedBankId(bank.id)}
            color={selectedBank?.id === bank.id ? "primary" : "default"}
            variant={selectedBank?.id === bank.id ? "filled" : "outlined"}
            sx={{ fontWeight: 700 }}
          />
        ))}
      </Stack>

      {selectedBank ? (
        <Box
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 1,
            border: "1px solid",
            borderColor: surfaceBorderColor,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 1, color: "primary.main" }}>
              {selectedBank.label.toUpperCase()}
            </Typography>
            <Typography sx={{ fontWeight: 700, mt: 0.75, fontSize: "0.95rem" }}>{selectedBank.accountName}</Typography>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: "1.05rem", fontWeight: 800, mt: 0.35, letterSpacing: 0.3 }}>
              {selectedBank.accountNumber}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, lineHeight: 1.45 }}>
              {selectedBank.note}
            </Typography>
          </Box>
          <Box sx={{ flexShrink: 0, alignSelf: { xs: "center", sm: "flex-start" } }}>
            <QrCodeTile label={selectedBank.label} imageUrl={selectedBank.qrImage} surfaceBorderColor={surfaceBorderColor} size="compact" />
          </Box>
        </Box>
      ) : null}

      <Box
        sx={{
          p: 2,
          borderRadius: 1,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          bgcolor: alpha(theme.palette.background.paper, 0.45),
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", mb: 1.25 }}>
          Proof of payment
          <Box component="span" sx={{ color: "error.main", ml: 0.25 }}>*</Box>
        </Typography>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <Button component="label" variant="outlined" color="inherit" sx={{ borderColor: surfaceBorderColor, fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}>
            {proofFile ? "Change file" : "Upload receipt"}
            <input type="file" hidden accept="image/*,application/pdf" onChange={handleFileChange} />
          </Button>
          {proofFile ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Chip label={proofFile.name} size="small" color="success" sx={{ maxWidth: "100%" }} />
              {proofFile.dataUrl?.startsWith("data:image") ? (
                <Box component="img" src={proofFile.dataUrl} alt="Proof preview" sx={{ height: 40, width: 40, objectFit: "cover", borderRadius: 0.75, border: "1px solid", borderColor: surfaceBorderColor, flexShrink: 0 }} />
              ) : null}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">Screenshot or PDF of your transfer.</Typography>
          )}
        </Stack>

        <FormControlLabel
          sx={{
            alignItems: "flex-start",
            mx: 0,
            mt: 2,
            "& .MuiCheckbox-root": { pt: 0.15, ml: -0.5 },
          }}
          control={(
            <Checkbox
              checked={confirmedTransfer}
              onChange={(e) => setConfirmedTransfer(e.target.checked)}
              size="small"
            />
          )}
          label={(
            <Typography variant="body2" component="span" sx={{ lineHeight: 1.5 }}>
              I have transferred the exact amount ({PESO.format(total)})
              <Box component="span" sx={{ color: "error.main" }}> *</Box>
            </Typography>
          )}
        />
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
        <Button variant="outlined" color="inherit" onClick={onBack} sx={{ borderColor: surfaceBorderColor }}>Back</Button>
        <Button
          variant="contained"
          disabled={busy || !proofFile || !confirmedTransfer}
          onClick={onPlaceOrder}
          sx={{ flexGrow: 1, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
        >
          {busy ? "Placing order…" : "Place order"}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, lineHeight: 1.45 }}>
        Marked <strong>Pending Verification</strong> until our team confirms payment.
        {orderIdPreview ? ` Reference: ${orderIdPreview}` : ""}
      </Typography>
    </CheckoutStepShell>
  );
}


export default function CheckoutPage() {
  const theme = useTheme();
  const { mode } = useColorMode();
  const outletContext = useOutletContext();
  const surfaces = outletContext?.surfaces ?? getSurfaces(theme, mode === "dark");
  const { panelSx, surfaceBorderColor } = surfaces;
  const { user, isCustomer, loading } = useAuth();
  const { items, subtotal, balanceDue, hasPreorder, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { decrementStockForCart } = useInventory();
  const confirmedOrder = useCheckoutConfirmation();

  const [step, setStep] = useState(0);
  const [isGuest, setIsGuest] = useState(true);
  const [accountSkipped, setAccountSkipped] = useState(false);
  const [details, setDetailsState] = useState(EMPTY_DETAILS);
  const [proofFile, setProofFile] = useState(null);
  const [confirmedTransfer, setConfirmedTransfer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const shippingFee = useMemo(() => calcShipping(), []);
  const total = subtotal + shippingFee;

  function setDetails(patch) {
    setDetailsState((prev) => ({ ...prev, ...patch }));
  }

  useEffect(() => {
    if (!loading && isCustomer && user && !accountSkipped) {
      setIsGuest(false);
      setDetailsState((prev) => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email,
      }));
      setStep(1);
      setAccountSkipped(true);
    }
  }, [loading, isCustomer, user, accountSkipped]);

  if (confirmedOrder) {
    return (
      <Box
        sx={{
          minHeight: "calc(100dvh - 72px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          py: { xs: 4, md: 6 },
        }}
      >
        <CheckoutConfirmation order={confirmedOrder} panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
      </Box>
    );
  }

  if (items.length === 0) {
    return <CheckoutEmptyLanding panelSx={panelSx} />;
  }

  function handleAccountContinue({ name, email, guest } = {}) {
    if (name || email) {
      setDetails({ ...(name ? { name } : {}), ...(email ? { email } : {}) });
    }
    if (guest !== undefined) setIsGuest(guest);
    setStep(1);
  }

  function handlePlaceOrder() {
    setPaymentError("");
    if (!proofFile?.dataUrl) {
      setPaymentError("Please upload proof of payment.");
      return;
    }
    setBusy(true);
    try {
      const address = {
        street: details.street.trim(),
        city: details.city.trim(),
        province: details.province.trim(),
        postal: details.postal.trim(),
      };

      const depositPercent = items.find((item) => item.depositPercent)?.depositPercent ?? 30;

      const order = placeOrder({
        cartItems: items,
        customer: details.name.trim(),
        email: details.email.trim(),
        phone: details.phone.trim(),
        fulfillment: "delivery",
        region: null,
        address,
        notes: details.notes,
        subtotal,
        shippingFee,
        total,
        fullSubtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        balanceDue,
        depositPercent,
        proofOfPayment: proofFile.dataUrl,
        guest: isGuest,
        userId: user?.uid,
      });

      if (order?.id) {
        writeCheckoutConfirmation({
          id: order.id,
          total: order.total ?? 0,
          balanceDue: order.balanceDue ?? 0,
          email: order.email ?? "",
          userId: order.userId ?? null,
        });
      } else {
        setPaymentError("Could not place order. Please try again.");
        setBusy(false);
        return;
      }

      clearCart();
      decrementStockForCart(items);
    } catch {
      setPaymentError("Could not place order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 5 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Checkout</Typography>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Typography variant="h3" sx={{ fontWeight: 800 }}>Complete your order</Typography>
            <Button component={RouterLink} to="/" variant="text" color="inherit" sx={{ color: "text.secondary" }}>
              ← Continue shopping
            </Button>
          </Stack>
        </Box>

        <Stepper activeStep={step} alternativeLabel sx={{ display: { xs: "none", sm: "flex" } }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        <Grid container spacing={3} alignItems="flex-start" justifyContent="center">
          <Grid size={{ xs: 12, lg: 7 }} sx={{ maxWidth: { lg: 640 }, mx: { lg: 0 }, width: "100%" }}>
            {step === 0 ? (
              <AccountStep
                panelSx={panelSx}
                surfaceBorderColor={surfaceBorderColor}
                onContinue={handleAccountContinue}
                isGuest={isGuest}
                setIsGuest={setIsGuest}
              />
            ) : null}
            {step === 1 ? (
              <DetailsStep
                panelSx={panelSx}
                surfaceBorderColor={surfaceBorderColor}
                details={details}
                setDetails={setDetails}
                onBack={() => setStep(isCustomer && user ? 0 : 0)}
                onContinue={() => setStep(2)}
              />
            ) : null}
            {step === 2 ? (
              <PaymentStep
                panelSx={panelSx}
                surfaceBorderColor={surfaceBorderColor}
                total={total}
                proofFile={proofFile}
                setProofFile={setProofFile}
                confirmedTransfer={confirmedTransfer}
                setConfirmedTransfer={setConfirmedTransfer}
                onBack={() => setStep(1)}
                onPlaceOrder={handlePlaceOrder}
                busy={busy}
                error={paymentError}
              />
            ) : null}
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }} sx={{ maxWidth: { lg: 380 }, width: "100%", mx: { lg: "auto" } }}>
            <Box sx={{ position: { lg: "sticky" }, top: 88 }}>
              <OrderSummaryPanel
                compact
                items={items.map((item) => ({ ...item, amount: cartItemDueNow(item) }))}
                subtotal={subtotal}
                shippingFee={shippingFee}
                total={total}
                balanceDue={balanceDue}
                hasPreorder={hasPreorder}
                panelSx={panelSx}
              />
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
