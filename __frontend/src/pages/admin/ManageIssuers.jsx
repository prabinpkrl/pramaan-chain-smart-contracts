import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Building2, Search } from "lucide-react";

import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import EtherscanLink from "../../components/common/EtherscanLink";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import TransactionProgress from "../../components/common/TransactionProgress";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/useAuth";
import { apiErrorMessage } from "../../services/api";
import {
  authorizeIssuerOnChain,
  validateIssuerAddress,
} from "../../services/contractService";
import {
  checkIssuer,
  listAdminInstitutions,
  registerInstitution,
} from "../../services/documentService";
import { normalizePublicInstitutionId } from "../../utils/institution";

function ManageIssuers() {
  const { session } = useAuth();
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [publicId, setPublicId] = useState("");
  const [issuerAddress, setIssuerAddress] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [provisioning, setProvisioning] = useState(false);
  const [authorizationTxHash, setAuthorizationTxHash] = useState("");
  const [authorizationVerified, setAuthorizationVerified] = useState(false);
  const [pendingProvision, setPendingProvision] = useState(null);
  const [transactionStep, setTransactionStep] = useState("");

  const loadInstitutions = useCallback(async () => {
    setInstitutions(await listAdminInstitutions());
  }, []);

  useEffect(() => {
    listAdminInstitutions()
      .then(setInstitutions)
      .catch((error) => toast.error(apiErrorMessage(error)));
  }, []);

  const handleLookup = async (event) => {
    event.preventDefault();
    if (!lookupAddress.trim()) {
      toast.error("Enter a wallet address to check.");
      return;
    }
    try {
      setChecking(true);
      const normalized = validateIssuerAddress(lookupAddress.trim());
      const result = await checkIssuer(normalized);
      setLookupAddress(normalized);
      setLookupResult(result);
    } catch (error) {
      toast.error(apiErrorMessage(error));
      setLookupResult(null);
    } finally {
      setChecking(false);
    }
  };

  const handleProvision = async (event) => {
    event.preventDefault();
    let normalizedPublicId;
    let normalizedIssuer;
    try {
      normalizedPublicId = normalizePublicInstitutionId(publicId);
      normalizedIssuer = validateIssuerAddress(issuerAddress.trim());
      if (institutionName.trim().length < 2) {
        throw new Error("Institution name must contain at least two characters");
      }
    } catch (error) {
      toast.error(error.message);
      return;
    }

    setPendingProvision({
      publicId: normalizedPublicId,
      name: institutionName.trim(),
      issuerAddress: normalizedIssuer,
    });
  };

  const provision = async ({ publicId: normalizedPublicId, name, issuerAddress: normalizedIssuer }) => {
    setProvisioning(true);
    setAuthorizationTxHash("");
    setAuthorizationVerified(false);
    setTransactionStep("check");
    try {
      let issuerStatus = await checkIssuer(normalizedIssuer);
      if (!issuerStatus.authorized) {
        setTransactionStep("wallet");
        const transactionHash = await authorizeIssuerOnChain(
          normalizedIssuer,
          session.address,
        );
        setAuthorizationTxHash(transactionHash);
        issuerStatus = await checkIssuer(normalizedIssuer);
        if (!issuerStatus.authorized) {
          throw new Error(
            "The transaction confirmed, but issuer authorization could not be verified",
          );
        }
      }
      setAuthorizationVerified(true);

      setTransactionStep("register");
      const institution = await registerInstitution(
        normalizedPublicId,
        name,
        normalizedIssuer,
      );
      await loadInstitutions();
      setInstitutionName("");
      setPublicId("");
      setIssuerAddress("");
      setLookupAddress(normalizedIssuer);
      setLookupResult(issuerStatus);
      toast.success(`${institution.name} registered with ID ${institution.publicId}.`);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setProvisioning(false);
      setTransactionStep("");
    }
  };

  const copyPublicId = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Public institution ID copied.");
    } catch {
      toast.error("Could not copy the institution ID.");
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Administrator controls"
        title="Institutions and issuers"
        description="Check an issuer’s current role, authorize a primary wallet when required, and register its private institution membership."
      />

      <section className="app-panel panel-padding section-spacing">
        <h2 className="mb-4 text-xl font-semibold">Check Issuer Authorization</h2>
        <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex-1">
            <Input
              id="issuerLookup"
              label="Wallet Address"
              placeholder="0x..."
              value={lookupAddress}
              onChange={(event) => setLookupAddress(event.target.value)}
            />
          </div>
          <Button type="submit" loading={checking}>
            <Search size={16} />
            Check
          </Button>
        </form>
        {lookupResult && (
          <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <span className="break-all font-mono text-sm">{lookupResult.address}</span>
            <Badge status={lookupResult.authorized ? "AUTHORIZED" : "UNAUTHORIZED"} />
          </div>
        )}
      </section>

      <section className="app-panel panel-padding section-spacing">
        <h2 className="mb-2 text-xl font-semibold">Create Institution</h2>
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          The public ID is permanent and shareable, for example{" "}
          <code>TU-NEPAL</code>. If needed, MetaMask submits one Sepolia
          authorization transaction. The primary issuer wallet is then
          registered privately with the institution.
        </div>
        <form onSubmit={handleProvision} className="grid gap-x-4 lg:grid-cols-2">
          <Input
            id="institutionName"
            label="Institution Name"
            placeholder="Tribhuvan University"
            value={institutionName}
            onChange={(event) => setInstitutionName(event.target.value)}
          />
          <Input
            id="publicInstitutionId"
            label="Public Institution ID"
            placeholder="TU-NEPAL"
            value={publicId}
            onChange={(event) => setPublicId(event.target.value)}
            autoComplete="off"
          />
          <div className="lg:col-span-2">
            <Input
              id="primaryIssuerAddress"
              label="Primary Issuer Wallet"
              placeholder="0x..."
              value={issuerAddress}
              onChange={(event) => setIssuerAddress(event.target.value)}
            />
          </div>
          <div className="lg:col-span-2">
            <Button
              type="submit"
              loading={provisioning}
              disabled={!institutionName.trim() || !publicId.trim() || !issuerAddress.trim()}
            >
              <Building2 size={16} />
              Authorize and Register Institution
            </Button>
          </div>
        </form>

        {authorizationTxHash && (
          <div className={`mt-5 rounded-lg border p-4 ${
            authorizationVerified
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}>
            <p className="mb-2 font-semibold">
              {authorizationVerified
                ? "Issuer authorization confirmed."
                : "Transaction confirmed. Retry registration without resending it."}
            </p>
            <p className="mb-3 break-all font-mono text-xs">{authorizationTxHash}</p>
            <EtherscanLink txHash={authorizationTxHash} />
          </div>
        )}
      </section>

      <section className="app-panel panel-padding">
        <h2 className="mb-4 text-xl font-semibold">Registered Institutions</h2>
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
          {institutions.map((institution) => (
            <article key={institution.id} className="rounded-xl border bg-[var(--surface-raised)] p-4 sm:p-5">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div>
                  <h3 className="text-lg font-semibold">{institution.name}</h3>
                  <button
                    type="button"
                    onClick={() => copyPublicId(institution.publicId)}
                    className="mt-1 font-mono text-sm text-blue-700 hover:underline"
                  >
                    {institution.publicId} · Copy
                  </button>
                </div>
                <Badge status={institution.authorized ? "AUTHORIZED" : "UNAUTHORIZED"} />
              </div>
              <p className="mt-4 break-all font-mono text-xs text-gray-500">
                {institution.issuerAddress}
              </p>
            </article>
          ))}
          {institutions.length === 0 && (
            <div className="rounded-xl border border-dashed p-5">
              <p className="font-medium">No institutions are registered yet.</p>
              <p className="mt-1 text-sm text-gray-500">
                Start by entering an institution and its primary issuer wallet
                above. Your administrator wallet will authorize that issuer
                on-chain before the private membership is registered.
              </p>
            </div>
          )}
        </div>
      </section>
      <ConfirmModal
        isOpen={Boolean(pendingProvision)}
        title="Authorize and register institution?"
        message={`Confirm ${pendingProvision?.name || ""} (${pendingProvision?.publicId || ""}) with primary issuer ${pendingProvision?.issuerAddress || ""}. If authorization is missing, your administrator wallet will send one Sepolia transaction.`}
        confirmText="Authorize and register"
        confirmVariant="primary"
        onCancel={() => setPendingProvision(null)}
        onConfirm={() => {
          const next = pendingProvision;
          setPendingProvision(null);
          if (next) provision(next);
        }}
      />
      {transactionStep && (
        <TransactionProgress
          title="Provision institution"
          currentStep={transactionStep}
          steps={[
            { id: "check", label: "Check current on-chain authorization", detail: "Already-authorized wallets do not send another transaction." },
            { id: "wallet", label: "Authorize issuer if required", detail: "Only the administrator wallet may send this Sepolia role transaction." },
            { id: "register", label: "Register private institution membership", detail: "The public ID and encrypted membership are stored off-chain." },
          ]}
        />
      )}
    </DashboardLayout>
  );
}

export default ManageIssuers;
