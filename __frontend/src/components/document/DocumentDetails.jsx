import toast from "react-hot-toast";
import QRCode from "react-qr-code";

import Button from "../common/Button";
import Badge from "../common/Badge";
import EtherscanLink from "../common/EtherscanLink";
import { config } from "../../config";
import { verificationUrl } from "../../utils/format";

function DocumentDetails({ document, onClose }) {
  if (!document) return null;

  const copyToClipboard = async (text, label) => {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Document Information */}
      <div>
        <h2 className="text-lg font-bold border-b pb-2 mb-4">
          Document Information
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">SHA-256 Hash</p>

            <p className="font-mono text-xs break-all">{document.documentHash}</p>

            <button
              className="mt-2 text-xs text-blue-600 hover:underline"
              onClick={() => copyToClipboard(document.documentHash, "Document hash")}
            >
              Copy
            </button>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Status</p>

            <Badge status={document.status} />
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Issuer Address</p>

            <p className="font-mono text-xs break-all">{document.issuer}</p>

            <button
              className="mt-2 text-xs text-blue-600 hover:underline"
              onClick={() => copyToClipboard(document.issuer, "Issuer address")}
            >
              Copy
            </button>
          </div>

          <div>
            <p className="text-sm text-gray-500">Issue Timestamp</p>

            <p className="font-semibold">
              {document.issuedAt
                ? new Date(document.issuedAt * 1000).toLocaleString()
                : "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Revocation Timestamp</p>

            <p className="font-semibold">
              {document.revokedAt
                ? new Date(document.revokedAt * 1000).toLocaleString()
                : "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Block Number</p>

            <p className="font-semibold">{document.blockNumber || "-"}</p>
          </div>
        </div>
      </div>

      {/* Blockchain Information */}
      <div>
        <h2 className="text-lg font-bold border-b pb-2 mb-4">
          Blockchain Information
        </h2>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-500 mb-2">Transaction Hash</p>

            <div className="bg-gray-100 rounded-lg p-3">
              <p className="font-mono text-xs break-all">
                {document.transactionHash || "-"}
              </p>

              {document.transactionHash && (
                <>
                  <button
                    className="mt-2 text-xs text-blue-600 hover:underline"
                    onClick={() =>
                      copyToClipboard(document.transactionHash, "Transaction hash")
                    }
                  >
                    Copy
                  </button>

                  <div className="mt-3">
                    <EtherscanLink txHash={document.transactionHash} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-700 mb-3">Blockchain Status</h3>

            <ul className="space-y-2 text-sm">
              <li>✅ Hash stored on-chain</li>
              <li>✅ Block successfully confirmed</li>
              <li>✅ Immutable on-chain record</li>

              <li>
                {document.status === "ACTIVE"
                  ? "✅ Document Status: Active"
                  : "❌ Document Status: Revoked"}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div>
        <h2 className="text-lg font-bold border-b pb-2 mb-4">
          Document Verification QR Code
        </h2>

        <div className="flex justify-center">
          <div className="bg-white border rounded-xl p-4 shadow-sm">
            <QRCode
              value={verificationUrl(config.publicAppUrl, document.documentHash)}
              size={180}
            />
          </div>
        </div>

        <p className="text-sm text-center text-gray-500 mt-4">
          Scan this QR code to open the verification page for this document.
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-4 border-t pt-6">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export default DocumentDetails;
