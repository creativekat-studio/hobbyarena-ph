import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { createAppTheme } from "../theme.js";
import { useDesignSettings } from "./designSettings.jsx";

/** Visitor override only — site default lives in design settings (Firestore). */
const COLOR_MODE_OVERRIDE_KEY = "hobbyarena:color-mode-override";

const ColorModeContext = createContext({ mode: "light", setMode: () => {}, toggle: () => {} });

function readOverride() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(COLOR_MODE_OVERRIDE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function ColorModeProvider({ children }) {
  const { proposalId, defaultColorMode, dirty } = useDesignSettings();
  const [mode, setModeState] = useState(() => readOverride() ?? defaultColorMode);
  const theme = useMemo(() => createAppTheme(mode, proposalId), [mode, proposalId]);

  // Follow the published site default unless the visitor chose an override.
  useEffect(() => {
    if (dirty) return;
    setModeState(readOverride() ?? defaultColorMode);
  }, [defaultColorMode, dirty]);

  useEffect(() => {
    document.documentElement.dataset.designProposal = String(proposalId);
    document.documentElement.dataset.colorMode = mode;
    if (theme.ha?.selectionBg) {
      document.documentElement.style.setProperty("--ha-selection-bg", theme.ha.selectionBg);
    }
    if (theme.ha?.brand) {
      document.body.style.setProperty("--ha-display-font", theme.typography.h1.fontFamily);
    }
  }, [theme, proposalId, mode]);

  const setMode = useCallback((next, options = {}) => {
    const normalized = next === "dark" ? "dark" : "light";
    setModeState(normalized);
    if (options.persistOverride !== false && typeof window !== "undefined") {
      // Storefront toggles persist a visitor override. Admin Design preview passes persistOverride: false.
      if (options.persistOverride) {
        window.localStorage.setItem(COLOR_MODE_OVERRIDE_KEY, normalized);
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode: (next) => setMode(next, { persistOverride: true }),
      setModePreview: (next) => setMode(next, { persistOverride: false }),
      toggle: () => setMode(mode === "light" ? "dark" : "light", { persistOverride: true }),
    }),
    [mode, setMode],
  );

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export function useColorMode() {
  return useContext(ColorModeContext);
}
