import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";

import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import PageHeader from "../../components/common/PageHeader";
import TransactionProgress from "../../components/common/TransactionProgress";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { config } from "../../config";
import { useAuth } from "../../context/useAuth";
import { apiErrorMessage } from "../../services/api";
import { revokeOnChain } from "../../services/contractService";
import {
  confirmRevocation,
  listIssuerCertificates,
  prepareRevocation,
} from "../../services/documentService";
import { formatDate, verificationUrl } from "../../utils/format";

function DocumentRegistry({ onlyRevoked = false }) {
  const { session } = useAuth();
  const [institutionId, setInstitutionId] = useState(session.issuerMemberships[0]?.id || "");
  const [certificates, setCertificates] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [pendingRevocation, setPendingRevocation] = useState(null);
  const [transactionStep, setTransactionStep] = useState("");

  const load = useCallback(async () => {
    if (!institutionId) return;
    setCertificates(await listIssuerCertificates(institutionId));
  }, [institutionId]);

  useEffect(() => {
    if (!institutionId) return;
    listIssuerCertificates(institutionId)
      .then(setCertificates)
      .catch((error) => toast.error(apiErrorMessage(error)));
  }, [institutionId]);

  const revoke = async (certificate) => {
    if (certificate.issuer.toLowerCase() !== session.address.toLowerCase()) return;
    setBusyId(certificate.id);
    setTransactionStep("prepare");
    try {
      const prepared = await prepareRevocation(certificate.id, institutionId);
      setTransactionStep("wallet");
      const transactionHash = await revokeOnChain(certificate.documentHash, session.address);
      setTransactionStep("validate");
      await confirmRevocation(
        certificate.id,
        institutionId,
        prepared.attemptId,
        transactionHash,
      );
      await load();
      toast.success("Certificate revoked and receipt confirmed.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
      await load().catch(() => undefined);
    } finally {
      setBusyId("");
      setTransactionStep("");
    }
  };

  const visible = onlyRevoked
    ? certificates.filter((certificate) => certificate.status === "REVOKED")
    : certificates;

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Private assignment plus public proof"
        title={onlyRevoked ? "Revoked certificates" : "Document registry"}
        description={onlyRevoked
          ? "Review permanently revoked proofs and their public verification links."
          : "Inspect issued proofs, share privacy-safe verification links, and revoke only with the original issuer wallet."}
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
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {visible.map((certificate) => {
          const originalIssuer =
            certificate.issuer.toLowerCase() === session.address.toLowerCase();
          const publicUrl = verificationUrl(config.publicAppUrl, certificate.documentHash);
          return (
            <article key={certificate.id} className="app-panel p-5 sm:p-6">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div>
                  <h2 className="text-xl font-semibold">{certificate.certificateType}</h2>
                  <p className="text-gray-500">{certificate.institutionName}</p>
                </div>
                <Badge status={certificate.status} />
              </div>
              <p className="mono-value mt-4 break-all rounded-xl border border-[var(--border)] bg-[var(--canvas-soft)] p-3 text-xs">
                {certificate.documentHash}
              </p>
              <p className="mt-3 text-sm text-gray-500">
                Issued {formatDate(certificate.issuedAt)}
              </p>
              {certificate.revokedAt && (
                <p className="text-sm text-gray-500">Revoked {formatDate(certificate.revokedAt)}</p>
              )}
              <div className="mt-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-5">
                <div className="rounded-xl bg-white p-2">
                  <QRCode value={publicUrl} size={104} bgColor="#ffffff" fgColor="#090a0d" />
                </div>
                <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
                  <a className="text-sm font-medium text-blue-700 hover:underline" href={publicUrl}>
                    Public verification
                  </a>
                  {certificate.status === "ACTIVE" && originalIssuer && (
                    <Button
                      variant="danger"
                      loading={busyId === certificate.id}
                      onClick={() => setPendingRevocation(certificate)}
                    >
                      Revoke with original wallet
                    </Button>
                  )}
                  {certificate.status === "ACTIVE" && !originalIssuer && (
                    <p className="max-w-xs text-right text-xs text-gray-500">
                      Only the exact original issuer wallet may revoke this proof.
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
        {visible.length === 0 && (
          <div className="app-panel p-8 text-center text-gray-500 sm:p-10">
            No {onlyRevoked ? "revoked " : ""}certificate proofs found.
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={Boolean(pendingRevocation)}
        title="Permanently revoke this proof?"
        message={`Revocation cannot be reversed. Your original issuer wallet will submit the hash ${pendingRevocation?.documentHash || ""} to Sepolia.`}
        confirmText="Continue to wallet"
        onCancel={() => setPendingRevocation(null)}
        onConfirm={() => {
          const certificate = pendingRevocation;
          setPendingRevocation(null);
          if (certificate) revoke(certificate);
        }}
      />
      {transactionStep && (
        <TransactionProgress
          title="Revoke certificate proof"
          currentStep={transactionStep}
          steps={[
            { id: "prepare", label: "Validate original issuer and reserve attempt", detail: "The backend checks current membership and immutable issuer ownership." },
            { id: "wallet", label: "Confirm permanent revocation in wallet", detail: "Wait for a successful Sepolia receipt." },
            { id: "validate", label: "Validate receipt and final REVOKED state", detail: "The backend checks the sender, event, hash, and permanent status." },
          ]}
        />
      )}
    </DashboardLayout>
  );
}

export default DocumentRegistry;
