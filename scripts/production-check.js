const fs = require("fs");
const path = require("path");

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
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
}

loadEnvFile(
  process.env.UYTOP_ENV_FILE ||
    path.resolve(__dirname, "..", ".env.api.local")
);

const isProduction =
  process.env.NODE_ENV === "production" || process.env.UYTOP_ENV === "production";
const findings = [];

function add(level, message, fix) {
  findings.push({ fix, level, message });
}

const allowedOrigins = process.env.UYTOP_ALLOWED_ORIGINS || "";
const adminPassword = process.env.UYTOP_ADMIN_PASSWORD || "";
const smsProvider = String(process.env.UYTOP_SMS_PROVIDER || "dev").toLowerCase();
const paymentProvider = String(
  process.env.UYTOP_PAYMENT_PROVIDER || "manual"
).toLowerCase();

if (!process.env.MONGODB_URI) {
  add("error", "MONGODB_URI topilmadi.", "Productionda alohida MongoDB URI kiriting.");
}

if (!allowedOrigins || allowedOrigins.includes("*")) {
  add(
    isProduction ? "error" : "warn",
    "UYTOP_ALLOWED_ORIGINS production uchun yopiq emas.",
    "Faqat ruxsat berilgan domenlarni vergul bilan yozing."
  );
}

if (["", "admin1234", "change-this-password", "demo1234"].includes(adminPassword)) {
  add(
    isProduction ? "error" : "warn",
    "Admin parol default yoki bo'sh.",
    "UYTOP_ADMIN_PASSWORD ni kuchli parolga almashtiring."
  );
}

if (isProduction && process.env.UYTOP_COOKIE_SECURE !== "true") {
  add("error", "Cookie secure rejimi yoqilmagan.", "HTTPS uchun UYTOP_COOKIE_SECURE=true qiling.");
}

if (smsProvider === "dev" && isProduction) {
  add(
    "error",
    "SMS OTP dev rejimda qolgan.",
    "UYTOP_SMS_PROVIDER=webhook va UYTOP_SMS_WEBHOOK_URL sozlang."
  );
}

if (smsProvider === "webhook" && !process.env.UYTOP_SMS_WEBHOOK_URL) {
  add("error", "SMS webhook URL topilmadi.", "UYTOP_SMS_WEBHOOK_URL kiriting.");
}

if (paymentProvider !== "manual" && !process.env.UYTOP_PAYMENT_WEBHOOK_SECRET) {
  add(
    isProduction ? "error" : "warn",
    "Payment webhook secret topilmadi.",
    "UYTOP_PAYMENT_WEBHOOK_SECRET ni provider webhooklari uchun kiriting."
  );
}

if (!process.env.UYTOP_BACKUP_DIR) {
  add("warn", "Backup papkasi aniq sozlanmagan.", "UYTOP_BACKUP_DIR ni belgilang.");
}

if (!process.env.UYTOP_LOG_DIR) {
  add("warn", "Log papkasi aniq sozlanmagan.", "UYTOP_LOG_DIR ni belgilang.");
}

console.log("UyTop production check");
console.log(`Mode: ${isProduction ? "production" : "local/dev"}`);

if (findings.length === 0) {
  console.log("OK: production uchun ko'rinadigan muammo topilmadi.");
  process.exit(0);
}

findings.forEach((finding) => {
  console.log(`[${finding.level.toUpperCase()}] ${finding.message}`);
  console.log(`  Fix: ${finding.fix}`);
});

if (isProduction && findings.some((finding) => finding.level === "error")) {
  process.exit(1);
}
