import { Router } from "express";
import { issueCertificate, revokeCertificate } from "../services/certificate.js";

const router = Router();

router.post("/issue", async (req, res, next) => {
  try {
    const { documentHash } = req.body;
    if (!documentHash) {
      return res.status(400).json({ error: "documentHash is required" });
    }

    const result = await issueCertificate(documentHash);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/revoke", async (req, res, next) => {
  try {
    const { documentHash } = req.body;
    if (!documentHash) {
      return res.status(400).json({ error: "documentHash is required" });
    }

    const result = await revokeCertificate(documentHash);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
