import { useDesignSettings } from "./designSettings.jsx";

/** Pass-through — state lives in DesignSettingsProvider. */
export function ShopNavLayoutProvider({ children }) {
  return children;
}

export function useShopNavLayout() {
  const { navLayoutId, setNavLayoutId } = useDesignSettings();
  return { layoutId: navLayoutId, setLayoutId: setNavLayoutId };
}
