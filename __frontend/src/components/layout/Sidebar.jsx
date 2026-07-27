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
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/issuers", label: "Manage Issuers", icon: Users },
    { to: "/admin/monitor", label: "Blockchain Monitor", icon: Activity },
    { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  ],
  issuer: [
    { to: "/issuer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/issuer/issue", label: "Issue Document", icon: FilePlus2 },
    { to: "/issuer/documents", label: "Document Registry", icon: Files },
    { to: "/issuer/revoked", label: "Revoked Documents", icon: Ban },
    { to: "/issuer/profile", label: "Profile", icon: UserCircle },
  ],
  citizen: [
    { to: "/citizen/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/citizen/verify", label: "Verify Document", icon: ShieldCheck },
    { to: "/citizen/my-documents", label: "My Documents", icon: FolderClock },
    { to: "/citizen/history", label: "Verification History", icon: History },
  ],
};

function Sidebar() {
  const { role } = useAuth();
  const items = NAV_ITEMS[role] || [];

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
