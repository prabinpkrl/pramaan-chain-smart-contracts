import { useEffect, useState } from "react";
import StatCard from "../../components/common/StatCard";
import { useAuth } from "../../contexts/useAuth";
import { apiErrorMessage } from "../../services/api";
import {
  listCitizenCertificates,
  listCitizenRequests,
} from "../../services/certificateService";
import { Link } from "../../routing/Link";

function CitizenDashboard() {
  const { session } = useAuth();
  const [requests, setRequests] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");
  const citizen = session.roles.includes("CITIZEN");

  useEffect(() => {
    if (!citizen) return;
    Promise.all([listCitizenRequests(), listCitizenCertificates()])
      .then(([nextRequests, nextCertificates]) => {
        setRequests(nextRequests);
        setCertificates(nextCertificates);
      })
      .catch((requestError) => setError(apiErrorMessage(requestError)));
  }, [citizen]);

  if (!citizen) {
    return (
      <section className="panel">
        <p className="eyebrow">Verified wallet</p>
        <h1>Claim an institution first</h1>
        <p>
          Your signature proves control of this wallet, but no private citizen
          relationship exists yet.
        </p>
        <Link to="/citizen/claim" className="button button-primary">Claim institution</Link>
      </section>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Private citizen workspace</p><h1>My certificate assignments</h1></div>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="stats-grid">
        <StatCard title="Institutions" value={session.citizenRelationships.length} color="blue" />
        <StatCard title="Pending" value={requests.filter((item) => item.status === "PENDING").length} color="yellow" />
        <StatCard title="Active proofs" value={certificates.filter((item) => item.status === "ACTIVE").length} color="green" />
        <StatCard title="Revoked proofs" value={certificates.filter((item) => item.status === "REVOKED").length} color="red" />
      </div>
      <section className="panel">
        <h2>What this account proves</h2>
        <p>
          Your wallet signature proves wallet control. The encrypted application
          database assigns certificate proofs to this account. The blockchain alone
          cannot identify the assigned citizen.
        </p>
        <div className="button-row">
          <Link to="/citizen/requests" className="button button-primary">Create or view requests</Link>
          <Link to="/citizen/certificates" className="button button-secondary">View proofs</Link>
        </div>
      </section>
    </>
  );
}

export default CitizenDashboard;
