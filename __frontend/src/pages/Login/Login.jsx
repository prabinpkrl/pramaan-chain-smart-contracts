import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, ShieldCheck, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/useAuth";
import { homeForRole } from "../../utils/roleRoutes";
import {
  SEPOLIA_CHAIN_ID,
  chooseWalletAccount,
  connectWallet,
  getConnectedAccounts,
  getWalletSnapshot,
  isMetaMaskInstalled,
  requestNetworkSwitch,
  shortenAddress,
} from "../../utils/wallet";

function Login() {
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  const walletInstalled = isMetaMaskInstalled();
  const onSepolia = wallet?.chainId?.toLowerCase() === SEPOLIA_CHAIN_ID;

  const refreshWallet = useCallback(async (address) => {
    if (!address) {
      setWallet(null);
      return;
    }
    setWallet(await getWalletSnapshot(address));
  }, []);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    getConnectedAccounts()
      .then(([address]) => refreshWallet(address))
      .catch(() => setWallet(null));

    const handleAccountsChanged = ([address]) => {
      setLocalError(null);
      refreshWallet(address).catch(() => setWallet(null));
    };
    const handleChainChanged = () => {
      if (!wallet?.address) return;
      refreshWallet(wallet.address).catch(() => setWallet(null));
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refreshWallet, wallet?.address]);

  const runWalletAction = async (action) => {
    setWalletBusy(true);
    setLocalError(null);
    try {
      setWallet(await action());
    } catch (error) {
      setLocalError(
        error.code === 4001
          ? "The wallet request was rejected."
          : error.message || "The wallet could not be connected.",
      );
    } finally {
      setWalletBusy(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setWalletBusy(true);
    setLocalError(null);
    try {
      await requestNetworkSwitch();
      await refreshWallet(wallet.address);
    } catch (error) {
      setLocalError(
        error.code === 4001
          ? "The Sepolia network request was rejected."
          : error.message || "Could not switch the wallet to Sepolia.",
      );
    } finally {
      setWalletBusy(false);
    }
  };

  const handleSignIn = async () => {
    setLocalError(null);
    try {
      if (!onSepolia) {
        await requestNetworkSwitch();
        await refreshWallet(wallet.address);
      }
      const session = await signIn();
      const role = ["ADMIN", "ISSUER", "CITIZEN", "UNLINKED"]
        .find((candidate) => session.roles.includes(candidate));
      toast.success("Wallet signature verified.");
      navigate(homeForRole(role), { replace: true });
    } catch (error) {
      setLocalError(error.message || "Wallet sign-in was rejected. Please try again.");
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

          {!walletInstalled ? (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800 transition"
            >
              <Wallet size={18} />
              Install a browser wallet
            </a>
          ) : !wallet ? (
            <Button
              onClick={() => runWalletAction(connectWallet)}
              loading={walletBusy}
            >
              <Wallet size={18} />
              Connect wallet
            </Button>
          ) : (
            <div className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-green-700">
                <Link2 size={16} />
                Wallet connected
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">Address</dt>
                  <dd className="font-mono">{shortenAddress(wallet.address)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">Network</dt>
                  <dd className={onSepolia ? "text-green-700" : "text-amber-700"}>
                    {onSepolia ? "Sepolia" : `Chain ${wallet.chainId}`}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-500">Balance</dt>
                  <dd>{wallet.balance === null ? "Unavailable" : `${wallet.balance} ETH`}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2">
                {!onSepolia && (
                  <Button
                    variant="secondary"
                    onClick={handleSwitchNetwork}
                    loading={walletBusy}
                  >
                    Switch to Sepolia
                  </Button>
                )}
                <Button onClick={handleSignIn} loading={loading || walletBusy}>
                  <ShieldCheck size={18} />
                  Sign message and continue
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => runWalletAction(chooseWalletAccount)}
                  disabled={loading}
                  loading={walletBusy}
                >
                  Change account
                </Button>
              </div>
            </div>
          )}

          {localError && (
            <p className="text-red-600 text-sm mt-4">{localError}</p>
          )}

          <p className="text-xs text-gray-400 mt-8">
            Connecting exposes only the public address. The separate SIWE
            signature proves wallet control and does not submit a blockchain
            transaction. Public verification does not require login.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Login;
