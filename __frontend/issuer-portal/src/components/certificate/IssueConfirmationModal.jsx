import Modal from "../common/Modal";
import Button from "../common/Button";

function IssueConfirmationModal({ isOpen, onClose, onConfirm, certificate }) {
  if (!certificate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Certificate Issuance"
    >
      <div className="space-y-4">
        <p>You are about to issue the following certificate:</p>

        <div className="bg-gray-100 rounded-lg p-4">
          <p>
            <strong>Holder:</strong> {certificate.fullName}
          </p>

          <p>
            <strong>Certificate:</strong> {certificate.certificateType}
          </p>

          <p>
            <strong>Citizen ID:</strong> {certificate.citizenId}
          </p>
        </div>

        <p className="text-red-600 font-medium">
          This action will be recorded on the blockchain and cannot be undone.
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button variant="success" onClick={onConfirm}>
            Confirm Issue
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default IssueConfirmationModal;
