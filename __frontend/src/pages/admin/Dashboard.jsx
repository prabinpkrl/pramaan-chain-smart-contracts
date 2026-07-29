import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Files, Radio, ShieldX } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/common/Button";
import PageHeader from "../../components/common/PageHeader";

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
      <PageHeader
        eyebrow="Administration"
        title="System overview"
      />

      <div className="content-grid section-spacing grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Documents" value={stats.total} icon={Files} />
        <StatCard title="Revoked Documents" value={stats.revoked} icon={ShieldX} />
        <StatCard
          title="Blockchain Status"
          value={chainStatus}
          icon={Radio}
          connected={chainStatus === "Sepolia Network"}
        />
      </div>

      <div className="app-panel panel-padding section-spacing">
        <h2 className="mb-2 text-xl font-semibold">Institution Administration</h2>
        <p className="mb-4 text-gray-600">
          Create a public institution ID, authorize its primary issuer wallet,
          and register the private membership.
        </p>
        <Button onClick={() => navigate("/admin/issuers")}>
          Manage Institutions
        </Button>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
