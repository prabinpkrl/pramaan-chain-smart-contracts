import { useCallback, useEffect, useState } from "react";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../contexts/useAuth";
import { apiErrorMessage } from "../../services/api";
import {
  confirmIssuance,
  createClaimCode,
  listIssuerRequests,
  prepareIssuance,
  rejectRequest,
} from "../../services/certificateService";
import { hashFile, issueOnChain } from "../../services/contractService";
import { formatDate } from "../../utils/format";

function IssuerRequests() {
  const { session } = useAuth();
  const [institutionId, setInstitutionId] = useState(session.issuerMemberships[0].id);
  const [requests, setRequests] = useState([]);
  const [files, setFiles] = useState({});
  const [transactionHashes, setTransactionHashes] = useState({});
  const [recipientReference, setRecipientReference] = useState("");
  const [claim, setClaim] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRequests(await listIssuerRequests(institutionId));
      setError("");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }, [institutionId]);

  useEffect(() => {
    listIssuerRequests(institutionId)
      .then((nextRequests) => {
        setRequests(nextRequests);
        setError("");
      })
      .catch((requestError) => setError(apiErrorMessage(requestError)));
  }, [institutionId]);

  const generateClaim = async (event) => {
    event.preventDefault();
    setError("");
    setClaim(null);
    try {
      setClaim(await createClaimCode(institutionId, recipientReference));
      setRecipientReference("");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  };

  const issue = async (certificateRequest) => {
    const file = files[certificateRequest.id];
    if (!file) {
      setError("Select the exact certificate file for this request.");
      return;
    }
    setBusyId(certificateRequest.id);
    setError("");
    try {
      const documentHash = await hashFile(file);
      if (
        certificateRequest.documentHash
        && certificateRequest.documentHash.toLowerCase() !== documentHash.toLowerCase()
      ) {
        throw new Error("This processing request is locked to a different document hash.");
      }
      if (!window.confirm(`Issue the local file with SHA-256 hash ${documentHash}?`)) return;
      const prepared = await prepareIssuance(
        certificateRequest.id,
        institutionId,
        documentHash,
      );
      const transactionHash = await issueOnChain(documentHash, session.address);
      await confirmIssuance(
        certificateRequest.id,
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

  const reconcile = async (certificateRequest) => {
    const transactionHash = transactionHashes[certificateRequest.id]?.trim();
    if (!transactionHash) {
      setError("Enter the already-submitted Sepolia transaction hash.");
      return;
    }
    setBusyId(certificateRequest.id);
    setError("");
    try {
      await confirmIssuance(
        certificateRequest.id,
        institutionId,
        certificateRequest.attemptId,
        transactionHash,
      );
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusyId("");
    }
  };

  const reject = async (requestId) => {
    if (!window.confirm("Reject this pending request?")) return;
    try {
      await rejectRequest(requestId, institutionId);
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  };

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Institution-scoped queue</p><h1>Certificate requests</h1></div>
        {session.issuerMemberships.length > 1 && (
          <select value={institutionId} onChange={(event) => setInstitutionId(event.target.value)}>
            {session.issuerMemberships.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}

      <section className="panel">
        <h2>Create citizen claim code</h2>
        <p className="muted">
          Use an opaque internal request reference, not a name or government identifier.
          The 128-bit code expires after 24 hours and is displayed once.
        </p>
        <form className="inline-form" onSubmit={generateClaim}>
          <Input
            label="Opaque recipient reference"
            value={recipientReference}
            onChange={(event) => setRecipientReference(event.target.value)}
            placeholder="REQUEST-2026-001"
            required
          />
          <Button type="submit">Generate code</Button>
        </form>
        {claim && (
          <div className="claim-result">
            <strong>Copy this code now:</strong>
            <code>{claim.code}</code>
            <span>Expires {formatDate(claim.expiresAt)}</span>
          </div>
        )}
      </section>

      <section className="card-list">
        {requests.length === 0 && <div className="panel empty-state">No requests for this institution.</div>}
        {requests.map((item) => (
          <article className="panel request-card" key={item.id}>
            <div className="section-heading">
              <div>
                <h2>{item.certificateType}</h2>
                <p className="muted">Reference: {item.recipientReference || "Private assignment"}</p>
              </div>
              <Badge status={item.status} />
            </div>
            <dl className="details-grid">
              <div><dt>Request ID</dt><dd className="mono">{item.id}</dd></div>
              <div><dt>Created</dt><dd>{formatDate(item.createdAt)}</dd></div>
              {item.documentHash && <div><dt>Frozen hash</dt><dd className="mono">{item.documentHash}</dd></div>}
            </dl>
            {(item.status === "PENDING" || item.status === "PROCESSING") && (
              <div className="form-stack">
                <Input
                  label="Exact certificate file"
                  type="file"
                  onChange={(event) => setFiles((current) => ({
                    ...current,
                    [item.id]: event.target.files?.[0],
                  }))}
                />
                <div className="button-row">
                  <Button onClick={() => issue(item)} disabled={busyId === item.id}>
                    {item.status === "PROCESSING" ? "Resume same-hash issuance" : "Prepare and issue"}
                  </Button>
                  {item.status === "PENDING" && (
                    <Button variant="danger" onClick={() => reject(item.id)}>Reject</Button>
                  )}
                </div>
              </div>
            )}
            {item.status === "PROCESSING" && (
              <div className="reconcile-box">
                <Input
                  label="Already-submitted transaction hash"
                  value={transactionHashes[item.id] || ""}
                  onChange={(event) => setTransactionHashes((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))}
                  placeholder="0x…"
                />
                <Button variant="secondary" onClick={() => reconcile(item)}>
                  Reconcile without resending
                </Button>
              </div>
            )}
          </article>
        ))}
      </section>
    </>
  );
}

export default IssuerRequests;
