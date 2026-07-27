import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";

import { config } from "../../config";
import { apiErrorMessage } from "../../services/api";
import { listCitizenCertificates } from "../../services/documentService";
import { formatDate, verificationUrl } from "../../utils/format";

function MyDocuments() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    listCitizenCertificates()
      .then(setDocuments)
      .catch((error) => toast.error(apiErrorMessage(error)));
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">My Documents</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
        These assignments come from the encrypted private database. The public
        blockchain proves the certificate hash but does not identify you.
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
          <p className="mb-4">No certificate has been assigned yet.</p>
          <Button onClick={() => navigate("/citizen/requests")}>
            View requests
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {documents.map((document) => (
            <article key={document.id} className="rounded-xl bg-white p-6 shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{document.certificateType}</h2>
                  <p className="text-gray-500">{document.institutionName}</p>
                </div>
                <Badge status={document.status} />
              </div>
              <p className="mt-4 break-all rounded bg-gray-50 p-3 font-mono text-xs">
                {document.documentHash}
              </p>
              <p className="mt-3 text-sm text-gray-500">Issued {formatDate(document.issuedAt)}</p>
              <div className="mt-5 flex items-end justify-between gap-4">
                <QRCode
                  value={verificationUrl(config.publicAppUrl, document.documentHash)}
                  size={104}
                />
                <a
                  className="text-sm font-medium text-blue-700 hover:underline"
                  href={verificationUrl(config.publicAppUrl, document.documentHash)}
                >
                  Open public verification
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export default MyDocuments;
