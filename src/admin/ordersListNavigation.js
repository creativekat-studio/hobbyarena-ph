import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const ORDERS_VIEW_STORAGE_KEY = "ha-admin-orders-view";
export const ORDERS_LIST_PATH = "/admin/orders";
export const SHOW_ORDERS_LIST_EVENT = "ha-admin-show-orders-list";

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

export function requestOrdersListView() {
  window.dispatchEvent(new CustomEvent(SHOW_ORDERS_LIST_EVENT));
}

/** In-app back to the orders grid. AdminLayout listens and mounts OrdersPage even if the router leaves a detail view on screen. */
export function useGoToOrdersList() {
  const navigate = useNavigate();
  return useCallback((view = "individual") => {
    const ordersView = view === "merged" ? "merged" : "individual";
    rememberOrdersView(ordersView);
    navigate(ORDERS_LIST_PATH, { state: { ordersView } });
    requestOrdersListView();
  }, [navigate]);
}
