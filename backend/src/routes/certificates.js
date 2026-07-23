import { Router } from "express";
import {
  queryCertificates,
  getRecordByHash,
  isIndexReady,
  getIndexSize,
  getSummary,
} from "../services/certificateIndex.js";

const router = Router();

router.get("/certificates", (req, res, next) => {
  try {
    if (!isIndexReady()) {
      return res.status(503).json({ error: "Certificate index not ready" });
    }

    const status = req.query.status
      ? req.query.status.toUpperCase()
      : undefined;

    if (status && !["ACTIVE", "REVOKED", "NOT_FOUND"].includes(status)) {
      return res.status(400).json({
        error: "status must be ACTIVE, REVOKED, or NOT_FOUND",
      });
    }

    const issuer = req.query.issuer || undefined;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const result = queryCertificates({ status, issuer, page, limit });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/certificates/summary", (req, res, next) => {
  try {
    if (!isIndexReady()) {
      return res.status(503).json({ error: "Certificate index not ready" });
    }

    res.json({
      ...getSummary(),
      indexSize: getIndexSize(),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/certificates/:documentHash", (req, res, next) => {
  try {
    if (!isIndexReady()) {
      return res.status(503).json({ error: "Certificate index not ready" });
    }

    const record = getRecordByHash(req.params.documentHash);
    if (!record) {
      return res.status(404).json({ error: "Certificate not found in index" });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
