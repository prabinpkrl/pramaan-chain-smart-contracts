const mockCertificates = [
  {
    id: "VC001",
    holder: "Mahesh Ayer",
    type: "Academic Certificate",
    status: "Active",
    issueDate: "2026-06-22",
    issuer: "PramaanChain",
    transactionId: "0x8fd73ca92ab452b18de09fcaa9a12345",
    blockchainStatus: "Anchored",
  },
  {
    id: "VC002",
    holder: "Ram Bahadur",
    type: "Birth Certificate",
    status: "Active",
    issueDate: "2026-06-20",
    issuer: "PramaanChain",
    transactionId: "0x7623ac891aab324f11234",
    blockchainStatus: "Anchored",
  },
  {
    id: "VC003",
    holder: "Sita Sharma",
    type: "Citizenship Certificate",

    status: "Revoked",

    issueDate: "2026-06-15",
    revokedDate: "2026-06-22",

    issuer: "PramaanChain",

    issueTransactionId: "0x123abc456def789",
    revokeTransactionId: "0x987xyz654uvw321",

    blockchainStatus: "Revoked",

    revokedReason: "Duplicate Record",
  },
];

export default mockCertificates;
