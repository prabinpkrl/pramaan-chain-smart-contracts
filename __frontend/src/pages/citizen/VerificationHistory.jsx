import { useState } from "react";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ConfirmModal from "../../components/common/ConfirmModal";

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Verification History</h1>

        {history.length > 0 && (
          <Button variant="danger" onClick={() => setConfirmClear(true)}>
            <Trash2 size={16} />
            Clear History
          </Button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 mb-6">
        This history is stored locally on this device/browser only. Clearing
        it or switching devices won't affect anything on the blockchain.
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-4 px-6">Document Name</th>
              <th className="text-left px-6">Document Hash</th>
              <th className="text-left px-6">Status</th>
              <th className="text-left px-6">Checked At</th>
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
                  <td className="px-6 py-4">{entry.documentName}</td>
                  <td className="px-6 font-mono text-xs">
                    {entry.documentHash?.slice(0, 20)}...
                  </td>
                  <td className="px-6">
                    <Badge status={entry.status === "ACTIVE" ? "Active" : "Revoked"} />
                  </td>
                  <td className="px-6 text-sm text-gray-500">
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
