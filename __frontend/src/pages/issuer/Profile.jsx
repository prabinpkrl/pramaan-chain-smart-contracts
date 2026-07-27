import DashboardLayout from "../../components/layout/DashboardLayout";
import { useAuth } from "../../context/useAuth";
import { config } from "../../config";

function Profile() {
  const { session } = useAuth();

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Issuer Profile</h1>

      <div className="bg-white rounded-xl shadow p-8 max-w-4xl">
        <h2 className="text-xl font-semibold mb-6 border-b pb-3">
          Issuer Authorization
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-gray-500 text-sm">Wallet Status</p>
            <p className="font-semibold text-green-600">🟢 Connected</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Authorization Status</p>
            <p className="font-semibold">
              {session.roles.includes("ISSUER")
                ? "🟢 Authorized issuer"
                : "🔴 Not authorized"}
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mt-10 mb-6 border-b pb-3">
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
            <ul className="mt-2 space-y-2">
              {session.issuerMemberships.map((institution) => (
                <li key={institution.id} className="rounded-lg bg-gray-100 p-3">
                  <span className="font-semibold">{institution.name}</span>
                  <span className="ml-2 font-mono text-xs text-gray-500">{institution.id}</span>
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
