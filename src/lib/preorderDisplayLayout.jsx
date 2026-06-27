import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_COUNTDOWN_VARIANT,
  DEFAULT_PRICING_VARIANT,
} from "../data/preorderDisplay.js";

const STORAGE_KEY = "hobbyarena:preorder-display";

function loadStored() {
  if (typeof window === "undefined") {
    return { countdownVariant: DEFAULT_COUNTDOWN_VARIANT, pricingVariant: DEFAULT_PRICING_VARIANT };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { countdownVariant: DEFAULT_COUNTDOWN_VARIANT, pricingVariant: DEFAULT_PRICING_VARIANT };
    }
    const parsed = JSON.parse(raw);
    return {
      countdownVariant: parsed.countdownVariant ?? DEFAULT_COUNTDOWN_VARIANT,
      pricingVariant: parsed.pricingVariant ?? DEFAULT_PRICING_VARIANT,
    };
  } catch {
    return { countdownVariant: DEFAULT_COUNTDOWN_VARIANT, pricingVariant: DEFAULT_PRICING_VARIANT };
  }
}

const PreorderDisplayContext = createContext(null);

export function PreorderDisplayProvider({ children }) {
  const [state, setState] = useState(loadStored);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setCountdownVariant = (countdownVariant) => {
    setState((prev) => ({ ...prev, countdownVariant }));
  };

  const setPricingVariant = (pricingVariant) => {
    setState((prev) => ({ ...prev, pricingVariant }));
  };

  const value = useMemo(
    () => ({
      countdownVariant: state.countdownVariant,
      pricingVariant: state.pricingVariant,
      setCountdownVariant,
      setPricingVariant,
    }),
    [state],
  );

  return (
    <PreorderDisplayContext.Provider value={value}>
      {children}
    </PreorderDisplayContext.Provider>
  );
}

export function usePreorderDisplay() {
  const context = useContext(PreorderDisplayContext);
  if (!context) {
    throw new Error("usePreorderDisplay must be used within PreorderDisplayProvider");
  }
  return context;
}
