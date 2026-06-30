import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SHOP_FILTER_LAYOUT } from "../data/shopFilterLayout.js";

const STORAGE_KEY = "hobbyarena:shop-filter-layout";

function loadStored() {
  if (typeof window === "undefined") return DEFAULT_SHOP_FILTER_LAYOUT;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_SHOP_FILTER_LAYOUT;
  } catch {
    return DEFAULT_SHOP_FILTER_LAYOUT;
  }
}

const ShopFilterLayoutContext = createContext(null);

export function ShopFilterLayoutProvider({ children }) {
  const [layoutId, setLayoutIdState] = useState(loadStored);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, layoutId);
  }, [layoutId]);

  const setLayoutId = (next) => setLayoutIdState(next);

  const value = useMemo(
    () => ({ layoutId, setLayoutId }),
    [layoutId],
  );

  return (
    <ShopFilterLayoutContext.Provider value={value}>
      {children}
    </ShopFilterLayoutContext.Provider>
  );
}

export function useShopFilterLayout() {
  const context = useContext(ShopFilterLayoutContext);
  if (!context) {
    throw new Error("useShopFilterLayout must be used within ShopFilterLayoutProvider");
  }
  return context;
}
