import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Link2, Network, ShieldCheck, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Brand from "../../components/brand/Brand";
import AnimatedGrid from "../../components/visual/AnimatedGrid";
import SignatureVaultFallback from "../../components/visual/SignatureVaultFallback";
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

const SignatureVault = lazy(() => import("../../components/visual/SignatureVault"));

function Login() {
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [use3d, setUse3d] = useState(false);

  const walletInstalled = isMetaMaskInstalled();
  const onSepolia = wallet?.chainId?.toLowerCase() === SEPOLIA_CHAIN_ID;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setUse3d(
        desktop.matches
        && !reduced.matches
        && Boolean(window.WebGLRenderingContext),
      );
    };

    update();
    desktop.addEventListener?.("change", update);
    reduced.addEventListener?.("change", update);
    return () => {
      desktop.removeEventListener?.("change", update);
      reduced.removeEventListener?.("change", update);
    };
  }, []);

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
    <main className="grid min-h-screen bg-[var(--canvas)] lg:grid-cols-[1fr_1.05fr]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-[var(--border)] p-10 lg:flex lg:flex-col xl:p-12">
        <AnimatedGrid />
        <div className="relative z-10">
          <Brand />
        </div>

        <div className="relative z-10 grid min-h-0 flex-1 grid-rows-[minmax(300px,1fr)_auto]">
          <div className="relative min-h-[300px]">
            {use3d ? (
              <Suspense
                fallback={(
                  <SignatureVaultFallback className="absolute inset-0 h-full w-full p-8" />
                )}
              >
                <SignatureVault />
              </Suspense>
            ) : (
              <SignatureVaultFallback className="absolute inset-0 h-full w-full p-8" />
            )}
            <div className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 border-l border-[var(--accent)] pl-3">
              <p className="mono-value whitespace-nowrap text-[0.65rem] tracking-[0.14em] text-[var(--text-muted)]">
                SIGNATURE / VERIFIED LOCALLY
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            <p className="eyebrow">SIWE access protocol</p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-0.05em] xl:text-5xl">
              One signature.
              <span className="mt-1 block text-[var(--accent-strong)]">
                The right workspace.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--text-muted)] xl:text-base xl:leading-7">
              Prove control of a public wallet with a one-time message. No
              password, private key, or blockchain transaction enters the flow.
            </p>

            <dl className="mt-7 grid grid-cols-3 border-y border-[var(--border)]">
              {[
                ["01", "Account", "Public address"],
                ["02", "Network", "Sepolia"],
                ["03", "Session", "HttpOnly"],
              ].map(([number, label, value]) => (
                <div
                  key={number}
                  className="border-r border-[var(--border)] px-3 py-4 first:pl-0 last:border-r-0"
                >
                  <dt className="mono-value text-[0.6rem] tracking-[0.12em] text-[var(--accent-strong)]">
                    {number} / {label}
                  </dt>
                  <dd className="mt-1 text-xs text-[var(--text-muted)]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <p className="relative z-10 mt-8 text-xs text-[var(--text-dim)]">
          PramaanChain · Ethereum Sepolia prototype
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex items-center justify-between sm:mb-10 lg:hidden">
            <Brand />
            <Link to="/" className="rounded-lg p-2 text-[var(--text-muted)]" aria-label="Back home">
              <ArrowLeft size={20} />
            </Link>
          </div>
          <Link
            to="/"
            className="mb-7 hidden min-h-10 w-fit items-center gap-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)] lg:inline-flex"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>
          <div className="mb-7 sm:mb-8">
            <p className="eyebrow">Secure sign-in</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Enter your workspace
            </h2>
          </div>

          <div className="mb-5 grid grid-cols-3 overflow-hidden rounded-xl border border-[var(--border)]" aria-label="Sign-in progress">
            {[
              { label: "Connect", done: Boolean(wallet), active: !wallet },
              { label: "Network", done: Boolean(wallet && onSepolia), active: Boolean(wallet && !onSepolia) },
              { label: "Sign", done: false, active: Boolean(wallet && onSepolia) },
            ].map((step, index) => (
              <div
                key={step.label}
                className={`border-r border-[var(--border)] p-3 last:border-r-0 ${
                  step.done
                    ? "bg-[var(--canvas-soft)] text-[var(--accent-strong)]"
                    : step.active
                      ? "bg-[var(--accent-soft)] text-[var(--text)]"
                      : "bg-[var(--surface)] text-[var(--text-muted)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="mono-value text-[10px] text-[var(--text-dim)]">0{index + 1}</p>
                  <p className="mono-value text-[9px] tracking-[0.1em]">
                    {step.done ? "DONE" : step.active ? "CURRENT" : "NEXT"}
                  </p>
                </div>
                <p className="mt-2 text-xs font-semibold">{step.label}</p>
              </div>
            ))}
          </div>

          <Card elevated className="sm:p-7">
            {!walletInstalled ? (
              <div className="text-center">
                <div className="mx-auto mb-5 w-fit rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--accent-strong)]">
                  <Wallet size={24} />
                </div>
                <h3 className="text-lg font-semibold">Browser wallet required</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-muted)]">
                  Install a compatible injected wallet to authenticate.
                  Public document verification remains available without one.
                </p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[#090a0d]"
                >
                  <Wallet size={17} />
                  Install a browser wallet
                </a>
              </div>
            ) : !wallet ? (
              <div>
                <div className="mb-6 flex items-start gap-4">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--accent-strong)]">
                    <Wallet size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Connect your wallet</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                      This reveals only the public account you approve.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => runWalletAction(connectWallet)}
                  loading={walletBusy}
                  fullWidth
                  size="lg"
                >
                  <Wallet size={18} />
                  Connect wallet
                </Button>
              </div>
            ) : (
              <div>
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-2.5 text-[var(--accent-strong)]">
                      <Link2 size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Wallet connected</p>
                      <p className="mono-value mt-0.5 text-xs text-[var(--text-muted)]">
                        {shortenAddress(wallet.address)}
                      </p>
                    </div>
                  </div>
                  <span className="mono-value border-l border-[var(--accent)] pl-3 text-[0.65rem] tracking-[0.12em] text-[var(--text-muted)]">
                    READY
                  </span>
                </div>
                <dl className="grid gap-3">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
                    <dt className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                      <Network size={15} />
                      Network
                    </dt>
                    <dd
                      data-testid="wallet-network"
                      className={`text-sm font-semibold ${onSepolia ? "text-[var(--accent-strong)]" : "text-[var(--warning)]"}`}
                    >
                      {onSepolia ? "Sepolia" : `Chain ${wallet.chainId}`}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
                    <dt className="text-sm text-[var(--text-muted)]">Available balance</dt>
                    <dd className="mono-value text-sm">
                      {wallet.balance === null ? "Unavailable" : `${wallet.balance} ETH`}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 grid gap-2.5">
                  {!onSepolia && (
                    <Button
                      variant="secondary"
                      onClick={handleSwitchNetwork}
                      loading={walletBusy}
                      fullWidth
                    >
                      <Network size={17} />
                      Switch to Sepolia
                    </Button>
                  )}
                  <Button
                    onClick={handleSignIn}
                    loading={loading || walletBusy}
                    fullWidth
                    size="lg"
                  >
                    <ShieldCheck size={18} />
                    Sign message and continue
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => runWalletAction(chooseWalletAccount)}
                    disabled={loading}
                    loading={walletBusy}
                    fullWidth
                  >
                    Change account
                  </Button>
                </div>
              </div>
            )}

            {localError && (
              <div role="alert" className="mt-5 rounded-xl border border-[#71303c] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]">
                {localError}
              </div>
            )}
          </Card>

          <div className="mt-6 flex justify-end text-xs">
            <Link to="/verify" className="text-[var(--accent-strong)] hover:text-[var(--text)]">
              Verify without signing in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Login;
