function Select({ label, id, name, value, onChange, options, hint, className = "" }) {
  const selectId = id || name;
  return (
    <div className={`mb-4 ${className}`}>
      <label htmlFor={selectId} className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        className="min-h-12 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--canvas-soft)] p-3 focus:border-[var(--accent)] focus:outline-none"
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {hint && <p className="mt-2 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export default Select;
