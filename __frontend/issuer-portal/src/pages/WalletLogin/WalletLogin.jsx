import { useState } from "react";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { useAuth } from "../../contexts/useAuth";
import { apiErrorMessage } from "../../services/api";
import { Link } from "../../routing/Link";
import { useRouter } from "../../routing/useRouter";

function destination(roles) {
  if (roles.includes("ISSUER")) return "/issuer";
  if (roles.includes("CITIZEN")) return "/citizen";
  if (roles.includes("UNLINKED")) return "/citizen/claim";
  return null;
}

function WalletLogin() {
  const { signIn, loading } = useAuth();
  const { navigate } = useRouter();
  const [error, setError] = useState("");

  const connect = async () => {
    setError("");
    try {
      const session = await signIn();
      const next = destination(session.roles);
      if (!next) {
        setError("Administrator access is recognized, but administrative operations are outside this portal.");
        return;
      }
      navigate(next);
    } catch (walletError) {
      setError(apiErrorMessage(walletError));
    }
  };

  return (
    <div className="login-page">
      <Card>
        <Link to="/" className="brand">PramaanChain</Link>
        <h1>Wallet sign in</h1>
        <p className="muted">
          Sign a standard SIWE message to prove wallet control. Signing is free
          and does not create a blockchain transaction.
        </p>
        <Button onClick={connect} disabled={loading}>
          {loading ? "Waiting for wallet…" : "Connect and sign"}
        </Button>
        {error && <p className="error-message" role="alert">{error}</p>}
        <Link to="/verify" className="text-link">Verify without signing in</Link>
      </Card>
    </div>
  );
}

export default WalletLogin;
