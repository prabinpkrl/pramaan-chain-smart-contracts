import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/useAuth";

const ROLE_HOME = {
  admin: "/admin/dashboard",
  issuer: "/issuer/dashboard",
  citizen: "/citizen/dashboard",
};

/**
 * Guards a portal's routes. If no wallet is connected, sends the user back
 * to login. If a wallet is connected but its role doesn't match this portal,
 * redirects to the portal it does belong to, instead of showing a dead end.
 */
function ProtectedRoute({ allowedRole, children }) {
  const { address, role, status } = useAuth();

  if (status === "idle" || !address) {
    return <Navigate to="/" replace />;
  }

  if (role !== allowedRole) {
    return <Navigate to={ROLE_HOME[role] || "/"} replace />;
  }

  return children;
}

export default ProtectedRoute;
