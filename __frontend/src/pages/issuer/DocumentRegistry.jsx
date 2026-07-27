import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import ConfirmModal from "../../components/common/ConfirmModal";
import Modal from "../../components/common/Modal";
import DocumentDetails from "../../components/document/DocumentDetails";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import DashboardLayout from "../../components/layout/DashboardLayout";

import { getDocuments, revokeDocument } from "../../services/documentService";

function DocumentRegistry() {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentToRevoke, setDocumentToRevoke] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const fetchDocuments = async () => {
    const data = await getDocuments();
    setDocuments(data.certificates || []);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getDocuments();

        if (mounted) {
          setDocuments(data.certificates || []);
        }
      } catch (error) {
        console.error("Failed to load documents", error);

        if (mounted) {
          toast.error("Failed to load documents.");
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

  const handleRevoke = async () => {
    if (!documentToRevoke) return;

    try {
      await revokeDocument(documentToRevoke.documentHash);

      toast.success("Document revoked successfully.");

      await fetchDocuments();
    } catch (error) {
      console.error(error);

      toast.error(error.response?.data?.error?.message || "Failed to revoke document.");
    } finally {
      setDocumentToRevoke(null);
    }
  };

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch =
      document.documentHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.issuer?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      document.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <h1 className="text-3xl font-bold mb-6">Document Registry</h1>

        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
          Loading documents...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Document Registry</h1>

      {/* Search + Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            label="Search"
            placeholder="Search by document hash or issuer address"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-52">
          <label className="block text-sm font-medium mb-2">Status</label>

          <select
            className="w-full border rounded-lg px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>ACTIVE</option>
            <option>REVOKED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-4 px-6">Document Hash</th>
              <th className="text-left px-6">Issuer</th>
              <th className="text-left px-6">Issue Date</th>
              <th className="text-left px-6">Status</th>
              <th className="text-left px-6">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-500">
                  No documents found.
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
                    {document.issuedAt
                      ? new Date(document.issuedAt * 1000).toLocaleDateString()
                      : "-"}
                  </td>

                  <td className="px-6">
                    <Badge status={document.status} />
                  </td>

                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedDocument(document)}
                      >
                        View
                      </Button>

                      {document.status === "ACTIVE" && (
                        <Button
                          variant="danger"
                          onClick={() => setDocumentToRevoke(document)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={documentToRevoke !== null}
        title="Revoke Document"
        message="This action cannot be undone. Are you sure you want to revoke this document?"
        confirmText="Revoke"
        cancelText="Cancel"
        onConfirm={handleRevoke}
        onCancel={() => setDocumentToRevoke(null)}
      />

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

export default DocumentRegistry;
