import { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Switch,
  Tab,
  Tabs,
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
import { alpha, useTheme } from "@mui/material/styles";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { useCatalog } from "../lib/catalogStore.jsx";
import { useFirebaseData } from "../lib/firebase/config.js";
import { uploadCmsAsset } from "../lib/firebase/repositories/uploads.js";
import { compressProductImageFile } from "../lib/imageCompression.js";
import { UPLOAD_SIZE_DISCLAIMER, validateUploadFileSize } from "../lib/uploadLimits.js";
import { resolveLineLogo } from "../lib/shopFilterUi.js";
import TermsEditor from "./TermsEditor.jsx";

function InfoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden {...props}>
      <path d="M11 7h2v2h-2V7zm0 4h2v6h-2v-6zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
  );
}

const MemberRanksPanel = lazy(() =>
  import("./MemberRanksPanel.jsx").then((mod) => ({ default: mod.MemberRanksPanel })),
);

const TABS = [
  { id: "product-lines", label: "Product lines" },
  { id: "product-types", label: "Product types" },
  { id: "member-ranks", label: "Member ranks" },
  { id: "pre-order-terms", label: "Pre-order terms" },
  { id: "in-stock-terms", label: "In-stock terms" },
];

function tabIndexFromParam(param) {
  const idx = TABS.findIndex((tab) => tab.id === param);
  return idx >= 0 ? idx : 0;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function LineLogoUpload({ line, onChange, surfaceBorderColor }) {
  const theme = useTheme();
  const firebaseEnabled = useFirebaseData();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const preview = line.logo || resolveLineLogo(line);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Image must be a PNG, JPG, or WebP file.");
      return;
    }
    const sizeError = validateUploadFileSize(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const compressedFile = await compressProductImageFile(file);
      const url = firebaseEnabled
        ? await uploadCmsAsset(compressedFile, `line-${line.id || "logo"}`)
        : await readAsDataUrl(compressedFile);
      onChange(url);
    } catch (uploadError) {
      console.error("[catalog] Line logo upload failed:", uploadError);
      setError(uploadError.message || "Could not upload the image. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        hidden
        onChange={handleFileChange}
      />
      <Box
        sx={{
          width: 56,
          height: 36,
          borderRadius: 1,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          bgcolor: preview ? "#fff" : alpha(theme.palette.text.primary, 0.04),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {uploading ? (
          <CircularProgress size={16} />
        ) : preview ? (
          <Box component="img" src={preview} alt="" sx={{ width: "100%", height: "100%", objectFit: "contain", p: 0.5 }} />
        ) : (
          <Typography sx={{ fontSize: "0.58rem", color: "text.secondary", fontFamily: MONO_FONT }}>LOGO</Typography>
        )}
      </Box>
      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Button
            size="small"
            variant="outlined"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            sx={{ fontSize: "0.68rem", minWidth: 88, px: 1.5, py: 0.4, lineHeight: 1.4 }}
          >
            {line.logo ? "Replace" : "Upload"}
          </Button>
          <Tooltip
            title={UPLOAD_SIZE_DISCLAIMER}
            arrow
            placement="top"
            enterTouchDelay={0}
            slotProps={{
              tooltip: {
                sx: {
                  fontFamily: MONO_FONT,
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  letterSpacing: 0.2,
                  textTransform: "none",
                  lineHeight: 1.45,
                  maxWidth: 220,
                },
              },
            }}
          >
            <Box
              component="span"
              role="img"
              aria-label={UPLOAD_SIZE_DISCLAIMER}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                color: "text.secondary",
                cursor: "help",
                lineHeight: 0,
                "&:hover": { color: "primary.main" },
              }}
            >
              <InfoIcon style={{ fontSize: 15 }} />
            </Box>
          </Tooltip>
        </Stack>
        {line.logo ? (
          <Button
            size="small"
            color="inherit"
            disabled={uploading}
            onClick={() => onChange("")}
            sx={{ fontSize: "0.62rem", minWidth: 0, px: 1, py: 0, color: "text.secondary", alignSelf: "flex-start" }}
          >
            Remove
          </Button>
        ) : null}
        {error ? (
          <Typography variant="caption" color="error.main" sx={{ lineHeight: 1.4, textTransform: "none" }}>
            {error}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

function TabIntro({ children }) {
  return (
    <Typography sx={{ fontSize: "0.84rem", color: "text.secondary", lineHeight: 1.55, mb: 2 }}>
      {children}
    </Typography>
  );
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

function ProductLinesTab({ panelSx, surfaceBorderColor, lines, addLine, updateLine, removeLine }) {
  const [newLabel, setNewLabel] = useState("");
  const [newMatch, setNewMatch] = useState("");

  function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    addLine({ label, match: newMatch.trim() || label });
    setNewLabel("");
    setNewMatch("");
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <TabIntro>
        Product lines are the game or franchise groupings shoppers filter by — for example Pokémon TCG or One Piece.
        Each product in Inventory must use a <strong>Line</strong> value that matches the inventory match text below.
        Upload a logo to show on the shop filters; without one, a built-in fallback is used when available.
      </TabIntro>

      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, width: 140 }}>Logo</TableCell>
              <TableCell sx={{ fontWeight: 800, width: "24%" }}>Shop label</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Inventory match</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="center">Active</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <LineLogoUpload
                    line={line}
                    surfaceBorderColor={surfaceBorderColor}
                    onChange={(logo) => updateLine(line.id, { logo })}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={line.label}
                    onChange={(e) => updateLine(line.id, { label: e.target.value })}
                    placeholder="Pokémon TCG"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={line.match ?? line.label}
                    onChange={(e) => updateLine(line.id, { match: e.target.value })}
                    placeholder="Pokémon TCG"
                    helperText={line.id ? `ID: ${line.id}` : undefined}
                    FormHelperTextProps={{ sx: { mx: 0, fontFamily: MONO_FONT, fontSize: "0.68rem" } }}
                  />
                </TableCell>
                <TableCell align="center">
                  <ActiveSwitch checked={line.active !== false} onChange={(v) => updateLine(line.id, { active: v })} />
                </TableCell>
                <TableCell align="right" sx={{ width: 88 }}>
                  <Button size="small" color="inherit" onClick={() => removeLine(line.id)} sx={{ fontSize: "0.72rem", minWidth: 0 }}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
        {lines.map((line) => (
          <Box key={line.id} sx={{ p: 1.5, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
            <Box sx={{ mb: 1.5 }}>
              <LineLogoUpload
                line={line}
                surfaceBorderColor={surfaceBorderColor}
                onChange={(logo) => updateLine(line.id, { logo })}
              />
            </Box>
            <TextField size="small" fullWidth label="Shop label" value={line.label} onChange={(e) => updateLine(line.id, { label: e.target.value })} sx={{ mb: 1.5 }} />
            <TextField size="small" fullWidth label="Inventory match" value={line.match ?? line.label} onChange={(e) => updateLine(line.id, { match: e.target.value })} sx={{ mb: 1 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <ActiveSwitch checked={line.active !== false} onChange={(v) => updateLine(line.id, { active: v })} />
                <Typography sx={{ fontSize: "0.82rem" }}>Active</Typography>
              </Stack>
              <Button size="small" color="inherit" onClick={() => removeLine(line.id)} sx={{ fontSize: "0.72rem" }}>
                Remove
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2.5 }}>
        <TextField size="small" label="New shop label" placeholder="Gundam" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} sx={{ flex: 1 }} />
        <TextField size="small" label="Inventory match (optional)" placeholder="Same as label if blank" value={newMatch} onChange={(e) => setNewMatch(e.target.value)} sx={{ flex: 1 }} />
        <Button variant="contained" onClick={handleAdd} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}>
          Add line
        </Button>
      </Stack>
    </Box>
  );
}

function ProductTypesTab({ panelSx, surfaceBorderColor, categories, addCategory, updateCategory, removeCategory }) {
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");

  function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    addCategory({ label, description: newDescription.trim() });
    setNewLabel("");
    setNewDescription("");
  }

  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <TabIntro>
        Product types classify <strong>in-stock</strong> items on the Products page — TCG sealed products, accessories, figures, and so on.
        Pre-orders are filtered by line only and do not use these types.
      </TabIntro>

      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, width: "24%" }}>Type name</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="center">Active</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={cat.label}
                    onChange={(e) => updateCategory(cat.id, { label: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={cat.description || ""}
                    onChange={(e) => updateCategory(cat.id, { description: e.target.value })}
                    placeholder="Short note for admins"
                  />
                </TableCell>
                <TableCell align="center">
                  <ActiveSwitch checked={cat.active !== false} onChange={(v) => updateCategory(cat.id, { active: v })} />
                </TableCell>
                <TableCell align="right" sx={{ width: 88 }}>
                  <Button size="small" color="inherit" onClick={() => removeCategory(cat.id)} sx={{ fontSize: "0.72rem", minWidth: 0 }}>
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
        {categories.map((cat) => (
          <Box key={cat.id} sx={{ p: 1.5, border: "1px solid", borderColor: surfaceBorderColor, borderRadius: 1 }}>
            <TextField size="small" fullWidth label="Type name" value={cat.label} onChange={(e) => updateCategory(cat.id, { label: e.target.value })} sx={{ mb: 1.5 }} />
            <TextField size="small" fullWidth label="Description" value={cat.description || ""} onChange={(e) => updateCategory(cat.id, { description: e.target.value })} sx={{ mb: 1 }} />
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <ActiveSwitch checked={cat.active !== false} onChange={(v) => updateCategory(cat.id, { active: v })} />
                <Typography sx={{ fontSize: "0.82rem" }}>Active</Typography>
              </Stack>
              <Button size="small" color="inherit" onClick={() => removeCategory(cat.id)} sx={{ fontSize: "0.72rem" }}>
                Remove
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2.5 }}>
        <TextField size="small" label="New type name" placeholder="Card Accessories" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} sx={{ flex: 1 }} />
        <TextField size="small" label="Description" placeholder="Sleeves, binders, deck boxes" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} sx={{ flex: 1.4 }} />
        <Button variant="contained" onClick={handleAdd} sx={{ fontFamily: MONO_FONT, letterSpacing: 0.4, textTransform: "uppercase", flexShrink: 0 }}>
          Add type
        </Button>
      </Stack>
    </Box>
  );
}

function PreorderTermsTab({ panelSx, surfaceBorderColor, terms, setTerms }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <TabIntro>
        Legal copy shown on pre-order product pages and at checkout, including the deposit acceptance checkbox.
        Separate paragraphs with a blank line — matches the official pre-order disclaimer.
      </TabIntro>
      <TermsEditor
        title="Pre-order terms"
        subtitle="Customers must accept these when placing a pre-order."
        value={terms.preorder}
        onSave={(lines) => setTerms("preorder", lines)}
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}

function InstockTermsTab({ panelSx, surfaceBorderColor, terms, setTerms }) {
  return (
    <Box sx={{ ...panelSx, p: { xs: 2, md: 2.5 } }}>
      <TabIntro>
        Legal copy shown on in-stock product pages — shipping, authenticity, returns, and general store policies.
        One bullet per line.
      </TabIntro>
      <TermsEditor
        title="In-stock product terms"
        subtitle="Displayed on regular product detail pages."
        value={terms.generic}
        onSave={(lines) => setTerms("generic", lines)}
        surfaceBorderColor={surfaceBorderColor}
      />
    </Box>
  );
}

export default function CatalogPage() {
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const { lines, categories, terms, addLine, addCategory, updateLine, updateCategory, removeLine, removeCategory, setTerms } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => tabIndexFromParam(searchParams.get("tab")));

  useEffect(() => {
    const next = tabIndexFromParam(searchParams.get("tab"));
    setTab((current) => (current === next ? current : next));
  }, [searchParams]);

  function handleTabChange(_, value) {
    setTab(value);
    setSearchParams({ tab: TABS[value].id }, { replace: true });
  }

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      <AdminPageHeader
        eyebrow="Store setup"
        title="Classifications"
        subtitle="Product lines, types, member ranks, and legal terms — used by shop filters, inventory, and account badges."
      />

      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: "1px solid",
          borderColor: surfaceBorderColor,
        }}
      >
        {TABS.map((item) => (
          <Tab key={item.id} label={item.label} />
        ))}
      </Tabs>

      {tab === 0 ? (
        <ProductLinesTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} lines={lines} addLine={addLine} updateLine={updateLine} removeLine={removeLine} />
      ) : null}
      {tab === 1 ? (
        <ProductTypesTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} categories={categories} addCategory={addCategory} updateCategory={updateCategory} removeCategory={removeCategory} />
      ) : null}
      {tab === 2 ? (
        <Suspense
          fallback={(
            <Box sx={{ ...panelSx, p: 4, display: "flex", justifyContent: "center" }}>
              <CircularProgress size={28} />
            </Box>
          )}
        >
          <MemberRanksPanel panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
        </Suspense>
      ) : null}
      {tab === 3 ? (
        <PreorderTermsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} terms={terms} setTerms={setTerms} />
      ) : null}
      {tab === 4 ? (
        <InstockTermsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} terms={terms} setTerms={setTerms} />
      ) : null}
    </Stack>
  );
}
