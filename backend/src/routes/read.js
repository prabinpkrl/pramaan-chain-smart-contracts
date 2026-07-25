import { Router } from "express";
import { getAddress } from "ethers";
import { verifyCertificate, getCertificate, isAuthorizedIssuer } from "../services/certificate.js";
import { getIndexState } from "../services/certificateIndex.js";
import { badRequest } from "../utils/httpError.js";

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
      certificateIndex: getIndexState(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      error: {
        code: "BLOCKCHAIN_UNAVAILABLE",
        message: "Blockchain connection is unavailable",
      },
    });
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
    let address;
    try {
      address = getAddress(req.params.address);
    } catch {
      throw badRequest(
        "INVALID_ISSUER_ADDRESS",
        "address must be a valid Ethereum address",
      );
    }
    const result = await isAuthorizedIssuer(address);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
