import { Router } from "express";
import { getAddress } from "ethers";
import {
  queryCertificates,
  isIndexReady,
  getIndexSize,
  getSummary,
  getIndexState,
  syncIndex,
} from "../services/certificateIndex.js";
import { badRequest } from "../utils/httpError.js";
import { serviceUnavailable } from "../utils/httpError.js";
import { redactSecrets } from "../utils/redact.js";

const router = Router();

async function refreshIndex() {
  try {
    await syncIndex();
  } catch (error) {
    if (!isIndexReady()) {
      throw serviceUnavailable(
        "CERTIFICATE_INDEX_NOT_READY",
        "Certificate index is not ready",
      );
    }
    console.warn(
      `Serving stale certificate index: ${redactSecrets(error.message)}`,
    );
  }
}

router.get("/certificates/summary", async (_req, res, next) => {
  try {
    await refreshIndex();
    if (!isIndexReady()) {
      return res.status(503).json({
        error: {
          code: "CERTIFICATE_INDEX_NOT_READY",
          message: "Certificate index is not ready",
        },
      });
    }

    return res.json({
      ...getSummary(),
      indexSize: getIndexSize(),
      index: getIndexState(),
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/certificates", async (req, res, next) => {
  try {
    await refreshIndex();
    if (!isIndexReady()) {
      return res.status(503).json({
        error: {
          code: "CERTIFICATE_INDEX_NOT_READY",
          message: "Certificate index is not ready",
        },
      });
    }

    const status = req.query.status?.toUpperCase();
    if (status && !["ACTIVE", "REVOKED"].includes(status)) {
      throw badRequest(
        "INVALID_CERTIFICATE_STATUS",
        "status must be ACTIVE or REVOKED",
      );
    }

    let issuer;
    if (req.query.issuer) {
      try {
        issuer = getAddress(req.query.issuer);
      } catch {
        throw badRequest(
          "INVALID_ISSUER_ADDRESS",
          "issuer must be a valid Ethereum address",
        );
      }
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const result = queryCertificates({ status, issuer, page, limit });
    return res.json({ ...result, index: getIndexState() });
  } catch (err) {
    return next(err);
  }
});

export default router;
