import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { wider } from "../lib/layout.js";
import PasswordField from "../components/PasswordField.jsx";
import {
  firebaseConfirmPasswordReset,
  firebaseVerifyPasswordResetCode,
  mapAuthError,
  useFirebaseAuth,
} from "../lib/firebase/auth.js";

function readOobCode(searchParams) {
  return String(searchParams.get("oobCode") || searchParams.get("oobcode") || "").trim();
}

function readMode(searchParams) {
  return String(searchParams.get("mode") || "").trim();
}

export default function ResetPasswordPage() {
  const { surfaces } = useOutletContext();
  const panelSx = surfaces?.panelSx || {};
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const firebaseEnabled = useFirebaseAuth();

  const oobCode = useMemo(() => readOobCode(searchParams), [searchParams]);
  const mode = useMemo(() => readMode(searchParams), [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      setChecking(true);
      setError("");
      setEmail("");

      if (!firebaseEnabled) {
        if (!cancelled) {
          setError("Sign-in isn’t configured yet. Add your Firebase web config to .env.local.");
          setChecking(false);
        }
        return;
      }

      if (!oobCode || (mode && mode !== "resetPassword")) {
        if (!cancelled) {
          setError(
            mode && mode !== "resetPassword"
              ? "This link isn’t a password reset link."
              : "This reset link is missing or incomplete. Request a new one from the sign-in page.",
          );
          setChecking(false);
        }
        return;
      }

      try {
        const accountEmail = await firebaseVerifyPasswordResetCode(oobCode);
        if (!cancelled) setEmail(accountEmail || "");
      } catch (err) {
        if (!cancelled) setError(mapAuthError(err));
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [firebaseEnabled, mode, oobCode]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }

    setBusy(true);
    try {
      await firebaseConfirmPasswordReset(oobCode, password);
      setDone(true);
      setTimeout(() => navigate("/account", { replace: true }), 1600);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        py: { xs: 6, md: 10 },
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          ...panelSx,
          p: { xs: 3, md: 5 },
          maxWidth: wider(460),
          width: "100%",
        }}
      >
        <Stack spacing={2.5}>
          <Stack spacing={0.5}>
            <Typography
              variant="overline"
              sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2, fontFamily: MONO_FONT }}
            >
              ▣ Password reset
            </Typography>
            <Typography variant="h4">
              {done ? "Password updated." : "Choose a new password."}
            </Typography>
            <Typography color="text.secondary">
              {done
                ? "You can sign in with your new password."
                : email
                  ? `Resetting password for ${email}.`
                  : "Enter a new password for your Hobby Arena account."}
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {done ? <Alert severity="success">Your password was updated. Taking you to sign in…</Alert> : null}

          {checking ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress size={28} />
            </Stack>
          ) : null}

          {!checking && !done && !error ? (
            <>
              <PasswordField
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                helperText="At least 8 characters."
                autoComplete="new-password"
                autoFocus
              />
              <PasswordField
                label="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={busy}
                sx={{ py: 1.3, fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase" }}
              >
                {busy ? "Saving…" : "▶ Save new password"}
              </Button>
            </>
          ) : null}

          {!checking && error ? (
            <Button
              component={RouterLink}
              to="/account"
              variant="contained"
              size="large"
              sx={{ py: 1.3, fontFamily: MONO_FONT, letterSpacing: 1, textTransform: "uppercase" }}
            >
              ▶ Back to sign in
            </Button>
          ) : null}

          {!done ? (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              <Box
                component={RouterLink}
                to="/account"
                sx={{ color: "primary.main", fontWeight: 700, textDecoration: "underline" }}
              >
                Back to account
              </Box>
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Container>
  );
}
