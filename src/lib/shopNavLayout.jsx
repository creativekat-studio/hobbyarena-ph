import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "hobbyarena:shop-nav-layout";

const ShopNavLayoutContext = createContext(null);

export function ShopNavLayoutProvider({ children }) {
  const [layoutId, setLayoutId] = useState(() => {
    if (typeof window === "undefined") return "crateDrop";
    return window.localStorage.getItem(STORAGE_KEY) || "dock";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, layoutId);
  }, [layoutId]);

  const value = useMemo(
    () => ({ layoutId, setLayoutId }),
    [layoutId],
  );

  return (
    <ShopNavLayoutContext.Provider value={value}>
      {children}
    </ShopNavLayoutContext.Provider>
  );
}

export function useShopNavLayout() {
  const context = useContext(ShopNavLayoutContext);
  if (!context) {
    throw new Error("useShopNavLayout must be used within ShopNavLayoutProvider");
  }
  return context;
}
