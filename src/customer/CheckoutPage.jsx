import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { mapFirebaseUserError } from "../lib/firebase/auth.js";
import { useColorMode } from "../lib/colorMode.jsx";
import { getSurfaces } from "../lib/surfaces.js";
import { useCart, cartItemDueNow } from "../lib/cartStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";
import { useStockHolds } from "../lib/stockHoldStore.jsx";
import {
  PROCESSING_HOURS,
  SHIPPING_DISCLAIMER,
  STORE_PICKUP_INFO,
  calcShipping,
} from "../data/checkoutSettings.js";
import { isGuestCaptchaEnabled, useCms } from "../lib/cmsContent.jsx";
import { useCheckoutConfirmation, writeCheckoutConfirmation } from "../lib/checkoutConfirmation.js";
import { compressProofFile } from "../lib/imageCompression.js";
import { UPLOAD_PROOF_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
import { getCustomerCheckoutDefaults, patchCustomerProfileIfEmpty, recordCustomerFromCheckout, useCustomers } from "../lib/customersStore.jsx";
import { readCheckoutDetails, writeCheckoutDetails, clearCheckoutDetails } from "../lib/checkoutDetails.js";
import { formatPhPhoneInput, isValidPhPhone } from "../lib/phone.js";
import { isValidEmail } from "../lib/email/emailUtils.js";
import PasswordField from "../components/PasswordField.jsx";
import QrCodeTile from "../components/QrCodeTile.jsx";
import BirSealBadge, { useBirSealVisible } from "../components/BirSealBadge.jsx";
import RecaptchaV2, { getRecaptchaSiteKey } from "../components/RecaptchaV2.jsx";

const STEPS = ["Account", "Details", "Payment"];

/** PH postal codes are numeric — strip everything else as the user types. */
function formatPostalInput(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 10);
}

function CheckoutStepShell({ panelSx, children, sx }) {
  return (
    <Box
      sx={{
        ...panelSx,
        p: { xs: 2, md: 2.25 },
        flex: 1,
        alignSelf: "stretch",
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function StepHeading({ step, title, subtitle, action }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5} sx={{ mb: 2 }}>
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
  const { user, isCustomer, signInCustomer, signInWithGoogle, registerCustomer, sendPasswordReset, authMode } = useAuth();
  const [mode, setMode] = useState("guest");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
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
    setInfo("");
    // Uncontrolled + FormData so iOS Safari autofill is not wiped by React state.
    const formData = new FormData(event.currentTarget);
    const nextName = String(formData.get("name") || "").trim();
    const nextEmail = String(formData.get("email") || "").trim();
    const nextPassword = String(formData.get("password") || "");
    if (!isValidEmail(nextEmail)) {
      setError("Enter a valid email address (name@domain.com).");
      return;
    }
    if ((mode === "signin" || mode === "signup") && !nextPassword) {
      setError("Password is required.");
      return;
    }
    if (mode === "signup" && !nextName) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        await sendPasswordReset(nextEmail);
        setInfo("If an email/password account exists for that address, we sent a reset link.");
      } else if (mode === "signin") {
        const signedIn = await signInCustomer(nextEmail, nextPassword);
        onContinue({ name: signedIn.displayName, email: signedIn.email, guest: false });
      } else if (mode === "signup") {
        const registered = await registerCustomer({
          name: nextName,
          email: nextEmail,
          password: nextPassword,
          acceptedTerms,
          marketingOptIn: false,
        });
        onContinue({ name: registered.displayName, email: registered.email, guest: false });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const signedIn = await signInWithGoogle();
      if (!signedIn) {
        setInfo("Redirecting to Google…");
        return;
      }
      onContinue({ name: signedIn.displayName, email: signedIn.email, guest: false });
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleGuestContinue() {
    setIsGuest(true);
    onContinue({ guest: true });
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 3, md: 4 }, flex: 1, alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
      <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Step 1</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>How would you like to checkout?</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Create an account to track orders, or continue as a guest — either way works.
      </Typography>

      {mode === "guest" && error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {mode === "guest" && info ? <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert> : null}

      {authMode === "firebase" ? (
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Button
            fullWidth
            type="button"
            variant="contained"
            color="primary"
            size="large"
            disabled={busy}
            onClick={handleGoogleSignIn}
            sx={{
              py: 1.35,
              fontFamily: MONO_FONT,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              fontWeight: 800,
              // Theme proposal 2 makes containedPrimary look outlined — force a solid fill.
              bgcolor: "primary.main",
              color: (theme) => theme.palette.getContrastText(theme.palette.primary.main),
              border: "1px solid",
              borderColor: "primary.main",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "primary.dark",
                borderColor: "primary.dark",
                boxShadow: "none",
              },
            }}
          >
            Continue with Google
          </Button>
          <Divider sx={{ color: "text.secondary", fontSize: "0.75rem" }}>or</Divider>
        </Stack>
      ) : null}

      <Stack spacing={2}>
        <Button
          fullWidth
          variant={mode === "guest" ? "contained" : "outlined"}
          color={mode === "guest" ? "primary" : "inherit"}
          onClick={() => { setMode("guest"); setError(""); setInfo(""); }}
          sx={{ py: 1.5, justifyContent: "flex-start", borderColor: surfaceBorderColor }}
        >
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontWeight: 800 }}>Continue as guest</Typography>
            <Typography variant="body2" color={mode === "guest" ? "inherit" : "text.secondary"} sx={{ opacity: 0.9, textTransform: "none" }}>
              No account needed — enter your details on the next step.
            </Typography>
          </Box>
        </Button>

        <Button
          fullWidth
          variant={mode === "signup" ? "contained" : "outlined"}
          color={mode === "signup" ? "primary" : "inherit"}
          onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
          sx={{ py: 1.5, justifyContent: "flex-start", borderColor: surfaceBorderColor }}
        >
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontWeight: 800 }}>Create an account</Typography>
            <Typography variant="body2" color={mode === "signup" ? "inherit" : "text.secondary"} sx={{ textTransform: "none" }}>
              Track orders and checkout faster next time.
            </Typography>
          </Box>
        </Button>

        <Button
          fullWidth
          variant={mode === "signin" || mode === "reset" ? "contained" : "outlined"}
          color={mode === "signin" || mode === "reset" ? "primary" : "inherit"}
          onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
          sx={{ py: 1.5, justifyContent: "flex-start", borderColor: surfaceBorderColor }}
        >
          <Box sx={{ textAlign: "left" }}>
            <Typography sx={{ fontWeight: 800 }}>Sign in</Typography>
            <Typography variant="body2" color={mode === "signin" || mode === "reset" ? "inherit" : "text.secondary"} sx={{ textTransform: "none" }}>
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
        <Box component="form" onSubmit={handleAuthSubmit} sx={{ mt: 3 }} key={mode}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          {info ? <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert> : null}
          <Stack spacing={2}>
            {mode === "reset" ? (
              <Typography variant="body2" color="text.secondary">
                We’ll email a reset link for email/password accounts. Google sign-in members should use Continue with Google.
              </Typography>
            ) : null}
            {mode === "signup" ? (
              <TextField name="name" label="Full name" fullWidth defaultValue="" autoComplete="name" />
            ) : null}
            <TextField
              name="email"
              label="Email"
              type="email"
              fullWidth
              defaultValue=""
              inputProps={{ inputMode: "email", autoComplete: "email" }}
            />
            {mode === "signin" || mode === "signup" ? (
              <Stack spacing={0.5}>
                <PasswordField
                  name="password"
                  defaultValue=""
                  helperText={mode === "signup" ? "At least 8 characters." : " "}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                {mode === "signin" && authMode === "firebase" ? (
                  <Typography variant="body2" textAlign="right">
                    <Box
                      component="button"
                      type="button"
                      onClick={() => { setMode("reset"); setError(""); setInfo(""); }}
                      sx={{
                        background: "none",
                        border: "none",
                        p: 0,
                        cursor: "pointer",
                        color: "primary.main",
                        fontWeight: 700,
                        textDecoration: "underline",
                        font: "inherit",
                      }}
                    >
                      Forgot password?
                    </Box>
                  </Typography>
                ) : null}
              </Stack>
            ) : null}
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
              {busy
                ? "Please wait…"
                : mode === "reset"
                  ? "Send reset link"
                  : mode === "signin"
                    ? "Sign in & continue"
                    : "Create account & continue"}
            </Button>
            {mode === "reset" ? (
              <Button
                type="button"
                variant="text"
                onClick={() => { setMode("signin"); setError(""); setInfo(""); }}
                sx={{ fontWeight: 700 }}
              >
                Back to sign in
              </Button>
            ) : null}
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
    if (!isValidEmail(details.email)) {
      setError("Enter a valid email address (name@domain.com).");
      return;
    }
    if (!isValidPhPhone(details.phone)) {
      setError("Enter a valid PH mobile number (09XX XXX XXXX).");
      return;
    }
    if (!details.street.trim() || !details.city.trim() || !details.province.trim()) {
      setError("Please complete your delivery address.");
      return;
    }
    if (details.postal && !/^\d+$/.test(details.postal.trim())) {
      setError("Postal code should contain numbers only.");
      return;
    }
    onContinue();
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ flex: 1, alignSelf: "stretch", display: "flex", flexDirection: "column" }}>
      <CheckoutStepShell panelSx={panelSx} sx={{ flex: 1 }}>
        <Box sx={{ flexShrink: 0 }}>
          <StepHeading
            step="Step 2"
            title="Contact & delivery"
            subtitle="Where should we send your order?"
          />
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        </Box>

        <Grid container spacing={1.75} sx={{ flexShrink: 0 }}>
          <Grid size={{ xs: 12 }}>
            <TextField label="Full name" fullWidth required size="small" value={details.name} onChange={(e) => setDetails({ name: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Phone"
              fullWidth
              required
              size="small"
              value={details.phone}
              onChange={(e) => setDetails({ phone: formatPhPhoneInput(e.target.value) })}
              placeholder="09XX XXX XXXX"
              inputProps={{ inputMode: "numeric", autoComplete: "tel-national" }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              size="small"
              value={details.email}
              onChange={(e) => setDetails({ email: e.target.value })}
              error={Boolean(details.email.trim()) && !isValidEmail(details.email)}
              helperText={
                details.email.trim() && !isValidEmail(details.email)
                  ? "Use a full email like name@domain.com"
                  : undefined
              }
              inputProps={{ inputMode: "email", autoComplete: "email" }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="Street address"
              fullWidth
              required
              size="small"
              multiline
              minRows={4}
              value={details.street}
              onChange={(e) => setDetails({ street: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="City" fullWidth required size="small" value={details.city} onChange={(e) => setDetails({ city: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Province" fullWidth required size="small" value={details.province} onChange={(e) => setDetails({ province: e.target.value })} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Postal code"
              fullWidth
              size="small"
              value={details.postal}
              onChange={(e) => setDetails({ postal: formatPostalInput(e.target.value) })}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*", autoComplete: "postal-code" }}
              helperText="Numbers only"
            />
          </Grid>
        </Grid>

        <Box sx={{ flex: 1, minHeight: 88, mt: 1.75, display: "flex", flexDirection: "column" }}>
          <TextField
            label="Order notes (optional)"
            fullWidth
            multiline
            minRows={2}
            size="small"
            value={details.notes}
            onChange={(e) => setDetails({ notes: e.target.value })}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              "& .MuiInputBase-root": {
                flex: 1,
                alignItems: "stretch",
                height: "100%",
              },
              "& textarea": {
                height: "100% !important",
                overflow: "auto !important",
              },
            }}
          />
        </Box>

        <Box
          sx={{
            flexShrink: 0,
            mt: 1.5,
            mb: 1.5,
            p: 1.25,
            borderRadius: 1,
            border: "1px solid",
            borderColor: surfaceBorderColor,
            bgcolor: (theme) => alpha(theme.palette.info.main, 0.06),
          }}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.45, fontSize: "0.8rem" }}>
            {SHIPPING_DISCLAIMER} {STORE_PICKUP_INFO} {PROCESSING_HOURS}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
          <Button variant="outlined" color="inherit" onClick={onBack} sx={{ borderColor: surfaceBorderColor }}>Back</Button>
          <Button type="submit" variant="contained" sx={{ flexGrow: 1, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Continue to payment
          </Button>
        </Stack>
      </CheckoutStepShell>
    </Box>
  );
}

function formatHoldClock(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function StockHoldBanner({ hold, surfaceBorderColor }) {
  const theme = useTheme();
  if (!hold || hold.status === "idle" || hold.status === "none") return null;

  if (hold.status === "held") {
    return (
      <Box
        sx={{
          mb: 2,
          p: { xs: 1, md: 1.25 },
          borderRadius: 1,
          border: "1.5px solid",
          borderColor: alpha(theme.palette.warning.main, 0.55),
          bgcolor: alpha(theme.palette.warning.main, 0.16),
          boxShadow: `0 0 0 1px ${alpha(theme.palette.warning.main, 0.12)}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", minWidth: 0, color: "warning.main", fontFamily: MONO_FONT, letterSpacing: 0.6, textTransform: "uppercase" }}>
          Reserved
        </Typography>
        <Typography
          sx={{ fontFamily: MONO_FONT, fontWeight: 800, fontSize: "1.05rem", color: "warning.main", letterSpacing: 0.5, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
        >
          {formatHoldClock(hold.remainingMs)}
        </Typography>
      </Box>
    );
  }

  const shortfallNames = (hold.shortfalls || []).map((s) => s.name).filter(Boolean).join(", ");
  return (
    <Alert
      severity="error"
      sx={{ mb: 2, borderColor: surfaceBorderColor }}
      action={
        <Button color="inherit" size="small" onClick={hold.onRetry} sx={{ fontWeight: 700 }}>
          Re-check
        </Button>
      }
    >
      {hold.status === "expired"
        ? "Your 20-minute reservation expired and the stock was released to other shoppers."
        : `Out of stock — ${shortfallNames || "these items"} were just reserved by another shopper.`}
    </Alert>
  );
}

function PaymentStep({
  panelSx,
  surfaceBorderColor,
  total,
  orderIdPreview,
  proofFile,
  setProofFile,
  confirmedTransfer,
  setConfirmedTransfer,
  onBack,
  onPlaceOrder,
  busy,
  error,
  setError,
  hold,
  guestCheckout,
  recaptchaToken,
  setRecaptchaToken,
}) {
  const theme = useTheme();
  const { content } = useCms();
  const showBirBelowPayment = useBirSealVisible("payment");
  const recaptchaSiteKey = getRecaptchaSiteKey();
  const banks = useMemo(
    () => (content.bankDetails?.accounts ?? []).filter((bank) => bank.active !== false),
    [content.bankDetails?.accounts],
  );
  const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id ?? "");
  const selectedBank = banks.find((bank) => bank.id === selectedBankId) ?? banks[0];
  const guestNeedsCaptcha = Boolean(
    guestCheckout
    && recaptchaSiteKey
    && isGuestCaptchaEnabled(content.storefront),
  );

  useEffect(() => {
    if (banks.length && !banks.some((bank) => bank.id === selectedBankId)) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  // Warm the browser cache for every bank's logo + QR so switching is instant
  // (otherwise each first switch triggers a fresh fetch/decode and flashes).
  useEffect(() => {
    banks.forEach((bank) => {
      [bank.logo, bank.qrImage].forEach((src) => {
        if (!src) return;
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      });
    });
  }, [banks]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return;
    }
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    try {
      const dataUrl = await compressProofFile(file);
      setProofFile({ name: file.name, dataUrl });
      setError("");
    } catch (err) {
      setError(err.message || "Could not read file. Try a smaller image or PDF.");
    }
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

      <StockHoldBanner hold={hold} surfaceBorderColor={surfaceBorderColor} />

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
            p: { xs: 2, md: 2.5 },
            mb: 2.5,
            borderRadius: 1,
            border: "1px solid",
            borderColor: surfaceBorderColor,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: { xs: 2, sm: 3 },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {selectedBank.logo ? (
                <Box
                  component="img"
                  src={selectedBank.logo}
                  alt={selectedBank.label}
                  decoding="async"
                  sx={{
                    height: selectedBank.id === "chinabank" ? 52 : 32,
                    width: "auto",
                    maxWidth: selectedBank.id === "chinabank" ? 200 : 140,
                    objectFit: "contain",
                    objectPosition: "left center",
                    display: "block",
                  }}
                />
              ) : (
                <Typography sx={{ fontWeight: 800, fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 1, color: "primary.main" }}>
                  {selectedBank.label.toUpperCase()}
                </Typography>
              )}
            </Stack>
            <Typography sx={{ fontWeight: 700, mt: 0.75, fontSize: "1rem" }}>{selectedBank.accountName}</Typography>
            <Typography sx={{ fontFamily: MONO_FONT, fontSize: "1.15rem", fontWeight: 800, mt: 0.5, letterSpacing: 0.3 }}>
              {selectedBank.accountNumber}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, lineHeight: 1.45, textTransform: "none" }}>
              {selectedBank.note}
            </Typography>
          </Box>
          <Box sx={{ flexShrink: 0, alignSelf: { xs: "center", sm: "center" } }}>
            <QrCodeTile label={selectedBank.label} imageUrl={selectedBank.qrImage} surfaceBorderColor={surfaceBorderColor} />
          </Box>
        </Box>
      ) : null}

      {showBirBelowPayment ? (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
          <BirSealBadge placement="payment" maxWidth={360} />
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
          <Button component="label" variant="contained" color="primary" sx={{ fontFamily: MONO_FONT, fontSize: "0.72rem", letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}>
            {proofFile ? "Change file" : "Upload receipt"}
            <input type="file" hidden accept="image/*,application/pdf" onChange={handleFileChange} />
          </Button>
          {proofFile ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <Chip
                label={proofFile.name}
                size="small"
                color="success"
                title={proofFile.name}
                sx={{
                  minWidth: 0,
                  maxWidth: "100%",
                  flex: "1 1 auto",
                  "& .MuiChip-label": {
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                }}
              />
              {proofFile.dataUrl?.startsWith("data:image") ? (
                <Box component="img" src={proofFile.dataUrl} alt="Proof preview" loading="lazy" decoding="async" sx={{ height: 40, width: 40, objectFit: "cover", borderRadius: 0.75, border: "1px solid", borderColor: surfaceBorderColor, flexShrink: 0 }} />
              ) : null}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">Screenshot or PDF of your transfer.</Typography>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75, lineHeight: 1.4, textTransform: "none" }}>
          {UPLOAD_PROOF_DISCLAIMER}
        </Typography>

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

      {guestNeedsCaptcha ? (
        <Box sx={{ mt: 2.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
            Quick security check
          </Typography>
          <RecaptchaV2
            siteKey={recaptchaSiteKey}
            theme={theme.palette.mode === "dark" ? "dark" : "light"}
            onChange={setRecaptchaToken}
            onReadyError={() => setError("Could not load the security check. Refresh and try again.")}
          />
        </Box>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
        <Button variant="outlined" color="inherit" onClick={onBack} sx={{ borderColor: surfaceBorderColor }}>Back</Button>
        <Button
          variant="contained"
          disabled={
            busy
            || !proofFile
            || !confirmedTransfer
            || hold?.status === "blocked"
            || hold?.status === "expired"
            || (guestNeedsCaptcha && !recaptchaToken)
          }
          onClick={onPlaceOrder}
          sx={{ flexGrow: 1, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}
        >
          {busy ? "Placing order…" : "Place order"}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, lineHeight: 1.45, textTransform: "none" }}>
        Marked <strong>pending verification</strong> until our team confirms payment.
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
  const { content } = useCms();
  const { user, isCustomer, loading, updateCustomerProfileDetails } = useAuth();
  const { customers } = useCustomers();
  const { items, subtotal, balanceDue, hasPreorder, clearCart } = useCart();
  const { placeOrder } = useOrders();
  const { decrementStockForCart, getProduct } = useInventory();
  const { placeHolds, releaseSessionHolds } = useStockHolds();
  const confirmedOrder = useCheckoutConfirmation();

  const [step, setStep] = useState(0);
  const [isGuest, setIsGuest] = useState(true);
  const [accountSkipped, setAccountSkipped] = useState(false);
  const [details, setDetailsState] = useState(() => ({
    ...EMPTY_DETAILS,
    ...(readCheckoutDetails() || {}),
  }));
  const [proofFile, setProofFile] = useState(null);
  const [confirmedTransfer, setConfirmedTransfer] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [holdState, setHoldState] = useState({ status: "idle", expiresAt: null, shortfalls: [] });
  const [holdRemaining, setHoldRemaining] = useState(0);

  const shippingFee = useMemo(() => calcShipping(), []);
  const total = subtotal + shippingFee;

  // In-stock lines only — pre-orders never reserve stock.
  const inStockLines = useMemo(
    () =>
      items
        .filter((item) => item.tag !== "Pre-order")
        .map((item) => ({ productId: item.id, quantity: item.quantity, name: item.name })),
    [items],
  );

  const attemptHold = useCallback(() => {
    if (!inStockLines.length) {
      setHoldState({ status: "none", expiresAt: null, shortfalls: [] });
      return;
    }
    const result = placeHolds(inStockLines, (productId) => getProduct(productId)?.stock ?? 0);
    if (result.ok) {
      setHoldState({ status: "held", expiresAt: result.expiresAt, shortfalls: [] });
    } else {
      setHoldState({ status: "blocked", expiresAt: null, shortfalls: result.shortfalls });
    }
  }, [inStockLines, placeHolds, getProduct]);

  const attemptHoldRef = useRef(attemptHold);
  useEffect(() => {
    attemptHoldRef.current = attemptHold;
  }, [attemptHold]);

  // Reserve stock once when the shopper reaches the payment step; release when they leave it.
  useEffect(() => {
    if (step !== 2) return undefined;
    attemptHoldRef.current();
    return () => releaseSessionHolds();
  }, [step, releaseSessionHolds]);

  // 20-minute countdown for the active hold.
  useEffect(() => {
    if (holdState.status !== "held" || !holdState.expiresAt) return undefined;
    const tick = () => {
      const remaining = holdState.expiresAt - Date.now();
      setHoldRemaining(Math.max(0, remaining));
      if (remaining <= 0) setHoldState((prev) => ({ ...prev, status: "expired" }));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [holdState.status, holdState.expiresAt]);

  function setDetails(patch) {
    setDetailsState((prev) => {
      const next = { ...prev, ...patch };
      writeCheckoutDetails(next);
      return next;
    });
  }

  useEffect(() => {
    if (step < 1) return;
    writeCheckoutDetails(details);
  }, [details, step]);

  useEffect(() => {
    if (!loading && isCustomer && user && !accountSkipped) {
      setIsGuest(false);
      const session = readCheckoutDetails() || {};
      const defaults = getCustomerCheckoutDefaults(user.email, user);
      setDetailsState((prev) => ({
        ...prev,
        ...session,
        // Profile wins when it has a value; session fills empty profile fields
        name: defaults.name || session.name || prev.name,
        email: defaults.email || session.email || prev.email,
        phone: formatPhPhoneInput(defaults.phone || session.phone || prev.phone),
        street: defaults.street || session.street || prev.street,
        city: defaults.city || session.city || prev.city,
        province: defaults.province || session.province || prev.province,
        postal: defaults.postal || session.postal || prev.postal,
      }));
      setStep(1);
      setAccountSkipped(true);
    }
  }, [loading, isCustomer, user, accountSkipped]);

  useEffect(() => {
    if (!isCustomer || !user?.email || step !== 1) return;
    const defaults = getCustomerCheckoutDefaults(user.email, user);
    setDetailsState((prev) => ({
      ...prev,
      name: defaults.name || prev.name,
      email: defaults.email || prev.email,
      phone: formatPhPhoneInput(defaults.phone || prev.phone),
      street: defaults.street || prev.street,
      city: defaults.city || prev.city,
      province: defaults.province || prev.province,
      postal: defaults.postal || prev.postal,
    }));
  }, [customers, isCustomer, user, step]);

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
    if (guest) {
      setIsGuest(true);
      setStep(1);
      return;
    }
    if (isCustomer && user?.email) {
      setIsGuest(false);
      setDetailsState((prev) => ({
        ...prev,
        ...getCustomerCheckoutDefaults(user.email, user),
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
      }));
    } else if (name || email) {
      setDetails({ ...(name ? { name } : {}), ...(email ? { email } : {}) });
      if (guest !== undefined) setIsGuest(guest);
    }
    setStep(1);
  }

  function handlePlaceOrder() {
    setPaymentError("");
    if (!proofFile?.dataUrl) {
      setPaymentError("Please upload proof of payment.");
      return;
    }
    if (holdState.status === "expired") {
      setPaymentError("Your 20-minute reservation expired and the stock was released. Please re-check availability.");
      return;
    }
    if (holdState.status === "blocked") {
      setPaymentError("Some items are no longer available — they were reserved by another shopper.");
      return;
    }
    const guestCheckout = Boolean(isGuest);
    if (
      guestCheckout
      && isGuestCaptchaEnabled(content.storefront)
      && getRecaptchaSiteKey()
      && !recaptchaToken
    ) {
      setPaymentError("Please complete the “I’m not a robot” check.");
      return;
    }
    setBusy(true);
    (async () => {
      try {
        const address = {
          street: details.street.trim(),
          city: details.city.trim(),
          province: details.province.trim(),
          postal: details.postal.trim(),
        };

        const depositPercent = items.find((item) => item.depositPercent)?.depositPercent ?? 30;

        const order = await placeOrder({
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
          guest: guestCheckout,
          recaptchaToken: guestCheckout ? recaptchaToken : null,
          // Guests must not attach a signed-in uid — they are guest checkouts.
          userId: guestCheckout ? null : (user?.uid || null),
        });

        if (order?.id) {
          writeCheckoutConfirmation({
            id: order.id,
            total: order.total ?? 0,
            balanceDue: order.balanceDue ?? 0,
            email: order.email ?? "",
            userId: order.userId ?? null,
          });

          try {
            await recordCustomerFromCheckout({
              email: details.email.trim(),
              name: details.name.trim(),
              phone: formatPhPhoneInput(details.phone),
              address: {
                street: details.street.trim(),
                city: details.city.trim(),
                province: details.province.trim(),
                postal: details.postal.trim(),
              },
              guest: guestCheckout,
              userId: guestCheckout ? null : (user?.uid || null),
              authProvider: guestCheckout
                ? "guest"
                : (user?.authProvider === "google.com" || user?.providerId === "google.com" ? "google" : "password"),
            });
          } catch (profileError) {
            console.warn("[checkout] Could not save customer profile:", profileError);
          }

          if (!guestCheckout && user?.email && details.email.trim().toLowerCase() === user.email.toLowerCase()) {
            try {
              await updateCustomerProfileDetails({
                name: details.name,
                phone: formatPhPhoneInput(details.phone),
                address: {
                  street: details.street,
                  city: details.city,
                  province: details.province,
                  postal: details.postal,
                },
              });
            } catch (profileError) {
              console.warn("[checkout] Could not save profile defaults:", profileError);
              try {
                await patchCustomerProfileIfEmpty(user.email, {
                  uid: user.uid,
                  name: details.name,
                  phone: formatPhPhoneInput(details.phone),
                  address: {
                    street: details.street,
                    city: details.city,
                    province: details.province,
                    postal: details.postal,
                  },
                });
              } catch (fallbackError) {
                console.warn("[checkout] Profile fallback save failed:", fallbackError);
              }
            }
          }
          clearCheckoutDetails();
        } else {
          setPaymentError("Could not place order. Please try again.");
          return;
        }

        clearCart();
        decrementStockForCart(items);
        releaseSessionHolds();
      } catch (error) {
        console.error("[checkout] placeOrder failed:", error);
        setPaymentError(mapFirebaseUserError(error));
      } finally {
        setBusy(false);
      }
    })();
  }

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 2, md: 2.5 },
        pb: { xs: 4, md: 5 },
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: 1080, mx: "auto", width: "100%" }}>
        <Box sx={{ flexShrink: 0 }}>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Checkout</Typography>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.85rem" } }}>Complete your order</Typography>
            <Button component={RouterLink} to="/" variant="text" color="inherit" sx={{ color: "text.secondary" }}>
              ← Continue shopping
            </Button>
          </Stack>
        </Box>

        <Stepper activeStep={step} alternativeLabel sx={{ display: { xs: "none", sm: "flex" }, flexShrink: 0, py: 0.5 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        <Grid container spacing={2.5} alignItems="stretch" justifyContent="center">
          <Grid size={{ xs: 12, md: 7 }} sx={{ display: "flex", minWidth: 0 }}>
            <Box sx={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
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
                  onContinue={async () => {
                    if (isCustomer && user?.email) {
                      try {
                        await updateCustomerProfileDetails({
                          name: details.name,
                          phone: formatPhPhoneInput(details.phone),
                          address: {
                            street: details.street,
                            city: details.city,
                            province: details.province,
                            postal: details.postal,
                          },
                        });
                      } catch (profileError) {
                        console.warn("[checkout] Could not save profile from details:", profileError);
                      }
                    }
                    setStep(2);
                  }}
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
                  setError={setPaymentError}
                  guestCheckout={Boolean(isGuest)}
                  recaptchaToken={recaptchaToken}
                  setRecaptchaToken={setRecaptchaToken}
                  hold={{
                    status: holdState.status,
                    remainingMs: holdRemaining,
                    shortfalls: holdState.shortfalls,
                    onRetry: attemptHold,
                  }}
                />
              ) : null}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: "none", md: "flex" }, minWidth: 0 }}>
            <Box sx={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
              <OrderSummaryPanel
                compact
                scrollable
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

        {/* Mobile order summary below the form */}
        <Box sx={{ display: { xs: "block", md: "none" }, flexShrink: 0 }}>
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
      </Stack>
    </Container>
  );
}
