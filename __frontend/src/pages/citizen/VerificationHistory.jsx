import { useState } from "react";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ConfirmModal from "../../components/common/ConfirmModal";
import PageHeader from "../../components/common/PageHeader";

import {
  getVerificationHistory,
  clearVerificationHistory,
} from "../../utils/verificationHistory";

function VerificationHistory() {
  const [history, setHistory] = useState(() => getVerificationHistory());
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = () => {
    clearVerificationHistory();
    setHistory([]);
    setConfirmClear(false);
    toast.success("Verification history cleared.");
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Local browser history"
        title="Verification history"
        description="Review checks stored only in this browser. Clearing this list does not change blockchain state."
        actions={history.length > 0 ? (
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            <Trash2 size={16} />
            Clear History
          </Button>
        ) : null}
      />

      <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        This history is stored locally on this device/browser only. Clearing
        it or switching devices won't affect anything on the blockchain.
      </div>

      <div className="app-panel overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-4 text-left sm:px-6">Document Name</th>
              <th className="px-4 text-left sm:px-6">Document Hash</th>
              <th className="px-4 text-left sm:px-6">Status</th>
              <th className="px-4 text-left sm:px-6">Checked At</th>
            </tr>
          </thead>

          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-gray-500">
                  No verification history yet.
                </td>
              </tr>
            ) : (
              history.map((entry, index) => (
                <tr key={`${entry.documentHash}-${index}`} className="border-b">
                  <td className="px-4 py-4 sm:px-6">{entry.documentName}</td>
                  <td className="px-4 font-mono text-xs sm:px-6">
                    {entry.documentHash?.slice(0, 20)}...
                  </td>
                  <td className="px-4 sm:px-6">
                    <Badge status={entry.status} />
                  </td>
                  <td className="px-4 text-sm text-gray-500 sm:px-6">
                    {entry.checkedAt
                      ? new Date(entry.checkedAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={confirmClear}
        title="Clear Verification History"
        message="This will remove all locally stored verification history on this device. This cannot be undone."
        confirmText="Clear"
        cancelText="Cancel"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </DashboardLayout>
  );
}

export default VerificationHistory;
