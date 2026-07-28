import { Check, LoaderCircle, WalletCards } from "lucide-react";

function TransactionProgress({ title, steps, currentStep }) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === currentStep));

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4" role="status" aria-live="polite">
      <div className="app-panel-raised w-full max-w-md p-6 sm:p-8">
        <div className="mb-7 flex items-start gap-4">
          <div className="rounded-xl border border-[#4b4385] bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]">
            <WalletCards size={22} />
          </div>
          <div>
            <p className="eyebrow">Sepolia transaction</p>
            <h2 className="mt-2 text-xl font-semibold">{title}</h2>
          </div>
        </div>
        <ol className="space-y-2">
          {steps.map((step, index) => {
            const complete = index < activeIndex;
            const active = index === activeIndex;
            return (
              <li
                key={step.id}
                className={`flex items-center gap-3 rounded-xl border p-3.5 ${
                  active
                    ? "border-[#4b4385] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs ${
                    complete
                      ? "border-[#1e5848] bg-[var(--success-soft)] text-[var(--success)]"
                      : active
                        ? "border-[#4b4385] text-[var(--accent-strong)]"
                        : "border-[var(--border-strong)] text-[var(--text-dim)]"
                  }`}
                >
                  {complete ? (
                    <Check size={14} />
                  ) : active ? (
                    <LoaderCircle className="animate-spin" size={14} />
                  ) : (
                    index + 1
                  )}
                </span>
                <div>
                  <p className={`text-sm font-medium ${active ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                    {step.label}
                  </p>
                  {active && step.detail && (
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{step.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-5 text-xs leading-5 text-[var(--text-dim)]">
          Keep this window open. A transaction hash alone is not treated as success.
        </p>
      </div>
    </div>
  );
}

export default TransactionProgress;
