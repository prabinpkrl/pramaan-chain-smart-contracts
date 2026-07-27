import { useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/common/Button";

import { useAuth } from "../../context/useAuth";
import { shortenAddress } from "../../utils/wallet";
import { getVerificationHistory } from "../../utils/verificationHistory";

function Dashboard() {
  const navigate = useNavigate();
  const { address } = useAuth();
  const [history] = useState(() => getVerificationHistory());

  const verified = history.filter((entry) => entry.status === "ACTIVE").length;
  const invalid = history.filter((entry) => entry.status !== "ACTIVE").length;

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="bg-blue-700 text-white rounded-xl p-6 mb-8 shadow">
        <h2 className="text-2xl font-bold">Welcome, {shortenAddress(address)}</h2>
        <p className="mt-2 text-blue-100">
          Verify any document's authenticity on the Sepolia blockchain in
          seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <StatCard title="Verified Documents" value={verified} color="green" />
        <StatCard title="Invalid / Revoked" value={invalid} color="red" />
        <StatCard title="Total Checks (this device)" value={history.length} color="blue" />
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Verification</h2>

        {history.length === 0 ? (
          <p className="text-gray-500">No documents verified yet on this device.</p>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 5).map((entry, index) => (
              <div
                key={`${entry.documentHash}-${index}`}
                className="flex justify-between items-center border-b pb-3 last:border-b-0"
              >
                <div>
                  <p className="font-medium">{entry.documentName}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {entry.documentHash?.slice(0, 20)}...
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    entry.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {entry.status === "ACTIVE" ? "Verified" : "Invalid"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Button onClick={() => navigate("/citizen/verify")}>
            Verify a Document
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
