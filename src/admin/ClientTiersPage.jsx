import { Navigate } from "react-router-dom";

/** Legacy route — Member tiers now live under Classifications. */
export default function ClientTiersPage() {
  return <Navigate to="/admin/catalog?tab=member-tiers" replace />;
}
