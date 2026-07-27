import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { config } from "../../config";
import { useAuth } from "../../contexts/useAuth";
import { apiErrorMessage } from "../../services/api";
import {
  confirmRevocation,
  listIssuerCertificates,
  prepareRevocation,
} from "../../services/certificateService";
import { revokeOnChain } from "../../services/contractService";
import { formatDate, shortAddress, verificationUrl } from "../../utils/format";

function IssuerCertificates() {
  const { session } = useAuth();
  const [institutionId, setInstitutionId] = useState(session.issuerMemberships[0].id);
  const [certificates, setCertificates] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setCertificates(await listIssuerCertificates(institutionId));
      setError("");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }, [institutionId]);

  useEffect(() => {
    listIssuerCertificates(institutionId)
      .then((nextCertificates) => {
        setCertificates(nextCertificates);
        setError("");
      })
      .catch((requestError) => setError(apiErrorMessage(requestError)));
  }, [institutionId]);

  const revoke = async (certificate) => {
    if (
      certificate.issuer.toLowerCase() !== session.address.toLowerCase()
      || !window.confirm("Permanently revoke this certificate proof on Sepolia?")
    ) return;
    setBusyId(certificate.id);
    try {
      const prepared = await prepareRevocation(certificate.id, institutionId);
      const transactionHash = await revokeOnChain(certificate.documentHash, session.address);
      await confirmRevocation(
        certificate.id,
        institutionId,
        prepared.attemptId,
        transactionHash,
      );
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
      await load();
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Private assignment plus public proof</p><h1>Certificates</h1></div>
        {session.issuerMemberships.length > 1 && (
          <select value={institutionId} onChange={(event) => setInstitutionId(event.target.value)}>
            {session.issuerMemberships.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="card-list">
        {certificates.length === 0 && <div className="panel empty-state">No confirmed certificate proofs.</div>}
        {certificates.map((certificate) => {
          const publicVerificationUrl = verificationUrl(
            config.publicAppUrl,
            certificate.documentHash,
          );
          const originalIssuer = certificate.issuer.toLowerCase() === session.address.toLowerCase();
          return (
            <article className="panel certificate-card" key={certificate.id}>
              <div>
                <div className="section-heading">
                  <h2>{certificate.certificateType}</h2>
                  <Badge status={certificate.status} />
                </div>
                <dl className="details-grid">
                  <div><dt>Document hash</dt><dd className="mono">{certificate.documentHash}</dd></div>
                  <div><dt>Original issuer</dt><dd title={certificate.issuer}>{shortAddress(certificate.issuer)}</dd></div>
                  <div><dt>Issued</dt><dd>{formatDate(certificate.issuedAt)}</dd></div>
                  <div><dt>Revoked</dt><dd>{formatDate(certificate.revokedAt)}</dd></div>
                </dl>
                <div className="button-row">
                  <a href={`${config.etherscanBaseUrl}/tx/${certificate.transactionHash}`} target="_blank" rel="noreferrer" className="text-link">
                    Issuance transaction
                  </a>
                  {certificate.status === "ACTIVE" && originalIssuer && (
                    <Button variant="danger" onClick={() => revoke(certificate)} disabled={busyId === certificate.id}>
                      Revoke with original wallet
                    </Button>
                  )}
                </div>
                {certificate.status === "ACTIVE" && !originalIssuer && (
                  <p className="muted">Only the exact original issuer wallet may revoke this proof.</p>
                )}
              </div>
              <div className="qr-box compact">
                <QRCode value={publicVerificationUrl} size={112} />
                <span>Public verification only</span>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export default IssuerCertificates;
