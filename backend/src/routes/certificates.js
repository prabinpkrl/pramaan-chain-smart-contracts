import { Router } from "express";
import { getAddress } from "ethers";
import {
  queryCertificates,
  isIndexReady,
  getIndexSize,
  getSummary,
  getIndexState,
  isIndexRetryDue,
  syncIndex,
} from "../services/certificateIndex.js";
import { parseInteger } from "../config.js";
import {
  badRequest,
  serviceUnavailable,
} from "../utils/httpError.js";
import { redactSecrets } from "../utils/redact.js";

const router = Router();

async function refreshIndex() {
  if (!isIndexRetryDue()) {
    if (isIndexReady()) return;
    throw serviceUnavailable(
      "CERTIFICATE_INDEX_NOT_READY",
      "Certificate index is not ready",
    );
  }

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

function parsePagination(value, name, fallback, maximum) {
  try {
    return parseInteger(value, name, {
      fallback,
      minimum: 1,
      maximum,
    });
  } catch {
    throw badRequest(
      "INVALID_PAGINATION",
      `${name} must be an integer between 1 and ${maximum}`,
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
    const page = parsePagination(
      req.query.page,
      "page",
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const limit = parsePagination(req.query.limit, "limit", 20, 100);

    await refreshIndex();
    if (!isIndexReady()) {
      return res.status(503).json({
        error: {
          code: "CERTIFICATE_INDEX_NOT_READY",
          message: "Certificate index is not ready",
        },
      });
    }

    const result = queryCertificates({ status, issuer, page, limit });
    return res.json({ ...result, index: getIndexState() });
  } catch (err) {
    return next(err);
  }
});

export default router;
