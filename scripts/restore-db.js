const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_PATH = path.resolve(
  process.env.UYTOP_DB_PATH || path.join(DATA_DIR, "uytop.sqlite")
);

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function getBackupArg() {
  return process.argv.slice(2).find((arg) => !arg.startsWith("--"));
}

function hasCurrentData() {
  return (
    fs.existsSync(DB_PATH) ||
    fs.existsSync(`${DB_PATH}-wal`) ||
    fs.existsSync(`${DB_PATH}-shm`) ||
    fs.existsSync(UPLOAD_DIR)
  );
}

function copyFileIfExists(source, destination) {
  if (!fs.existsSync(source)) {
    return false;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return true;
}

function saveCurrentData() {
  const safetyDir = path.join(DATA_DIR, `restore-safety-${getTimestamp()}`);
  fs.mkdirSync(safetyDir, { recursive: true });

  copyFileIfExists(DB_PATH, path.join(safetyDir, "uytop.sqlite"));
  copyFileIfExists(`${DB_PATH}-wal`, path.join(safetyDir, "uytop.sqlite-wal"));
  copyFileIfExists(`${DB_PATH}-shm`, path.join(safetyDir, "uytop.sqlite-shm"));

  if (fs.existsSync(UPLOAD_DIR)) {
    fs.cpSync(UPLOAD_DIR, path.join(safetyDir, "uploads"), {
      force: true,
      recursive: true,
    });
  }

  return safetyDir;
}

function removeCurrentData() {
  fs.rmSync(DB_PATH, { force: true });
  fs.rmSync(`${DB_PATH}-wal`, { force: true });
  fs.rmSync(`${DB_PATH}-shm`, { force: true });
  fs.rmSync(UPLOAD_DIR, { force: true, recursive: true });
}

function restoreBackup() {
  const backupArg = getBackupArg();
  const force = process.argv.includes("--force");

  if (!backupArg) {
    throw new Error("Backup papkasini ko'rsating: npm run api:restore -- <backup-dir> --force");
  }

  const backupDir = path.resolve(backupArg);
  const backupDb = path.join(backupDir, "uytop.sqlite");
  const backupUploads = path.join(backupDir, "uploads");

  if (!fs.existsSync(backupDb)) {
    throw new Error(`Backup database topilmadi: ${backupDb}`);
  }

  if (hasCurrentData() && !force) {
    throw new Error("Restore mavjud data ustiga yozadi. Davom etish uchun --force qo'shing.");
  }

  const safetyDir = hasCurrentData() ? saveCurrentData() : null;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  removeCurrentData();
  copyFileIfExists(backupDb, DB_PATH);
  copyFileIfExists(path.join(backupDir, "uytop.sqlite-wal"), `${DB_PATH}-wal`);
  copyFileIfExists(path.join(backupDir, "uytop.sqlite-shm"), `${DB_PATH}-shm`);

  if (fs.existsSync(backupUploads)) {
    fs.cpSync(backupUploads, UPLOAD_DIR, {
      force: true,
      recursive: true,
    });
  }

  console.log(`UyTop restore tugadi: ${backupDir}`);

  if (safetyDir) {
    console.log(`Oldingi data safety backup: ${safetyDir}`);
  }
}

try {
  restoreBackup();
} catch (error) {
  console.error(`Restore xatosi: ${error.message}`);
  process.exit(1);
}
