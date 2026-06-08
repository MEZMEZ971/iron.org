import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getAuthenticatedUserId,
  getStoredToken,
} from "../../lib/authStorage";

/**
 * Keeps the session when a valid JWT + user id exist in storage.
 * Network/proxy failures on child pages must not clear auth or force login.
 */
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const hasStoredSession = Boolean(
    getStoredToken() && getAuthenticatedUserId()
  );

  if (!isAuthenticated && !hasStoredSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
