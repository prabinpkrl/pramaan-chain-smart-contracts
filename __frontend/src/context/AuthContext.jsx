import { useCallback, useEffect, useMemo, useState } from "react";
import {
  connectWalletAndSignIn,
  getSession,
  logout as logoutRequest,
} from "../services/authService";
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
    if (!window.ethereum) return undefined;
    const reset = () => {
      applySession(null);
      logoutRequest().catch(() => undefined);
    };
    window.ethereum.on?.("accountsChanged", reset);
    window.ethereum.on?.("chainChanged", reset);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", reset);
      window.ethereum.removeListener?.("chainChanged", reset);
    };
  }, [applySession]);

  const signIn = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await connectWalletAndSignIn();
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
      address: session?.address || null,
    }),
    [session, activeRole, loading, error, signIn, logout, refresh, setActiveRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
