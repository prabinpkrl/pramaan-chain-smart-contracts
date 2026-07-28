import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { apiErrorMessage } from "../../services/api";
import {
  createCitizenRequest,
  listCitizenInstitutions,
  listCitizenRequests,
} from "../../services/documentService";
import { formatDate } from "../../utils/format";

function CitizenRequests() {
  const [institutions, setInstitutions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [institutionId, setInstitutionId] = useState("");
  const [certificateType, setCertificateType] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [nextInstitutions, nextRequests] = await Promise.all([
      listCitizenInstitutions(),
      listCitizenRequests(),
    ]);
    setInstitutions(nextInstitutions);
    setRequests(nextRequests);
    setInstitutionId((current) => current || nextInstitutions[0]?.id || "");
  }, []);

  useEffect(() => {
    Promise.all([listCitizenInstitutions(), listCitizenRequests()])
      .then(([nextInstitutions, nextRequests]) => {
        setInstitutions(nextInstitutions);
        setRequests(nextRequests);
        setInstitutionId((current) => current || nextInstitutions[0]?.id || "");
      })
      .catch((error) => toast.error(apiErrorMessage(error)));
  }, []);

  const create = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await createCitizenRequest(institutionId, certificateType.trim());
      setCertificateType("");
      await load();
      toast.success("Certificate request submitted.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Private institution workflow"
        title="Certificate requests"
        description="Create an institution-scoped request and track its pending, processing, issued, or rejected state."
      />
      <section className="app-panel panel-padding section-spacing max-w-2xl">
        <h2 className="mb-4 text-xl font-semibold">New request</h2>
        <form onSubmit={create}>
          <label htmlFor="institution" className="mb-2 block font-medium">
            Institution
          </label>
          <select
            id="institution"
            value={institutionId}
            onChange={(event) => setInstitutionId(event.target.value)}
            className="mb-4 w-full rounded-lg border border-gray-300 p-3"
            required
          >
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name} ({institution.publicId})
              </option>
            ))}
          </select>
          <Input
            id="certificateType"
            label="Certificate type"
            value={certificateType}
            onChange={(event) => setCertificateType(event.target.value)}
            placeholder="Academic certificate"
          />
          <Button
            type="submit"
            loading={busy}
            disabled={!institutionId || certificateType.trim().length < 2}
          >
            Submit request
          </Button>
        </form>
      </section>

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {requests.map((request) => (
          <article key={request.id} className="app-panel p-5 sm:p-6">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div>
                <h2 className="text-lg font-semibold">{request.certificateType}</h2>
                <p className="text-sm text-gray-500">{request.institutionName}</p>
              </div>
              <Badge status={request.status} />
            </div>
            <p className="mt-4 break-all font-mono text-xs text-gray-500">{request.id}</p>
            <p className="mt-2 text-sm text-gray-500">
              Created {formatDate(request.createdAt)}
            </p>
          </article>
        ))}
        {requests.length === 0 && (
          <div className="app-panel p-8 text-center text-gray-500 sm:p-10">
            No certificate requests yet.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default CitizenRequests;
