import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import AdminSectionTitle from "./AdminSectionTitle.jsx";
import {
  getDataSource,
  isFirebaseConfigured,
  readFirebaseConfig,
  testFirestoreConnection,
} from "../lib/firebase.js";

export default function FirebaseStatusCard({ panelSx }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const configured = isFirebaseConfigured();
  const dataSource = getDataSource();
  const { config, missing } = readFirebaseConfig();

  async function handleTest() {
    setBusy(true);
    setResult(null);
    try {
      const test = await testFirestoreConnection();
      setResult(test);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Box>
            <AdminSectionTitle variant="h6">Database</AdminSectionTitle>
            <Typography sx={{ color: "text.secondary", fontSize: "0.82rem", mt: 0.25 }}>
              Firebase prep — app still uses local storage until migration is complete.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Source: ${dataSource}`}
              size="small"
              color={dataSource === "firebase" ? "success" : "default"}
              variant="outlined"
              sx={{ fontWeight: 700, fontFamily: MONO_FONT }}
            />
            <Chip
              label={configured ? `Project: ${config.projectId}` : "Not configured"}
              size="small"
              color={configured ? "primary" : "warning"}
              variant="outlined"
              sx={{ fontWeight: 700, fontFamily: MONO_FONT }}
            />
          </Stack>
        </Stack>

        {configured && dataSource === "firebase" ? (
          <Alert severity="info">
            <strong>Firestore active</strong> for products, CMS, design, classifications, customers, and orders. Inquiries, cart, and wishlists still use{" "}
            <strong>localStorage</strong>.
          </Alert>
        ) : null}

        {!configured ? (
          <Alert severity="info">
            Add your Firebase web config to <strong>.env.local</strong> (see <code>docs/FIREBASE-SETUP.md</code>), restart <code>yarn dev:full</code>, then run Test connection.
            {missing.length ? ` Missing: ${missing.join(", ")}` : ""}
          </Alert>
        ) : null}

        {configured ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }}>
            <Button variant="contained" onClick={handleTest} disabled={busy} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.5, alignSelf: "flex-start" }}>
              {busy ? "Testing…" : "Test Firestore connection"}
            </Button>
            <Typography sx={{ color: "text.secondary", fontSize: "0.8rem" }}>
              First time? Enable Firestore in <strong>test mode</strong> in Firebase Console, then test. Deploy <code>firestore.rules</code> after Auth is wired.
            </Typography>
          </Stack>
        ) : null}

        {result ? (
          <Alert severity={result.ok ? "success" : "error"}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>{result.message}</Typography>
            {result.hint ? <Typography sx={{ fontSize: "0.82rem", mt: 0.5 }}>{result.hint}</Typography> : null}
            {result.projectId ? (
              <Typography sx={{ fontSize: "0.78rem", mt: 0.5, fontFamily: MONO_FONT, color: "text.secondary" }}>
                Project: {result.projectId}
              </Typography>
            ) : null}
          </Alert>
        ) : null}
      </Stack>
    </Box>
  );
}
