import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import Badge from "../../components/common/Badge";
import { config } from "../../config";
import { useAuth } from "../../contexts/useAuth";
import { apiErrorMessage } from "../../services/api";
import { listCitizenCertificates } from "../../services/certificateService";
import { formatDate, shortAddress, verificationUrl } from "../../utils/format";

function CitizenCertificates() {
  const { session } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session.roles.includes("CITIZEN")) return;
    listCitizenCertificates()
      .then(setCertificates)
      .catch((requestError) => setError(apiErrorMessage(requestError)));
  }, [session.roles]);

  if (!session.roles.includes("CITIZEN")) {
    return <div className="panel empty-state">No private citizen relationship exists.</div>;
  }

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Private assignment</p><h1>My certificate proofs</h1></div>
      </div>
      <p className="muted">
        These assignments come from the private database. The public blockchain
        authenticates the certificate hash but does not identify you.
      </p>
      {error && <p className="error-message">{error}</p>}
      <div className="card-list">
        {certificates.map((certificate) => {
          const publicVerificationUrl = verificationUrl(
            config.publicAppUrl,
            certificate.documentHash,
          );
          return (
            <article className="panel certificate-card" key={certificate.id}>
              <div>
                <div className="section-heading">
                  <div><h2>{certificate.certificateType}</h2><p className="muted">{certificate.institutionName}</p></div>
                  <Badge status={certificate.status} />
                </div>
                <dl className="details-grid">
                  <div><dt>Document hash</dt><dd className="mono">{certificate.documentHash}</dd></div>
                  <div><dt>Issuer</dt><dd title={certificate.issuer}>{shortAddress(certificate.issuer)}</dd></div>
                  <div><dt>Issued</dt><dd>{formatDate(certificate.issuedAt)}</dd></div>
                  <div><dt>Revoked</dt><dd>{formatDate(certificate.revokedAt)}</dd></div>
                </dl>
                <a href={`${config.etherscanBaseUrl}/tx/${certificate.transactionHash}`} target="_blank" rel="noreferrer" className="text-link">
                  View issuance transaction
                </a>
              </div>
              <div className="qr-box compact">
                <QRCode value={publicVerificationUrl} size={112} />
                <span>Hash-only verification URL</span>
              </div>
            </article>
          );
        })}
        {certificates.length === 0 && <div className="panel empty-state">No certificate has been assigned yet.</div>}
      </div>
    </>
  );
}

export default CitizenCertificates;
