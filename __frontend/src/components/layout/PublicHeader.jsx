import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import Brand from "../brand/Brand";
import { config } from "../../config";

function PublicHeader({ showSignIn = true }) {
  return (
    <header className="relative z-30 border-b border-[var(--border)] bg-[var(--canvas)]/95">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Brand hideNameOnSmall />
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Public navigation">
          <a
            className="hidden items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)] md:inline-flex"
            href={`${config.etherscanBaseUrl}/address/${config.contractAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="mono-value text-[var(--accent-strong)]">ETH</span>
            Sepolia
            <ExternalLink size={12} />
          </a>
          <Link
            to="/verify"
            className="inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]"
          >
            Verify
          </Link>
          {showSignIn && (
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#090a0d] transition hover:bg-[var(--accent-strong)]"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default PublicHeader;
