import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileCheck2 } from "lucide-react";

import Button from "../../components/common/Button";
import DashboardLayout from "../../components/layout/DashboardLayout";
import EtherscanLink from "../../components/common/EtherscanLink";

import { issueDocument } from "../../services/documentService";
import { hashDocument } from "../../utils/hashDocument";
import { isValidDocumentHash } from "../../utils/validateHash";

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx,.zip";

function IssueDocument() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please upload a document first.");
      return;
    }

    try {
      setLoading(true);

      const documentHash = await hashDocument(selectedFile);

      if (!isValidDocumentHash(documentHash)) {
        throw new Error("Generated document hash is invalid.");
      }

      const response = await issueDocument(documentHash);

      setResult({
        documentName: selectedFile.name,
        documentSize: selectedFile.size,
        documentHash,
        transactionHash: response.transactionHash,
        blockNumber: response.blockNumber,
        timestamp: response.issuedAt || Math.floor(Date.now() / 1000),
      });

      toast.success("Document issued successfully!");
    } catch (error) {
      console.error(error);

      toast.error(error.response?.data?.error?.message || "Document issuance failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Issue Document</h1>

      <div className="bg-white rounded-xl shadow p-8 max-w-3xl">
        {!result ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Upload Document
              </label>

              <div className="space-y-3">
                <input
                  id="documentFile"
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <label
                  htmlFor="documentFile"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white cursor-pointer hover:bg-blue-700 transition"
                >
                  <UploadCloud size={18} />
                  Select File
                </label>

                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
                  {selectedFile ? (
                    <div>
                      <p className="font-medium text-gray-800">
                        📄 {selectedFile.name}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <p>No file selected</p>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  Supported: PDF, DOC, DOCX, PNG, JPG, JPEG, TXT, CSV, XLSX,
                  ZIP — any file can be hashed and anchored on-chain.
                </p>
              </div>
            </div>

            {/* Workflow preview */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6 text-sm text-blue-800">
              <p className="font-semibold mb-2">What happens next</p>

              <ol className="list-decimal list-inside space-y-1">
                <li>Your browser generates a SHA-256 hash of the file.</li>
                <li>Only the hash — never the document — is sent to the server.</li>
                <li>Your wallet's authorization is used to submit the transaction.</li>
                <li>The hash is stored permanently on the Sepolia blockchain.</li>
              </ol>
            </div>

            <Button type="submit" loading={loading}>
              Issue Document
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-green-700">
              <FileCheck2 size={28} />
              <h2 className="text-xl font-semibold">Document Issued</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Document Name</p>
                <p className="font-semibold break-all">{result.documentName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Document Size</p>
                <p className="font-semibold">
                  {(result.documentSize / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-1">SHA-256 Hash</p>
                <p className="font-mono text-xs break-all bg-gray-100 p-3 rounded-lg">
                  {result.documentHash}
                </p>
              </div>

              {result.transactionHash && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Transaction Hash</p>
                  <p className="font-mono text-xs break-all bg-gray-100 p-3 rounded-lg">
                    {result.transactionHash}
                  </p>
                  <div className="mt-2">
                    <EtherscanLink txHash={result.transactionHash} />
                  </div>
                </div>
              )}

              {result.blockNumber && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Block Number</p>
                  <p className="font-semibold">{result.blockNumber}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Timestamp</p>
                <p className="font-semibold">
                  {new Date(result.timestamp * 1000).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4 border-t">
              <Button onClick={handleReset}>Issue Another Document</Button>
              <Button variant="secondary" onClick={() => navigate("/issuer/documents")}>
                View Document Registry
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default IssueDocument;
