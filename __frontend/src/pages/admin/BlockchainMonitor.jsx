import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/common/Button";
import PageHeader from "../../components/common/PageHeader";

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
      <PageHeader
        eyebrow="Read-only infrastructure"
        title="Blockchain monitor"
        description="Inspect gateway reachability, Sepolia identity, current block height, and index readiness."
        actions={(
          <Button variant="secondary" onClick={handleRefresh} loading={loading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        )}
      />

      {!health ? (
        <div className="app-panel p-8 text-center text-gray-500 sm:p-10">
          {loading ? "Checking blockchain connection..." : "No connection data available."}
        </div>
      ) : (
        <div className="content-grid grid-cols-1 md:grid-cols-2">
          <div className="app-panel panel-padding">
            <p className="text-gray-500 text-sm">Gateway Status</p>
            <p className={`mt-2 text-2xl font-semibold ${health.status === "ok" ? "text-[var(--accent-strong)]" : "text-[var(--danger)]"}`}>
              {health.status === "ok" ? "Online" : "Offline"}
            </p>
          </div>

          <div className="app-panel panel-padding">
            <p className="text-gray-500 text-sm">Chain ID</p>
            <p className="text-2xl font-bold mt-1">{health.chainId}</p>
          </div>

          <div className="app-panel panel-padding">
            <p className="text-gray-500 text-sm">Latest Block Number</p>
            <p className="text-2xl font-bold mt-1">{health.blockNumber}</p>
          </div>

          <div className="app-panel panel-padding">
            <p className="text-gray-500 text-sm">Configured Issuer Signer</p>
            <p className="font-mono text-sm break-all mt-1">{health.issuerAddress}</p>
          </div>

          {health.certificateIndex && (
            <div className="app-panel panel-padding md:col-span-2">
              <p className="text-gray-500 text-sm mb-3">Document Index State</p>
              <pre className="overflow-x-auto rounded-xl bg-gray-100 p-4 text-xs">
                {JSON.stringify(health.certificateIndex, null, 2)}
              </pre>
            </div>
          )}

          <div className="app-panel panel-padding md:col-span-2">
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
