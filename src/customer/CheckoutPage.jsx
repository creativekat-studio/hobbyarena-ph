import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import { Link as RouterLink, Navigate, useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { PESO } from "../components/ProductCard.jsx";
import ConfettiBurst from "../components/ConfettiBurst.jsx";
import { ShieldIcon } from "../components/icons.jsx";
import { useAuth } from "../auth/AuthProvider.jsx";
import { useCart } from "../lib/cartStore.jsx";
import { useOrders } from "../lib/ordersStore.jsx";
import { BANK_ACCOUNTS, SHIPPING, calcShipping } from "../data/checkoutSettings.js";

const STEPS = ["Account", "Details", "Payment"];

const EMPTY_DETAILS = {
  name: "",
  email: "",
  phone: "",
  fulfillment: "delivery",
  region: "metro",
  street: "",
  city: "",
  province: "",
  postal: "",
  notes: "",
};

function OrderSummary({ items, subtotal, shippingFee, total, panelSx }) {
  return (
    <Box sx={{ ...panelSx, p: 2.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Order summary</Typography>
      <Stack spacing={1.25} divider={<Divider flexItem />}>
        {items.map((item) => (
          <Stack key={item.id} direction="row" justifyContent="space-between" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>{item.name}</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.75rem", fontFamily: MONO_FONT }}>
                {item.tag} · Qty {item.quantity}
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, flexShrink: 0 }}>{PESO.format(item.price * item.quantity)}</Typography>
          </Stack>
        ))}
      </Stack>
      <Stack spacing={1} sx={{ mt: 2.5 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary">Subtotal</Typography>
          <Typography>{PESO.format(subtotal)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography color="text.secondary">Shipping</Typography>
          <Typography>{shippingFee === 0 ? "Free" : PESO.format(shippingFee)}</Typography>
        </Stack>
        <Divider />
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography sx={{ fontWeight: 800 }}>Total</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: "primary.main" }}>{PESO.format(total)}</Typography>
        </Stack>
      </Stack>
    </Box>
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
  const theme = useTheme();
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!details.name.trim() || !details.email.trim() || !details.phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }
    if (details.fulfillment === "delivery") {
      if (!details.street.trim() || !details.city.trim() || !details.province.trim()) {
        setError("Please complete your delivery address.");
        return;
      }
    }
    onContinue();
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ ...panelSx, p: { xs: 3, md: 4 } }}>
      <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Step 2</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>Contact & delivery</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Where should we send your order?</Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Full name" fullWidth required value={details.name} onChange={(e) => setDetails({ name: e.target.value })} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Phone" fullWidth required value={details.phone} onChange={(e) => setDetails({ phone: e.target.value })} placeholder="09XX XXX XXXX" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField label="Email" type="email" fullWidth required value={details.email} onChange={(e) => setDetails({ email: e.target.value })} />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <FormControl component="fieldset">
            <FormLabel sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>Fulfillment</FormLabel>
            <RadioGroup
              row
              value={details.fulfillment}
              onChange={(e) => setDetails({ fulfillment: e.target.value })}
            >
              <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
              <FormControlLabel value="pickup" control={<Radio />} label="Store pickup (free)" />
            </RadioGroup>
          </FormControl>
        </Grid>

        {details.fulfillment === "delivery" ? (
          <>
            <Grid size={{ xs: 12 }}>
              <FormControl component="fieldset">
                <FormLabel sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>Region</FormLabel>
                <RadioGroup
                  row
                  value={details.region}
                  onChange={(e) => setDetails({ region: e.target.value })}
                >
                  <FormControlLabel value="metro" control={<Radio />} label={`Metro Manila (${PESO.format(SHIPPING.metroManila)})`} />
                  <FormControlLabel value="provincial" control={<Radio />} label={`Provincial (${PESO.format(SHIPPING.provincial)})`} />
                </RadioGroup>
              </FormControl>
              {SHIPPING.freeThreshold ? (
                <Typography variant="caption" color="text.secondary">
                  Free shipping on orders over {PESO.format(SHIPPING.freeThreshold)}.
                </Typography>
              ) : null}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Street address" fullWidth required value={details.street} onChange={(e) => setDetails({ street: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="City" fullWidth required value={details.city} onChange={(e) => setDetails({ city: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Province" fullWidth required value={details.province} onChange={(e) => setDetails({ province: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Postal code" fullWidth value={details.postal} onChange={(e) => setDetails({ postal: e.target.value })} />
            </Grid>
          </>
        ) : (
          <Grid size={{ xs: 12 }}>
            <Alert severity="info" icon={<ShieldIcon />} sx={{ border: "1px solid", borderColor: surfaceBorderColor }}>
              Pick up at Hobby Arena during processing hours. We&apos;ll email when your order is ready.
            </Alert>
          </Grid>
        )}

        <Grid size={{ xs: 12 }}>
          <TextField label="Order notes (optional)" fullWidth multiline minRows={2} value={details.notes} onChange={(e) => setDetails({ notes: e.target.value })} />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" color="inherit" onClick={onBack} sx={{ borderColor: surfaceBorderColor }}>Back</Button>
        <Button type="submit" variant="contained" sx={{ flexGrow: 1, fontFamily: MONO_FONT, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Continue to payment
        </Button>
      </Stack>
    </Box>
  );
}

function PaymentStep({ panelSx, surfaceBorderColor, total, orderIdPreview, proofFile, setProofFile, confirmedTransfer, setConfirmedTransfer, onBack, onPlaceOrder, busy, error }) {
  const theme = useTheme();

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
    <Box sx={{ ...panelSx, p: { xs: 3, md: 4 } }}>
      <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}>Step 3</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>Pay via bank transfer</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Transfer <strong>{PESO.format(total)}</strong> to one of the accounts below, then upload your proof of payment.
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {BANK_ACCOUNTS.map((bank) => (
          <Grid key={bank.id} size={{ xs: 12, sm: 6 }}>
            <Box sx={{ p: 2, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor, height: "100%" }}>
              <Typography sx={{ fontWeight: 800, fontFamily: MONO_FONT, fontSize: "0.75rem", letterSpacing: 1, color: "primary.main" }}>
                {bank.label.toUpperCase()}
              </Typography>
              <Typography sx={{ fontWeight: 700, mt: 1 }}>{bank.accountName}</Typography>
              <Typography sx={{ fontFamily: MONO_FONT, fontSize: "1.1rem", fontWeight: 800, mt: 0.5 }}>{bank.accountNumber}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{bank.note}</Typography>
              <Box sx={{ mt: 1.5, p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.text.primary, 0.04), textAlign: "center", fontFamily: MONO_FONT, fontSize: "0.72rem", color: "text.secondary" }}>
                QR code placeholder
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Typography sx={{ fontWeight: 700, mb: 1 }}>Proof of payment</Typography>
      <Button component="label" variant="outlined" color="inherit" sx={{ borderColor: surfaceBorderColor, mb: 1 }}>
        {proofFile ? "Change file" : "Upload screenshot or PDF"}
        <input type="file" hidden accept="image/*,application/pdf" onChange={handleFileChange} />
      </Button>
      {proofFile ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Chip label={proofFile.name} size="small" color="success" />
          {proofFile.dataUrl?.startsWith("data:image") ? (
            <Box component="img" src={proofFile.dataUrl} alt="Proof preview" sx={{ height: 48, borderRadius: 1, border: "1px solid", borderColor: surfaceBorderColor }} />
          ) : null}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Required — upload your transfer receipt.</Typography>
      )}

      <FormControlLabel
        control={<Checkbox checked={confirmedTransfer} onChange={(e) => setConfirmedTransfer(e.target.checked)} />}
        label={<Typography variant="body2">I have transferred the exact amount ({PESO.format(total)}).</Typography>}
      />

      <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
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

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        Your order will be marked <strong>Pending Verification</strong> until our team confirms payment.
        {orderIdPreview ? ` Reference: ${orderIdPreview}` : ""}
      </Typography>
    </Box>
  );
}

const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.85) translateY(12px); }
  60% { opacity: 1; transform: scale(1.04) translateY(-4px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const wave = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(18deg); }
  75% { transform: rotate(-12deg); }
`;

function ConfirmationView({ order, panelSx }) {
  const theme = useTheme();

  return (
    <>
      <ConfettiBurst />
      <Box
        sx={{
          ...panelSx,
          p: { xs: 4, md: 5 },
          textAlign: "center",
          maxWidth: 480,
          width: "100%",
          animation: `${popIn} 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) both`,
        }}
      >
        <Typography
          component="span"
          sx={{
            display: "block",
            fontSize: "3rem",
            lineHeight: 1,
            mb: 1.5,
            animation: `${wave} 0.9s ease-in-out 0.35s 2`,
          }}
        >
          🎉
        </Typography>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}
        >
          Hooray!
        </Typography>

        <Typography variant="overline" sx={{ color: "success.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT, display: "block", mt: 1.5 }}>
          Order received
        </Typography>

        <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.6 }}>
          Your order <strong>{order.id}</strong> is in — we&apos;ll verify your payment and keep you posted.
        </Typography>

        <Stack spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
          <Chip label="Pending Verification" color="warning" sx={{ fontWeight: 800, px: 0.5 }} />
          <Typography sx={{ fontWeight: 800, fontSize: "1.35rem", color: "primary.main" }}>
            {PESO.format(order.total)}
          </Typography>
        </Stack>
      </Box>
    </>
  );
}

export default function CheckoutPage() {
  const theme = useTheme();
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { user, isCustomer, loading } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { placeOrder } = useOrders();

  const [step, setStep] = useState(0);
  const [isGuest, setIsGuest] = useState(true);
  const [accountSkipped, setAccountSkipped] = useState(false);
  const [details, setDetailsState] = useState(EMPTY_DETAILS);
  const [proofFile, setProofFile] = useState(null);
  const [confirmedTransfer, setConfirmedTransfer] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const shippingFee = useMemo(
    () => calcShipping(subtotal, details.fulfillment, details.region),
    [subtotal, details.fulfillment, details.region],
  );
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

  if (items.length === 0 && !placedOrder) {
    return <Navigate to="/" replace />;
  }

  if (placedOrder) {
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
        <ConfirmationView order={placedOrder} panelSx={panelSx} />
      </Box>
    );
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
      const address = details.fulfillment === "delivery"
        ? {
            street: details.street.trim(),
            city: details.city.trim(),
            province: details.province.trim(),
            postal: details.postal.trim(),
          }
        : null;

      const order = placeOrder({
        cartItems: items,
        customer: details.name.trim(),
        email: details.email.trim(),
        phone: details.phone.trim(),
        fulfillment: details.fulfillment,
        region: details.region,
        address,
        notes: details.notes,
        subtotal,
        shippingFee,
        total,
        proofOfPayment: proofFile.dataUrl,
        guest: isGuest,
        userId: user?.uid,
      });

      clearCart();
      setPlacedOrder(order);
    } catch {
      setPaymentError("Could not place order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
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

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
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
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ position: { md: "sticky" }, top: 88 }}>
              <OrderSummary items={items} subtotal={subtotal} shippingFee={shippingFee} total={total} panelSx={panelSx} />
            </Box>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
