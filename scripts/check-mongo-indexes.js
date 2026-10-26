const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        return;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine
        .slice(separatorIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
}

loadEnvFile(
  process.env.UYTOP_ENV_FILE ||
    path.resolve(__dirname, "..", ".env.api.local")
);

const expectedIndexes = {
  admin_action_logs: ["id_1", "createdAt_-1"],
  favorites: ["userId_1_listingId_1"],
  listing_reports: ["id_1", "listingId_1_status_1"],
  listing_stats: ["listingId_1"],
  listings: ["id_1", "city_1_district_1_price_1", "ownerId_1_createdAt_-1"],
  messages: ["conversationKey_1_createdAt_1", "senderId_1", "recipientId_1"],
  notifications: ["id_1", "userId_1_read_1_createdAt_-1"],
  phone_otp_codes: ["userId_1_phone_1", "expiresAt_1"],
  saved_searches: ["id_1", "userId_1_createdAt_-1"],
  sessions: ["expiresAt_1"],
  users: ["phone_1"],
};

async function main() {
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
  );

  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB || "uytop");
    const missing = [];

    for (const [collectionName, indexNames] of Object.entries(expectedIndexes)) {
      const existingIndexes = await db.collection(collectionName).indexes();
      const existingNames = new Set(existingIndexes.map((index) => index.name));

      indexNames.forEach((indexName) => {
        if (!existingNames.has(indexName)) {
          missing.push(`${collectionName}.${indexName}`);
        }
      });
    }

    if (missing.length > 0) {
      throw new Error(`Mongo indexlar yetishmayapti: ${missing.join(", ")}`);
    }

    console.log("Mongo indexlar joyida.");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
