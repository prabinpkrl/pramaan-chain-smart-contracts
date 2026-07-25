import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import ConfirmModal from "../../components/common/ConfirmModal";
import Modal from "../../components/common/Modal";
import CertificateDetails from "../../components/certificate/CertificateDetails";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import DashboardLayout from "../../components/layout/DashboardLayout";

import {
  getCertificates,
  revokeCertificate,
} from "../../services/certificateService";

function Certificates() {
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [certificateToRevoke, setCertificateToRevoke] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Failed to copy.");
    }
  };

  // Refresh certificates after revoke
  const fetchCertificates = async () => {
    const data = await getCertificates();
    setCertificates(data.certificates || []);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getCertificates();

        if (mounted) {
          setCertificates(data.certificates || []);
        }
      } catch (error) {
        console.error("Failed to load certificates", error);

        if (mounted) {
          toast.error("Failed to load certificates.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleRevoke = async () => {
    if (!certificateToRevoke) return;

    try {
      await revokeCertificate(certificateToRevoke.documentHash);

      toast.success("Certificate revoked successfully.");

      await fetchCertificates();
    } catch (error) {
      console.error(error);

      toast.error(
        error.response?.data?.error || "Failed to revoke certificate.",
      );
    } finally {
      setCertificateToRevoke(null);
    }
  };

  const filteredCertificates = certificates.filter((certificate) => {
    const matchesSearch =
      certificate.documentHash
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      certificate.issuer?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ||
      certificate.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <h1 className="text-3xl font-bold mb-6">Certificates</h1>

        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
          Loading certificates...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Certificate Registry</h1>

      {/* Search + Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            label="Search"
            placeholder="Search by document hash or issuer address"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-52">
          <label className="block text-sm font-medium mb-2">Status</label>

          <select
            className="w-full border rounded-lg px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>ACTIVE</option>
            <option>REVOKED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-4 px-6">Document Hash</th>
              <th className="text-left px-6">Issuer</th>
              <th className="text-left px-6">Issue Date</th>
              <th className="text-left px-6">Status</th>
              <th className="text-left px-6">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredCertificates.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-500">
                  No certificates found.
                </td>
              </tr>
            ) : (
              filteredCertificates.map((certificate) => (
                <tr
                  key={certificate.documentHash}
                  className="border-b hover:bg-gray-50 transition"
                >
                  {/* Document Hash */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {certificate.documentHash.slice(0, 18)}...
                      </span>

                      <button
                        onClick={() =>
                          copyToClipboard(
                            certificate.documentHash,
                            "Document hash",
                          )
                        }
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  </td>

                  {/* Issuer */}
                  <td className="px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {certificate.issuer.slice(0, 16)}...
                      </span>

                      <button
                        onClick={() =>
                          copyToClipboard(certificate.issuer, "Issuer address")
                        }
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  </td>

                  {/* Issue Date */}
                  <td className="px-6">
                    {certificate.issuedAt
                      ? new Date(
                          certificate.issuedAt * 1000,
                        ).toLocaleDateString()
                      : "-"}
                  </td>

                  {/* Status */}
                  <td className="px-6">
                    <Badge status={certificate.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedCertificate(certificate)}
                      >
                        View
                      </Button>

                      {certificate.status === "ACTIVE" && (
                        <Button
                          variant="danger"
                          onClick={() => setCertificateToRevoke(certificate)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={certificateToRevoke !== null}
        title="Revoke Certificate"
        message="This action cannot be undone. Are you sure you want to revoke this certificate?"
        confirmText="Revoke"
        cancelText="Cancel"
        onConfirm={handleRevoke}
        onCancel={() => setCertificateToRevoke(null)}
      />

      <Modal
        isOpen={selectedCertificate !== null}
        onClose={() => setSelectedCertificate(null)}
        title="Certificate Details"
      >
        <CertificateDetails
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      </Modal>
    </DashboardLayout>
  );
}

export default Certificates;
