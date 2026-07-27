import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle } from "lucide-react";

import Button from "../../components/common/Button";
import EtherscanLink from "../../components/common/EtherscanLink";
import { apiErrorMessage } from "../../services/api";
import { verifyDocument } from "../../services/documentService";
import { hashDocument } from "../../utils/hashDocument";
import { addVerificationEntry } from "../../utils/verificationHistory";
import { isValidDocumentHash } from "../../utils/validateHash";

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv,.xlsx,.zip";

function VerifyDocument() {
  const { documentHash: routeHash } = useParams();
  const navigate = useNavigate();
  const [hashInput, setHashInput] = useState(routeHash || "");
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(
    Boolean(routeHash && isValidDocumentHash(routeHash)),
  );

  const verifyHash = useCallback(async (documentHash, documentName = "Shared proof") => {
    if (!isValidDocumentHash(documentHash)) {
      toast.error("The verification link contains an invalid document hash.");
      return;
    }
    setLoading(true);
    try {
      const response = await verifyDocument(documentHash);
      setResult({ ...response, documentHash, documentName });
      addVerificationEntry({
        documentName,
        documentHash,
        status: response.status,
        issuer: response.issuer,
        transactionHash: response.transactionHash,
      });
      if (response.status === "ACTIVE") toast.success("Certificate is active.");
      else if (response.status === "REVOKED") toast.error("Certificate is revoked.");
      else toast.error("Certificate hash was not found.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!routeHash) return;
    if (!isValidDocumentHash(routeHash)) {
      toast.error("The verification link contains an invalid document hash.");
      return;
    }
    verifyDocument(routeHash)
      .then((response) => {
        setResult({
          ...response,
          documentHash: routeHash,
          documentName: "Shared proof",
        });
        addVerificationEntry({
          documentName: "Shared proof",
          documentHash: routeHash,
          status: response.status,
          issuer: response.issuer,
          transactionHash: response.transactionHash,
        });
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [routeHash]);

  const handleVerifyFile = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to verify.");
      return;
    }
    await verifyHash(await hashDocument(selectedFile), selectedFile.name);
  };

  const handleVerifyHash = async (event) => {
    event.preventDefault();
    const documentHash = hashInput.trim();
    if (!isValidDocumentHash(documentHash)) {
      toast.error("Enter a 0x-prefixed 32-byte document hash.");
      return;
    }
    setResult(null);
    if (routeHash?.toLowerCase() === documentHash.toLowerCase()) {
      await verifyHash(documentHash, "Entered hash");
      return;
    }
    navigate(`/verify/${documentHash}`);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <Link to="/" className="text-2xl font-bold text-blue-700">PramaanChain</Link>
        <Link to="/login" className="font-medium text-blue-700 hover:underline">
          Wallet sign-in
        </Link>
      </header>
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="mb-2 text-3xl font-bold">Public Certificate Verifier</h1>
        <p className="mb-6 text-gray-600">
          No wallet or login is required. Enter an existing SHA-256 hash, or
          select a file to hash locally. Files are never uploaded.
        </p>

        <div className="rounded-xl bg-white p-8 shadow">
          <form onSubmit={handleVerifyHash}>
            <label htmlFor="verificationHash" className="mb-2 block text-sm font-medium">
              Document hash
            </label>
            <input
              id="verificationHash"
              type="text"
              value={hashInput}
              onChange={(event) => {
                setHashInput(event.target.value);
                setResult(null);
              }}
              placeholder="0x followed by 64 hexadecimal characters"
              spellCheck="false"
              autoComplete="off"
              className="block w-full rounded-lg border border-gray-300 p-3 font-mono text-sm"
            />
            <p className="mb-4 mt-2 text-xs text-gray-500">
              Paste the exact 32-byte SHA-256 digest recorded on PramaanChain.
            </p>
            <Button type="submit" loading={loading}>Verify hash</Button>
          </form>

          <div className="my-8 flex items-center gap-4 text-sm text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            OR VERIFY THE ORIGINAL FILE
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <label htmlFor="verificationFile" className="mb-2 block text-sm font-medium">
            Upload document
          </label>
          <input
            id="verificationFile"
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(event) => {
              setSelectedFile(event.target.files[0] || null);
              setResult(null);
            }}
            className="block w-full rounded-lg border border-gray-300 p-3"
          />
          <p className="mb-4 mt-2 text-xs text-gray-500">
            {selectedFile
              ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
              : "Select the original file to calculate its SHA-256 digest locally."}
          </p>
          <Button onClick={handleVerifyFile} loading={loading}>Verify document</Button>

          {routeHash && loading && (
            <p className="text-gray-600">Checking the shared certificate hash…</p>
          )}

          {result && (
            <section className="mt-8 space-y-5 rounded-xl border bg-gray-50 p-6">
              <div className={`flex items-center gap-3 ${
                result.status === "ACTIVE" ? "text-green-700" : "text-red-700"
              }`}>
                {result.status === "ACTIVE" ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                <h2 className="text-xl font-semibold">
                  {result.status === "ACTIVE"
                    ? "Active certificate"
                    : result.status === "REVOKED"
                      ? "Revoked certificate"
                      : "Certificate not found"}
                </h2>
              </div>

              {result.status === "NOT_FOUND" ? (
                <p className="text-gray-600">
                  The hash is not anchored in PramaanChain. The file may be
                  unissued or changed since issuance.
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Document hash</p>
                    <p className="break-all rounded bg-white p-3 font-mono text-xs">
                      {result.documentHash}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Issuer</p>
                    <p className="break-all font-mono text-xs">{result.issuer}</p>
                  </div>
                  <p><strong>Issued:</strong>{" "}
                    {result.issuedAt ? new Date(result.issuedAt * 1000).toLocaleString() : "-"}
                  </p>
                  {result.status === "REVOKED" && (
                    <p><strong>Revoked:</strong>{" "}
                      {result.revokedAt ? new Date(result.revokedAt * 1000).toLocaleString() : "-"}
                    </p>
                  )}
                  {result.transactionHash && <EtherscanLink txHash={result.transactionHash} />}
                </>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default VerifyDocument;
