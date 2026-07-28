import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  FileKey2,
  Fingerprint,
  LockKeyhole,
  Network,
} from "lucide-react";

import { hashDocument } from "../../utils/hashDocument";
import { isValidDocumentHash } from "../../utils/validateHash";
import {
  ACCEPTED_DOCUMENT_TYPES,
  isAcceptedDocument,
} from "../../utils/verificationInput";

function displayDigest(digest) {
  if (!digest) return "Waiting for local input";
  return `${digest.slice(0, 14)}···${digest.slice(-10)}`;
}

function HeroVerifier({ onDigestChange }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [mode, setMode] = useState("hash");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDigest, setFileDigest] = useState("");
  const [hashInput, setHashInput] = useState("");
  const [digest, setDigest] = useState("");
  const [error, setError] = useState("");
  const [hashing, setHashing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const setReadyDigest = (nextDigest) => {
    setDigest(nextDigest);
    onDigestChange?.(nextDigest);
  };

  const processFile = async (file) => {
    setError("");
    setFileDigest("");
    setReadyDigest("");

    if (!isAcceptedDocument(file)) {
      setSelectedFile(null);
      setError("Choose a supported certificate file.");
      return;
    }

    setSelectedFile(file);
    setHashing(true);
    try {
      const nextDigest = await hashDocument(file);
      setFileDigest(nextDigest);
      setReadyDigest(nextDigest);
    } catch {
      setSelectedFile(null);
      setError("This file could not be hashed in the browser.");
    } finally {
      setHashing(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    if (nextMode === "hash") {
      setReadyDigest(isValidDocumentHash(hashInput.trim()) ? hashInput.trim() : "");
    } else {
      setReadyDigest(selectedFile ? fileDigest : "");
    }
  };

  const handleHashChange = (event) => {
    const nextValue = event.target.value;
    setHashInput(nextValue);
    setError("");
    setReadyDigest(isValidDocumentHash(nextValue.trim()) ? nextValue.trim() : "");
  };

  const handleContinue = () => {
    const documentHash = mode === "file" ? fileDigest : hashInput.trim();
    if (!isValidDocumentHash(documentHash)) {
      setError(
        mode === "file"
          ? "Choose a certificate and wait for local hashing to finish."
          : "Enter 0x followed by 64 hexadecimal characters.",
      );
      return;
    }

    navigate(`/verify/${documentHash}`, {
      state: {
        documentName: mode === "file" ? selectedFile?.name : "Entered hash",
        source: "landing",
      },
    });
  };

  return (
    <section
      className="proof-console relative z-30 mx-auto w-full max-w-5xl overflow-hidden border border-[var(--border-strong)] bg-[var(--surface)]"
      aria-label="Try the public verifier"
    >
      <div className="flex flex-col gap-4 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="mono-value text-[0.62rem] tracking-[0.16em] text-[var(--accent-strong)]">
            PROOF INPUT / LOCAL DEVICE
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Try the real verification path.
          </p>
        </div>
        <div
          className="grid grid-cols-2 border border-[var(--border)] bg-[var(--canvas)] p-1"
          role="tablist"
          aria-label="Proof input method"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "file"}
            onClick={() => changeMode("file")}
            className={`min-h-10 px-4 text-xs font-semibold transition ${
              mode === "file"
                ? "bg-[var(--accent)] text-[#090a0d]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Use file
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "hash"}
            onClick={() => changeMode("hash")}
            className={`min-h-10 px-4 text-xs font-semibold transition ${
              mode === "hash"
                ? "bg-[var(--accent)] text-[#090a0d]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            Paste hash
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr_.8fr]">
        <div className="relative border-b border-[var(--border)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <span className="mono-value text-[0.62rem] tracking-[0.15em] text-[var(--text-dim)]">
              01 / DOCUMENT
            </span>
            <FileKey2 size={17} className="text-[var(--accent-strong)]" />
          </div>

          {mode === "file" ? (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  processFile(event.dataTransfer.files[0]);
                }}
                className={`min-h-24 w-full border border-dashed px-4 text-left transition ${
                  dragging
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border-strong)] bg-[var(--canvas-soft)] hover:border-[var(--accent)]"
                }`}
                aria-label="Choose certificate file"
              >
                <span className="block truncate text-sm font-semibold">
                  {selectedFile?.name || "Drop or choose a certificate"}
                </span>
                <span className="mt-2 block text-xs leading-5 text-[var(--text-muted)]">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB · ${
                      hashing ? "Hashing locally…" : "Local fingerprint ready"
                    }`
                    : "PDF, Office, image, text, CSV, XLSX, or ZIP"}
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_DOCUMENT_TYPES}
                aria-label="Certificate file"
                className="sr-only"
                onChange={(event) => processFile(event.target.files[0])}
              />
            </>
          ) : (
            <label className="block">
              <span className="sr-only">SHA-256 document hash</span>
              <textarea
                value={hashInput}
                onChange={handleHashChange}
                onBlur={() => {
                  if (hashInput.trim() && !isValidDocumentHash(hashInput.trim())) {
                    setError("Enter 0x followed by 64 hexadecimal characters.");
                  }
                }}
                rows="3"
                placeholder="0x followed by 64 hexadecimal characters"
                spellCheck="false"
                autoComplete="off"
                className="mono-value min-h-24 w-full resize-none border border-[var(--border-strong)] bg-[var(--canvas-soft)] p-3 text-xs leading-5 outline-none transition focus:border-[var(--accent)]"
              />
            </label>
          )}
        </div>

        <div className="border-b border-[var(--border)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between">
            <span className="mono-value text-[0.62rem] tracking-[0.15em] text-[var(--text-dim)]">
              02 / SHA-256
            </span>
            <Fingerprint size={17} className="text-[var(--accent-strong)]" />
          </div>
          <div className="flex min-h-24 items-center border border-[var(--border)] bg-[var(--canvas-soft)] px-4">
            <p
              className={`mono-value break-all text-xs leading-5 ${
                digest ? "text-[var(--accent-strong)]" : "text-[var(--text-dim)]"
              }`}
              aria-live="polite"
            >
              {hashing ? "Calculating fingerprint…" : displayDigest(digest)}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="mono-value text-[0.62rem] tracking-[0.15em] text-[var(--text-dim)]">
                03 / REGISTRY
              </span>
              <Network size={17} className="text-[var(--accent-strong)]" />
            </div>
            <p className="text-sm font-semibold">Ethereum Sepolia</p>
            <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
              Public, read-only, and no wallet required.
            </p>
          </div>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!digest || hashing}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-between bg-[var(--accent)] px-4 text-sm font-semibold text-[#090a0d] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:bg-[var(--surface-hover)] disabled:text-[var(--text-dim)]"
          >
            Check this proof
            <ArrowRight size={17} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--border)] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="flex items-start gap-2 leading-5 text-[var(--text-muted)]">
          <LockKeyhole className="mt-0.5 shrink-0 text-[var(--accent-strong)]" size={13} />
          The original file stays on this device. Only its digest is checked.
        </p>
        {error && (
          <p role="alert" className="text-[var(--danger)]">{error}</p>
        )}
      </div>
    </section>
  );
}

export default HeroVerifier;
