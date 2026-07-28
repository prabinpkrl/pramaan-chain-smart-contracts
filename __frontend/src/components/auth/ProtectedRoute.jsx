import { Navigate } from "react-router";

import { useAuth } from "../../context/useAuth";
import { homeForRole } from "../../utils/roleRoutes";
import RouteLoader from "../common/RouteLoader";

/**
 * Guards a portal's routes. If no wallet is connected, sends the user back
 * to login. If a wallet is connected but its role doesn't match this portal,
 * redirects to the portal it does belong to, instead of showing a dead end.
 */
function ProtectedRoute({ allowedRoles, children }) {
  const { session, activeRole, loading } = useAuth();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (loading) {
    return <RouteLoader />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(activeRole) || !session.roles.includes(activeRole)) {
    return <Navigate to={homeForRole(activeRole)} replace />;
  }

  return children;
}

export default ProtectedRoute;
