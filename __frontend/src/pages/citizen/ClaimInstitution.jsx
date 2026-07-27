import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/useAuth";
import { apiErrorMessage } from "../../services/api";
import { claimCode } from "../../services/documentService";

function ClaimInstitution() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await claimCode(code.trim());
      await refresh();
      toast.success("Institution linked to this wallet.");
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
          Private institution link
        </p>
        <h1 className="mt-2 text-3xl font-bold">Claim an institution</h1>
        <p className="mb-6 mt-3 text-gray-600">
          Enter the single-use code supplied by your institution. This creates
          a private wallet relationship; the code and relationship are never
          written to the blockchain.
        </p>
        <form onSubmit={handleSubmit}>
          <Input
            id="claimCode"
            label="One-time claim code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Paste the code exactly"
          />
          <Button type="submit" loading={busy} disabled={code.trim().length < 20}>
            Claim institution
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default ClaimInstitution;
