import { useState } from "react";
import { useNavigate } from "react-router";
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
      <div className="app-panel-raised mx-auto max-w-xl p-5 sm:p-7 lg:p-9">
        <p className="eyebrow">
          Institution connection
        </p>
        <h1 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">Connect an institution</h1>
        <p className="mb-6 mt-3 text-sm leading-6 text-[var(--text-muted)] sm:mb-7">
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
          <Button type="submit" loading={busy} disabled={publicId.trim().length < 3} fullWidth>
            Connect institution
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default ConnectInstitution;
