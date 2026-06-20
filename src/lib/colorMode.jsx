import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { createAppTheme } from "../theme.js";
import { useDesignProposal } from "./designProposal.jsx";
import { getDesignProposal } from "../themes/index.js";

const COLOR_MODE_STORAGE_KEY = "hobbyarena:color-mode";

const ColorModeContext = createContext({ mode: "light", toggle: () => {} });

function getInitialColorMode(proposalId) {
  if (typeof window === "undefined") {
    return getDesignProposal(proposalId).defaultMode;
  }
  const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return getDesignProposal(proposalId).defaultMode;
}

export function ColorModeProvider({ children }) {
  const { proposalId } = useDesignProposal();
  const [mode, setMode] = useState(() => getInitialColorMode(proposalId));
  const theme = useMemo(() => createAppTheme(mode, proposalId), [mode, proposalId]);

  useEffect(() => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  }, [mode]);

  // When switching design proposals, snap to each proposal's preferred default mode.
  useEffect(() => {
    setMode(getDesignProposal(proposalId).defaultMode);
  }, [proposalId]);

  useEffect(() => {
    const brand = theme.ha?.brand;
    document.documentElement.dataset.designProposal = String(proposalId);
    document.documentElement.dataset.colorMode = mode;
    if (theme.ha?.selectionBg) {
      document.documentElement.style.setProperty("--ha-selection-bg", theme.ha.selectionBg);
    }
    if (brand) {
      document.body.style.setProperty("--ha-display-font", theme.typography.h1.fontFamily);
    }
  }, [theme, proposalId, mode]);

  const value = useMemo(
    () => ({
      mode,
      toggle: () => setMode((current) => (current === "light" ? "dark" : "light")),
    }),
    [mode],
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
