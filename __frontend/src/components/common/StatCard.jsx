import { ArrowUpRight } from "lucide-react";

function StatCard({ title, value, icon: Icon = ArrowUpRight, connected = false }) {
  return (
    <article className="app-panel group relative min-h-40 overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] sm:min-h-44 sm:p-6">
      <svg
        aria-hidden="true"
        viewBox="0 0 220 176"
        className="pointer-events-none absolute -right-8 top-0 h-full w-56 opacity-70"
      >
        <path
          d="M42 0v41l31 31v40l29 29v35M95 0v28l52 52v96M145 0v34l31 31v43l44 44"
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
        />
        <circle cx="73" cy="72" r="3" fill="var(--accent)" />
        <circle cx="147" cy="80" r="2.5" fill="var(--accent-strong)" />
        <circle cx="176" cy="108" r="2" fill="var(--border-strong)" />
      </svg>

      <div className="relative flex h-full min-h-30 flex-col justify-between sm:min-h-32">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--accent-strong)]">
            <Icon size={18} strokeWidth={1.8} />
          </div>

          {connected && (
            <span className="mono-value border-l border-[var(--accent)] pl-3 text-[0.65rem] tracking-[0.12em] text-[var(--text-muted)]">
              RPC / SYNCED
            </span>
          )}
        </div>

        <div className="mt-6 sm:mt-7">
          <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--text)]">
            {value}
          </h2>
        </div>
      </div>
    </article>
  );
}

export default StatCard;
