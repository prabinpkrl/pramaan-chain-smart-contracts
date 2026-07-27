import { useEffect, useState } from "react";
import Badge from "../../components/common/Badge";
import StatCard from "../../components/common/StatCard";
import { useAuth } from "../../contexts/useAuth";
import { apiErrorMessage } from "../../services/api";
import { listIssuerCertificates, listIssuerRequests } from "../../services/certificateService";
import { Link } from "../../routing/Link";

function IssuerDashboard() {
  const { session } = useAuth();
  const institution = session.issuerMemberships[0];
  const [requests, setRequests] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      listIssuerRequests(institution.id),
      listIssuerCertificates(institution.id),
    ]).then(([nextRequests, nextCertificates]) => {
      setRequests(nextRequests);
      setCertificates(nextCertificates);
    }).catch((requestError) => setError(apiErrorMessage(requestError)));
  }, [institution.id]);

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Issuer workspace</p><h1>{institution.name}</h1></div>
        <Badge status="ACTIVE" />
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="stats-grid">
        <StatCard title="Pending requests" value={requests.filter((item) => item.status === "PENDING").length} color="yellow" />
        <StatCard title="Processing" value={requests.filter((item) => item.status === "PROCESSING").length} color="blue" />
        <StatCard title="Active proofs" value={certificates.filter((item) => item.status === "ACTIVE").length} color="green" />
        <StatCard title="Revoked" value={certificates.filter((item) => item.status === "REVOKED").length} color="red" />
      </div>
      <section className="panel">
        <h2>Issuer responsibility</h2>
        <p>
          Select a citizen request, hash the exact certificate file locally, and
          sign the Sepolia transaction with the currently authorized issuer wallet.
        </p>
        <div className="button-row">
          <Link to="/issuer/requests" className="button button-primary">Open requests</Link>
          <Link to="/issuer/certificates" className="button button-secondary">View proofs</Link>
        </div>
      </section>
    </>
  );
}

export default IssuerDashboard;
