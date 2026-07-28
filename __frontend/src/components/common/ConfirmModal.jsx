import Modal from "./Modal";
import Button from "./Button";

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-6">
        <p className="text-gray-600">{message}</p>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelText}
          </Button>

          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmModal;
