import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/common/Button";

import { useAuth } from "../../context/useAuth";
import { apiErrorMessage } from "../../services/api";
import {
  getHealth,
  listIssuerCertificates,
  listIssuerRequests,
} from "../../services/documentService";

function Dashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const institution = session.issuerMemberships[0];
  const [requests, setRequests] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [chainStatus, setChainStatus] = useState("Loading...");

  useEffect(() => {
    Promise.all([
      listIssuerRequests(institution.id),
      listIssuerCertificates(institution.id),
      getHealth(),
    ])
      .then(([nextRequests, nextCertificates, health]) => {
        setRequests(nextRequests);
        setCertificates(nextCertificates);
        setChainStatus(health.status === "ok" ? "Sepolia Network" : "Offline");
      })
      .catch((error) => {
        setChainStatus("Connection Failed");
        toast.error(apiErrorMessage(error));
      });
  }, [institution.id]);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* Welcome Banner */}
      <div className="bg-blue-700 text-white rounded-xl p-6 mb-8 shadow">
        <h2 className="text-2xl font-bold">
          {institution.name}
        </h2>

        <p className="mt-2 text-blue-100">
          Review private citizen requests and sign certificate hashes with the
          authenticated, authorized issuer wallet.
        </p>
        <p className="mt-3 font-mono text-sm text-blue-100">
          Public institution ID: {institution.publicId}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard title="Pending Requests" value={requests.filter((item) => item.status === "PENDING").length} color="yellow" />
        <StatCard title="Processing" value={requests.filter((item) => item.status === "PROCESSING").length} color="blue" />
        <StatCard title="Active Proofs" value={certificates.filter((item) => item.status === "ACTIVE").length} color="green" />
        <StatCard title="Network" value={chainStatus} color="yellow" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>

        <div className="flex flex-wrap gap-4">
          <Button onClick={() => navigate("/issuer/issue")}>
            Open Requests
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
