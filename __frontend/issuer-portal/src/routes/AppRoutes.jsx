import { useEffect } from "react";
import DashboardLayout from "../components/Layout/DashboardLayout";
import { useAuth } from "../contexts/useAuth";
import CitizenCertificates from "../pages/Citizen/CitizenCertificates";
import CitizenDashboard from "../pages/Citizen/CitizenDashboard";
import CitizenRequests from "../pages/Citizen/CitizenRequests";
import ClaimInstitution from "../pages/Citizen/ClaimInstitution";
import Home from "../pages/Home/Home";
import IssuerCertificates from "../pages/Issuer/IssuerCertificates";
import IssuerDashboard from "../pages/Issuer/IssuerDashboard";
import IssuerRequests from "../pages/Issuer/IssuerRequests";
import Verify from "../pages/Verify/Verify";
import WalletLogin from "../pages/WalletLogin/WalletLogin";
import { RouterProvider } from "../routing/RouterProvider";
import { useRouter } from "../routing/useRouter";

function Redirect({ to }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(to, { replace: true }), [navigate, to]);
  return <div className="page-message">Redirecting…</div>;
}

function RoutedContent() {
  const { location } = useRouter();
  const { session, loading } = useAuth();
  const path = location.pathname;

  if (path === "/") return <Home />;
  if (path === "/verify") return <Verify />;
  if (path === "/login") return <WalletLogin />;
  if (loading) return <div className="page-message">Loading secure session…</div>;
  if (!session) return <Redirect to="/login" />;

  if (path.startsWith("/issuer")) {
    if (!session.roles.includes("ISSUER")) return <Redirect to="/login" />;
    const page = path === "/issuer/requests"
      ? <IssuerRequests />
      : path === "/issuer/certificates"
        ? <IssuerCertificates />
        : <IssuerDashboard />;
    return <DashboardLayout role="ISSUER">{page}</DashboardLayout>;
  }

  if (path.startsWith("/citizen")) {
    if (
      !session.roles.includes("CITIZEN")
      && !session.roles.includes("UNLINKED")
    ) return <Redirect to="/login" />;
    const page = path === "/citizen/claim"
      ? <ClaimInstitution />
      : path === "/citizen/requests"
        ? <CitizenRequests />
        : path === "/citizen/certificates"
          ? <CitizenCertificates />
          : <CitizenDashboard />;
    return <DashboardLayout role="CITIZEN">{page}</DashboardLayout>;
  }

  return <Redirect to="/" />;
}

function AppRoutes() {
  return (
    <RouterProvider>
      <RoutedContent />
    </RouterProvider>
  );
}

export default AppRoutes;
