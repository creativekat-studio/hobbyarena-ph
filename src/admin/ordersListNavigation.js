import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const ORDERS_VIEW_STORAGE_KEY = "ha-admin-orders-view";
export const ORDERS_LIST_PATH = "/admin/orders";

export function isOrdersListPath(pathname) {
  const path = String(pathname || "").replace(/\/$/, "") || "/";
  return path === ORDERS_LIST_PATH;
}

export function rememberOrdersView(view) {
  try {
    window.sessionStorage.setItem(
      ORDERS_VIEW_STORAGE_KEY,
      view === "merged" ? "merged" : "individual",
    );
  } catch {
    /* ignore */
  }
}

/** Navigate to the orders grid, restoring the individual / merged tab. */
export function useGoToOrdersList() {
  const navigate = useNavigate();
  return useCallback((view = "individual") => {
    const ordersView = view === "merged" ? "merged" : "individual";
    rememberOrdersView(ordersView);
    navigate(ORDERS_LIST_PATH, { state: { ordersView }, flushSync: true });
  }, [navigate]);
}
