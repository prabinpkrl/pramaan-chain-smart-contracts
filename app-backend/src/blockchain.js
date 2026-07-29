import {
  Contract,
  Interface,
  JsonRpcProvider,
  getAddress,
} from "ethers";
import { badRequest, forbidden } from "./errors.js";

const ABI = [
  "function ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function isAuthorizedIssuer(address issuer) view returns (bool)",
  "function verifyCertificate(bytes32 documentHash) view returns (uint8)",
  "function getCertificate(bytes32 documentHash) view returns (tuple(address issuer,uint64 issuedAt,uint64 revokedAt,uint8 status))",
  "event CertificateIssued(bytes32 indexed documentHash,address indexed issuer,uint64 issuedAt)",
  "event CertificateRevoked(bytes32 indexed documentHash,address indexed issuer,address indexed revokedBy,uint64 revokedAt)",
];

const STATUS_NAMES = ["NOT_FOUND", "ACTIVE", "REVOKED"];
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const TX_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export function validateDocumentHash(value) {
  if (!HASH_PATTERN.test(value || "")) {
    throw badRequest(
      "INVALID_DOCUMENT_HASH",
      "documentHash must be a 0x-prefixed 32-byte SHA-256 digest",
    );
  }
  if (/^0x0{64}$/i.test(value)) {
    throw badRequest("ZERO_DOCUMENT_HASH", "documentHash cannot be zero");
  }
  return value.toLowerCase();
}

function validateTransactionHash(value) {
  if (!TX_PATTERN.test(value || "")) {
    throw badRequest("INVALID_TRANSACTION_HASH", "transactionHash must be a 32-byte hex value");
  }
  return value.toLowerCase();
}

function normalizeRecord(documentHash, record) {
  const status = STATUS_NAMES[Number(record.status)];
  return {
    documentHash: documentHash.toLowerCase(),
    issuer: getAddress(record.issuer),
    issuedAt: new Date(Number(record.issuedAt) * 1000).toISOString(),
    revokedAt: Number(record.revokedAt)
      ? new Date(Number(record.revokedAt) * 1000).toISOString()
      : null,
    status,
  };
}

export class BlockchainService {
  constructor({ rpcUrl, chainId, contractAddress }) {
    this.provider = new JsonRpcProvider(rpcUrl, chainId, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
    this.chainId = BigInt(chainId);
    this.contractAddress = getAddress(contractAddress);
    this.contract = new Contract(this.contractAddress, ABI, this.provider);
    this.interface = new Interface(ABI);
  }

  async checkReady() {
    const [network, code] = await Promise.all([
      this.provider.getNetwork(),
      this.provider.getCode(this.contractAddress),
    ]);
    if (network.chainId !== this.chainId) {
      throw new Error(`Chain ID mismatch: expected ${this.chainId}, received ${network.chainId}`);
    }
    if (code === "0x") throw new Error("No contract bytecode exists at PRAMAAN_CHAIN_ADDRESS");
    return {
      chainId: network.chainId.toString(),
      contractAddress: this.contractAddress,
    };
  }

  async isAdmin(address) {
    const role = await this.contract.ADMIN_ROLE();
    return this.contract.hasRole(role, getAddress(address));
  }

  async isAuthorizedIssuer(address) {
    return this.contract.isAuthorizedIssuer(getAddress(address));
  }

  async verifyCertificate(documentHash) {
    const hash = validateDocumentHash(documentHash);
    const statusValue = await this.contract.verifyCertificate(hash);
    const record = await this.contract.getCertificate(hash);
    return {
      ...normalizeRecord(hash, record),
      status: STATUS_NAMES[Number(statusValue)],
    };
  }

  parseDomainEvent(receipt, expectedName) {
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== this.contractAddress.toLowerCase()) continue;
      try {
        const parsed = this.interface.parseLog(log);
        if (parsed?.name === expectedName) return parsed;
      } catch {
        // Ignore unrelated contract logs.
      }
    }
    return null;
  }

  async validateTransactionBase(transactionHash, expectedSender) {
    const hash = validateTransactionHash(transactionHash);
    const [transaction, receipt] = await Promise.all([
      this.provider.getTransaction(hash),
      this.provider.getTransactionReceipt(hash),
    ]);
    if (!transaction || !receipt) {
      throw badRequest("TRANSACTION_NOT_CONFIRMED", "The transaction is not confirmed");
    }
    if (receipt.status !== 1) {
      throw badRequest("TRANSACTION_REVERTED", "The transaction did not succeed");
    }
    if (
      !transaction.to
      || getAddress(transaction.to) !== this.contractAddress
      || getAddress(transaction.from) !== getAddress(expectedSender)
    ) {
      throw forbidden(
        "TRANSACTION_IDENTITY_MISMATCH",
        "The transaction contract or sender does not match the authenticated action",
      );
    }
    return { transaction, receipt, hash };
  }

  async validateIssuance({ transactionHash, documentHash, expectedSender }) {
    const normalizedHash = validateDocumentHash(documentHash);
    const { receipt, hash } = await this.validateTransactionBase(transactionHash, expectedSender);
    const event = this.parseDomainEvent(receipt, "CertificateIssued");
    if (
      !event
      || event.args.documentHash.toLowerCase() !== normalizedHash
      || getAddress(event.args.issuer) !== getAddress(expectedSender)
    ) {
      throw badRequest("INVALID_ISSUANCE_EVENT", "The receipt does not contain the expected issuance event");
    }
    const record = await this.verifyCertificate(normalizedHash);
    if (record.status !== "ACTIVE" || record.issuer !== getAddress(expectedSender)) {
      throw badRequest("ISSUANCE_STATE_MISMATCH", "The on-chain certificate is not active for this issuer");
    }
    return { ...record, transactionHash: hash, blockNumber: receipt.blockNumber };
  }

  async validateRevocation({ transactionHash, documentHash, expectedSender }) {
    const normalizedHash = validateDocumentHash(documentHash);
    const { receipt, hash } = await this.validateTransactionBase(transactionHash, expectedSender);
    const event = this.parseDomainEvent(receipt, "CertificateRevoked");
    if (
      !event
      || event.args.documentHash.toLowerCase() !== normalizedHash
      || getAddress(event.args.issuer) !== getAddress(expectedSender)
      || getAddress(event.args.revokedBy) !== getAddress(expectedSender)
    ) {
      throw badRequest("INVALID_REVOCATION_EVENT", "The receipt does not contain the expected original-issuer revocation event");
    }
    const record = await this.verifyCertificate(normalizedHash);
    if (record.status !== "REVOKED" || record.issuer !== getAddress(expectedSender)) {
      throw badRequest("REVOCATION_STATE_MISMATCH", "The on-chain certificate is not revoked by its original issuer");
    }
    return { ...record, transactionHash: hash, blockNumber: receipt.blockNumber };
  }
}
