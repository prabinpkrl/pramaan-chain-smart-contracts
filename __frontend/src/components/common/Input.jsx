function Input({
  label,
  type = "text",
  id,
  name,
  placeholder,
  value,
  onChange,
  hint,
  error,
  className = "",
  inputClassName = "",
  ...inputProps
}) {
  const inputId = id || name;

  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-[var(--text)]">
        {label}
      </label>

      <input
        id={inputId}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={hint || error ? `${inputId}-help` : undefined}
        {...inputProps}
        className={`min-h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--canvas-soft)] px-3.5 py-3 text-[var(--text)] transition placeholder:text-[var(--text-dim)] hover:border-[#4a5160] focus:border-[var(--accent)] focus:outline-none ${inputClassName}`}
      />
      {(error || hint) && (
        <p
          id={`${inputId}-help`}
          className={`mt-2 text-xs ${error ? "text-[var(--danger)]" : "text-[var(--text-muted)]"}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export default Input;
