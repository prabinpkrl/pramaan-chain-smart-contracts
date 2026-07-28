import DashboardLayout from "../../components/layout/DashboardLayout";
import PageHeader from "../../components/common/PageHeader";
import { useAuth } from "../../context/useAuth";
import { config } from "../../config";

function Profile() {
  const { session } = useAuth();

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Wallet and network"
        title="Issuer profile"
        description="Review the authenticated wallet, institution memberships, Sepolia network, and contract reference."
      />

      <div className="app-panel max-w-4xl p-5 sm:p-7 lg:p-8">
        <h2 className="mb-5 border-b pb-4 text-xl font-semibold sm:mb-6">
          Issuer Authorization
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <p className="text-gray-500 text-sm">Wallet Status</p>
            <p className="font-semibold text-[var(--accent-strong)]">Connected</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Authorization Status</p>
            <p className="font-semibold">
              {session.roles.includes("ISSUER")
                ? "Authorized issuer"
                : "Not authorized"}
            </p>
          </div>
        </div>

        <h2 className="mb-5 mt-8 border-b pb-4 text-xl font-semibold sm:mb-6 sm:mt-10">
          Blockchain Information
        </h2>

        <div className="space-y-6">
          <div>
            <p className="text-gray-500 text-sm">Network</p>
            <p className="font-semibold">Sepolia Testnet ({config.chainId})</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Wallet Address</p>
            <p className="font-mono text-sm break-all bg-gray-100 p-3 rounded-lg">
              {session.address}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Smart Contract Address</p>
            <p className="font-mono text-sm break-all bg-gray-100 p-3 rounded-lg">
              {config.contractAddress}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Institution memberships</p>
            <ul className="mt-3 space-y-3">
              {session.issuerMemberships.map((institution) => (
                <li key={institution.id} className="rounded-lg bg-gray-100 p-3">
                  <span className="font-semibold">{institution.name}</span>
                  <span className="ml-2 font-mono text-xs text-blue-700">
                    {institution.publicId}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Profile;
