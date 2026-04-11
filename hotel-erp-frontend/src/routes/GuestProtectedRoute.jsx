import { Navigate } from "react-router-dom";
import { useAdminAuthStore } from "../store/adminAuthStore";
import { getDefaultAuthenticatedPath, isGuestRole } from "./permissionRouting";

export default function GuestProtectedRoute({ children }) {
  const token = useAdminAuthStore((s) => s.token);
  const role = useAdminAuthStore((s) => s.user?.role);
  const permissions = useAdminAuthStore((s) => s.permissions);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isGuestRole(role)) {
    return <Navigate to={getDefaultAuthenticatedPath(role, permissions)} replace />;
  }

  return children;
}
