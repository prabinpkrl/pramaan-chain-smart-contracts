import { useCallback, useEffect, useMemo, useState } from "react";
import {
  connectWalletAndSignIn,
  getSession,
  logout as logoutRequest,
} from "../services/authService";
import {
  clearActiveWalletProvider,
  getActiveWalletProvider,
  setActiveWalletProvider,
} from "../utils/walletProvider";
import AuthContext from "./authContextStore";

const ROLE_PRIORITY = ["ADMIN", "ISSUER", "CITIZEN", "UNLINKED"];

function defaultRole(session) {
  return ROLE_PRIORITY.find((role) => session?.roles?.includes(role)) || null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [activeRole, setActiveRoleState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletProvider, setWalletProviderState] = useState(
    () => getActiveWalletProvider(),
  );

  const applySession = useCallback((next) => {
    setSession(next);
    setActiveRoleState((current) =>
      next?.roles?.includes(current) ? current : defaultRole(next));
  }, []);

  const refresh = useCallback(async () => {
    try {
      applySession(await getSession());
    } catch {
      applySession(null);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    getSession()
      .then(applySession)
      .catch(() => applySession(null))
      .finally(() => setLoading(false));
  }, [applySession]);

  useEffect(() => {
    const provider = walletProvider || getActiveWalletProvider();
    if (!provider) return undefined;
    const reset = () => {
      applySession(null);
      logoutRequest().catch(() => undefined);
    };
    provider.on?.("accountsChanged", reset);
    provider.on?.("chainChanged", reset);
    return () => {
      provider.removeListener?.("accountsChanged", reset);
      provider.removeListener?.("chainChanged", reset);
    };
  }, [applySession, walletProvider]);

  const signIn = useCallback(async (provider) => {
    setLoading(true);
    setError(null);
    try {
      setActiveWalletProvider(provider);
      setWalletProviderState(provider);
      const next = await connectWalletAndSignIn(provider);
      applySession(next);
      return next;
    } catch (err) {
      setError(err.message || "Wallet sign-in failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearActiveWalletProvider();
      setWalletProviderState(null);
      applySession(null);
    }
  }, [applySession]);

  const setActiveRole = useCallback((role) => {
    if (session?.roles?.includes(role)) setActiveRoleState(role);
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      activeRole,
      loading,
      error,
      signIn,
      logout,
      refresh,
      setActiveRole,
      walletProvider,
      address: session?.address || null,
    }),
    [
      session,
      activeRole,
      loading,
      error,
      signIn,
      logout,
      refresh,
      setActiveRole,
      walletProvider,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
