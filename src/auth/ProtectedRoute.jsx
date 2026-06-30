import { Box, CircularProgress } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, ROLES } from "./AuthProvider.jsx";

/**
 * Client-side route guard. UX only — enforce roles server-side in production.
 */
export default function ProtectedRoute({ role, redirectTo }) {
  const { admin, customer, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (role === ROLES.ADMIN) {
    if (!admin) {
      return <Navigate to={redirectTo} replace state={{ from: location }} />;
    }
    return <Outlet />;
  }

  const user = customer;
  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    const fallback = user.role === ROLES.ADMIN ? "/admin" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
