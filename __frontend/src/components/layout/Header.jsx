import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import { useAuth } from "../../context/useAuth";
import { shortenAddress } from "../../utils/wallet";

const ROLE_LABELS = {
  admin: "Administrator",
  issuer: "Issuer",
  citizen: "Citizen",
};

function Header() {
  const { address, role, disconnect } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnect();
    navigate("/", { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-700">PramaanChain</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-gray-700 font-medium">{ROLE_LABELS[role] || "Guest"}</p>
          <p className="text-xs text-gray-400 font-mono">{shortenAddress(address)}</p>
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
