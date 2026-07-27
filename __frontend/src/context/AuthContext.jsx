import { useCallback, useEffect, useMemo, useState } from "react";

import { connectWallet, getConnectedAccounts } from "../utils/wallet";
import { resolveRole } from "../utils/resolveRole";
import AuthContext from "./authContextStore";

const SESSION_KEY = "pramaanchain.session";

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — session simply
    // won't survive a refresh, which is an acceptable degradation.
  }
}

export function AuthProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | ready | error
  const [error, setError] = useState(null);

  const disconnect = useCallback(() => {
    setAddress(null);
    setRole(null);
    setStatus("idle");
    writeSession(null);
  }, []);

  // Restore a session left by a previous connect, and pick up an already
  // connected MetaMask account on refresh without prompting again.
  useEffect(() => {
    (async () => {
      const cached = readSession();
      const [connected] = await getConnectedAccounts();

      if (connected && cached?.address?.toLowerCase() === connected.toLowerCase()) {
        setAddress(cached.address);
        setRole(cached.role);
        setStatus("ready");
      }
    })();
  }, []);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnect();
      } else if (accounts[0].toLowerCase() !== address?.toLowerCase()) {
        // Wallet switched accounts mid-session: drop back to login so the
        // role can be re-resolved for the new address.
        disconnect();
      }
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [address, disconnect]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    setError(null);

    try {
      const { address: connectedAddress } = await connectWallet();
      const resolvedRole = await resolveRole(connectedAddress);

      setAddress(connectedAddress);
      setRole(resolvedRole);
      setStatus("ready");
      writeSession({ address: connectedAddress, role: resolvedRole });

      return resolvedRole;
    } catch (err) {
      setStatus("error");
      setError(
        err.message === "METAMASK_NOT_INSTALLED"
          ? "MetaMask is not installed in this browser."
          : "Wallet connection was rejected or failed.",
      );
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({ address, role, status, error, connect, disconnect }),
    [address, role, status, error, connect, disconnect],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
