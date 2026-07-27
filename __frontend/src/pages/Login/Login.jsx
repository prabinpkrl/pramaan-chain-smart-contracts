import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/useAuth";
import { isMetaMaskInstalled } from "../../utils/wallet";
import { homeForRole } from "../../utils/roleRoutes";

function Login() {
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState(null);

  const connecting = loading;
  const metaMaskInstalled = isMetaMaskInstalled();

  const handleConnect = async () => {
    setLocalError(null);

    try {
      const session = await signIn();
      const role = ["ADMIN", "ISSUER", "CITIZEN", "UNLINKED"]
        .find((candidate) => session.roles.includes(candidate));
      toast.success("Wallet signature verified.");
      navigate(homeForRole(role), { replace: true });
    } catch (error) {
      setLocalError(
        metaMaskInstalled
          ? error.message || "Wallet sign-in was rejected. Please try again."
          : "MetaMask is not installed in this browser.",
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <Card>
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="bg-blue-100 text-blue-700 rounded-full p-3 mb-4">
            <ShieldCheck size={32} />
          </div>

          <h1 className="text-3xl font-bold text-blue-700 mb-2">PramaanChain</h1>

          <p className="text-gray-500 mb-8">
            Blockchain Document Verification Platform
          </p>

          {metaMaskInstalled ? (
            <Button onClick={handleConnect} loading={connecting}>
              <Wallet size={18} />
              Sign in with wallet
            </Button>
          ) : (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 transition"
            >
              <Wallet size={18} />
              Download MetaMask
            </a>
          )}

          {localError && (
            <p className="text-red-600 text-sm mt-4">{localError}</p>
          )}

          <p className="text-xs text-gray-400 mt-8">
            Signing verifies control of the wallet and does not submit a
            blockchain transaction. Public verification does not require login.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Login;
