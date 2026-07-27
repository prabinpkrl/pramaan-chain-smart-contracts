import { useCallback, useEffect, useMemo, useState } from "react";
import { connectWalletAndSignIn, getSession, logout as logoutRequest } from "../services/authService";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSession(await getSession());
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!window.ethereum) return undefined;
    const reset = () => {
      setSession(null);
      refresh();
    };
    window.ethereum.on?.("accountsChanged", reset);
    window.ethereum.on?.("chainChanged", reset);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", reset);
      window.ethereum.removeListener?.("chainChanged", reset);
    };
  }, [refresh]);

  const signIn = useCallback(async () => {
    setLoading(true);
    try {
      const next = await connectWalletAndSignIn();
      setSession(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, signIn, logout, refresh }),
    [session, loading, signIn, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
