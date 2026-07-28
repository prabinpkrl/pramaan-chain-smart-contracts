import { useEffect, useRef } from "react";
import { X } from "lucide-react";

function Modal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialog) return;
      const nodes = [...dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )].filter((node) => !node.disabled);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previous?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="app-panel-raised max-h-[90vh] w-full max-w-3xl overflow-y-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)] p-5 sm:p-6">
          <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
