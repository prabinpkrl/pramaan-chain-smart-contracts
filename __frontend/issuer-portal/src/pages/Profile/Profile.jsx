import DashboardLayout from "../../components/layout/DashboardLayout";
import Button from "../../components/common/Button";

function Profile() {
  const issuer = {
    organization: "Westcliff University",
    issuerName: "Mahesh Ayer",
    email: "mahesh.ayer@gmail.com",
    role: "Registrar",
    organizationId: "WU-001",
    walletStatus: "Connected",

    network: "Sepolia Testnet",

    walletAddress: "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",

    contractAddress: "0x0bb21729BBDaBe54A289A1e924941F8F635Cab84",
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Issuer Profile</h1>

      <div className="bg-white rounded-xl shadow p-8 max-w-4xl">
        {/* Organization */}
        <h2 className="text-xl font-semibold mb-6 border-b pb-3">
          Organization Information
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-gray-500 text-sm">Organization</p>

            <p className="font-semibold text-lg">{issuer.organization}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Organization ID</p>

            <p className="font-semibold text-lg">{issuer.organizationId}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Authorized Issuer</p>

            <p className="font-semibold text-lg">{issuer.issuerName}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Role</p>

            <p className="font-semibold text-lg">{issuer.role}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Email Address</p>

            <p className="font-semibold text-lg">{issuer.email}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Wallet Status</p>

            <p className="font-semibold text-green-600">
              🟢 {issuer.walletStatus}
            </p>
          </div>
        </div>

        {/* Blockchain */}
        <h2 className="text-xl font-semibold mt-10 mb-6 border-b pb-3">
          Blockchain Information
        </h2>

        <div className="space-y-6">
          <div>
            <p className="text-gray-500 text-sm">Network</p>

            <p className="font-semibold">{issuer.network}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Wallet Address</p>

            <p className="font-mono text-sm break-all bg-gray-100 p-3 rounded-lg">
              {issuer.walletAddress}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Smart Contract Address</p>

            <p className="font-mono text-sm break-all bg-gray-100 p-3 rounded-lg">
              {issuer.contractAddress}
            </p>
          </div>
        </div>

        <div className="mt-10 flex gap-4">
          <Button>Edit Profile</Button>

          <Button variant="secondary">Change Password</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Profile;
