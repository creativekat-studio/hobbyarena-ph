import { Navigate } from "react-router-dom";

/** Legacy route — Member ranks now lives under Classifications. */
export default function ClientTiersPage() {
  return <Navigate to="/admin/catalog?tab=member-ranks" replace />;
}
