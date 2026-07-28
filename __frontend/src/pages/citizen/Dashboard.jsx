import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { BadgeCheck, Building2, Clock3 } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/common/Button";
import PageHeader from "../../components/common/PageHeader";

import { useAuth } from "../../context/useAuth";
import { apiErrorMessage } from "../../services/api";
import {
  listCitizenCertificates,
  listCitizenRequests,
} from "../../services/documentService";

function Dashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [requests, setRequests] = useState([]);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    Promise.all([listCitizenRequests(), listCitizenCertificates()])
      .then(([nextRequests, nextCertificates]) => {
        setRequests(nextRequests);
        setCertificates(nextCertificates);
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }, []);

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Citizen workspace"
        title="Your private proof workspace"
      />

      <div className="content-grid section-spacing grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Institutions" value={session.citizenRelationships.length} icon={Building2} />
        <StatCard title="Pending Requests" value={requests.filter((item) => item.status === "PENDING").length} icon={Clock3} />
        <StatCard title="Active Proofs" value={certificates.filter((item) => item.status === "ACTIVE").length} icon={BadgeCheck} />
      </div>

      <div className="app-panel panel-padding section-spacing">
        <div className="mb-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-semibold">Connected Institutions</h2>
          <Button variant="secondary" onClick={() => navigate("/citizen/connect")}>
            Connect another
          </Button>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {session.citizenRelationships.map((institution) => (
            <div key={institution.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <p className="font-semibold">{institution.name}</p>
              <p className="mt-1 font-mono text-sm text-blue-700">
                {institution.publicId}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="app-panel panel-padding">
        <h2 className="mb-2 text-xl font-semibold">Certificate ownership boundary</h2>
        <p className="text-gray-600">
          The private application database assigns proofs to this wallet.
          The public blockchain authenticates the hash but cannot identify the citizen.
        </p>
        <div className="action-cluster mt-6">
          <Button onClick={() => navigate("/citizen/requests")}>Create or view requests</Button>
          <Button variant="secondary" onClick={() => navigate("/citizen/my-documents")}>View my proofs</Button>
          <Button variant="secondary" onClick={() => navigate("/verify")}>Public verifier</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
