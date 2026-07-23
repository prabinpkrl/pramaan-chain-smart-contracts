import "dotenv/config";
import express from "express";
import cors from "cors";
import { initBlockchain } from "./services/blockchain.js";
import readRoutes from "./routes/read.js";
import writeRoutes from "./routes/write.js";
import eventRoutes from "./routes/events.js";
import { errorHandler } from "./middleware/errors.js";
import { readLimiter, writeLimiter } from "./middleware/rateLimit.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", readLimiter, readRoutes);
app.use("/api/write", writeLimiter, writeRoutes);
app.use("/api", readLimiter, eventRoutes);

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

    app.listen(PORT, () => {
      console.log(`PramaanChain backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start:", err.message);
    process.exit(1);
  }
}

start();
