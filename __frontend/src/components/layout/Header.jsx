import { useNavigate } from "react-router";
import { ChevronDown, LogOut, Menu } from "lucide-react";

import { useAuth } from "../../context/useAuth";
import { shortenAddress } from "../../utils/wallet";
import { homeForRole } from "../../utils/roleRoutes";
import Brand from "../brand/Brand";

const ROLE_LABELS = {
  ADMIN: "Administrator",
  ISSUER: "Issuer",
  CITIZEN: "Citizen",
  UNLINKED: "Unlinked wallet",
};

function Header({ onOpenNavigation }) {
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
    <header className="sticky top-0 z-30 flex min-h-18 items-center justify-between border-b border-[var(--border)] bg-[var(--canvas)]/95 px-5 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] lg:hidden"
          onClick={onOpenNavigation}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div className="lg:hidden">
          <Brand compact hideNameOnSmall />
        </div>
        <div className="hidden items-center gap-2 text-xs text-[var(--text-muted)] sm:flex lg:flex">
          Ethereum
          <span className="text-[var(--accent-strong)]">/</span>
          Sepolia
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-right">
          {session?.roles?.length > 1 ? (
            <div className="relative">
              <select
                aria-label="Active portal"
                value={activeRole || ""}
                onChange={handleRoleChange}
                className="min-h-10 appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 pl-3 pr-9 text-sm"
              >
                {session.roles.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                size={14}
              />
            </div>
          ) : (
            <p className="max-w-24 truncate text-sm font-medium text-[var(--text)] sm:max-w-none">
              {ROLE_LABELS[activeRole] || "Guest"}
            </p>
          )}
          <p className="mono-value hidden text-xs text-[var(--text-dim)] sm:block">
            {shortenAddress(session?.address)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-muted)] transition hover:border-[#71303c] hover:text-[var(--danger)]"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
