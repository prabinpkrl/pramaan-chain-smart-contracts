import { ClipboardList, Files, LayoutDashboard, Link2 } from "lucide-react";
import { NavLink } from "../../routing/Link";

function Sidebar({ role }) {
  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? "sidebar-link-active" : ""}`;
  return (
    <aside className="sidebar">
      <nav>
        <NavLink
          to={role === "ISSUER" ? "/issuer" : "/citizen"}
          end
          className={linkClass}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>
        {role === "ISSUER" ? (
          <>
            <NavLink to="/issuer/requests" className={linkClass}>
              <ClipboardList size={20} />
              Requests
            </NavLink>
            <NavLink to="/issuer/certificates" className={linkClass}>
              <Files size={20} />
              Certificates
            </NavLink>
          </>
        ) : (
          <>
            <NavLink to="/citizen/claim" className={linkClass}>
              <Link2 size={20} />
              Claim institution
            </NavLink>
            <NavLink to="/citizen/requests" className={linkClass}>
              <ClipboardList size={20} />
              Requests
            </NavLink>
            <NavLink to="/citizen/certificates" className={linkClass}>
              <Files size={20} />
              Certificate proofs
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;
