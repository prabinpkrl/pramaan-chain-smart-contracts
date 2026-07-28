import { appApi, setCsrfToken } from "./api";
import { getActiveWalletProvider } from "../utils/walletProvider";

export async function connectWalletAndSignIn(provider) {
  const selectedProvider = provider || getActiveWalletProvider();
  if (!selectedProvider || typeof selectedProvider.request !== "function") {
    throw new Error("Connect a browser or mobile wallet first");
  }
  const accounts = await selectedProvider.request({ method: "eth_requestAccounts" });
  const address = accounts[0];
  if (!address) throw new Error("The wallet did not provide an account");

  const challenge = await appApi.post("/auth/nonce", { address });
  const signature = await selectedProvider.request({
    method: "personal_sign",
    params: [challenge.data.message, address],
  });
  const response = await appApi.post("/auth/verify", {
    message: challenge.data.message,
    signature,
  });
  setCsrfToken(response.data.csrfToken);
  return response.data;
}

export async function getSession() {
  try {
    const response = await appApi.get("/auth/session");
    setCsrfToken(response.data.csrfToken);
    return response.data;
  } catch (error) {
    setCsrfToken(null);
    throw error;
  }
}

export async function logout() {
  try {
    await appApi.post("/auth/logout");
  } finally {
    setCsrfToken(null);
  }
}
