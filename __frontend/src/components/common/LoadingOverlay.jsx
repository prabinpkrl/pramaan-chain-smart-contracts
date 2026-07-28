function LoadingOverlay({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="app-panel-raised w-full max-w-sm p-8 text-center" role="status">
        <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]" />

        <h2 className="mt-6 text-xl font-semibold">Processing transaction</h2>

        <p className="mt-3 text-sm text-[var(--text-muted)]">{message}</p>
      </div>
    </div>
  );
}

export default LoadingOverlay;
