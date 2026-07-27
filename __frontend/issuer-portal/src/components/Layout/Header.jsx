import { useAuth } from "../../contexts/useAuth";
import { Link } from "../../routing/Link";
import { shortAddress } from "../../utils/format";

function Header({ role }) {
  const { session, logout } = useAuth();
  return (
    <header className="app-header">
      <Link to="/" className="brand">PramaanChain</Link>
      <div className="header-actions">
        <Link to="/verify" className="text-link">Verify</Link>
        {role === "ISSUER" && session?.roles.includes("CITIZEN") && (
          <Link to="/citizen" className="text-link">Citizen view</Link>
        )}
        {role === "CITIZEN" && session?.roles.includes("ISSUER") && (
          <Link to="/issuer" className="text-link">Issuer view</Link>
        )}
        <span className="wallet-pill">{shortAddress(session?.address)}</span>
        <button className="button button-danger" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;
