import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/useAuth";
import { isMetaMaskInstalled } from "../../utils/wallet";

const ROLE_HOME = {
  admin: "/admin/dashboard",
  issuer: "/issuer/dashboard",
  citizen: "/citizen/dashboard",
};

function Login() {
  const { connect, status } = useAuth();
  const navigate = useNavigate();
  const [localError, setLocalError] = useState(null);

  const connecting = status === "connecting";
  const metaMaskInstalled = isMetaMaskInstalled();

  const handleConnect = async () => {
    setLocalError(null);

    try {
      const role = await connect();
      toast.success("Wallet connected.");
      navigate(ROLE_HOME[role] || "/", { replace: true });
    } catch {
      setLocalError(
        metaMaskInstalled
          ? "Connection was rejected. Please try again."
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
              Connect with MetaMask
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
            Admins and authorized issuers are routed to their portals
            automatically. Every other connected wallet lands on the Citizen
            Portal to verify documents.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Login;
