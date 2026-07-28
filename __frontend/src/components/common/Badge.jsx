function Badge({ status }) {
  const styles = {
    ACTIVE: "border-[#1e5848] bg-[var(--success-soft)] text-[var(--success)]",
    REVOKED: "border-[#71303c] bg-[var(--danger-soft)] text-[var(--danger)]",
    PENDING: "border-[#66521e] bg-[var(--warning-soft)] text-[var(--warning)]",
    PROCESSING: "border-[#345781] bg-[var(--info-soft)] text-[var(--info)]",
    ISSUED: "border-[#1e5848] bg-[var(--success-soft)] text-[var(--success)]",
    REJECTED: "border-[#71303c] bg-[var(--danger-soft)] text-[var(--danger)]",
    NOT_FOUND: "border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text-muted)]",
    AUTHORIZED: "border-[#1e5848] bg-[var(--success-soft)] text-[var(--success)]",
    UNAUTHORIZED: "border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text-muted)]",
    Active: "border-[#1e5848] bg-[var(--success-soft)] text-[var(--success)]",
    Revoked: "border-[#71303c] bg-[var(--danger-soft)] text-[var(--danger)]",
    Pending: "border-[#66521e] bg-[var(--warning-soft)] text-[var(--warning)]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-semibold tracking-wide ${
        styles[status] || "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)]"
      }`}
    >
      {status}
    </span>
  );
}

export default Badge;
