import React from "react";
import ReactDOM from "react-dom/client";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { DesignProposalProvider } from "./lib/designProposal.jsx";
import { ColorModeProvider } from "./lib/colorMode.jsx";
import { CmsProvider } from "./lib/cmsContent.jsx";
import { ShopNavLayoutProvider } from "./lib/shopNavLayout.jsx";
import { PreorderDisplayProvider } from "./lib/preorderDisplayLayout.jsx";
import { InquiriesProvider } from "./lib/inquiriesStore.jsx";
import { InventoryProvider } from "./lib/inventoryStore.jsx";
import { CartProvider } from "./lib/cartStore.jsx";
import { OrdersProvider } from "./lib/ordersStore.jsx";
import { WishlistProvider } from "./lib/wishlistStore.jsx";
import { AuthProvider, ROLES } from "./auth/AuthProvider.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import CustomerLayout from "./customer/CustomerLayout.jsx";
import HomePage from "./customer/HomePage.jsx";
import ShopPage from "./customer/ShopPage.jsx";
import ProductPage from "./customer/ProductPage.jsx";
import AccountPage from "./customer/AccountPage.jsx";
import CheckoutPage from "./customer/CheckoutPage.jsx";
import AdminLayout from "./admin/AdminLayout.jsx";
import AdminLogin from "./admin/AdminLogin.jsx";
import DashboardPage from "./admin/DashboardPage.jsx";
import OrdersPage from "./admin/OrdersPage.jsx";
import CustomersPage from "./admin/CustomersPage.jsx";
import InquiriesPage from "./admin/InquiriesPage.jsx";
import InventoryPage from "./admin/InventoryPage.jsx";
import CmsPage from "./admin/CmsPage.jsx";
import RouteErrorFallback from "./components/RouteErrorFallback.jsx";
import "./styles.css";

const router = createBrowserRouter([
  {
    // Customer-facing site (public + customer account)
    element: <CustomerLayout />,
    errorElement: <RouteErrorFallback title="This page couldn't load" />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/shop", element: <ShopPage /> },
      { path: "/shop/:productId", element: <ProductPage /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/account", element: <AccountPage /> },
    ],
  },
  {
    // Admin login (no role required to view the login page itself)
    path: "/admin/login",
    element: <AdminLogin />,
  },
  {
    // Admin portal — requires an authenticated user with the admin role.
    element: <ProtectedRoute role={ROLES.ADMIN} redirectTo="/admin/login" />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: "/admin", element: <DashboardPage /> },
          { path: "/admin/orders", element: <OrdersPage /> },
          { path: "/admin/customers", element: <CustomersPage /> },
          { path: "/admin/inquiries", element: <InquiriesPage /> },
          { path: "/admin/inventory", element: <InventoryPage /> },
          { path: "/admin/cms", element: <CmsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DesignProposalProvider>
      <ColorModeProvider>
        <CmsProvider>
          <ShopNavLayoutProvider>
          <PreorderDisplayProvider>
          <InquiriesProvider>
            <InventoryProvider>
            <CartProvider>
              <OrdersProvider>
                <AuthProvider>
                  <WishlistProvider>
                    <RouterProvider router={router} />
                  </WishlistProvider>
                </AuthProvider>
              </OrdersProvider>
            </CartProvider>
            </InventoryProvider>
          </InquiriesProvider>
          </PreorderDisplayProvider>
          </ShopNavLayoutProvider>
        </CmsProvider>
      </ColorModeProvider>
    </DesignProposalProvider>
  </React.StrictMode>,
);
