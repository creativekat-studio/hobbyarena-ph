import { useDesignSettings } from "./designSettings.jsx";

/** Pass-through — state lives in DesignSettingsProvider. */
export function ShopFilterLayoutProvider({ children }) {
  return children;
}

export function useShopFilterLayout() {
  const { filterLayoutId, setFilterLayoutId } = useDesignSettings();
  return { layoutId: filterLayoutId, setLayoutId: setFilterLayoutId };
}
