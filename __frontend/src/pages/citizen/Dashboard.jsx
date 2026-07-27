import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DashboardLayout from "../../components/layout/DashboardLayout";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/common/Button";

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
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="bg-blue-700 text-white rounded-xl p-6 mb-8 shadow">
        <h2 className="text-2xl font-bold">Private citizen workspace</h2>
        <p className="mt-2 text-blue-100">
          Your wallet controls access, while assignments remain encrypted
          off-chain and public verification uses only a certificate hash.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <StatCard title="Institutions" value={session.citizenRelationships.length} color="blue" />
        <StatCard title="Pending Requests" value={requests.filter((item) => item.status === "PENDING").length} color="yellow" />
        <StatCard title="Active Proofs" value={certificates.filter((item) => item.status === "ACTIVE").length} color="green" />
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Certificate ownership boundary</h2>
        <p className="text-gray-600">
          The private application database assigns proofs to this wallet.
          The public blockchain authenticates the hash but cannot identify the citizen.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => navigate("/citizen/requests")}>Create or view requests</Button>
          <Button variant="secondary" onClick={() => navigate("/citizen/my-documents")}>View my proofs</Button>
          <Button variant="secondary" onClick={() => navigate("/verify")}>Public verifier</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
