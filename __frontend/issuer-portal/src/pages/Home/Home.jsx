import { FileCheck2, Landmark, ShieldCheck, Wallet } from "lucide-react";
import { Link } from "../../routing/Link";

function Home() {
  return (
    <div className="public-page">
      <header className="public-header">
        <Link to="/" className="brand">PramaanChain</Link>
        <nav>
          <Link to="/verify" className="text-link">Verify a certificate</Link>
          <Link to="/login" className="button button-primary">Connect wallet</Link>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Sepolia certificate proof registry</p>
            <h1>Verify certificate authenticity without exposing the document.</h1>
            <p className="hero-copy">
              PramaanChain anchors only a SHA-256 fingerprint and public blockchain
              metadata. Certificate files and private citizen assignments remain off-chain.
            </p>
            <div className="hero-actions">
              <Link to="/verify" className="button button-primary">Verify a file</Link>
              <Link to="/login" className="button button-secondary">Wallet sign in</Link>
            </div>
          </div>
          <div className="trust-card">
            <ShieldCheck size={42} />
            <h2>Three separate proofs</h2>
            <p><strong>Blockchain:</strong> certificate authenticity and status.</p>
            <p><strong>Private backend:</strong> citizen assignment.</p>
            <p><strong>Wallet signature:</strong> control of the assigned wallet.</p>
          </div>
        </section>
        <section className="feature-grid">
          <article><FileCheck2 /><h2>Public verification</h2><p>No wallet or ETH is needed to check a file.</p></article>
          <article><Landmark /><h2>Institution issuance</h2><p>Authorized issuers sign Sepolia transactions in their wallet.</p></article>
          <article><Wallet /><h2>Private assignment</h2><p>Citizen relationships are encrypted and never placed on-chain.</p></article>
        </section>
      </main>
    </div>
  );
}

export default Home;
