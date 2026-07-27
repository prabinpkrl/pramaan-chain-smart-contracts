import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { config } from "../../config";
import { apiErrorMessage } from "../../services/api";
import { verifyCertificate } from "../../services/certificateService";
import { hashFile } from "../../services/contractService";
import { Link } from "../../routing/Link";
import { useRouter } from "../../routing/useRouter";
import { formatDate, shortAddress, verificationUrl as buildVerificationUrl } from "../../utils/format";

const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

function Verify() {
  const { location } = useRouter();
  const params = new URLSearchParams(location.search);
  const [hash, setHash] = useState(params.get("hash") || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verificationUrl = useMemo(
    () => result ? buildVerificationUrl(config.publicAppUrl, result.documentHash) : "",
    [result],
  );

  const selectFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setHash(await hashFile(file));
    setResult(null);
    setError("");
  };

  const verify = async (event) => {
    event.preventDefault();
    if (!HASH_PATTERN.test(hash)) {
      setError("Use a local file or enter a 0x-prefixed 32-byte SHA-256 hash.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await verifyCertificate(hash.toLowerCase()));
    } catch (requestError) {
      setResult(null);
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-page">
      <header className="public-header">
        <Link to="/" className="brand">PramaanChain</Link>
        <Link to="/login" className="text-link">Wallet sign in</Link>
      </header>
      <main className="narrow-page">
        <p className="eyebrow">Public read-only check</p>
        <h1>Verify a certificate</h1>
        <p className="muted">
          The file is hashed in this browser and is never uploaded. Verification
          proves a matching certificate record, not the holder’s identity or ownership.
        </p>
        <form className="panel form-stack" onSubmit={verify}>
          <Input label="Certificate file" type="file" onChange={selectFile} />
          <Input
            label="SHA-256 document hash"
            value={hash}
            onChange={(event) => setHash(event.target.value.trim())}
            placeholder="0x…"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Checking Sepolia…" : "Verify"}
          </Button>
          {error && <p className="error-message" role="alert">{error}</p>}
        </form>
        {result && (
          <section className="panel result-panel" aria-live="polite">
            <div className="section-heading">
              <h2>Verification result</h2>
              <Badge status={result.status} />
            </div>
            <dl className="details-grid">
              <div><dt>Document hash</dt><dd className="mono">{result.documentHash}</dd></div>
              <div><dt>Issuer</dt><dd title={result.issuer}>{shortAddress(result.issuer)}</dd></div>
              <div><dt>Issued</dt><dd>{formatDate(result.issuedAt)}</dd></div>
              <div><dt>Revoked</dt><dd>{formatDate(result.revokedAt)}</dd></div>
            </dl>
            {result.status !== "NOT_FOUND" && (
              <>
                <a
                  className="text-link"
                  href={`${config.etherscanBaseUrl}/address/${config.contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View verified contract on Etherscan
                </a>
                <div className="qr-box">
                  <QRCode value={verificationUrl} size={148} />
                  <p>This QR contains only this public verification URL and document hash.</p>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default Verify;
