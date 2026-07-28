function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="app-panel grid min-h-52 place-items-center p-8 text-center">
      <div>
        {Icon && (
          <div className="mx-auto mb-4 w-fit rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-[var(--accent-strong)]">
            <Icon size={22} />
          </div>
        )}
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export default EmptyState;
