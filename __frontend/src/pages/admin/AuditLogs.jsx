import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Input from "../../components/common/Input";
import EtherscanLink from "../../components/common/EtherscanLink";

import { getRecentEvents } from "../../services/documentService";

const TYPE_LABELS = {
  issuance: "Document Issued",
  revocation: "Document Revoked",
  authorization: "Issuer Authorized",
  removal: "Issuer Removed",
};

const TYPE_COLORS = {
  issuance: "bg-green-100 text-green-700",
  revocation: "bg-red-100 text-red-700",
  authorization: "bg-blue-100 text-blue-700",
  removal: "bg-gray-200 text-gray-700",
};

function AuditLogs() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getRecentEvents();
        if (mounted) setEvents(data.events || []);
      } catch (error) {
        console.error("Failed to load audit logs", error);
        if (mounted) toast.error("Failed to load audit logs.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredEvents = events.filter((event) => {
    const term = searchTerm.toLowerCase();
    return (
      event.documentHash?.toLowerCase().includes(term) ||
      event.issuer?.toLowerCase().includes(term) ||
      event.administrator?.toLowerCase().includes(term) ||
      event.type?.toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>

      <div className="mb-6 max-w-md">
        <Input
          label="Search"
          placeholder="Search by hash, address, or event type"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left py-4 px-6">Event</th>
              <th className="text-left px-6">Document / Issuer</th>
              <th className="text-left px-6">Block</th>
              <th className="text-left px-6">Timestamp</th>
              <th className="text-left px-6">Tx</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-500">
                  Loading audit logs...
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-10 text-gray-500">
                  No events found.
                </td>
              </tr>
            ) : (
              filteredEvents.map((event, index) => (
                <tr
                  key={`${event.transactionHash}-${index}`}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        TYPE_COLORS[event.type] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {TYPE_LABELS[event.type] || event.type}
                    </span>
                  </td>

                  <td className="px-6">
                    <p className="font-mono text-xs break-all">
                      {event.documentHash || event.issuer}
                    </p>
                  </td>

                  <td className="px-6">{event.blockNumber}</td>

                  <td className="px-6 text-sm text-gray-500">
                    {event.timestamp
                      ? new Date(event.timestamp * 1000).toLocaleString()
                      : "-"}
                  </td>

                  <td className="px-6">
                    <EtherscanLink txHash={event.transactionHash} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export default AuditLogs;
