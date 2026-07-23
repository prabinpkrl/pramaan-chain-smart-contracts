import "dotenv/config";
import express from "express";
import cors from "cors";
import { initBlockchain } from "./services/blockchain.js";
import { buildIndex } from "./services/certificateIndex.js";
import readRoutes from "./routes/read.js";
import writeRoutes from "./routes/write.js";
import eventRoutes from "./routes/events.js";
import certificateRoutes from "./routes/certificates.js";
import eventsTransformedRoutes from "./routes/eventsTransformed.js";
import { errorHandler } from "./middleware/errors.js";
import { readLimiter, writeLimiter } from "./middleware/rateLimit.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", readLimiter, readRoutes);
app.use("/api", readLimiter, certificateRoutes);
app.use("/api", readLimiter, eventRoutes);
app.use("/api", readLimiter, eventsTransformedRoutes);
app.use("/api/write", writeLimiter, writeRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    console.log("Initializing blockchain connection...");
    const { chainId, contractAddress, issuerAddress } = await initBlockchain();
    console.log(`Connected — chain ${chainId}, contract ${contractAddress}`);
    if (issuerAddress) {
      console.log(`Issuer wallet: ${issuerAddress}`);
    }

    console.log("Building certificate index...");
    await buildIndex();

    app.listen(PORT, () => {
      console.log(`PramaanChain backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start:", err.message);
    process.exit(1);
  }
}

start();
