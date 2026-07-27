import { useState } from "react";
import toast from "react-hot-toast";
import { Search, UserPlus } from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import EtherscanLink from "../../components/common/EtherscanLink";

import { useAuth } from "../../context/useAuth";
import { apiErrorMessage } from "../../services/api";
import {
  authorizeIssuerOnChain,
  validateIssuerAddress,
} from "../../services/contractService";
import { checkIssuer } from "../../services/documentService";

function ManageIssuers() {
  const { session } = useAuth();
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [issuerAddress, setIssuerAddress] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [authorizationTxHash, setAuthorizationTxHash] = useState("");
  const [authorizationVerified, setAuthorizationVerified] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();

    if (!lookupAddress) {
      toast.error("Enter a wallet address to check.");
      return;
    }

    try {
      setChecking(true);
      const result = await checkIssuer(lookupAddress);
      setLookupResult(result);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error?.message || "Lookup failed.");
      setLookupResult(null);
    } finally {
      setChecking(false);
    }
  };

  const handleAuthorize = async (event) => {
    event.preventDefault();
    let normalized;
    try {
      normalized = validateIssuerAddress(issuerAddress.trim());
    } catch (error) {
      toast.error(error.message);
      return;
    }

    setAuthorizing(true);
    setAuthorizationTxHash("");
    setAuthorizationVerified(false);
    try {
      const current = await checkIssuer(normalized);
      if (current.authorized) {
        setLookupAddress(normalized);
        setLookupResult(current);
        toast.error("This wallet is already an authorized issuer.");
        return;
      }
      if (
        !window.confirm(
          `Authorize ${normalized} as an issuer on Sepolia? This submits one permanent public transaction.`,
        )
      ) return;

      const transactionHash = await authorizeIssuerOnChain(
        normalized,
        session.address,
      );
      setAuthorizationTxHash(transactionHash);
      const result = await checkIssuer(normalized);
      if (!result.authorized) {
        throw new Error("The transaction confirmed, but issuer authorization could not be verified");
      }
      setAuthorizationVerified(true);
      setLookupAddress(normalized);
      setLookupResult(result);
      setIssuerAddress("");
      toast.success("Issuer authorized on Sepolia.");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Manage Issuers</h1>

      {/* Real issuer lookup */}
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Check Issuer Authorization</h2>

        <form onSubmit={handleLookup} className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              label="Wallet Address"
              placeholder="0x..."
              value={lookupAddress}
              onChange={(e) => setLookupAddress(e.target.value)}
            />
          </div>

          <Button type="submit" loading={checking}>
            <Search size={16} />
            Check
          </Button>
        </form>

        {lookupResult && (
          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-sm">{lookupResult.address}</span>
            <Badge status={lookupResult.authorized ? "AUTHORIZED" : "UNAUTHORIZED"} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Authorize Issuer On-chain</h2>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-5">
          This action submits one public Sepolia transaction. MetaMask must be
          connected to the same administrator wallet used for SIWE login.
          The administrator key stays in the browser wallet and is never sent
          to either backend. On-chain authorization does not create the
          issuer&apos;s private institution membership; that relationship must
          already exist in the application backend.
        </div>

        <form onSubmit={handleAuthorize} className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              id="issuerAddress"
              label="New Issuer Wallet Address"
              placeholder="0x..."
              value={issuerAddress}
              onChange={(event) => setIssuerAddress(event.target.value)}
            />
          </div>
          <Button type="submit" loading={authorizing} disabled={!issuerAddress.trim()}>
            <UserPlus size={16} />
            Authorize Issuer
          </Button>
        </form>

        {authorizationTxHash && (
          <div className={`mt-5 rounded-lg border p-4 ${
            authorizationVerified
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}>
            <p className={`mb-2 font-semibold ${
              authorizationVerified ? "text-green-800" : "text-amber-800"
            }`}>
              {authorizationVerified
                ? "Authorization confirmed and independently read back."
                : "Transaction confirmed. Recheck issuer status before retrying."}
            </p>
            <p className="mb-3 break-all font-mono text-xs text-gray-700">
              {authorizationTxHash}
            </p>
            <EtherscanLink txHash={authorizationTxHash} />
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Issuer removal and administrator emergency revocation remain separate,
          deliberately unimplemented operations.
        </p>
      </div>
    </DashboardLayout>
  );
}

export default ManageIssuers;
