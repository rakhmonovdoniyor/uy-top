const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

let DatabaseSync = null;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  DatabaseSync = null;
}

const DATA_DIR = path.resolve(__dirname, "..", "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.resolve(
  process.env.UYTOP_DB_PATH || path.join(DATA_DIR, "uytop.sqlite")
);
const BACKUP_DIR = path.resolve(
  process.env.UYTOP_BACKUP_DIR || path.join(DATA_DIR, "backups")
);

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

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function copyFileIfExists(source, destination) {
  if (!fs.existsSync(source)) {
    return false;
  }

  fs.copyFileSync(source, destination);
  return true;
}

function checkpointDatabase() {
  if (!DatabaseSync) {
    throw new Error("Node sqlite moduli topilmadi. Mongo rejimida UYTOP_DB_DRIVER=mongo bo'lishi kerak.");
  }

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database topilmadi: ${DB_PATH}`);
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA wal_checkpoint(FULL)");

  if (typeof db.close === "function") {
    db.close();
  }
}

function createBackup() {
  checkpointDatabase();

  const targetDir = path.join(BACKUP_DIR, `uytop-${getTimestamp()}`);
  fs.mkdirSync(targetDir, { recursive: true });

  const databaseFile = path.join(targetDir, "uytop.sqlite");
  copyFileIfExists(DB_PATH, databaseFile);
  copyFileIfExists(`${DB_PATH}-wal`, path.join(targetDir, "uytop.sqlite-wal"));
  copyFileIfExists(`${DB_PATH}-shm`, path.join(targetDir, "uytop.sqlite-shm"));

  let uploadsCopied = false;

  if (fs.existsSync(UPLOAD_DIR)) {
    fs.cpSync(UPLOAD_DIR, path.join(targetDir, "uploads"), {
      force: true,
      recursive: true,
    });
    uploadsCopied = true;
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    database: DB_PATH,
    files: {
      database: "uytop.sqlite",
      uploads: uploadsCopied ? "uploads" : null,
    },
    type: "uytop-sqlite-backup",
    version: 1,
  };

  fs.writeFileSync(
    path.join(targetDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  console.log(`UyTop backup yaratildi: ${targetDir}`);
}

async function createMongoBackup() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB || "uytop";
  const client = new MongoClient(uri);
  const targetDir = path.join(BACKUP_DIR, `uytop-mongo-${getTimestamp()}`);
  const collectionsDir = path.join(targetDir, "collections");

  fs.mkdirSync(collectionsDir, { recursive: true });
  await client.connect();

  try {
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const exported = [];

    for (const collectionInfo of collections) {
      const name = collectionInfo.name;
      const docs = await db.collection(name).find().toArray();

      fs.writeFileSync(
        path.join(collectionsDir, `${name}.json`),
        `${JSON.stringify(docs, null, 2)}\n`
      );
      exported.push({ count: docs.length, name });
    }

    if (fs.existsSync(UPLOAD_DIR)) {
      fs.cpSync(UPLOAD_DIR, path.join(targetDir, "uploads"), {
        force: true,
        recursive: true,
      });
    }

    fs.writeFileSync(
      path.join(targetDir, "manifest.json"),
      `${JSON.stringify(
        {
          collections: exported,
          createdAt: new Date().toISOString(),
          database: dbName,
          files: {
            collections: "collections",
            uploads: fs.existsSync(UPLOAD_DIR) ? "uploads" : null,
          },
          type: "uytop-mongo-backup",
          version: 1,
        },
        null,
        2
      )}\n`
    );
    console.log(`UyTop Mongo backup yaratildi: ${targetDir}`);
  } finally {
    await client.close();
  }
}

async function main() {
  if ((process.env.UYTOP_DB_DRIVER || "").toLowerCase() === "mongo") {
    await createMongoBackup();
    return;
  }

  createBackup();
}

main().catch((error) => {
  console.error(`Backup xatosi: ${error.message}`);
  process.exit(1);
});
