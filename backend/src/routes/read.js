import { Router } from "express";
import { verifyCertificate, getCertificate, isAuthorizedIssuer } from "../services/certificate.js";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    const { getProvider, getIssuerAddress } = await import("../services/blockchain.js");
    const provider = getProvider();
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    res.json({
      status: "ok",
      chainId: network.chainId.toString(),
      blockNumber: Number(blockNumber),
      issuerAddress: getIssuerAddress(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: "error", message: err.message });
  }
});

router.get("/verify/:documentHash", async (req, res, next) => {
  try {
    const result = await verifyCertificate(req.params.documentHash);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/certificates/:documentHash", async (req, res, next) => {
  try {
    const result = await getCertificate(req.params.documentHash);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/issuer/:address", async (req, res, next) => {
  try {
    const result = await isAuthorizedIssuer(req.params.address);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
