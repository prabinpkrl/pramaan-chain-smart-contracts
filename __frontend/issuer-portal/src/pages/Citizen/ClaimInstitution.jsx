import { useState } from "react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../contexts/useAuth";
import { apiErrorMessage } from "../../services/api";
import { claimCode } from "../../services/certificateService";
import { useRouter } from "../../routing/useRouter";

function ClaimInstitution() {
  const { refresh } = useAuth();
  const { navigate } = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const claim = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await claimCode(code.trim());
      await refresh();
      navigate("/citizen/requests");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel narrow-panel">
      <p className="eyebrow">Private institution link</p>
      <h1>Claim an institution</h1>
      <p className="muted">
        Enter the single-use code the institution gave you. The code establishes
        a private wallet–institution relationship and does not put your wallet on-chain.
      </p>
      <form className="form-stack" onSubmit={claim}>
        <Input
          label="One-time claim code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Paste the code exactly"
          required
        />
        <Button type="submit" disabled={busy}>{busy ? "Claiming…" : "Claim institution"}</Button>
      </form>
      {error && <p className="error-message" role="alert">{error}</p>}
    </section>
  );
}

export default ClaimInstitution;
