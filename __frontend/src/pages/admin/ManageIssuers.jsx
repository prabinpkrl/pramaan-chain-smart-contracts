import { useState } from "react";
import toast from "react-hot-toast";
import { Search } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";

import { checkIssuer } from "../../services/documentService";

function ManageIssuers() {
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const [pendingAddress, setPendingAddress] = useState("");
  const [pendingIssuers, setPendingIssuers] = useState([]);

  const handleLookup = async (e) => {
    e.preventDefault();

    if (!lookupAddress) {
      toast.error("Enter a wallet address to check.");
      return;
    }

    try {
      setChecking(true);
      const result = await checkIssuer(lookupAddress);
      setLookupResult(result);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error?.message || "Lookup failed.");
      setLookupResult(null);
    } finally {
      setChecking(false);
    }
  };

  const handleQueue = (e) => {
    e.preventDefault();

    if (!pendingAddress) {
      toast.error("Enter a wallet address.");
      return;
    }

    setPendingIssuers((prev) => [
      ...prev,
      { address: pendingAddress, queuedAt: new Date().toLocaleString() },
    ]);
    setPendingAddress("");
    toast.success("Added to the local action queue.");
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Manage Issuers</h1>

      {/* Real issuer lookup */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Check Issuer Authorization</h2>

        <form onSubmit={handleLookup} className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              label="Wallet Address"
              placeholder="0x..."
              value={lookupAddress}
              onChange={(e) => setLookupAddress(e.target.value)}
            />
          </div>

          <Button type="submit" loading={checking}>
            <Search size={16} />
            Check
          </Button>
        </form>

        {lookupResult && (
          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-sm">{lookupResult.address}</span>
            <Badge status={lookupResult.authorized ? "Active" : "Revoked"} />
          </div>
        )}
      </div>

      {/* Local-only add/remove queue */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Authorize / Remove Issuer</h2>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-4">
          The smart contract already supports <code>authorizeIssuer</code> and{" "}
          <code>removeIssuer</code> (admin-only), but the backend gateway
          doesn't expose them over HTTP yet. Entries queued below are kept in
          this browser session only, ready to wire up to a real{" "}
          <code>POST /api/admin/issuers</code> endpoint once it exists.
        </div>

        <form onSubmit={handleQueue} className="flex gap-4 items-end mb-6">
          <div className="flex-1">
            <Input
              label="Issuer Wallet Address"
              placeholder="0x..."
              value={pendingAddress}
              onChange={(e) => setPendingAddress(e.target.value)}
            />
          </div>

          <Button type="submit" variant="secondary">
            Queue Authorization
          </Button>
        </form>

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-4">Address</th>
                <th className="text-left px-4">Queued At</th>
                <th className="text-left px-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {pendingIssuers.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-8 text-gray-500">
                    No pending actions queued.
                  </td>
                </tr>
              ) : (
                pendingIssuers.map((issuer, index) => (
                  <tr key={`${issuer.address}-${index}`} className="border-b">
                    <td className="px-4 py-3 font-mono text-xs">
                      {issuer.address}
                    </td>
                    <td className="px-4 text-sm text-gray-500">
                      {issuer.queuedAt}
                    </td>
                    <td className="px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        Pending backend endpoint
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ManageIssuers;
