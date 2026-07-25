import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Ban,
  UserCircle,
  ShieldCheck,
} from "lucide-react";

function Sidebar() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
      isActive ? "bg-blue-700 text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <nav className="space-y-2">
        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>

        <NavLink to="/create" className={linkClass}>
          <FilePlus2 size={20} />
          Issue Certificate
        </NavLink>

        <NavLink to="/certificates" className={linkClass}>
          <Files size={20} />
          Certificates
        </NavLink>

        <NavLink to="/verify" className={linkClass}>
          <ShieldCheck size={20} />
          Verification
        </NavLink>

        <NavLink to="/revoked" className={linkClass}>
          <Ban size={20} />
          Revoked
        </NavLink>

        <NavLink to="/profile" className={linkClass}>
          <UserCircle size={20} />
          Profile
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
