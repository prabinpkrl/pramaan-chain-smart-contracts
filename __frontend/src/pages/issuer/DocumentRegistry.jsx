import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";

import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
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
      toast.success("Certificate revoked and receipt confirmed.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
      await load().catch(() => undefined);
    } finally {
      setBusyId("");
    }
  };

  const visible = onlyRevoked
    ? certificates.filter((certificate) => certificate.status === "REVOKED")
    : certificates;

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Private assignment plus public proof
          </p>
          <h1 className="text-3xl font-bold">
            {onlyRevoked ? "Revoked Certificates" : "Document Registry"}
          </h1>
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
      <div className="grid gap-5 lg:grid-cols-2">
        {visible.map((certificate) => {
          const originalIssuer =
            certificate.issuer.toLowerCase() === session.address.toLowerCase();
          const publicUrl = verificationUrl(config.publicAppUrl, certificate.documentHash);
          return (
            <article key={certificate.id} className="rounded-xl bg-white p-6 shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{certificate.certificateType}</h2>
                  <p className="text-gray-500">{certificate.institutionName}</p>
                </div>
                <Badge status={certificate.status} />
              </div>
              <p className="mt-4 break-all rounded bg-gray-50 p-3 font-mono text-xs">
                {certificate.documentHash}
              </p>
              <p className="mt-3 text-sm text-gray-500">
                Issued {formatDate(certificate.issuedAt)}
              </p>
              {certificate.revokedAt && (
                <p className="text-sm text-gray-500">Revoked {formatDate(certificate.revokedAt)}</p>
              )}
              <div className="mt-5 flex items-end justify-between gap-4">
                <QRCode value={publicUrl} size={104} />
                <div className="flex flex-col items-end gap-3">
                  <a className="text-sm font-medium text-blue-700 hover:underline" href={publicUrl}>
                    Public verification
                  </a>
                  {certificate.status === "ACTIVE" && originalIssuer && (
                    <Button
                      variant="danger"
                      loading={busyId === certificate.id}
                      onClick={() => revoke(certificate)}
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
          <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow">
            No {onlyRevoked ? "revoked " : ""}certificate proofs found.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DocumentRegistry;
