import { NavLink } from "react-router-dom";
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
} from "lucide-react";

import { useAuth } from "../../context/useAuth";

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

function Sidebar() {
  const { activeRole } = useAuth();
  const items = NAV_ITEMS[activeRole] || [];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      isActive ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <nav className="space-y-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
