import { useDesignSettings } from "./designSettings.jsx";

/** Pass-through — state lives in DesignSettingsProvider. */
export function PreorderDisplayProvider({ children }) {
  return children;
}

export function usePreorderDisplay() {
  const {
    countdownVariant,
    pricingVariant,
    setCountdownVariant,
    setPricingVariant,
  } = useDesignSettings();
  return {
    countdownVariant,
    pricingVariant,
    setCountdownVariant,
    setPricingVariant,
  };
}
