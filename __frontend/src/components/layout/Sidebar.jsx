import { NavLink } from "react-router";
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Ban,
  UserCircle,
  ShieldCheck,
  Users,
  Activity,
  ScrollText,
  FolderClock,
  History,
  X,
} from "lucide-react";

import { useAuth } from "../../context/useAuth";
import Brand from "../brand/Brand";

const NAV_ITEMS = {
  ADMIN: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/issuers", label: "Institutions", icon: Users },
    { to: "/admin/monitor", label: "Blockchain Monitor", icon: Activity },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  ],
  ISSUER: [
    { to: "/issuer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/issuer/issue", label: "Issue Document", icon: FilePlus2 },
    { to: "/issuer/documents", label: "Document Registry", icon: Files },
    { to: "/issuer/revoked", label: "Revoked Documents", icon: Ban },
    { to: "/issuer/profile", label: "Profile", icon: UserCircle },
  ],
  CITIZEN: [
    { to: "/citizen/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/citizen/connect", label: "Connect Institution", icon: Users },
    { to: "/citizen/requests", label: "Certificate Requests", icon: FilePlus2 },
    { to: "/citizen/my-documents", label: "My Documents", icon: FolderClock },
    { to: "/verify", label: "Public Verifier", icon: ShieldCheck },
    { to: "/citizen/history", label: "Verification History", icon: History },
  ],
  UNLINKED: [
    { to: "/citizen/connect", label: "Connect Institution", icon: Users },
  ],
};

function Sidebar({ mobileOpen = false, onClose }) {
  const { activeRole } = useAuth();
  const items = NAV_ITEMS[activeRole] || [];

  const linkClass = ({ isActive }) =>
    `group flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
      isActive
        ? "border-[#4b4385] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
        : "border-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
    }`;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-[var(--border)] bg-[var(--canvas-soft)] p-4 sm:p-5 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex h-12 items-center justify-between px-2">
          <Brand />
          <button
            type="button"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface)] lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>
        <p className="eyebrow mb-3 px-3">Workspace</p>
        <nav className="space-y-1" aria-label={`${activeRole || "Account"} portal`}>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass} onClick={onClose}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mono-value mb-2 text-[0.65rem] tracking-[0.12em] text-[var(--accent-strong)]">
            SEPOLIA / 11155111
          </p>
          <p className="text-xs leading-5 text-[var(--text-muted)]">
            Sepolia is public test infrastructure. Certificate files remain off-chain.
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
