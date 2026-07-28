import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  FileKey2,
  FileUp,
  Fingerprint,
  LockKeyhole,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import Button from "../../components/common/Button";
import EtherscanLink from "../../components/common/EtherscanLink";
import PublicHeader from "../../components/layout/PublicHeader";
import { apiErrorMessage } from "../../services/api";
import { verifyDocument } from "../../services/documentService";
import { hashDocument } from "../../utils/hashDocument";
import { addVerificationEntry } from "../../utils/verificationHistory";
import { isValidDocumentHash } from "../../utils/validateHash";
import { ACCEPTED_DOCUMENT_TYPES } from "../../utils/verificationInput";

function VerifyDocument() {
  const { documentHash: routeHash } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const routeDocumentName = location.state?.documentName || "Shared proof";
  const [hashInput, setHashInput] = useState(routeHash || "");
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState(routeHash ? "hash" : "file");
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
          documentName: routeDocumentName,
        });
        addVerificationEntry({
          documentName: routeDocumentName,
          documentHash: routeHash,
          status: response.status,
          issuer: response.issuer,
          transactionHash: response.transactionHash,
        });
      })
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [routeDocumentName, routeHash]);

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
    <div className="min-h-screen bg-[var(--canvas)]">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-16">
        <div className="mb-8 grid gap-5 sm:mb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="eyebrow">Public · Read-only · No wallet</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:mt-4 sm:text-5xl">
              Verify an exact certificate proof.
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--text-muted)]">
            <span className="mono-value text-[var(--accent-strong)]">ETH</span>
            Ethereum Sepolia
          </div>
        </div>

        <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <section className="app-panel-raised p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--canvas-soft)] p-1.5" role="tablist" aria-label="Verification method">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "file"}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
                  mode === "file"
                    ? "bg-[var(--surface-hover)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                onClick={() => setMode("file")}
              >
                <FileUp size={17} />
                Original file
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "hash"}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
                  mode === "hash"
                    ? "bg-[var(--surface-hover)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
                onClick={() => setMode("hash")}
              >
                <Fingerprint size={17} />
                Document hash
              </button>
            </div>

            {mode === "hash" ? (
              <form onSubmit={handleVerifyHash} className="mt-7">
                <label htmlFor="verificationHash" className="mb-2 block text-sm font-medium">
                  SHA-256 document hash
                </label>
                <textarea
                  id="verificationHash"
                  rows="3"
                  value={hashInput}
                  onChange={(event) => {
                    setHashInput(event.target.value);
                    setResult(null);
                  }}
                  placeholder="0x followed by 64 hexadecimal characters"
                  spellCheck="false"
                  autoComplete="off"
                  className="mono-value block w-full resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--canvas-soft)] p-4 text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <p className="mb-5 mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  Paste the exact 32-byte digest recorded by the issuer.
                </p>
                <Button type="submit" loading={loading} fullWidth size="lg">
                  <Search size={18} />
                  Verify hash
                </Button>
              </form>
            ) : (
              <div className="mt-7">
                <label
                  htmlFor="verificationFile"
                  className="group flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--canvas-soft)] p-6 text-center transition hover:border-[var(--accent)]"
                >
                  <span className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--accent-strong)]">
                    <FileKey2 size={24} />
                  </span>
                  <span className="font-semibold">
                    {selectedFile ? selectedFile.name : "Choose the original certificate file"}
                  </span>
                  <span className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB · Ready to hash locally`
                      : "PDF, Office documents, images, text, CSV, XLSX, or ZIP"}
                  </span>
                </label>
                <input
                  id="verificationFile"
                  type="file"
                  accept={ACCEPTED_DOCUMENT_TYPES}
                  onChange={(event) => {
                    setSelectedFile(event.target.files[0] || null);
                    setResult(null);
                  }}
                  className="sr-only"
                />
                <div className="mb-5 mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--text-muted)]">
                  <LockKeyhole className="mt-0.5 shrink-0 text-[var(--success)]" size={14} />
                  Hashing happens on this device. PramaanChain receives only the digest.
                </div>
                <Button onClick={handleVerifyFile} loading={loading} fullWidth size="lg">
                  <ShieldCheck size={18} />
                  Verify document
                </Button>
              </div>
            )}

            {routeHash && loading && (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]" role="status">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />
                Checking the shared certificate hash…
              </div>
            )}
          </section>

          <aside className="app-panel min-h-[430px] p-5 sm:p-7" aria-live="polite">
            {!result ? (
              <div className="grid h-full min-h-96 place-items-center text-center">
                <div>
                  <div className="mx-auto mb-5 w-fit rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-[var(--text-dim)]">
                    <ShieldCheck size={32} />
                  </div>
                  <h2 className="text-lg font-semibold">Verification result</h2>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--text-muted)]">
                    Select a file or enter its exact digest to query the public proof registry.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div
                  className={`rounded-xl border p-5 ${
                    result.status === "ACTIVE"
                      ? "border-[#1e5848] bg-[var(--success-soft)] text-[var(--success)]"
                      : result.status === "REVOKED"
                        ? "border-[#71303c] bg-[var(--danger-soft)] text-[var(--danger)]"
                        : "border-[#66521e] bg-[var(--warning-soft)] text-[var(--warning)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.status === "ACTIVE" ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em]">Registry status</p>
                      <h2 className="mt-1 text-xl font-semibold">
                        {result.status === "ACTIVE"
                          ? "Active certificate"
                          : result.status === "REVOKED"
                            ? "Revoked certificate"
                            : "Certificate not found"}
                      </h2>
                    </div>
                  </div>
                </div>

                {result.status === "NOT_FOUND" ? (
                  <p className="mt-6 text-sm leading-6 text-[var(--text-muted)]">
                    This hash is not anchored in PramaanChain. The file may be
                    unissued or changed since issuance.
                  </p>
                ) : (
                  <dl className="mt-6 space-y-5">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-dim)]">Document hash</dt>
                      <dd className="mono-value mt-2 break-all rounded-xl border border-[var(--border)] bg-[var(--canvas-soft)] p-3 text-xs leading-5">
                        {result.documentHash}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--text-dim)]">Issuer</dt>
                      <dd className="mono-value mt-2 break-all text-xs leading-5">{result.issuer}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-xs text-[var(--text-dim)]">Issued</dt>
                        <dd className="mt-1 text-sm">
                          {result.issuedAt ? new Date(result.issuedAt * 1000).toLocaleString() : "-"}
                        </dd>
                      </div>
                      {result.status === "REVOKED" && (
                        <div>
                          <dt className="text-xs text-[var(--text-dim)]">Revoked</dt>
                          <dd className="mt-1 text-sm">
                            {result.revokedAt ? new Date(result.revokedAt * 1000).toLocaleString() : "-"}
                          </dd>
                        </div>
                      )}
                    </div>
                    {result.transactionHash && (
                      <div className="border-t border-[var(--border)] pt-5">
                        <EtherscanLink txHash={result.transactionHash} />
                      </div>
                    )}
                  </dl>
                )}
              </div>
            )}
          </aside>
        </div>

        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
          {[
            ["Exact-match proof", "Changing one byte produces a different digest."],
            ["No identity claim", "A valid hash does not prove who owns the document."],
            ["Read-only check", "Verification sends no transaction and costs no ETH."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default VerifyDocument;
