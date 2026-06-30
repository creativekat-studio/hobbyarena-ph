import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { SearchIcon } from "./icons.jsx";
import { useInventory } from "../lib/inventoryStore.jsx";

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.89 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
    </svg>
  );
}

export default function SearchDialog({ open, onClose, surfaceBorderColor }) {
  const navigate = useNavigate();
  const { publishedCatalog } = useInventory();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return publishedCatalog.slice(0, 8);
    return publishedCatalog.filter(
      (p) => p.name.toLowerCase().includes(q) || p.line?.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [publishedCatalog, query]);

  function goToProduct(id) {
    onClose();
    setQuery("");
    navigate(`/shop/${id}`);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle sx={{ pr: 6, fontWeight: 800 }}>
        Search products
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: "absolute", right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          autoFocus
          placeholder="Search by name or product line…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
        {results.length ? (
          <List disablePadding>
            {results.map((product) => (
              <ListItemButton key={product.id} onClick={() => goToProduct(product.id)} sx={{ borderRadius: 1, mb: 0.5, border: "1px solid", borderColor: surfaceBorderColor }}>
                <ListItemText
                  primary={product.name}
                  secondary={
                    <Stack direction="row" spacing={1} alignItems="center" component="span">
                      <Typography component="span" sx={{ fontFamily: MONO_FONT, fontSize: "0.68rem" }}>{product.line}</Typography>
                      <Chip label={product.tag} size="small" component="span" sx={{ height: 20, fontSize: "0.6rem" }} />
                    </Stack>
                  }
                  primaryTypographyProps={{ fontWeight: 700, fontSize: "0.9rem" }}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No products match &ldquo;{query}&rdquo;.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SearchTrigger({ onClick, children }) {
  return children({ onClick });
}
