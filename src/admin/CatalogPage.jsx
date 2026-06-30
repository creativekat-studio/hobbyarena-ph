import { useState } from "react";
import {
  Box,
  Button,
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
  Typography,
} from "@mui/material";
import { useOutletContext } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import { useCatalog } from "../lib/catalogStore.jsx";
import TermsEditor from "./TermsEditor.jsx";

const TABS = [
  "Product lines",
  "Product types",
  "Pre-order terms",
  "In-stock terms",
];

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
      </TabIntro>

      <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, width: "28%" }}>Shop label</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Inventory match</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="center">Active</TableCell>
              <TableCell sx={{ fontWeight: 800, width: 88 }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
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
  const [tab, setTab] = useState(0);

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      <AdminPageHeader
        eyebrow="Store setup"
        title="Product classifications"
        subtitle="Define product lines, in-stock types, and legal terms — used by shop filters, inventory, and product pages."
      />

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 40,
          borderBottom: "1px solid",
          borderColor: surfaceBorderColor,
          "& .MuiTab-root": { minHeight: 40, py: 1, fontSize: "0.82rem" },
        }}
      >
        {TABS.map((label) => (
          <Tab key={label} label={label} sx={{ fontWeight: 700, textTransform: "none" }} />
        ))}
      </Tabs>

      {tab === 0 ? (
        <ProductLinesTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} lines={lines} addLine={addLine} updateLine={updateLine} removeLine={removeLine} />
      ) : null}
      {tab === 1 ? (
        <ProductTypesTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} categories={categories} addCategory={addCategory} updateCategory={updateCategory} removeCategory={removeCategory} />
      ) : null}
      {tab === 2 ? (
        <PreorderTermsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} terms={terms} setTerms={setTerms} />
      ) : null}
      {tab === 3 ? (
        <InstockTermsTab panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} terms={terms} setTerms={setTerms} />
      ) : null}
    </Stack>
  );
}
