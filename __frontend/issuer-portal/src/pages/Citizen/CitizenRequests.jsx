import { useCallback, useEffect, useState } from "react";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../contexts/useAuth";
import { apiErrorMessage } from "../../services/api";
import {
  createCitizenRequest,
  listCitizenInstitutions,
  listCitizenRequests,
} from "../../services/certificateService";
import { formatDate } from "../../utils/format";

function CitizenRequests() {
  const { session } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [institutionId, setInstitutionId] = useState("");
  const [certificateType, setCertificateType] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!session.roles.includes("CITIZEN")) return;
    try {
      const [nextInstitutions, nextRequests] = await Promise.all([
        listCitizenInstitutions(),
        listCitizenRequests(),
      ]);
      setInstitutions(nextInstitutions);
      setRequests(nextRequests);
      setInstitutionId((current) => current || nextInstitutions[0]?.id || "");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  }, [session.roles]);

  useEffect(() => {
    if (!session.roles.includes("CITIZEN")) return;
    Promise.all([listCitizenInstitutions(), listCitizenRequests()])
      .then(([nextInstitutions, nextRequests]) => {
        setInstitutions(nextInstitutions);
        setRequests(nextRequests);
        setInstitutionId((current) => current || nextInstitutions[0]?.id || "");
      })
      .catch((requestError) => setError(apiErrorMessage(requestError)));
  }, [session.roles]);

  const create = async (event) => {
    event.preventDefault();
    try {
      await createCitizenRequest(institutionId, certificateType);
      setCertificateType("");
      await load();
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    }
  };

  if (!session.roles.includes("CITIZEN")) {
    return <div className="panel empty-state">Claim an institution before creating a request.</div>;
  }

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Private requests</p><h1>Certificate requests</h1></div>
      </div>
      {error && <p className="error-message">{error}</p>}
      <section className="panel">
        <h2>New request</h2>
        <form className="form-stack" onSubmit={create}>
          <label>
            Institution
            <select value={institutionId} onChange={(event) => setInstitutionId(event.target.value)} required>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>{institution.name}</option>
              ))}
            </select>
          </label>
          <Input
            label="Certificate type"
            value={certificateType}
            onChange={(event) => setCertificateType(event.target.value)}
            placeholder="Academic certificate"
            required
          />
          <Button type="submit" disabled={!institutionId}>Submit request</Button>
        </form>
      </section>
      <section className="card-list">
        {requests.map((item) => (
          <article className="panel" key={item.id}>
            <div className="section-heading">
              <div><h2>{item.certificateType}</h2><p className="muted">{item.institutionName}</p></div>
              <Badge status={item.status} />
            </div>
            <p className="mono">{item.id}</p>
            <p className="muted">Created {formatDate(item.createdAt)}</p>
          </article>
        ))}
        {requests.length === 0 && <div className="panel empty-state">No requests yet.</div>}
      </section>
    </>
  );
}

export default CitizenRequests;
