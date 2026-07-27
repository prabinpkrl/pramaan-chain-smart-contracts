import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/common/Button";

import { getHealth } from "../../services/documentService";

function BlockchainMonitor() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getHealth();
        if (mounted) setHealth(data);
      } catch (error) {
        console.error(error);
        if (mounted) {
          toast.error("Unable to reach the blockchain gateway.");
          setHealth(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Blockchain Monitor</h1>

        <Button variant="secondary" onClick={handleRefresh} loading={loading}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {!health ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
          {loading ? "Checking blockchain connection..." : "No connection data available."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500 text-sm">Gateway Status</p>
            <p className={`text-2xl font-bold mt-1 ${health.status === "ok" ? "text-green-600" : "text-red-600"}`}>
              {health.status === "ok" ? "🟢 Online" : "🔴 Offline"}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500 text-sm">Chain ID</p>
            <p className="text-2xl font-bold mt-1">{health.chainId}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500 text-sm">Latest Block Number</p>
            <p className="text-2xl font-bold mt-1">{health.blockNumber}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-500 text-sm">Configured Issuer Signer</p>
            <p className="font-mono text-sm break-all mt-1">{health.issuerAddress}</p>
          </div>

          {health.certificateIndex && (
            <div className="bg-white rounded-xl shadow p-6 md:col-span-2">
              <p className="text-gray-500 text-sm mb-3">Document Index State</p>
              <pre className="bg-gray-100 rounded-lg p-4 text-xs overflow-x-auto">
                {JSON.stringify(health.certificateIndex, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-white rounded-xl shadow p-6 md:col-span-2">
            <p className="text-gray-500 text-sm">Last Checked</p>
            <p className="font-semibold mt-1">
              {new Date(health.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default BlockchainMonitor;
