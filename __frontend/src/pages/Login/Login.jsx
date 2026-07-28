import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Network,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Brand from "../../components/brand/Brand";
import AnimatedGrid from "../../components/visual/AnimatedGrid";
import SignatureVaultFallback from "../../components/visual/SignatureVaultFallback";
import { config } from "../../config";
import { useAuth } from "../../context/useAuth";
import { useInjectedWallets } from "../../hooks/useInjectedWallets";
import { homeForRole } from "../../utils/roleRoutes";
import {
  SEPOLIA_CHAIN_ID,
  chooseWalletAccount,
  connectMobileWallet,
  connectWallet,
  getConnectedAccounts,
  getWalletSnapshot,
  requestNetworkSwitch,
  shortenAddress,
} from "../../utils/wallet";

const SignatureVault = lazy(() => import("../../components/visual/SignatureVault"));

function safeWalletIcon(icon) {
  if (typeof icon !== "string") return "";
  return icon.startsWith("data:image/") || icon.startsWith("https://") ? icon : "";
}

function WalletIdentity({ info, size = "md" }) {
  const icon = safeWalletIcon(info?.icon);
  const dimensions = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return icon ? (
    <img
      src={icon}
      alt=""
      className={`${dimensions} rounded-lg object-cover`}
    />
  ) : (
    <span
      className={`grid ${dimensions} place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--accent-strong)]`}
      aria-hidden="true"
    >
      <Wallet size={size === "sm" ? 16 : 19} />
    </span>
  );
}

function Login() {
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();
  const injectedWallets = useInjectedWallets();
  const [wallet, setWallet] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedWalletInfo, setSelectedWalletInfo] = useState(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [use3d, setUse3d] = useState(false);

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

  const refreshWallet = useCallback(async (address, provider) => {
    if (!address) {
      setWallet(null);
      return;
    }
    setWallet(await getWalletSnapshot(address, provider));
  }, []);

  useEffect(() => {
    if (
      wallet
      || selectedProvider
      || injectedWallets.length !== 1
    ) {
      return undefined;
    }

    const [{ provider, info }] = injectedWallets;
    getConnectedAccounts(provider)
      .then(([address]) => {
        if (!address) return;
        setSelectedProvider(provider);
        setSelectedWalletInfo(info);
        return refreshWallet(address, provider);
      })
      .catch(() => setWallet(null));
    return undefined;
  }, [injectedWallets, refreshWallet, selectedProvider, wallet]);

  useEffect(() => {
    const provider = selectedProvider;
    if (!provider) return undefined;

    const handleAccountsChanged = ([address]) => {
      setLocalError(null);
      refreshWallet(address, provider).catch(() => setWallet(null));
    };
    const handleChainChanged = () => {
      if (!wallet?.address) return;
      refreshWallet(wallet.address, provider).catch(() => setWallet(null));
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);
    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refreshWallet, selectedProvider, wallet?.address]);

  const runWalletAction = async (action, provider, info) => {
    setWalletBusy(true);
    setLocalError(null);
    try {
      setSelectedProvider(provider);
      setSelectedWalletInfo(info);
      setWallet(await action(provider));
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

  const handleMobileConnect = async () => {
    setWalletBusy(true);
    setLocalError(null);
    try {
      const connection = await connectMobileWallet(config.walletConnectProjectId);
      setSelectedProvider(connection.provider);
      setSelectedWalletInfo(connection.info);
      setWallet(connection.wallet);
    } catch (error) {
      setLocalError(
        error.message === "WALLETCONNECT_NOT_CONFIGURED"
          ? "Mobile QR login is not configured for this environment yet."
          : error.code === 4001
            ? "The mobile wallet request was rejected."
            : error.message || "The mobile wallet could not be connected.",
      );
    } finally {
      setWalletBusy(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setWalletBusy(true);
    setLocalError(null);
    try {
      await requestNetworkSwitch(selectedProvider);
      await refreshWallet(wallet.address, selectedProvider);
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
        await requestNetworkSwitch(selectedProvider);
        await refreshWallet(wallet.address, selectedProvider);
      }
      const session = await signIn(selectedProvider);
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
            {!wallet ? (
              <div>
                <div className="mb-6 flex items-start gap-4">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--accent-strong)]">
                    <Wallet size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Choose a wallet</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                      {injectedWallets.length
                        ? `${injectedWallets.length} browser wallet${
                          injectedWallets.length === 1 ? "" : "s"
                        } detected. Select the one you want to use.`
                        : "No browser wallet was detected. Use a mobile wallet or follow the installation guide."}
                    </p>
                  </div>
                </div>

                {injectedWallets.length > 0 && (
                  <div className="grid gap-2" aria-label="Detected browser wallets">
                    {injectedWallets.map(({ info, provider }) => (
                      <button
                        key={info.uuid}
                        type="button"
                        onClick={() => runWalletAction(connectWallet, provider, info)}
                        disabled={walletBusy}
                        className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-left transition hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] disabled:cursor-wait disabled:opacity-60"
                        aria-label={`Connect ${info.name}`}
                      >
                        <WalletIdentity info={info} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{info.name}</span>
                          <span className="mt-0.5 block text-xs text-[var(--text-dim)]">
                            Browser extension
                          </span>
                        </span>
                        <ArrowRight size={16} className="text-[var(--text-dim)]" />
                      </button>
                    ))}
                  </div>
                )}

                <div className={`${injectedWallets.length ? "mt-5 border-t border-[var(--border)] pt-5" : ""}`}>
                  <button
                    type="button"
                    onClick={handleMobileConnect}
                    disabled={walletBusy}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--canvas-soft)] px-3 text-left transition hover:border-[var(--accent)] disabled:cursor-wait disabled:opacity-60"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--accent-strong)]">
                      <QrCode size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">Connect mobile wallet</span>
                      <span className="mt-0.5 block text-xs text-[var(--text-dim)]">
                        WalletConnect QR or mobile app
                      </span>
                    </span>
                    <Smartphone size={17} className="text-[var(--text-dim)]" />
                  </button>
                  {!config.walletConnectProjectId && (
                    <p className="mt-2 text-xs leading-5 text-[var(--text-dim)]">
                      Mobile QR requires WalletConnect configuration for this deployment.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowInstallGuide((current) => !current)}
                  className="mt-5 flex min-h-11 w-full items-center justify-between border-t border-[var(--border)] pt-4 text-left text-sm font-semibold text-[var(--text-muted)] transition hover:text-[var(--text)]"
                  aria-expanded={showInstallGuide || injectedWallets.length === 0}
                >
                  <span className="flex items-center gap-2">
                    <Download size={16} />
                    Install a browser wallet
                  </span>
                  <span className="mono-value text-xs text-[var(--accent-strong)]">
                    {showInstallGuide || injectedWallets.length === 0 ? "HIDE" : "GUIDE"}
                  </span>
                </button>

                {(showInstallGuide || injectedWallets.length === 0) && (
                  <div className="mt-4 border-l border-[var(--accent)] pl-4">
                    <ol className="space-y-3 text-xs leading-5 text-[var(--text-muted)]">
                      <li><span className="mono-value mr-2 text-[var(--accent-strong)]">01</span>Choose and install an official wallet extension.</li>
                      <li><span className="mono-value mr-2 text-[var(--accent-strong)]">02</span>Create or restore the wallet inside its official app.</li>
                      <li><span className="mono-value mr-2 text-[var(--accent-strong)]">03</span>Return here, refresh, and select the detected wallet.</li>
                    </ol>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
                      <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-strong)] hover:text-[var(--text)]">MetaMask</a>
                      <a href="https://rabby.io/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-strong)] hover:text-[var(--text)]">Rabby</a>
                      <a href="https://www.coinbase.com/wallet/downloads" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-strong)] hover:text-[var(--text)]">Coinbase Wallet</a>
                    </div>
                    <p className="mt-4 text-xs leading-5 text-[var(--text-dim)]">
                      Never enter a seed phrase or private key on this website.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-5 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
                  <div className="flex items-center gap-3">
                    <WalletIdentity info={selectedWalletInfo} />
                    <div>
                      <p className="text-sm font-semibold">
                        {selectedWalletInfo?.name || "Wallet"} connected
                      </p>
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
                    onClick={() => runWalletAction(
                      chooseWalletAccount,
                      selectedProvider,
                      selectedWalletInfo,
                    )}
                    disabled={loading}
                    loading={walletBusy}
                    fullWidth
                  >
                    Change account
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setWallet(null);
                      setSelectedProvider(null);
                      setSelectedWalletInfo(null);
                      setLocalError(null);
                    }}
                    className="min-h-10 text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
                  >
                    Choose another wallet
                  </button>
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
