import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/common/Button";

import { getDocuments, getHealth } from "../../services/documentService";

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: "--", active: "--", revoked: "--" });
  const [chainStatus, setChainStatus] = useState("Loading...");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [documentData, health] = await Promise.all([getDocuments(), getHealth()]);

        if (!mounted) return;

        if (documentData.summary) {
          setStats({
            total: documentData.summary.total,
            active: documentData.summary.active,
            revoked: documentData.summary.revoked,
          });
        }

        setChainStatus(health.status === "ok" ? "Sepolia Network" : "Offline");
      } catch (error) {
        console.error("Failed to load admin dashboard", error);
        if (mounted) setChainStatus("Connection Failed");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="bg-blue-700 text-white rounded-xl p-6 mb-8 shadow">
        <h2 className="text-2xl font-bold">System Overview</h2>
        <p className="mt-2 text-blue-100">
          Monitor issuers, documents, and blockchain health across
          PramaanChain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Documents" value={stats.total} color="blue" />
        <StatCard title="Revoked Documents" value={stats.revoked} color="red" />
        <StatCard title="Blockchain Status" value={chainStatus} color="yellow" />
      </div>

      <div className="mb-8 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-2 text-xl font-semibold">Institution Administration</h2>
        <p className="mb-4 text-gray-600">
          Create a public institution ID, authorize its primary issuer wallet,
          and register the private membership.
        </p>
        <Button onClick={() => navigate("/admin/issuers")}>
          Manage Institutions
        </Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
        <p className="font-semibold mb-1">A few cards are placeholders</p>
        <p>
          <strong>Total Issuers</strong>, <strong>Verified Today</strong>, and{" "}
          <strong>Gas Used</strong> need dedicated backend endpoints that
          don't exist yet (the gateway currently exposes document and event
          reads, plus a single issuer lookup — see
          docs/BACKEND_API.md). Once those are added, wiring them into this
          dashboard is a small change on the frontend side.
        </p>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
