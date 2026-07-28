function Button({
  children,
  type = "button",
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
  ...buttonProps
}) {
  const baseStyle =
    "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition duration-200 focus-visible:outline-none disabled:cursor-not-allowed";

  const variants = {
    primary:
      "border-[var(--accent)] bg-[var(--accent)] text-[#090a0d] hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)]",
    secondary:
      "border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text)] hover:bg-[var(--surface-hover)]",
    danger:
      "border-[#71303c] bg-[var(--danger-soft)] text-[var(--danger)] hover:border-[var(--danger)]",
    success:
      "border-[#1e5848] bg-[var(--success-soft)] text-[var(--success)] hover:border-[var(--success)]",
    ghost:
      "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
  };

  const sizes = {
    sm: "min-h-10 px-3 py-2 text-sm",
    md: "min-h-11 px-4 py-2.5 text-sm",
    lg: "min-h-12 px-5 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${baseStyle} ${sizes[size] || sizes.md} ${
        variants[variant] || variants.primary
      } ${fullWidth ? "w-full" : ""} ${
        disabled || loading ? "opacity-55" : ""
      } ${className}`}
      {...buttonProps}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}

      {loading ? "Please wait..." : children}
    </button>
  );
}

export default Button;
