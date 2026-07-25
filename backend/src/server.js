import "dotenv/config";
import express from "express";
import cors from "cors";
import { pathToFileURL } from "node:url";
import { initBlockchain } from "./services/blockchain.js";
import {
  buildIndex,
  startIndexPolling,
} from "./services/certificateIndex.js";
import readRoutes from "./routes/read.js";
import writeRoutes from "./routes/write.js";
import eventRoutes from "./routes/events.js";
import certificateRoutes from "./routes/certificates.js";
import eventsTransformedRoutes from "./routes/eventsTransformed.js";
import { errorHandler } from "./middleware/errors.js";
import { readLimiter, writeLimiter } from "./middleware/rateLimit.js";
import { authenticateWrite } from "./middleware/authenticateWrite.js";
import { getCorsOrigins, parseInteger } from "./config.js";
import { HttpError } from "./utils/httpError.js";
import { redactSecrets } from "./utils/redact.js";

export function createApp() {
  const app = express();
  const allowedOrigins = getCorsOrigins();

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new HttpError(
        403,
        "CORS_ORIGIN_DENIED",
        "Browser origin is not allowed",
      ));
    },
  }));
  app.use(express.json({ limit: "16kb", strict: true }));

  app.use(
    "/api/write",
    writeLimiter,
    authenticateWrite,
    writeRoutes,
  );

  app.use("/api", readLimiter);
  app.use("/api", certificateRoutes);
  app.use("/api", readRoutes);
  app.use("/api", eventRoutes);
  app.use("/api", eventsTransformedRoutes);

  app.use((_req, _res, next) => {
    next(new HttpError(404, "ROUTE_NOT_FOUND", "Route not found"));
  });
  app.use(errorHandler);

  return app;
}

export async function start() {
  try {
    const app = createApp();
    const port = parseInteger(process.env.PORT, "PORT", {
      fallback: 3000,
      minimum: 1,
      maximum: 65535,
    });

    console.log("Initializing blockchain connection...");
    const {
      chainId,
      contractAddress,
      issuerAddress,
      issuerAuthorized,
    } = await initBlockchain();
    console.log(`Connected — chain ${chainId}, contract ${contractAddress}`);
    if (issuerAddress) {
      console.log(
        `Issuer wallet: ${issuerAddress} (${issuerAuthorized ? "authorized" : "issuance disabled"})`,
      );
    }

    console.log("Building certificate index...");
    try {
      await buildIndex();
    } catch (error) {
      console.error(
        `Certificate index unavailable: ${redactSecrets(error.message)}`,
      );
    }
    startIndexPolling();

    return app.listen(port, () => {
      console.log(`PramaanChain backend listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start:", redactSecrets(err.message));
    throw err;
  }
}

const isEntrypoint = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  start().catch(() => {
    process.exitCode = 1;
  });
}
