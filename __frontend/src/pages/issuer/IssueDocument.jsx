import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/useAuth";
import { apiErrorMessage } from "../../services/api";
import { issueOnChain } from "../../services/contractService";
import {
  confirmIssuance,
  listIssuerRequests,
  prepareIssuance,
  rejectRequest,
} from "../../services/documentService";
import { hashDocument } from "../../utils/hashDocument";
import { formatDate } from "../../utils/format";

function IssueDocument() {
  const { session } = useAuth();
  const [institutionId, setInstitutionId] = useState(session.issuerMemberships[0]?.id || "");
  const [requests, setRequests] = useState([]);
  const [files, setFiles] = useState({});
  const [transactionHashes, setTransactionHashes] = useState({});
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    if (!institutionId) return;
    setRequests(await listIssuerRequests(institutionId));
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId) return;
    listIssuerRequests(institutionId)
      .then(setRequests)
      .catch((error) => toast.error(apiErrorMessage(error)));
  }, [institutionId]);

  const issue = async (request) => {
    const file = files[request.id];
    if (!file) {
      toast.error("Select the exact certificate file for this request.");
      return;
    }
    setBusyId(request.id);
    try {
      const documentHash = await hashDocument(file);
      if (
        request.documentHash
        && request.documentHash.toLowerCase() !== documentHash.toLowerCase()
      ) {
        throw new Error("This processing request is locked to a different document hash.");
      }
      if (!window.confirm(`Issue the local file with SHA-256 hash ${documentHash}?`)) return;
      const prepared = await prepareIssuance(request.id, institutionId, documentHash);
      const transactionHash = await issueOnChain(documentHash, session.address);
      await confirmIssuance(request.id, institutionId, prepared.attemptId, transactionHash);
      await load();
      toast.success("Certificate issued and receipt confirmed.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
      await load().catch(() => undefined);
    } finally {
      setBusyId("");
    }
  };

  const reconcile = async (request) => {
    const transactionHash = transactionHashes[request.id]?.trim();
    if (!transactionHash) {
      toast.error("Enter the already-submitted Sepolia transaction hash.");
      return;
    }
    setBusyId(request.id);
    try {
      await confirmIssuance(
        request.id,
        institutionId,
        request.attemptId,
        transactionHash,
      );
      await load();
      toast.success("Existing transaction reconciled.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusyId("");
    }
  };

  const reject = async (requestId) => {
    if (!window.confirm("Reject this pending request?")) return;
    try {
      await rejectRequest(requestId, institutionId);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Institution-scoped queue
          </p>
          <h1 className="text-3xl font-bold">Issue Certificates</h1>
        </div>
        {session.issuerMemberships.length > 1 && (
          <select
            value={institutionId}
            onChange={(event) => setInstitutionId(event.target.value)}
            className="rounded-lg border border-gray-300 p-3"
          >
            {session.issuerMemberships.map((institution) => (
              <option key={institution.id} value={institution.id}>{institution.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-5">
        {requests.map((request) => (
          <article key={request.id} className="rounded-xl bg-white p-6 shadow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{request.certificateType}</h2>
                <p className="text-sm text-gray-500">Private citizen request</p>
              </div>
              <Badge status={request.status} />
            </div>
            <dl className="mt-4 grid gap-3 md:grid-cols-2">
              <div><dt className="text-sm text-gray-500">Request ID</dt><dd className="break-all font-mono text-xs">{request.id}</dd></div>
              <div><dt className="text-sm text-gray-500">Created</dt><dd>{formatDate(request.createdAt)}</dd></div>
              {request.documentHash && (
                <div className="md:col-span-2"><dt className="text-sm text-gray-500">Frozen hash</dt><dd className="break-all font-mono text-xs">{request.documentHash}</dd></div>
              )}
            </dl>
            {(request.status === "PENDING" || request.status === "PROCESSING") && (
              <div className="mt-5 border-t pt-5">
                <Input
                  id={`file-${request.id}`}
                  label="Exact certificate file"
                  type="file"
                  onChange={(event) => setFiles((current) => ({
                    ...current,
                    [request.id]: event.target.files?.[0],
                  }))}
                />
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => issue(request)} loading={busyId === request.id}>
                    {request.status === "PROCESSING" ? "Resume same-hash issuance" : "Prepare and issue"}
                  </Button>
                  {request.status === "PENDING" && (
                    <Button variant="danger" onClick={() => reject(request.id)}>Reject</Button>
                  )}
                </div>
              </div>
            )}
            {request.status === "PROCESSING" && (
              <div className="mt-5 rounded-lg bg-blue-50 p-4">
                <Input
                  id={`tx-${request.id}`}
                  label="Already-submitted transaction hash"
                  value={transactionHashes[request.id] || ""}
                  onChange={(event) => setTransactionHashes((current) => ({
                    ...current,
                    [request.id]: event.target.value,
                  }))}
                  placeholder="0x…"
                />
                <Button variant="secondary" onClick={() => reconcile(request)}>
                  Reconcile without resending
                </Button>
              </div>
            )}
          </article>
        ))}
        {requests.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            No requests for this institution.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default IssueDocument;
