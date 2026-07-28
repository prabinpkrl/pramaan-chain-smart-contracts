import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { BadgeCheck, Clock3, Radio, RefreshCw } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/common/Button";
import PageHeader from "../../components/common/PageHeader";

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
      <PageHeader
        eyebrow="Issuer workspace"
        title={institution.name}
      />

      <div className="content-grid section-spacing grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pending Requests" value={requests.filter((item) => item.status === "PENDING").length} icon={Clock3} />
        <StatCard title="Processing" value={requests.filter((item) => item.status === "PROCESSING").length} icon={RefreshCw} />
        <StatCard title="Active Proofs" value={certificates.filter((item) => item.status === "ACTIVE").length} icon={BadgeCheck} />
        <StatCard
          title="Network"
          value={chainStatus}
          icon={Radio}
          connected={chainStatus === "Sepolia Network"}
        />
      </div>

      <div className="app-panel panel-padding">
        <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>

        <div className="action-cluster">
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
