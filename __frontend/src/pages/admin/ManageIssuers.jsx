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
            <Badge status={lookupResult.authorized ? "AUTHORIZED" : "UNAUTHORIZED"} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Issuer Administration</h2>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          The smart contract already supports <code>authorizeIssuer</code> and{" "}
          <code>removeIssuer</code>, but administrator transaction signing is
          intentionally outside this prototype application. This page remains
          read-only; no action is queued locally and no administrator key is
          loaded into either backend.
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ManageIssuers;
