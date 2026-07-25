import { Router } from "express";
import { parseBlockQuery } from "../config.js";
import { getProvider } from "../services/blockchain.js";
import { fetchEvents } from "../services/events.js";
import { badRequest } from "../utils/httpError.js";

const router = Router();

const EVENT_TYPES = {
  CertificateIssued: "issuance",
  CertificateRevoked: "revocation",
  IssuerAuthorized: "authorization",
  IssuerRemoved: "removal",
};
const EVENT_NAMES_BY_TYPE = Object.fromEntries(
  Object.entries(EVENT_TYPES).map(([eventName, type]) => [type, eventName]),
);

router.get("/events/transformed", async (req, res, next) => {
  try {
    const from = parseBlockQuery(req.query.from, "from");
    const to = parseBlockQuery(req.query.to, "to");
    const typeFilter = req.query.type?.toLowerCase() || null;
    const validTypes = Object.values(EVENT_TYPES);

    if (typeFilter && !validTypes.includes(typeFilter)) {
      throw badRequest(
        "INVALID_EVENT_TYPE",
        `type must be one of: ${validTypes.join(", ")}`,
      );
    }

    const provider = getProvider();
    const blockTimestamps = new Map();
    const events = await fetchEvents(
      from,
      to,
      typeFilter ? [EVENT_NAMES_BY_TYPE[typeFilter]] : undefined,
    );
    const transformed = [];

    for (const event of events) {
      const type = EVENT_TYPES[event.eventName];
      if (!type || (typeFilter && type !== typeFilter)) continue;

      let timestamp = event.args.issuedAt || event.args.revokedAt;
      if (!timestamp) {
        if (!blockTimestamps.has(event.blockNumber)) {
          const block = await provider.getBlock(event.blockNumber);
          blockTimestamps.set(event.blockNumber, block?.timestamp || 0);
        }
        timestamp = blockTimestamps.get(event.blockNumber);
      }

      transformed.push({
        type,
        ...event.args,
        timestamp: Number(timestamp),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex,
      });
    }

    res.json({ events: transformed, count: transformed.length });
  } catch (error) {
    next(error);
  }
});

export default router;
