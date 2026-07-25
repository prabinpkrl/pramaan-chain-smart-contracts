import { Router } from "express";
import { issueCertificate, revokeCertificate } from "../services/certificate.js";
import { runIdempotent } from "../services/idempotency.js";
import { badRequest } from "../utils/httpError.js";

const router = Router();

function validateBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("INVALID_REQUEST_BODY", "Request body must be a JSON object");
  }

  const keys = Object.keys(body);
  if (keys.some((key) => key !== "documentHash")) {
    throw badRequest(
      "UNEXPECTED_REQUEST_FIELDS",
      "Only documentHash is accepted",
    );
  }

  if (typeof body.documentHash !== "string" || !body.documentHash) {
    throw badRequest(
      "DOCUMENT_HASH_REQUIRED",
      "documentHash must be a non-empty string",
    );
  }
}

router.post("/issue", async (req, res, next) => {
  try {
    validateBody(req.body);
    const { documentHash } = req.body;

    const { value, replayed } = await runIdempotent({
      key: req.get("idempotency-key"),
      operation: "issue",
      fingerprint: documentHash.toLowerCase(),
      execute: () => issueCertificate(documentHash),
    });
    res.status(replayed ? 200 : 201).json({ ...value, replayed });
  } catch (err) {
    next(err);
  }
});

router.post("/revoke", async (req, res, next) => {
  try {
    validateBody(req.body);
    const { documentHash } = req.body;

    const { value, replayed } = await runIdempotent({
      key: req.get("idempotency-key"),
      operation: "revoke",
      fingerprint: documentHash.toLowerCase(),
      execute: () => revokeCertificate(documentHash),
    });
    res.json({ ...value, replayed });
  } catch (err) {
    next(err);
  }
});

export default router;
