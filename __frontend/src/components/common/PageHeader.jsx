function PageHeader({ eyebrow, title, actions, className = "" }) {
  return (
    <div className={`mb-8 flex flex-col justify-between gap-4 sm:mb-10 md:flex-row md:items-end ${className}`}>
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.035em] text-[var(--text)] sm:text-4xl">
          {title}
        </h1>
      </div>
      {actions && <div className="action-cluster">{actions}</div>}
    </div>
  );
}

export default PageHeader;
