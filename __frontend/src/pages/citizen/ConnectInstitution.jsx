import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/useAuth";
import { apiErrorMessage } from "../../services/api";
import { connectInstitution } from "../../services/documentService";
import { normalizePublicInstitutionId } from "../../utils/institution";

function ConnectInstitution() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [publicId, setPublicId] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const normalized = normalizePublicInstitutionId(publicId);
      const result = await connectInstitution(normalized);
      await refresh();
      toast.success(`${result.institution.name} connected.`);
      navigate("/citizen/requests", { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          Institution connection
        </p>
        <h1 className="mt-2 text-3xl font-bold">Connect an institution</h1>
        <p className="mb-6 mt-3 text-gray-600">
          Enter the stable public ID shared by the institution. Your SIWE
          session links this wallet privately; the connection is never
          written to the blockchain and needs no institution approval.
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            id="publicInstitutionId"
            label="Public institution ID"
            value={publicId}
            onChange={(event) => setPublicId(event.target.value)}
            placeholder="TU-NEPAL"
            autoComplete="off"
          />
          <Button type="submit" loading={busy} disabled={publicId.trim().length < 3}>
            Connect institution
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default ConnectInstitution;
