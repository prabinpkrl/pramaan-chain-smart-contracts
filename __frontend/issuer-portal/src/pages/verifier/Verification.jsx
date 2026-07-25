import { useState } from "react";
import toast from "react-hot-toast";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import EtherscanLink from "../../components/common/EtherscanLink";

import { hashDocument } from "../../utils/hashDocument";
import { verifyCertificate } from "../../services/certificateService";

function Verification() {
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
    setSelectedFile(e.target.files[0]);
    setResult(null);
  };

  const handleVerify = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF.");
      return;
    }

    try {
      setLoading(true);

      const documentHash = await hashDocument(selectedFile);

      const response = await verifyCertificate(documentHash);

      setResult(response);

      toast.success("Certificate verified successfully.");
    } catch (error) {
      console.error(error);

      toast.error(error.response?.data?.error || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Verify Certificate</h1>

      <div className="bg-white rounded-xl shadow p-8 max-w-3xl">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Upload Certificate PDF
          </label>

          <div className="space-y-3">
            <input
              id="verificationFile"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <label
              htmlFor="verificationFile"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white cursor-pointer hover:bg-blue-700 transition"
            >
              Select PDF
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
          </div>
        </div>

        <Button onClick={handleVerify} loading={loading}>
          Verify Certificate
        </Button>

        {result && (
          <div className="border rounded-xl p-6 bg-gray-50 mt-8 space-y-5">
            <h2 className="text-xl font-semibold">Verification Result</h2>

            <div>
              <p className="text-sm text-gray-500 mb-2">Status</p>

              <Badge status={result.status} />
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Document Hash</p>

              <div className="bg-white rounded-lg border p-3">
                <p className="font-mono text-xs break-all">
                  {result.documentHash}
                </p>

                <Button
                  variant="secondary"
                  onClick={() =>
                    copyToClipboard(result.documentHash, "Document hash")
                  }
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
                  onClick={() =>
                    copyToClipboard(result.issuer, "Issuer address")
                  }
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
                        copyToClipboard(
                          result.transactionHash,
                          "Transaction hash",
                        )
                      }
                    >
                      Copy Hash
                    </Button>

                    <EtherscanLink txHash={result.transactionHash} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Verification;
