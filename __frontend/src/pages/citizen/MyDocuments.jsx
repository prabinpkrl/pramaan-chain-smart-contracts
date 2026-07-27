import { useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";

import { getVerificationHistory } from "../../utils/verificationHistory";

function MyDocuments() {
  const navigate = useNavigate();
  const [documents] = useState(() =>
    getVerificationHistory().filter((entry) => entry.status === "ACTIVE"),
  );

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">My Documents</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
        PramaanChain doesn't yet link documents to a citizen's wallet on the
        backend, so this list is built from documents you've successfully
        verified on this device — not a synced, wallet-owned registry.
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
          <p className="mb-4">You haven't verified any documents yet.</p>
          <Button onClick={() => navigate("/citizen/verify")}>
            Verify a Document
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-4 px-6">Document Name</th>
                <th className="text-left px-6">Document Hash</th>
                <th className="text-left px-6">Issuer</th>
                <th className="text-left px-6">Status</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((document, index) => (
                <tr key={`${document.documentHash}-${index}`} className="border-b">
                  <td className="px-6 py-4">{document.documentName}</td>
                  <td className="px-6 font-mono text-xs">
                    {document.documentHash?.slice(0, 20)}...
                  </td>
                  <td className="px-6 font-mono text-xs">
                    {document.issuer?.slice(0, 16)}...
                  </td>
                  <td className="px-6">
                    <Badge status="Active" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}

export default MyDocuments;
