import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import DocumentDetails from "../../components/document/DocumentDetails";

import { getDocuments } from "../../services/documentService";

function RevokedDocuments() {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [revokedDocuments, setRevokedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getDocuments({ status: "REVOKED" });

        if (mounted) {
          setRevokedDocuments(data.certificates || []);
        }
      } catch (error) {
        console.error("Failed to load revoked documents", error);

        if (mounted) {
          toast.error("Failed to load revoked documents.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredDocuments = revokedDocuments.filter(
    (document) =>
      document.documentHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.issuer?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <DashboardLayout>
        <h1 className="text-3xl font-bold mb-6">Revoked Documents</h1>

        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
          Loading revoked documents...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Revoked Documents</h1>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-600">
          Total Revoked Documents
        </h2>

        <p className="text-4xl font-bold text-red-600 mt-2">
          {revokedDocuments.length}
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          label="Search"
          placeholder="Search by document hash or issuer address"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-4 px-6">Document Hash</th>
              <th className="text-left px-6">Issuer</th>
              <th className="text-left px-6">Revocation Date</th>
              <th className="text-left px-6">Status</th>
              <th className="text-left px-6">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-500">
                  No revoked documents found.
                </td>
              </tr>
            ) : (
              filteredDocuments.map((document) => (
                <tr
                  key={document.documentHash}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {document.documentHash.slice(0, 18)}...
                      </span>

                      <button
                        onClick={() =>
                          copyToClipboard(document.documentHash, "Document hash")
                        }
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  </td>

                  <td className="px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {document.issuer.slice(0, 16)}...
                      </span>

                      <button
                        onClick={() => copyToClipboard(document.issuer, "Issuer address")}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  </td>

                  <td className="px-6">
                    {document.revokedAt
                      ? new Date(document.revokedAt * 1000).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="px-6">
                    <Badge status={document.status} />
                  </td>

                  <td className="px-6 py-3">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedDocument(document)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={selectedDocument !== null}
        onClose={() => setSelectedDocument(null)}
        title="Document Details"
      >
        <DocumentDetails
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      </Modal>
    </DashboardLayout>
  );
}

export default RevokedDocuments;
