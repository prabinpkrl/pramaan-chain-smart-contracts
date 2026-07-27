import { useEffect, useState } from "react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/useAuth";
import { checkIssuer } from "../../services/documentService";

const NETWORK_NAME = import.meta.env.VITE_NETWORK_NAME || "Sepolia Testnet";
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "-";

function Profile() {
  const { address } = useAuth();
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (!address) return undefined;

    checkIssuer(address)
      .then((result) => {
        if (mounted) setAuthorized(Boolean(result.authorized));
      })
      .catch(() => {
        if (mounted) setAuthorized(null);
      });

    return () => {
      mounted = false;
    };
  }, [address]);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Issuer Profile</h1>

      <div className="bg-white rounded-xl shadow p-8 max-w-4xl">
        <h2 className="text-xl font-semibold mb-6 border-b pb-3">
          Issuer Authorization
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-gray-500 text-sm">Wallet Status</p>
            <p className="font-semibold text-green-600">🟢 Connected</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Authorization Status</p>
            <p className="font-semibold">
              {authorized === null
                ? "Checking..."
                : authorized
                  ? "🟢 Authorized Issuer"
                  : "🔴 Not Authorized"}
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mt-10 mb-6 border-b pb-3">
          Blockchain Information
        </h2>

        <div className="space-y-6">
          <div>
            <p className="text-gray-500 text-sm">Network</p>
            <p className="font-semibold">{NETWORK_NAME}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Wallet Address</p>
            <p className="font-mono text-sm break-all bg-gray-100 p-3 rounded-lg">
              {address}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Smart Contract Address</p>
            <p className="font-mono text-sm break-all bg-gray-100 p-3 rounded-lg">
              {CONTRACT_ADDRESS}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Profile;
