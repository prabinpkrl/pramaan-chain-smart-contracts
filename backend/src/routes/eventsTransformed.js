import { Router } from "express";
import { getProvider, getReadContract } from "../services/blockchain.js";

const START_BLOCK = BigInt(process.env.PRAMAAN_CHAIN_START_BLOCK || "11318772");
const CONFIRMATIONS = Number(process.env.BLOCKCHAIN_CONFIRMATIONS || "2");

const router = Router();

router.get("/events/transformed", async (req, res, next) => {
  try {
    const contract = getReadContract();
    const provider = getProvider();

    const from = req.query.from
      ? BigInt(req.query.from)
      : START_BLOCK;
    const to = req.query.to
      ? BigInt(req.query.to)
      : (await provider.getBlockNumber()) - BigInt(CONFIRMATIONS);

    if (from > to) {
      return res.json({ events: [], count: 0 });
    }

    const typeFilter = req.query.type
      ? req.query.type.toLowerCase()
      : null;

    const validTypes = ["issuance", "revocation", "authorization", "removal"];
    if (typeFilter && !validTypes.includes(typeFilter)) {
      return res.status(400).json({
        error: `type must be one of: ${validTypes.join(", ")}`,
      });
    }

    const transformed = [];

    const fetchAndTransform = async (eventName, transform) => {
      const filter = contract.filters[eventName]();
      const logs = await contract.queryFilter(filter, from, to);
      for (const log of logs) {
        const parsed = contract.interface.parseLog(log);
        if (!parsed) continue;

        const block = await provider.getBlock(log.blockNumber);
        const timestamp = block ? block.timestamp : 0;

        transformed.push({
          ...transform(parsed.args),
          timestamp: Number(timestamp),
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
        });
      }
    };

    if (!typeFilter || typeFilter === "issuance") {
      await fetchAndTransform("CertificateIssued", (args) => ({
        type: "issuance",
        documentHash: args.documentHash,
        issuer: args.issuer,
      }));
    }

    if (!typeFilter || typeFilter === "revocation") {
      await fetchAndTransform("CertificateRevoked", (args) => ({
        type: "revocation",
        documentHash: args.documentHash,
        issuer: args.issuer,
        revokedBy: args.revokedBy,
      }));
    }

    if (!typeFilter || typeFilter === "authorization") {
      await fetchAndTransform("IssuerAuthorized", (args) => ({
        type: "authorization",
        issuer: args.issuer,
        administrator: args.administrator,
      }));
    }

    if (!typeFilter || typeFilter === "removal") {
      await fetchAndTransform("IssuerRemoved", (args) => ({
        type: "removal",
        issuer: args.issuer,
        administrator: args.administrator,
      }));
    }

    transformed.sort((a, b) => a.blockNumber - b.blockNumber);

    res.json({ events: transformed, count: transformed.length });
  } catch (err) {
    next(err);
  }
});

export default router;
