import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import { useAuth } from "../../context/useAuth";
import { shortenAddress } from "../../utils/wallet";
import { homeForRole } from "../../utils/roleRoutes";

const ROLE_LABELS = {
  ADMIN: "Administrator",
  ISSUER: "Issuer",
  CITIZEN: "Citizen",
  UNLINKED: "Unlinked wallet",
};

function Header() {
  const { session, activeRole, setActiveRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleRoleChange = (event) => {
    const nextRole = event.target.value;
    setActiveRole(nextRole);
    navigate(homeForRole(nextRole));
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-700">PramaanChain</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          {session?.roles?.length > 1 ? (
            <select
              aria-label="Active portal"
              value={activeRole || ""}
              onChange={handleRoleChange}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            >
              {session.roles.map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
              ))}
            </select>
          ) : (
            <p className="text-gray-700 font-medium">
              {ROLE_LABELS[activeRole] || "Guest"}
            </p>
          )}
          <p className="text-xs text-gray-400 font-mono">
            {shortenAddress(session?.address)}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
