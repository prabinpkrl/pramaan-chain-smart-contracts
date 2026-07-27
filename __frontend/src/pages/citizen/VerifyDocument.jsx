import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/common/Button";
import EtherscanLink from "../../components/common/EtherscanLink";

import { hashDocument } from "../../utils/hashDocument";
import { verifyDocument } from "../../services/documentService";
import { addVerificationEntry } from "../../utils/verificationHistory";

const ACCEPTED_TYPES =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx,.zip";

function VerifyDocument() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null);
    setResult(null);
  };

  const handleVerify = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to verify.");
      return;
    }

    try {
      setLoading(true);

      const documentHash = await hashDocument(selectedFile);
      const response = await verifyDocument(documentHash);

      setResult({ ...response, documentName: selectedFile.name });

      addVerificationEntry({
        documentName: selectedFile.name,
        documentHash,
        status: response.status,
        issuer: response.issuer,
        transactionHash: response.transactionHash,
      });

      if (response.status === "ACTIVE") {
        toast.success("Document verified successfully.");
      } else {
        toast.error("This document was not found on the blockchain.");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Verify Document</h1>

      <div className="bg-white rounded-xl shadow p-8 max-w-3xl">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Upload Document
          </label>

          <div className="space-y-3">
            <input
              id="verificationFile"
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="hidden"
            />

            <label
              htmlFor="verificationFile"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white cursor-pointer hover:bg-blue-700 transition"
            >
              Select File
            </label>

            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
              {selectedFile ? (
                <>
                  <p className="font-medium text-gray-800">
                    📄 {selectedFile.name}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <p>No file selected</p>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Supported: PDF, DOC, DOCX, PNG, JPG, JPEG, TXT, CSV, XLSX, ZIP.
            </p>
          </div>
        </div>

        <Button onClick={handleVerify} loading={loading}>
          Verify Document
        </Button>

        {result && (
          <div className="border rounded-xl p-6 bg-gray-50 mt-8 space-y-5">
            {result.status === "ACTIVE" ? (
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle2 size={28} />
                <h2 className="text-xl font-semibold">Verified Document</h2>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-red-600">
                <XCircle size={28} />
                <h2 className="text-xl font-semibold">
                  {result.status === "REVOKED" ? "Revoked Document" : "Invalid Document"}
                </h2>
              </div>
            )}

            {result.status === "NOT_FOUND" ? (
              <p className="text-gray-600">
                Hash not found on the blockchain. This document was not
                issued through PramaanChain, or it has been altered since
                issuance.
              </p>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-500 mb-2">Document Name</p>
                  <p className="font-semibold">{result.documentName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Document Hash</p>

                  <div className="bg-white rounded-lg border p-3">
                    <p className="font-mono text-xs break-all">
                      {result.documentHash}
                    </p>

                    <Button
                      variant="secondary"
                      onClick={() => copyToClipboard(result.documentHash, "Document hash")}
                    >
                      Copy Hash
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-2">Issuer Address</p>

                  <div className="bg-white rounded-lg border p-3">
                    <p className="font-mono text-xs break-all">{result.issuer}</p>

                    <Button
                      variant="secondary"
                      onClick={() => copyToClipboard(result.issuer, "Issuer address")}
                    >
                      Copy Address
                    </Button>
                  </div>
                </div>

                <div>
                  <strong>Issued At:</strong>{" "}
                  {result.issuedAt
                    ? new Date(result.issuedAt * 1000).toLocaleString()
                    : "-"}
                </div>

                {result.status === "REVOKED" && result.revokedAt && (
                  <div>
                    <strong>Revoked At:</strong>{" "}
                    {new Date(result.revokedAt * 1000).toLocaleString()}
                  </div>
                )}

                {result.blockNumber && (
                  <div>
                    <strong>Block Number:</strong> {result.blockNumber}
                  </div>
                )}

                {result.transactionHash && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Transaction Hash</p>

                    <div className="bg-white rounded-lg border p-3">
                      <p className="font-mono text-xs break-all">
                        {result.transactionHash}
                      </p>

                      <div className="flex gap-3 mt-3">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            copyToClipboard(result.transactionHash, "Transaction hash")
                          }
                        >
                          Copy Hash
                        </Button>

                        <EtherscanLink txHash={result.transactionHash} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default VerifyDocument;
