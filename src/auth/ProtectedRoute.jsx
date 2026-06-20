import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, ROLES } from "./AuthProvider.jsx";

/**
 * Client-side route guard. UX only — real authorization is enforced by Firebase
 * Security Rules + custom claims on the backend. Never rely on this alone.
 *
 * @param {"customer"|"admin"} role - required role to view the nested routes
 * @param {string} redirectTo - where to send unauthenticated/unauthorized users
 */
export default function ProtectedRoute({ role, redirectTo }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    // Signed in but wrong role — bounce admins/customers to their own home.
    const fallback = user.role === ROLES.ADMIN ? "/admin" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
