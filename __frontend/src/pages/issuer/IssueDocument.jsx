import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import TransactionProgress from "../../components/common/TransactionProgress";
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
  const [confirmation, setConfirmation] = useState(null);
  const [transactionStep, setTransactionStep] = useState("");

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

  const requestIssue = async (request) => {
    const file = files[request.id];
    if (!file) {
      toast.error("Select the exact certificate file for this request.");
      return;
    }
    try {
      const documentHash = await hashDocument(file);
      if (
        request.documentHash
        && request.documentHash.toLowerCase() !== documentHash.toLowerCase()
      ) {
        throw new Error("This processing request is locked to a different document hash.");
      }
      setConfirmation({ kind: "issue", request, documentHash });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const issue = async (request, documentHash) => {
    setBusyId(request.id);
    setTransactionStep("prepare");
    try {
      const prepared = await prepareIssuance(request.id, institutionId, documentHash);
      setTransactionStep("wallet");
      const transactionHash = await issueOnChain(documentHash, session.address);
      setTransactionStep("validate");
      await confirmIssuance(request.id, institutionId, prepared.attemptId, transactionHash);
      await load();
      toast.success("Certificate issued and receipt confirmed.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
      await load().catch(() => undefined);
    } finally {
      setBusyId("");
      setTransactionStep("");
    }
  };

  const reconcile = async (request) => {
    const transactionHash = transactionHashes[request.id]?.trim();
    if (!transactionHash) {
      toast.error("Enter the already-submitted Sepolia transaction hash.");
      return;
    }
    setBusyId(request.id);
    setTransactionStep("validate");
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
      setTransactionStep("");
    }
  };

  const reject = async (requestId) => {
    try {
      await rejectRequest(requestId, institutionId);
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Institution-scoped queue"
        title="Issue certificates"
        description="Select the exact local file, freeze its SHA-256 digest, and submit a hash-only Sepolia transaction."
        actions={session.issuerMemberships.length > 1 ? (
          <select
            value={institutionId}
            onChange={(event) => setInstitutionId(event.target.value)}
            className="rounded-lg border border-gray-300 p-3"
          >
            {session.issuerMemberships.map((institution) => (
              <option key={institution.id} value={institution.id}>{institution.name}</option>
            ))}
          </select>
        ) : null}
      />

      <div className="grid gap-4 sm:gap-5">
        {requests.map((request) => (
          <article key={request.id} className="app-panel p-5 sm:p-6">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div>
                <h2 className="text-xl font-semibold">{request.certificateType}</h2>
                <p className="text-sm text-gray-500">Private citizen request</p>
              </div>
              <Badge status={request.status} />
            </div>
            <dl className="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2">
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
                <div className="action-cluster">
                  <Button onClick={() => requestIssue(request)} loading={busyId === request.id}>
                    {request.status === "PROCESSING" ? "Resume same-hash issuance" : "Prepare and issue"}
                  </Button>
                  {request.status === "PENDING" && (
                    <Button
                      variant="danger"
                      onClick={() => setConfirmation({ kind: "reject", request })}
                    >
                      Reject
                    </Button>
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
          <div className="app-panel p-8 text-center text-gray-500 sm:p-10">
            No requests for this institution.
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={Boolean(confirmation)}
        title={confirmation?.kind === "reject" ? "Reject certificate request?" : "Issue certificate proof?"}
        message={
          confirmation?.kind === "reject"
            ? "This rejects the pending request for this institution. No blockchain transaction will be sent."
            : `Confirm the exact SHA-256 hash ${confirmation?.documentHash || ""}. Your wallet will submit this proof to Sepolia.`
        }
        confirmText={confirmation?.kind === "reject" ? "Reject request" : "Continue to wallet"}
        confirmVariant={confirmation?.kind === "reject" ? "danger" : "primary"}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          const next = confirmation;
          setConfirmation(null);
          if (next?.kind === "reject") {
            reject(next.request.id);
          } else if (next) {
            issue(next.request, next.documentHash);
          }
        }}
      />
      {transactionStep && (
        <TransactionProgress
          title="Issue certificate proof"
          currentStep={transactionStep}
          steps={[
            { id: "prepare", label: "Freeze request and document hash", detail: "The backend prevents concurrent or changed-hash issuance." },
            { id: "wallet", label: "Confirm in wallet and wait for Sepolia", detail: "Review the hash-only transaction in your wallet." },
            { id: "validate", label: "Validate receipt and final ACTIVE state", detail: "The backend independently checks the chain, sender, event, and status." },
          ]}
        />
      )}
    </DashboardLayout>
  );
}

export default IssueDocument;
