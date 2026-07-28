import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Hash,
  Anchor,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDown,
  Loader2,
} from "lucide-react";

import { verifyDocument } from "../../services/documentService";
import { isValidDocumentHash } from "../../utils/validateHash";

/* ------------------------------------------------------------------ */
/* Reveal — fades + lifts a section in once it scrolls into view       */
/* ------------------------------------------------------------------ */
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.15 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Counter — ticks a number up once it becomes visible                 */
/* ------------------------------------------------------------------ */
function Counter({ to, duration = 1400, prefix = "", suffix = "" }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            setStarted(true);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.4 },
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started) return undefined;

    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.floor(eased * to));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

const DEMO_HASH =
  "0xb65b7e2c9f1a3d8e4c6b0a2f5d9e1c7a8b4f6d2e0a3c5b7d9e1f3a5c7b9d1e2a4c";

function Landing() {
  const navigate = useNavigate();
  const sceneRef = useRef(null);

  const [hash, setHash] = useState("");
  const [status, setStatus] = useState("idle"); // idle | checking | verified | invalid | error
  const [result, setResult] = useState(null);

  // Cursor-reactive glow — cheap, GPU-friendly (just moves a radial-gradient
  // position via CSS custom properties), not a heavy parallax library.
  useEffect(() => {
    const el = sceneRef.current;
    if (!el) return undefined;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    const trimmed = hash.trim();
    if (!trimmed) return;

    if (!isValidDocumentHash(trimmed)) {
      setStatus("error");
      setResult({ message: "That doesn't look like a valid SHA-256 hash." });
      return;
    }

    setStatus("checking");

    try {
      const response = await verifyDocument(trimmed);
      setResult(response);
      setStatus(response.status === "ACTIVE" ? "verified" : "invalid");
    } catch (err) {
      setResult({
        message:
          err.response?.data?.error?.message ||
          "Couldn't reach the verification service.",
      });
      setStatus("error");
    }
  };

  const useDemoCertificate = () => {
    setHash(DEMO_HASH);
    setStatus("idle");
    setResult(null);
  };

  return (
    <div
      ref={sceneRef}
      className="relative min-h-screen overflow-hidden bg-[#07080d] text-white"
      style={{ "--mx": "50%", "--my": "20%" }}
    >
      <style>{`
        @keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        @keyframes spinSlowReverse { to { transform: rotate(-360deg); } }
        @keyframes pulseDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .35; transform: scale(0.7); } }
        @keyframes scanline { 0% { transform: translateX(-110%); } 100% { transform: translateX(110%); } }
        @keyframes gridPan { 0% { background-position: 0 0; } 100% { background-position: 44px 44px; } }
        .float-card { animation: floatY 6s ease-in-out infinite; }
        .orbit-ring { animation: spinSlow 26s linear infinite; }
        .orbit-ring-inner { animation: spinSlowReverse 16s linear infinite; }
        .pulse-dot { animation: pulseDot 2s ease-in-out infinite; }
        .scanline { animation: scanline 3.2s ease-in-out infinite; }
        .grid-pan { animation: gridPan 6s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .float-card, .orbit-ring, .orbit-ring-inner, .pulse-dot, .scanline, .grid-pan { animation: none; }
        }
      `}</style>

      {/* faint panning grid texture */}
      <div className="grid-pan pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]" />

      {/* single, quiet glow that follows the cursor — replaces the heavier gradient blobs */}
      <div
        className="pointer-events-none absolute inset-0 transition-[background] duration-300"
        style={{
          background:
            "radial-gradient(480px circle at var(--mx) var(--my), rgba(139,92,246,0.08), transparent 60%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ---------------------------------------------------------- */}
        {/* Header                                                     */}
        {/* ---------------------------------------------------------- */}
        <header className="flex items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <div className="flex items-center gap-2.5">
            <img
              src="/Logo.png"
              alt="PramaanChain"
              className="h-14 w-14 object-contain sm:h-16 sm:w-16"
            />
            <span className="text-2xl font-semibold uppercase tracking-[0.15em] 3xl:text-base">
              PramaanChain
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <button
              onClick={() => scrollTo("verify")}
              className="transition hover:text-white"
            >
              Verify
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="transition hover:text-white"
            >
              How it works
            </button>
            <button
              onClick={() => scrollTo("network")}
              className="transition hover:text-white"
            >
              Network
            </button>
          </nav>

          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/90 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-violet-400" />
            Connect wallet
          </button>
        </header>

        {/* ---------------------------------------------------------- */}
        {/* Hero                                                       */}
        {/* ---------------------------------------------------------- */}
        <main className="flex flex-1 flex-col items-center justify-center gap-16 px-6 py-16 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <Reveal className="max-w-xl text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live on Sepolia
            </div>

            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Truth,
              <br />
              <span className="bg-gradient-to-r from-violet-300 to-white bg-clip-text text-transparent">
                anchored on-chain.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base text-white/55 sm:text-lg lg:mx-0">
              Verify documents without trusting a database. Private files stay
              private — only their fingerprint ever touches the blockchain.
            </p>

            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <button
                onClick={() => scrollTo("verify")}
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-3 font-medium text-white transition hover:-translate-y-0.5 hover:bg-violet-500 active:translate-y-0"
              >
                Verify a document
                <ArrowUpRight size={16} />
              </button>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
              >
                See how it works
                <ArrowDown size={14} />
              </button>
            </div>
          </Reveal>

          {/* right: document proof card */}
          <Reveal delay={0.15} className="relative w-[380px] max-w-full">
            {/* dual orbit rings — sized to clear a 380×300 card (diagonal ≈ 485px) */}
            <div className="orbit-ring pointer-events-none absolute left-1/2 top-1/2 hidden h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10 sm:block">
              <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-violet-400" />
            </div>
            <div className="orbit-ring-inner pointer-events-none absolute left-1/2 top-1/2 hidden h-[370px] w-[370px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dotted border-white/[0.07] sm:block">
              <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-400" />
            </div>

            {/* card + tags share one positioning box, sized exactly to the card */}
            <div className="relative h-[300px] w-[380px]">
              <span className="absolute -right-4 -top-10 z-20 hidden rounded-md border border-white/10 bg-[#0b0c14] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/40 sm:block">
                Immutable
              </span>
              <span className="absolute -bottom-10 -left-4 z-20 hidden rounded-md border border-white/10 bg-[#0b0c14] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white/40 sm:block">
                Public proof
              </span>

              <div className="float-card relative z-10 flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/50">
                    Document proof
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Verified
                  </span>
                </div>

                <div className="relative space-y-2.5 overflow-hidden border-t border-white/10 pt-5">
                  <div className="h-2.5 w-full rounded-full bg-white/10" />
                  <div className="h-2.5 w-3/5 rounded-full bg-white/10" />
                  <div className="scanline pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-violet-400/15 to-transparent" />
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-4 font-mono text-xs">
                  <span className="text-white/40">SHA-256</span>
                  <span className="text-violet-300">b65b...2a4c</span>
                </div>

                <div className="flex items-center gap-2 border-t border-white/10 pt-4">
                  <ShieldCheck size={16} className="text-violet-300" />
                  <div className="font-mono text-[11px] uppercase tracking-wide text-white/40">
                    Anchored on{" "}
                    <span className="text-white/70">
                      Sepolia · Block <Counter to={11345360} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </main>

        {/* ---------------------------------------------------------- */}
        {/* How it works                                                */}
        {/* ---------------------------------------------------------- */}
        <section id="how-it-works" className="px-6 py-24 sm:px-10">
          <Reveal className="mx-auto max-w-5xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-300">
              How it works
            </span>
            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Simple by design.
            </h2>

            <div className="mt-14 grid grid-cols-1 gap-10 border-t border-white/10 pt-10 sm:grid-cols-3 sm:gap-8">
              <Step
                index="01"
                icon={<Hash size={16} />}
                title="Hash locally"
                text="Your document becomes a unique SHA-256 fingerprint in the browser. The file itself never touches the blockchain."
              />
              <Step
                index="02"
                icon={<Anchor size={16} />}
                title="Anchor proof"
                text="An authorized issuer records the fingerprint on-chain, tied to their verified wallet address."
              />
              <Step
                index="03"
                icon={<CheckCircle2 size={16} />}
                title="Verify forever"
                text="Anyone can independently check whether a proof is active, revoked, or unknown — no account needed."
              />
            </div>
          </Reveal>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Check any document — wired to the real verify endpoint      */}
        {/* ---------------------------------------------------------- */}
        <section id="verify" className="px-6 py-24 sm:px-10">
          <Reveal className="mx-auto max-w-5xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-300">
                  Public verification
                </span>
                <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                  Check any document.
                </h2>
              </div>
              <p className="max-w-xs text-sm text-white/45">
                Paste a document hash below. No account, wallet, or personal
                details required.
              </p>
            </div>

            <form
              onSubmit={handleVerify}
              className="mt-10 grid grid-cols-1 gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:grid-cols-2 sm:p-8"
            >
              <div>
                <label className="font-mono text-[11px] uppercase tracking-widest text-white/40">
                  Document hash
                </label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={hash}
                    onChange={(e) => {
                      setHash(e.target.value);
                      setStatus("idle");
                      setResult(null);
                    }}
                    placeholder="0x..."
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={status === "checking"}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-medium text-[#07080d] transition hover:bg-white/90 disabled:opacity-60"
                  >
                    {status === "checking" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : null}
                    Verify proof
                  </button>
                </div>
                <button
                  type="button"
                  onClick={useDemoCertificate}
                  className="mt-3 text-xs text-white/40 underline decoration-white/20 underline-offset-4 transition hover:text-white/70"
                >
                  Use demo hash
                </button>
              </div>

              <div className="flex items-center justify-center rounded-xl border border-white/10 bg-black/20 p-6">
                {status === "idle" && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/30">
                      <Hash size={16} />
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-white/30">
                      Ready to verify
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      Document status will appear here.
                    </p>
                  </div>
                )}

                {status === "checking" && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/30 text-violet-300">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-violet-300">
                      Checking the chain
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      Looking up this fingerprint on Sepolia.
                    </p>
                  </div>
                )}

                {status === "verified" && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 text-emerald-300">
                      <CheckCircle2 size={16} />
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-emerald-300">
                      Verified
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      Active proof, anchored on Sepolia.
                    </p>
                  </div>
                )}

                {status === "invalid" && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-red-400/30 text-red-300">
                      <XCircle size={16} />
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-red-300">
                      {result?.status === "REVOKED" ? "Revoked" : "Not found"}
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      {result?.status === "REVOKED"
                        ? "This document was issued, then later revoked."
                        : "No matching proof exists on-chain for this hash."}
                    </p>
                  </div>
                )}

                {status === "error" && (
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/30 text-amber-300">
                      <XCircle size={16} />
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-amber-300">
                      Couldn't check
                    </p>
                    <p className="mt-1 text-sm text-white/45">
                      {result?.message}
                    </p>
                  </div>
                )}
              </div>
            </form>
          </Reveal>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Network strip / footer                                     */}
        {/* ---------------------------------------------------------- */}
        <footer
          id="network"
          className="mt-auto flex flex-col items-center justify-between gap-4 border-t border-white/10 px-6 py-8 text-xs text-white/35 sm:flex-row sm:px-10"
        >
          <div className="flex items-center gap-2">
            <img src="/Logo.png" alt="" className="h-5 w-5 object-contain" />
            <span>© {new Date().getFullYear()} PramaanChain</span>
          </div>
          <div className="flex items-center gap-2 font-mono uppercase tracking-widest">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Sepolia testnet
          </div>
        </footer>
      </div>
    </div>
  );
}

function Step({ index, icon, title, text }) {
  return (
    <div>
      <span className="font-mono text-[11px] text-white/30">{index}</span>
      <div className="mt-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-violet-300 transition group-hover:border-violet-400/40">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{text}</p>
    </div>
  );
}

export default Landing;
