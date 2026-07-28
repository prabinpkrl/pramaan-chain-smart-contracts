import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router";
import { m } from "motion/react";
import {
  ArrowRight,
  Blocks,
  Building2,
  FileCheck2,
  FileKey2,
  Fingerprint,
  LockKeyhole,
  UserRound,
  Wallet,
} from "lucide-react";

import PublicHeader from "../../components/layout/PublicHeader";
import Brand from "../../components/brand/Brand";
import ProofChamberFallback from "../../components/visual/ProofChamberFallback";
import HeroVerifier from "./HeroVerifier";

const ProofChamber = lazy(() => import("../../components/visual/ProofChamber"));

const PROOF_STAGES = [
  {
    number: "01",
    icon: FileKey2,
    title: "The original stays local.",
    text: "Your browser reads the exact file bytes. The certificate is never uploaded to PramaanChain or written to Ethereum.",
    signal: "LOCAL / FILE.BYTES",
  },
  {
    number: "02",
    icon: Fingerprint,
    title: "The bytes become a fingerprint.",
    text: "SHA-256 converts the file into one deterministic 32-byte digest. Change one byte and the fingerprint changes.",
    signal: "0x 64 HEX CHARACTERS",
  },
  {
    number: "03",
    icon: Blocks,
    title: "Ethereum answers with status.",
    text: "The public registry identifies the issuer and returns ACTIVE, REVOKED, or NOT_FOUND without requiring a wallet or transaction.",
    signal: "SEPOLIA / READ ONLY",
  },
];

const PUBLIC_FACTS = [
  ["Document digest", "The exact SHA-256 fingerprint"],
  ["Issuer address", "The institution wallet that anchored it"],
  ["Proof status", "Active, revoked, or not found"],
  ["Timestamps", "Issuance and permanent revocation"],
];

const PRIVATE_FACTS = [
  ["Certificate file", "Document contents and marks"],
  ["Citizen identity", "Names, addresses, and identifiers"],
  ["Private assignment", "Which citizen can access a proof"],
  ["Wallet relationship", "Institution and citizen records"],
];

const ACTORS = [
  {
    number: "01",
    icon: FileCheck2,
    title: "Verify a proof",
    text: "Compare an exact document against the public Ethereum registry. No account, wallet, or gas.",
    to: "/verify",
    action: "Open public verifier",
  },
  {
    number: "02",
    icon: Building2,
    title: "Issue from an institution",
    text: "Review private requests and anchor approved certificate fingerprints with an authorized wallet.",
    to: "/login",
    action: "Enter issuer workspace",
  },
  {
    number: "03",
    icon: UserRound,
    title: "Access as a citizen",
    text: "Sign in with a wallet to view proofs privately assigned by a connected institution.",
    to: "/login",
    action: "Enter citizen workspace",
  },
];

function Home() {
  const [use3d, setUse3d] = useState(false);
  const [heroDigest, setHeroDigest] = useState("");

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setUse3d(
        wide.matches
        && !reduced.matches
        && Boolean(window.WebGLRenderingContext),
      );
    };
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
        <section className="proof-hero relative isolate overflow-hidden border-b border-[var(--border)]">
          <div className="proof-hero-rule proof-hero-rule-left" aria-hidden="true" />
          <div className="proof-hero-rule proof-hero-rule-right" aria-hidden="true" />

          <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-[92rem] flex-col px-5 pb-10 pt-14 sm:px-8 sm:pb-14 sm:pt-18 lg:px-10 lg:pt-20">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-20 mx-auto max-w-6xl text-center"
            >
              <p className="eyebrow">Ethereum certificate proofs</p>
              <h1 className="mt-5 text-[clamp(3.25rem,8vw,7.9rem)] font-semibold leading-[0.88] tracking-[-0.075em]">
                <span className="block">The document</span>
                <span className="block">stays with you.</span>
                <span className="mt-3 block text-[var(--accent-strong)] sm:mt-5">
                  The proof lives on Ethereum.
                </span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:mt-9 sm:text-lg sm:leading-8">
                Turn exact certificate bytes into a public, verifiable fingerprint
                without publishing the certificate or the person behind it.
              </p>
            </m.div>

            <div className="relative mx-auto -mb-8 -mt-1 h-[280px] w-full max-w-6xl sm:-mb-12 sm:h-[390px] lg:-mb-16 lg:-mt-12 lg:h-[500px]">
              <p className="proof-annotation left-0 top-1/2 hidden -translate-y-1/2 lg:block">
                INPUT<br />
                <span>RAW BYTES / LOCAL ONLY</span>
              </p>
              <p className="proof-annotation right-0 top-1/2 hidden -translate-y-1/2 text-right lg:block">
                OUTPUT<br />
                <span>32-BYTE PUBLIC DIGEST</span>
              </p>

              {use3d ? (
                <Suspense
                  fallback={(
                    <ProofChamberFallback
                      digest={heroDigest}
                      className="h-full w-full"
                    />
                  )}
                >
                  <ProofChamber digest={heroDigest} />
                </Suspense>
              ) : (
                <ProofChamberFallback
                  digest={heroDigest}
                  className="h-full w-full"
                />
              )}

              <div className="absolute bottom-8 left-1/2 hidden w-40 -translate-x-1/2 border-t border-[var(--accent)] pt-2 text-center lg:block">
                <p className="mono-value text-[0.58rem] tracking-[0.15em] text-[var(--text-muted)]">
                  PRAMAANCHAIN / SEPOLIA
                </p>
              </div>
            </div>

            <HeroVerifier onDigestChange={setHeroDigest} />
          </div>
        </section>

        <section id="protocol" className="border-b border-[var(--border)]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
            <div className="grid gap-8 border-b border-[var(--border)] pb-10 sm:pb-14 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
              <div>
                <p className="eyebrow">The proof path</p>
                <p className="mono-value mt-4 text-sm text-[var(--text-dim)]">01 — 03</p>
              </div>
              <h2 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">
                Verification is a sequence, not a promise.
              </h2>
            </div>

            <ol>
              {PROOF_STAGES.map(({ number, icon: Icon, title, text, signal }) => (
                <li
                  key={number}
                  className="grid gap-5 border-b border-[var(--border)] py-8 sm:py-10 lg:grid-cols-[.35fr_.85fr_1.3fr] lg:items-center lg:gap-10 lg:py-14"
                >
                  <div className="flex items-center gap-4">
                    <span className="mono-value text-xs text-[var(--accent-strong)]">{number}</span>
                    <Icon size={22} className="text-[var(--accent-strong)]" />
                  </div>
                  <div>
                    <p className="mono-value text-[0.62rem] tracking-[0.14em] text-[var(--text-dim)]">
                      {signal}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em]">{title}</h3>
                  </div>
                  <p className="max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
                    {text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-b border-[var(--border)] bg-[var(--canvas-soft)]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <p className="eyebrow">The privacy boundary</p>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
                Public proof.
                <span className="block text-[var(--accent-strong)]">Private person.</span>
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
                Ethereum authenticates the fingerprint. The private application
                controls who can access the certificate relationship.
              </p>
            </div>

            <div className="mt-12 grid border-y border-[var(--border)] sm:mt-16 lg:grid-cols-2">
              <div className="border-b border-[var(--border)] lg:border-b-0 lg:border-r">
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-5 sm:px-7">
                  <Fingerprint size={19} className="text-[var(--accent-strong)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.13em]">
                    Public on Ethereum
                  </h3>
                </div>
                <dl>
                  {PUBLIC_FACTS.map(([term, definition]) => (
                    <div
                      key={term}
                      className="grid gap-1 border-b border-[var(--border)] px-4 py-5 last:border-b-0 sm:grid-cols-[.75fr_1.25fr] sm:gap-6 sm:px-7"
                    >
                      <dt className="text-sm font-semibold">{term}</dt>
                      <dd className="text-sm leading-6 text-[var(--text-muted)]">{definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-5 sm:px-7">
                  <LockKeyhole size={19} className="text-[var(--accent-strong)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.13em]">
                    Private off-chain
                  </h3>
                </div>
                <dl>
                  {PRIVATE_FACTS.map(([term, definition]) => (
                    <div
                      key={term}
                      className="grid gap-1 border-b border-[var(--border)] px-4 py-5 last:border-b-0 sm:grid-cols-[.75fr_1.25fr] sm:gap-6 sm:px-7"
                    >
                      <dt className="text-sm font-semibold">{term}</dt>
                      <dd className="text-sm leading-6 text-[var(--text-muted)]">{definition}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
            <div className="grid gap-6 pb-10 sm:pb-14 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
              <p className="eyebrow">One registry · Three entrances</p>
              <h2 className="text-4xl font-semibold tracking-[-0.05em] sm:text-6xl">
                Enter where you belong.
              </h2>
            </div>

            <div className="border-t border-[var(--border)]">
              {ACTORS.map(({ number, icon: Icon, title, text, to, action }) => (
                <Link
                  key={title}
                  to={to}
                  className="group grid gap-5 border-b border-[var(--border)] py-7 transition hover:bg-[var(--canvas-soft)] sm:px-4 sm:py-9 lg:grid-cols-[.25fr_.65fr_1.05fr_.45fr] lg:items-center lg:gap-8"
                >
                  <div className="flex items-center gap-4">
                    <span className="mono-value text-xs text-[var(--text-dim)]">{number}</span>
                    <Icon size={22} className="text-[var(--accent-strong)]" />
                  </div>
                  <h3 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h3>
                  <p className="max-w-xl text-sm leading-6 text-[var(--text-muted)]">{text}</p>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)] lg:justify-self-end">
                    {action}
                    <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 sm:py-28 lg:py-36">
            <p className="mono-value text-[0.65rem] tracking-[0.16em] text-[var(--accent-strong)]">
              EXACT BYTES / INDEPENDENT ANSWER
            </p>
            <h2 className="mx-auto mt-5 max-w-5xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl">
              Verification begins with evidence, not trust.
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/verify"
                className="inline-flex min-h-13 items-center gap-2 bg-[var(--accent)] px-6 font-semibold text-[#090a0d] transition hover:bg-[var(--accent-strong)]"
              >
                <FileCheck2 size={18} />
                Open public verifier
                <ArrowRight size={17} />
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-13 items-center gap-2 border border-[var(--border-strong)] bg-[var(--surface)] px-6 font-semibold transition hover:bg-[var(--surface-hover)]"
              >
                <Wallet size={18} />
                Wallet sign-in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--canvas-soft)]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-8 text-xs text-[var(--text-muted)] sm:px-8 md:flex-row md:items-center">
          <Brand compact />
          <p>Ethereum Sepolia prototype · No certificate files stored on-chain</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
