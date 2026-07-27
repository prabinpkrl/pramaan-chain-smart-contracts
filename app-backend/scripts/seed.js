import "dotenv/config";
import { loadConfig } from "../src/config.js";
import { AppDatabase } from "../src/database.js";

const config = loadConfig();
const db = new AppDatabase(config.databasePath, config.encryptionKey);

try {
  const institution = db.seedInstitution({
    name: process.env.SEED_INSTITUTION_NAME?.trim() || "Demo Institution",
    slug: process.env.SEED_INSTITUTION_SLUG?.trim() || "demo-institution",
    issuerAddress: process.env.SEED_ISSUER_ADDRESS?.trim(),
  });
  console.log(`Seeded institution ${institution.slug}`);
} finally {
  db.close();
}
