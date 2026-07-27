import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import ActivityCard from "../../components/common/ActivityCard";
import Button from "../../components/common/Button";

import { useAuth } from "../../context/useAuth";
import { shortenAddress } from "../../utils/wallet";
import { getDocuments, getHealth } from "../../services/documentService";

function Dashboard() {
  const navigate = useNavigate();
  const { address } = useAuth();

  const [stats, setStats] = useState({
    total: "--",
    active: "--",
    revoked: "--",
  });

  const [chainStatus, setChainStatus] = useState("Loading...");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [documentData, health] = await Promise.all([
          getDocuments(),
          getHealth(),
        ]);

        if (!isMounted) return;

        if (documentData.summary) {
          setStats({
            total: documentData.summary.total,
            active: documentData.summary.active,
            revoked: documentData.summary.revoked,
          });
        }

        setChainStatus(health.status === "ok" ? "Sepolia Network" : "Offline");
      } catch (error) {
        console.error("Failed to load dashboard", error);

        if (!isMounted) return;

        setChainStatus("Connection Failed");
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Welcome Banner */}
      <div className="bg-blue-700 text-white rounded-xl p-6 mb-8 shadow">
        <h2 className="text-2xl font-bold">
          Welcome, {shortenAddress(address)}
        </h2>

        <p className="mt-2 text-blue-100">
          Issue, manage and verify blockchain-backed documents securely on the
          Sepolia Ethereum network.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Documents" value={stats.total} color="blue" />

        <StatCard
          title="Active Documents"
          value={stats.active}
          color="green"
        />

        <StatCard
          title="Revoked Documents"
          value={stats.revoked}
          color="red"
        />

        <StatCard
          title="Blockchain Network"
          value={chainStatus}
          color="yellow"
        />
      </div>

      {/* Recent Activity */}
      <ActivityCard />

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>

        <div className="flex flex-wrap gap-4">
          <Button onClick={() => navigate("/issuer/issue")}>
            Issue Document
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/issuer/documents")}
          >
            View Document Registry
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/issuer/revoked")}
          >
            View Revoked Documents
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
