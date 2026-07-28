import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router";
import { m } from "motion/react";
import {
  ArrowRight,
  Blocks,
  Building2,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  UserRound,
  Wallet,
} from "lucide-react";

import AnimatedGrid from "../../components/visual/AnimatedGrid";
import ProofFallback from "../../components/visual/ProofFallback";
import PublicHeader from "../../components/layout/PublicHeader";
import Brand from "../../components/brand/Brand";

const ProofCrystal = lazy(() => import("../../components/visual/ProofCrystal"));

const TRUST_ITEMS = [
  { icon: Fingerprint, label: "SHA-256", text: "Exact-file fingerprinting in your browser" },
  { icon: Blocks, label: "Sepolia", text: "Public Ethereum testnet proof registry" },
  { icon: LockKeyhole, label: "Private by design", text: "No certificate file or personal data on-chain" },
];

const STEPS = [
  {
    number: "01",
    title: "Hash locally",
    text: "The browser calculates the exact file’s SHA-256 digest. The original document never leaves the device.",
  },
  {
    number: "02",
    title: "Anchor the proof",
    text: "An authorized institution signs a transaction that stores only the digest and necessary blockchain metadata.",
  },
  {
    number: "03",
    title: "Verify anywhere",
    text: "Anyone can compare a file or known digest and read ACTIVE, REVOKED, or NOT_FOUND without a wallet.",
  },
];

const ACTORS = [
  {
    icon: FileCheck2,
    title: "Public verifier",
    text: "Check an exact document proof without an account, wallet, or transaction.",
    to: "/verify",
    action: "Verify a document",
  },
  {
    icon: Building2,
    title: "Institution issuer",
    text: "Review private requests and anchor approved certificate hashes with an authorized wallet.",
    to: "/login",
    action: "Open issuer portal",
  },
  {
    icon: UserRound,
    title: "Citizen",
    text: "Use wallet-based authentication to access proofs privately assigned by an institution.",
    to: "/login",
    action: "Open citizen portal",
  },
];

function Home() {
  const [use3d, setUse3d] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 900px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setUse3d(wide.matches && !reduced.matches && Boolean(window.WebGLRenderingContext));
    update();
    wide.addEventListener?.("change", update);
    reduced.addEventListener?.("change", update);
    return () => {
      wide.removeEventListener?.("change", update);
      reduced.removeEventListener?.("change", update);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--canvas)]">
      <PublicHeader />

      <main>
        <section className="relative isolate border-b border-[var(--border)]">
          <AnimatedGrid />
          <div className="relative mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:gap-16 lg:py-24">
            <m.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10"
            >
              <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--text)] sm:text-6xl lg:text-7xl">
                Proof you can verify.
                <span className="mt-2 block text-[var(--accent-strong)]">Privacy you can keep.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--text-muted)] sm:mt-7 sm:text-lg sm:leading-8">
                PramaanChain anchors certificate fingerprints on Ethereum while
                documents and personal information stay off-chain. Verify an exact
                proof publicly, or use a wallet to enter your secure workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row">
                <Link
                  to="/verify"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 font-semibold text-[#090a0d] transition hover:bg-[var(--accent-strong)]"
                >
                  <FileCheck2 size={19} />
                  Verify a document
                  <ArrowRight size={17} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-5 font-semibold text-[var(--text)] transition hover:bg-[var(--surface-hover)]"
                >
                  <Wallet size={19} />
                  Wallet sign-in
                </Link>
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative hidden h-[540px] lg:block"
            >
              <div className="absolute inset-10 rounded-full border border-[var(--border)]" />
              <div className="absolute inset-24 rounded-full border border-[var(--border)]" />
              {use3d ? (
                <Suspense fallback={<ProofFallback className="h-full w-full p-16" />}>
                  <ProofCrystal />
                </Suspense>
              ) : (
                <ProofFallback className="h-full w-full p-16" />
              )}
              <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--text-muted)] shadow-xl">
                <Fingerprint size={13} className="text-[var(--accent-strong)]" />
                Hash-only public proof
              </div>
            </m.div>
          </div>
        </section>

        <section className="border-b border-[var(--border)] bg-[var(--canvas-soft)]">
          <div className="mx-auto grid max-w-7xl divide-y divide-[var(--border)] px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0">
            {TRUST_ITEMS.map(({ icon: Icon, label, text }) => (
              <div key={label} className="flex gap-4 py-6 md:px-7 md:py-7 first:pl-0 last:pr-0">
                <div className="mt-0.5 h-fit rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--accent-strong)]">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              One exact file. One permanent proof.
            </h2>
            <p className="mt-5 text-[var(--text-muted)]">
              The verification path stays simple because the privacy boundary is strict.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 lg:mt-14 lg:grid-cols-3">
            {STEPS.map((step) => (
              <article
                key={step.number}
                className="app-panel relative overflow-hidden p-5 sm:p-7"
              >
                <span className="mono-value text-xs text-[var(--accent-strong)]">{step.number}</span>
                <h3 className="mt-8 text-xl font-semibold sm:mt-12">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--canvas-soft)]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
            <div className="text-center">
              <p className="eyebrow">Built for every side of the proof</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">
                One registry. Focused workspaces.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-3">
              {ACTORS.map(({ icon: Icon, title, text, to, action }) => (
                <Link
                  key={title}
                  to={to}
                  className="app-panel group p-5 transition hover:-translate-y-1 hover:border-[var(--border-strong)] sm:p-7"
                >
                  <div className="w-fit rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-[var(--accent-strong)]">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold sm:mt-8">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-muted)] lg:min-h-18">{text}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]">
                    {action}
                    <ArrowRight className="transition group-hover:translate-x-1" size={16} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
          <div className="app-panel-raised grid overflow-hidden lg:grid-cols-2">
            <div className="border-b border-[var(--border)] p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-12">
              <p className="eyebrow">What the chain proves</p>
              <ul className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                {[
                  "Whether an exact SHA-256 digest was issued",
                  "Which authorized issuer anchored the proof",
                  "Whether the certificate is active or permanently revoked",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-[var(--text-muted)]">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--success)]" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-5 sm:p-8 lg:p-12">
              <p className="eyebrow">What it never stores</p>
              <ul className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
                {[
                  "Certificate files, marks, or document contents",
                  "Citizen names, addresses, contact details, or identifiers",
                  "Proof that a person owns or controls a certificate",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-[var(--text-muted)]">
                    <LockKeyhole className="mt-0.5 shrink-0 text-[var(--accent-strong)]" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border)] bg-[var(--accent)] text-[#090a0d]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 sm:gap-8 sm:px-8 sm:py-16 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em]">Verify independently</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Check a certificate proof in seconds.
              </h2>
            </div>
            <Link
              to="/verify"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#090a0d] px-5 font-semibold text-white transition hover:bg-[#181b21]"
            >
              Open public verifier
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--canvas)]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-8 text-xs text-[var(--text-muted)] sm:px-8 md:flex-row md:items-center">
          <Brand compact />
          <p>Ethereum Sepolia prototype · No certificate files stored on-chain</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
