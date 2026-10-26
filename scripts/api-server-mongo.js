const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { MongoClient } = require("mongodb");

let DatabaseSync = null;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch {
  DatabaseSync = null;
}

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

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || process.env.API_PORT || 4100);
const FRONTEND_URL = process.env.UYTOP_FRONTEND_URL || "http://localhost:3000";
const ADMIN_PHONE = process.env.UYTOP_ADMIN_PHONE || "+998 99 000 00 01";
const ADMIN_PASSWORD = process.env.UYTOP_ADMIN_PASSWORD || "admin1234";
const SESSION_TTL_DAYS = Number(process.env.UYTOP_SESSION_TTL_DAYS || 30);
const MAX_BODY_BYTES = Number(process.env.UYTOP_MAX_BODY_MB || 10) * 1024 * 1024;
const MAX_UPLOAD_FILE_BYTES =
  Number(process.env.UYTOP_MAX_UPLOAD_FILE_MB || 3) * 1024 * 1024;
const MIN_LISTING_IMAGE_LONG_SIDE = Number(
  process.env.UYTOP_MIN_LISTING_IMAGE_LONG_SIDE || 900
);
const MIN_LISTING_IMAGE_SHORT_SIDE = Number(
  process.env.UYTOP_MIN_LISTING_IMAGE_SHORT_SIDE || 480
);
const UPLOAD_CLEANUP_MAX_AGE_DAYS = Number(
  process.env.UYTOP_UPLOAD_CLEANUP_DAYS || 7
);
const OTP_TTL_MINUTES = Number(process.env.UYTOP_OTP_TTL_MINUTES || 10);
const SMS_PROVIDER = String(process.env.UYTOP_SMS_PROVIDER || "dev").toLowerCase();
const SMS_WEBHOOK_URL = process.env.UYTOP_SMS_WEBHOOK_URL || "";
const SMS_WEBHOOK_TOKEN = process.env.UYTOP_SMS_WEBHOOK_TOKEN || "";
const OTP_DEV_MODE = SMS_PROVIDER === "dev" || !SMS_PROVIDER;
const PAYMENT_PROVIDER = String(
  process.env.UYTOP_PAYMENT_PROVIDER || "manual"
).toLowerCase();
const PAYMENT_WEBHOOK_SECRET = process.env.UYTOP_PAYMENT_WEBHOOK_SECRET || "";
const ALLOWED_ORIGINS = (process.env.UYTOP_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const DATA_DIR = path.resolve(__dirname, "..", "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const LOG_DIR = path.resolve(process.env.UYTOP_LOG_DIR || path.join(DATA_DIR, "logs"));
const ERROR_LOG_PATH = path.join(LOG_DIR, "api-errors.log");
const SQLITE_DB_PATH = path.resolve(
  process.env.UYTOP_DB_PATH || path.join(DATA_DIR, "uytop.sqlite")
);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const MONGODB_DB = process.env.MONGODB_DB || "uytop";
const AUTH_COOKIE_NAME = process.env.UYTOP_AUTH_COOKIE_NAME || "uytop_session";
const COOKIE_SECURE =
  String(process.env.UYTOP_COOKIE_SECURE || "").toLowerCase() === "true";
const RATE_LIMIT_DISABLED =
  String(process.env.UYTOP_DISABLE_RATE_LIMIT || "").toLowerCase() === "true";
const RATE_LIMIT_WINDOW_MS = Number(
  process.env.UYTOP_RATE_LIMIT_WINDOW_MS || 60_000
);
const RATE_LIMIT_RULES = [
  { limit: 10, method: "POST", pattern: /^\/auth\/login$/ },
  { limit: 6, method: "POST", pattern: /^\/auth\/register$/ },
  { limit: 5, method: "POST", pattern: /^\/phone-verification\/start$/ },
  { limit: 10, method: "POST", pattern: /^\/phone-verification\/verify$/ },
  { limit: 30, method: "POST", pattern: /^\/conversations\/[^/]+\/messages$/ },
  { limit: 20, method: "POST", pattern: /^\/uploads\// },
];

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

const client = new MongoClient(MONGODB_URI);
const routes = [];
const rateLimitBuckets = new Map();
let database = null;
let collections = null;

function now() {
  return new Date().toISOString();
}

function cleanText(value = "") {
  return String(value ?? "").trim();
}

function cleanTextList(value = []) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(item)).filter(Boolean)
    : [];
}

function getClientIp(req) {
  const forwardedFor = cleanText(req.headers["x-forwarded-for"] || "");
  return forwardedFor.split(",")[0].trim() || req.socket.remoteAddress || "local";
}

function checkRateLimit(req, pathname) {
  if (RATE_LIMIT_DISABLED) {
    return;
  }

  const rule = RATE_LIMIT_RULES.find(
    (item) => item.method === req.method && item.pattern.test(pathname)
  );

  if (!rule) {
    return;
  }

  const nowMs = Date.now();
  const bucketKey = `${rule.method}:${rule.pattern.source}:${getClientIp(req)}`;
  const bucket = rateLimitBuckets.get(bucketKey) || {
    count: 0,
    resetAt: nowMs + RATE_LIMIT_WINDOW_MS,
  };

  if (nowMs > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = nowMs + RATE_LIMIT_WINDOW_MS;
  }

  bucket.count += 1;
  rateLimitBuckets.set(bucketKey, bucket);

  if (bucket.count > rule.limit) {
    throw httpError(
      429,
      "Juda ko'p so'rov yuborildi. Birozdan keyin qayta urinib ko'ring."
    );
  }
}

async function sendOtpCode({ phone, code }) {
  if (OTP_DEV_MODE) {
    return { delivery: "dev" };
  }

  if (SMS_PROVIDER !== "webhook") {
    throw httpError(500, "SMS provider noto'g'ri sozlangan.");
  }

  if (!SMS_WEBHOOK_URL) {
    throw httpError(500, "UYTOP_SMS_WEBHOOK_URL sozlanmagan.");
  }

  const message = `UyTop tasdiqlash kodi: ${code}. Kod ${OTP_TTL_MINUTES} daqiqa amal qiladi.`;
  const headers = { "Content-Type": "application/json" };

  if (SMS_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${SMS_WEBHOOK_TOKEN}`;
  }

  const response = await fetch(SMS_WEBHOOK_URL, {
    body: JSON.stringify({
      code,
      message,
      phone,
      service: "uytop",
      ttlMinutes: OTP_TTL_MINUTES,
    }),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    throw httpError(502, "SMS provider kodni yubormadi.");
  }

  return { delivery: "sms" };
}

function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

function getUserIdFromPhone(phone = "") {
  const digits = normalizePhone(phone);
  return digits ? `user-${digits}` : `user-${Date.now()}`;
}

function getUserId(user = {}) {
  return user.id || getUserIdFromPhone(user.phone);
}

function getListingOwnerId(listing = {}) {
  return listing.ownerId || getUserIdFromPhone(listing.phone);
}

function getMessageSenderId(message = {}) {
  return message.senderId || getUserIdFromPhone(message.senderPhone);
}

function getMessageRecipientId(message = {}) {
  return message.recipientId || getUserIdFromPhone(message.recipientPhone);
}

function getConversationKey(message = {}) {
  const participantIds = [
    getMessageSenderId(message),
    getMessageRecipientId(message),
  ].sort();

  return `${Number(message.listingId)}:${participantIds.join(":")}`;
}

function getNowLabel(value = now()) {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const matchedCookie = cookies.find((item) => item.startsWith(`${name}=`));

  if (!matchedCookie) {
    return "";
  }

  return decodeURIComponent(matchedCookie.slice(name.length + 1));
}

function buildAuthCookie(token) {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (COOKIE_SECURE) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildClearAuthCookie() {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (COOKIE_SECURE) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatListingPriceLabel(price, dealType = "sale") {
  return dealType === "rent"
    ? `$${Number(price || 0).toLocaleString("en-US")} / oy`
    : `$${Number(price || 0).toLocaleString("en-US")}`;
}

function normalizePriceHistoryEntries(value = []) {
  return Array.isArray(value)
    ? value
        .map((item) => ({
          changedAt: cleanText(item.changedAt || item.createdAt || item.updatedAt || ""),
          price: Number(item.price || 0),
          priceLabel: cleanText(item.priceLabel || formatListingPriceLabel(item.price)),
        }))
        .filter((item) => item.price > 0)
    : [];
}

function buildPriceHistory(existing = {}, payload = {}, price, priceLabel, timestamp) {
  const nextPrice = Number(price || 0);
  const existingPrice = Number(existing.price || 0);
  const incomingHistory = Array.isArray(payload.priceHistory)
    ? payload.priceHistory
    : existing.priceHistory || [];
  const priceHistory = normalizePriceHistoryEntries(incomingHistory);

  if (!existing.id || !existingPrice || !nextPrice || existingPrice === nextPrice) {
    return priceHistory;
  }

  if (Number(priceHistory[priceHistory.length - 1]?.price || 0) === nextPrice) {
    return priceHistory.slice(-8);
  }

  const hasExistingPrice = priceHistory.some(
    (item) => Number(item.price) === existingPrice
  );
  const previousEntry = {
    changedAt: existing.updatedAt || existing.createdAt || timestamp,
    price: existingPrice,
    priceLabel:
      existing.priceLabel ||
      formatListingPriceLabel(existingPrice, existing.dealType || "sale"),
  };
  const nextEntry = {
    changedAt: timestamp,
    price: nextPrice,
    priceLabel:
      priceLabel ||
      formatListingPriceLabel(nextPrice, payload.dealType || existing.dealType),
  };

  return [
    ...(hasExistingPrice ? priceHistory : [...priceHistory, previousEntry]),
    nextEntry,
  ].slice(-8);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return {
    hash: crypto.scryptSync(String(password), salt, 64).toString("hex"),
    salt,
  };
}

function timingSafeHexEqual(first, second) {
  const firstBuffer = Buffer.from(first || "", "hex");
  const secondBuffer = Buffer.from(second || "", "hex");

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(firstBuffer, secondBuffer);
}

function verifyPassword(user, password) {
  if (!user?.passwordHash || !user?.passwordSalt) {
    return false;
  }

  const nextHash = hashPassword(password, user.passwordSalt).hash;
  return timingSafeHexEqual(nextHash, user.passwordHash);
}

function verifyOtpHash(otpDoc, code) {
  if (!otpDoc?.codeHash || !otpDoc?.codeSalt) {
    return false;
  }

  const nextHash = hashPassword(String(code || ""), otpDoc.codeSalt).hash;
  return timingSafeHexEqual(nextHash, otpDoc.codeHash);
}

function httpError(status, message, details = null) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function throwValidationError(fields) {
  throw httpError(400, "Ma'lumotlarni tekshiring.", { fields });
}

function logServerError(req, error) {
  const status = error.status || 500;

  if (status < 500) {
    return;
  }

  fs.appendFile(
    ERROR_LOG_PATH,
    `${JSON.stringify({
      at: now(),
      details: error.details || null,
      message: error.message || "Server xatosi.",
      method: req.method,
      path: req.url,
      status,
      stack: error.stack || "",
    })}\n`,
    () => {}
  );
}

function userFromDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    accountStatus: doc.accountStatus || "active",
    blockReason: doc.blockReason || "",
    email: doc.email || "",
    id: doc.id || String(doc._id),
    lastLoginAt: doc.lastLoginAt || "",
    lastLoginAtLabel: formatDateLabel(doc.lastLoginAt),
    name: doc.name,
    phone: doc.phone,
    phoneVerified: Boolean(doc.phoneVerified),
    registeredAt: doc.registeredAt || "",
    registeredAtLabel: formatDateLabel(doc.registeredAt),
    role: doc.role || "user",
  };
}

function listingFromDoc(doc) {
  if (!doc) {
    return null;
  }

  const tags = Array.isArray(doc.tags) ? doc.tags : [];

  return {
    address: doc.address || "",
    adminNote: doc.adminNote || "",
    agent: doc.agent || "",
    amenities: Array.isArray(doc.amenities) ? doc.amenities : [],
    area: Number(doc.area || 0),
    city: doc.city || "",
    createdAt: doc.createdAt || "",
    dealType: doc.dealType || "sale",
    description: doc.description || "",
    district: doc.district || "",
    documentType: doc.documentType || "",
    floor: doc.floor || "",
    furnished: Boolean(doc.furnished),
    galleryImages: Array.isArray(doc.galleryImages) ? doc.galleryImages : [],
    id: Number(doc.id || doc._id),
    image: doc.image || "",
    imageMetadata: Array.isArray(doc.imageMetadata) ? doc.imageMetadata : [],
    latitude: doc.latitude ?? "",
    listingPlan: doc.listingPlan || "standard",
    longitude: doc.longitude ?? "",
    moderationStatus: doc.moderationStatus || "approved",
    negotiable: Boolean(doc.negotiable || tags.includes("Kelishiladi")),
    ownerId: doc.ownerId || "",
    paymentAmount: Number(doc.paymentAmount || 0),
    paymentProvider: doc.paymentProvider || "",
    paymentReference: doc.paymentReference || "",
    paymentStatus: doc.paymentStatus || "not_required",
    phone: doc.phone || "",
    planExpiresAt: doc.planExpiresAt || "",
    price: Number(doc.price || 0),
    priceHistory: normalizePriceHistoryEntries(doc.priceHistory),
    priceLabel: doc.priceLabel || "",
    propertyType: doc.propertyType || "",
    published: doc.published || "",
    rooms: Number(doc.rooms || 0),
    renovationCondition: doc.renovationCondition || "",
    tags,
    title: doc.title || "",
    typeLabel: doc.typeLabel || "",
    updatedAt: doc.updatedAt || "",
    utilities: Array.isArray(doc.utilities) ? doc.utilities : [],
    verified: Boolean(doc.verified),
  };
}

function messageFromDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    attachmentImage: doc.attachmentImage || "",
    body: doc.body || "",
    conversationKey: doc.conversationKey || getConversationKey(doc),
    createdAt: doc.createdAt,
    createdAtLabel: doc.createdAtLabel || getNowLabel(doc.createdAt),
    id: Number(doc.id || doc._id),
    listingId: Number(doc.listingId),
    listingImage: doc.listingImage || "",
    listingPrice: doc.listingPrice || "",
    listingTitle: doc.listingTitle || "",
    read: Boolean(doc.read),
    recipientId: doc.recipientId || "",
    recipientName: doc.recipientName || "",
    recipientPhone: doc.recipientPhone || "",
    senderId: doc.senderId || "",
    senderName: doc.senderName || "",
    senderPhone: doc.senderPhone || "",
  };
}

function reportFromDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    createdAt: doc.createdAt || "",
    createdAtLabel: doc.createdAtLabel || getNowLabel(doc.createdAt),
    id: Number(doc.id || doc._id),
    listingId: Number(doc.listingId),
    listingTitle: doc.listingTitle || "",
    reason: doc.reason || "",
    reporterId: doc.reporterId || "",
    reporterName: doc.reporterName || "Mehmon",
    reporterPhone: doc.reporterPhone || "",
    resolvedAt: doc.resolvedAt || "",
    status: doc.status || "open",
  };
}

function adminActionFromDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    action: doc.action || "",
    actor: doc.actor || "Admin",
    adminId: doc.adminId || "",
    createdAt: doc.createdAt || "",
    createdAtLabel: doc.createdAtLabel || getNowLabel(doc.createdAt),
    entityId: doc.entityId ?? "",
    entityTitle: doc.entityTitle || "",
    id: Number(doc.id || doc._id),
    note: doc.note || "",
    type: doc.type || "system",
  };
}

function savedSearchFromDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    createdAt: doc.createdAt || "",
    createdAtLabel: doc.createdAtLabel || getNowLabel(doc.createdAt),
    filters: doc.filters || {},
    id: Number(doc.id || doc._id),
    name: doc.name || "Saqlangan qidiruv",
    userId: doc.userId || "",
  };
}

function notificationFromDoc(doc) {
  if (!doc) {
    return null;
  }

  return {
    body: doc.body || "",
    createdAt: doc.createdAt || "",
    createdAtLabel: doc.createdAtLabel || getNowLabel(doc.createdAt),
    entityId: doc.entityId ?? "",
    id: Number(doc.id || doc._id),
    read: Boolean(doc.read),
    text: doc.body || "",
    title: doc.title || "Bildirishnoma",
    type: doc.type || "system",
    userId: doc.userId || "",
  };
}

function listingStatsFromDoc(doc) {
  const listingId = Number(doc?.listingId || doc?._id || 0);

  return {
    favorites: Number(doc?.favoriteCount || 0),
    favoriteCount: Number(doc?.favoriteCount || 0),
    leads: Number(doc?.leadCount || 0),
    leadCount: Number(doc?.leadCount || 0),
    listingId,
    updatedAt: doc?.updatedAt || "",
    views: Number(doc?.viewCount || 0),
    viewCount: Number(doc?.viewCount || 0),
  };
}

function getCorsHeaders(req) {
  const origin = req.headers.origin || "";
  const allowAll = ALLOWED_ORIGINS.includes("*");
  const allowedOrigin =
    allowAll || ALLOWED_ORIGINS.includes(origin)
      ? origin || (allowAll ? "*" : ALLOWED_ORIGINS[0])
      : "";

  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function isOriginAllowed(req) {
  const origin = req.headers.origin;
  return !origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin);
}

function sendJson(res, status, payload, req, extraHeaders = {}) {
  res.writeHead(status, {
    ...getCorsHeaders(req),
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res, req) {
  res.writeHead(204, getCorsHeaders(req));
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on("data", (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > MAX_BODY_BYTES) {
        reject(httpError(413, "So'rov hajmi juda katta."));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function sanitizeFilename(filename = "") {
  return path
    .basename(filename)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

const imageSignatures = {
  "image/gif": (buffer) =>
    buffer.slice(0, 6).toString("ascii") === "GIF87a" ||
    buffer.slice(0, 6).toString("ascii") === "GIF89a",
  "image/jpeg": (buffer) =>
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff,
  "image/png": (buffer) =>
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a,
  "image/webp": (buffer) =>
    buffer.length >= 12 &&
    buffer.slice(0, 4).toString("ascii") === "RIFF" &&
    buffer.slice(8, 12).toString("ascii") === "WEBP",
};

function readUInt24LE(buffer, offset) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function getImageDimensions(buffer, contentType) {
  if (contentType === "image/png" && buffer.length >= 24) {
    return {
      height: buffer.readUInt32BE(20),
      width: buffer.readUInt32BE(16),
    };
  }

  if (contentType === "image/gif" && buffer.length >= 10) {
    return {
      height: buffer.readUInt16LE(8),
      width: buffer.readUInt16LE(6),
    };
  }

  if (contentType === "image/jpeg") {
    let offset = 2;

    while (offset + 4 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = buffer[offset + 1];

      if (marker === 0xd9 || marker === 0xda) {
        break;
      }

      const length = buffer.readUInt16BE(offset + 2);
      const isStartOfFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        ![0xc4, 0xc8, 0xcc].includes(marker);

      if (isStartOfFrame && offset + 8 < buffer.length) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }

      if (!Number.isFinite(length) || length < 2) {
        break;
      }

      offset += 2 + length;
    }
  }

  if (contentType === "image/webp" && buffer.length >= 30) {
    const chunkType = buffer.slice(12, 16).toString("ascii");

    if (chunkType === "VP8X") {
      return {
        height: readUInt24LE(buffer, 27) + 1,
        width: readUInt24LE(buffer, 24) + 1,
      };
    }

    if (chunkType === "VP8L" && buffer.length >= 25) {
      const byte1 = buffer[21];
      const byte2 = buffer[22];
      const byte3 = buffer[23];
      const byte4 = buffer[24];

      return {
        height: 1 + (((byte4 & 0x0f) << 10) | (byte3 << 2) | ((byte2 & 0xc0) >> 6)),
        width: 1 + (((byte2 & 0x3f) << 8) | byte1),
      };
    }

    if (chunkType === "VP8 " && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
      return {
        height: buffer.readUInt16LE(28) & 0x3fff,
        width: buffer.readUInt16LE(26) & 0x3fff,
      };
    }
  }

  return null;
}

function validateImageResolution(file, contentType, limits = {}) {
  if (!limits.minLongSide || !limits.minShortSide) {
    return;
  }

  const dimensions = getImageDimensions(file.buffer, contentType);

  if (!dimensions) {
    throwValidationError({ file: "Rasm o'lchamini aniqlab bo'lmadi." });
  }

  const longSide = Math.max(dimensions.width, dimensions.height);
  const shortSide = Math.min(dimensions.width, dimensions.height);

  if (longSide < limits.minLongSide || shortSide < limits.minShortSide) {
    throwValidationError({
      file: `Rasm kamida ${limits.minLongSide}x${limits.minShortSide} px bo'lishi kerak. Hozirgi o'lcham: ${dimensions.width}x${dimensions.height} px.`,
    });
  }
}

function parseMultipartFiles(body, contentType = "") {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    throwValidationError({ file: "Multipart boundary topilmadi." });
  }

  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const parts = body.toString("binary").split(boundary).slice(1, -1);

  return parts
    .map((part) => {
      const cleanPart = part.replace(/^\r?\n/, "").replace(/\r?\n--$/, "");
      const separatorIndex = cleanPart.indexOf("\r\n\r\n");

      if (separatorIndex === -1) {
        return null;
      }

      const rawHeaders = cleanPart.slice(0, separatorIndex);
      const content = cleanPart.slice(separatorIndex + 4).replace(/\r\n$/, "");
      const disposition = rawHeaders.match(/content-disposition:\s*([^\r\n]+)/i)?.[1] || "";
      const filename = disposition.match(/filename="([^"]*)"/i)?.[1] || "";
      const name = disposition.match(/name="([^"]*)"/i)?.[1] || "";
      const fileContentType =
        rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() ||
        "application/octet-stream";

      if (!filename) {
        return null;
      }

      return {
        buffer: Buffer.from(content, "binary"),
        contentType: fileContentType,
        filename,
        name,
      };
    })
    .filter(Boolean);
}

function getUploadExtension(filename, contentType) {
  const extension = path.extname(filename).toLowerCase();

  if ([".gif", ".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
    return extension;
  }

  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  if (contentType === "image/gif") {
    return ".gif";
  }

  return ".jpg";
}

function validateUploadImage(file, limits = {}) {
  const contentType = cleanText(file.contentType).toLowerCase();
  const extension = path.extname(file.filename).toLowerCase();
  const allowedExtensions = {
    "image/gif": [".gif"],
    "image/jpeg": [".jpg", ".jpeg", ""],
    "image/png": [".png", ""],
    "image/webp": [".webp", ""],
  };

  if (!file.buffer.length) {
    throwValidationError({ file: "Bo'sh fayl yuklanmaydi." });
  }

  if (file.buffer.length > MAX_UPLOAD_FILE_BYTES) {
    throwValidationError({
      file: `Har bir rasm ${Math.round(
        MAX_UPLOAD_FILE_BYTES / 1024 / 1024
      )} MB dan kichik bo'lishi kerak.`,
    });
  }

  if (!imageSignatures[contentType]) {
    throwValidationError({ file: "Faqat JPG, PNG, WEBP yoki GIF rasm yuklanadi." });
  }

  if (!allowedExtensions[contentType].includes(extension)) {
    throwValidationError({ file: "Fayl kengaytmasi rasm turiga mos emas." });
  }

  if (!imageSignatures[contentType](file.buffer)) {
    throwValidationError({ file: "Fayl haqiqiy rasm emas." });
  }

  validateImageResolution(file, contentType, limits);
}

function getUploadMetadata(file) {
  const contentType = cleanText(file.contentType).toLowerCase();
  const dimensions = getImageDimensions(file.buffer, contentType) || {};

  return {
    height: Number(dimensions.height || 0),
    mimeType: contentType,
    originalName: sanitizeFilename(file.filename),
    size: file.buffer.length,
    width: Number(dimensions.width || 0),
  };
}

async function saveUploadedFiles(req, folder, { maxFiles = 8, minLongSide = 0, minShortSide = 0 } = {}) {
  const body = await readBody(req);
  const files = parseMultipartFiles(body, req.headers["content-type"] || "");

  if (files.length === 0) {
    throwValidationError({ file: "Kamida bitta rasm tanlang." });
  }

  if (files.length > maxFiles) {
    throwValidationError({ file: `Bir martada ${maxFiles} tagacha rasm yuklang.` });
  }

  const targetDir = path.join(UPLOAD_DIR, folder);
  fs.mkdirSync(targetDir, { recursive: true });

  return files.map((file) => {
    validateUploadImage(file, { minLongSide, minShortSide });
    const cleanName = sanitizeFilename(file.filename) || "upload";
    const extension = getUploadExtension(cleanName, file.contentType);
    const savedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const filePath = path.join(targetDir, savedName);
    const url = `${publicBaseUrl(req)}/uploads/${folder}/${savedName}`;

    fs.writeFileSync(filePath, file.buffer);
    return {
      ...getUploadMetadata(file),
      path: `${folder}/${savedName}`,
      url,
    };
  });
}

function serveUpload(req, res, pathname) {
  const relativePath = decodeURIComponent(pathname.replace(/^\/uploads\//, ""));
  const filePath = path.resolve(UPLOAD_DIR, relativePath);

  if (!filePath.startsWith(UPLOAD_DIR)) {
    sendJson(res, 403, { error: "Fayl yo'li noto'g'ri." }, req);
    return true;
  }

  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: "Fayl topilmadi." }, req);
    return true;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType =
    {
      ".gif": "image/gif",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
    }[extension] || "application/octet-stream";

  res.writeHead(200, {
    ...getCorsHeaders(req),
    "Content-Type": contentType,
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function getUploadRelativePath(value = "") {
  const text = String(value || "");
  const marker = "/uploads/";
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    return "";
  }

  return decodeURIComponent(text.slice(markerIndex + marker.length).split(/[?#]/)[0])
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function collectUploadFiles(directory = UPLOAD_DIR, prefix = "") {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    const relativePath = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
      return collectUploadFiles(entryPath, relativePath);
    }

    if (!entry.isFile()) {
      return [];
    }

    return [
      {
        filePath: entryPath,
        relativePath: relativePath.replace(/\\/g, "/"),
      },
    ];
  });
}

async function getReferencedUploadPaths() {
  const referenced = new Set();
  const listings = await collections.listings
    .find({}, { projection: { galleryImages: 1, image: 1 } })
    .toArray();
  const messages = await collections.messages
    .find({}, { projection: { attachmentImage: 1, listingImage: 1 } })
    .toArray();

  listings.forEach((listing) => {
    [
      listing.image,
      ...(Array.isArray(listing.galleryImages) ? listing.galleryImages : []),
    ]
      .map(getUploadRelativePath)
      .filter(Boolean)
      .forEach((item) => referenced.add(item));
  });

  messages.forEach((message) => {
    [message.attachmentImage, message.listingImage]
      .map(getUploadRelativePath)
      .filter(Boolean)
      .forEach((item) => referenced.add(item));
  });

  return referenced;
}

async function cleanupUnusedUploads({
  olderThanDays = UPLOAD_CLEANUP_MAX_AGE_DAYS,
} = {}) {
  const referenced = await getReferencedUploadPaths();
  const cutoffMs =
    Date.now() - Math.max(1, olderThanDays) * 24 * 60 * 60 * 1000;
  const files = collectUploadFiles();
  const deleted = [];
  const kept = [];

  files.forEach((file) => {
    const stats = fs.statSync(file.filePath);

    if (referenced.has(file.relativePath) || stats.mtimeMs > cutoffMs) {
      kept.push(file.relativePath);
      return;
    }

    fs.rmSync(file.filePath, { force: true });
    deleted.push(file.relativePath);
  });

  return {
    deleted,
    deletedCount: deleted.length,
    keptCount: kept.length,
    olderThanDays,
  };
}

async function createNotification(userId, title, body = "", meta = {}) {
  if (!userId) {
    return null;
  }

  const id = await getNextSequence("notifications");
  const timestamp = now();
  const doc = {
    _id: id,
    body: cleanText(body),
    createdAt: timestamp,
    createdAtLabel: getNowLabel(timestamp),
    entityId: meta.entityId ?? "",
    id,
    read: false,
    title: cleanText(title) || "Bildirishnoma",
    type: cleanText(meta.type || "system"),
    userId,
  };

  await collections.notifications.insertOne(doc);
  return notificationFromDoc(doc);
}

function doesListingMatchSavedSearch(listing, filters = {}) {
  const minPrice = Number(filters.minPrice || 0);
  const maxPrice = Number(filters.maxPrice || 0);
  const minArea = Number(filters.minArea || 0);
  const maxArea = Number(filters.maxArea || 0);
  const query = cleanText(filters.query || "").toLowerCase();
  const haystack = [
    listing.title,
    listing.city,
    listing.district,
    listing.address,
    listing.propertyType,
    listing.agent,
    ...(listing.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return (
    (!filters.dealType || filters.dealType === "all" || listing.dealType === filters.dealType) &&
    (!filters.city || filters.city === "all" || listing.city === filters.city) &&
    (!filters.district || filters.district === "all" || listing.district === filters.district) &&
    (!filters.propertyType || filters.propertyType === "all" || listing.propertyType === filters.propertyType) &&
    (!filters.rooms || filters.rooms === "all" || Number(listing.rooms) >= Number(filters.rooms)) &&
    (!minPrice || Number(listing.price) >= minPrice) &&
    (!maxPrice || Number(listing.price) <= maxPrice) &&
    (!minArea || Number(listing.area) >= minArea) &&
    (!maxArea || Number(listing.area) <= maxArea) &&
    (!filters.imagesOnly || Boolean(listing.image || listing.galleryImages?.length)) &&
    (!filters.featuredOnly || ["top", "premium"].includes(listing.listingPlan)) &&
    (!query || haystack.includes(query))
  );
}

async function notifySavedSearchMatches(listing, ownerId) {
  const searches = await collections.savedSearches
    .find({ userId: { $ne: ownerId } })
    .toArray();

  await Promise.all(
    searches
      .filter((search) => doesListingMatchSavedSearch(listing, search.filters))
      .map((search) =>
        createNotification(
          search.userId,
          "Saqlangan qidiruvga mos e'lon",
          `"${listing.title}" siz saqlagan "${search.name}" qidiruviga mos keldi.`,
          { entityId: listing.id, type: "saved-search" }
        )
      )
  );
}

async function syncListingFavoriteCount(listingId) {
  const numericListingId = Number(listingId);
  const favoriteCount = await collections.favorites.countDocuments({
    listingId: numericListingId,
  });
  const timestamp = now();

  await collections.listingStats.updateOne(
    { _id: numericListingId },
    {
      $set: {
        favoriteCount,
        listingId: numericListingId,
        updatedAt: timestamp,
      },
      $setOnInsert: {
        createdAt: timestamp,
        leadCount: 0,
        viewCount: 0,
      },
    },
    { upsert: true }
  );

  return favoriteCount;
}

async function getListingStatsDoc(listingId) {
  const numericListingId = Number(listingId);

  if (!Number.isFinite(numericListingId) || numericListingId <= 0) {
    throwValidationError({ listingId: "E'lon topilmadi." });
  }

  const listing = await collections.listings.findOne({ id: numericListingId });

  if (!listing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  await syncListingFavoriteCount(numericListingId);
  return collections.listingStats.findOne({ _id: numericListingId });
}

async function incrementListingStat(listingId, field) {
  const numericListingId = Number(listingId);
  const listing = await collections.listings.findOne({ id: numericListingId });

  if (!listing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  const timestamp = now();
  const setOnInsert = {
    createdAt: timestamp,
    favoriteCount: await collections.favorites.countDocuments({
      listingId: numericListingId,
    }),
    leadCount: 0,
    viewCount: 0,
  };
  delete setOnInsert[field];
  const result = await collections.listingStats.findOneAndUpdate(
    { _id: numericListingId },
    {
      $inc: { [field]: 1 },
      $set: { listingId: numericListingId, updatedAt: timestamp },
      $setOnInsert: setOnInsert,
    },
    { returnDocument: "after", upsert: true }
  );

  return result.value || result;
}

async function readJson(req) {
  const body = await readBody(req);

  if (!body.length) {
    return {};
  }

  try {
    return JSON.parse(body.toString("utf8"));
  } catch (error) {
    throw httpError(400, "JSON body noto'g'ri.", { cause: error.message });
  }
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createSession(userId) {
  const token = createToken();
  const timestamp = now();
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  await collections.sessions.updateOne(
    { _id: hashToken(token) },
    {
      $set: {
        _id: hashToken(token),
        createdAt: timestamp,
        expiresAt,
        lastSeenAt: timestamp,
        revokedAt: null,
        tokenHash: hashToken(token),
        userId,
      },
    },
    { upsert: true }
  );

  return token;
}

async function getUserFromRequest(req) {
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const token = getCookieValue(req, AUTH_COOKIE_NAME) || bearerToken;

  if (!token) {
    throw httpError(401, "Kirish talab qilinadi.");
  }

  const tokenHash = hashToken(token);
  const session = await collections.sessions.findOne({
    _id: tokenHash,
    expiresAt: { $gt: now() },
    revokedAt: null,
  });

  if (!session) {
    throw httpError(401, "Sessiya tugagan yoki bekor qilingan.");
  }

  await collections.sessions.updateOne(
    { _id: tokenHash },
    { $set: { lastSeenAt: now() } }
  );

  const user = await collections.users.findOne({ id: session.userId });

  if (!user) {
    throw httpError(401, "Foydalanuvchi topilmadi.");
  }

  return user;
}

async function getOptionalUser(req) {
  try {
    return await getUserFromRequest(req);
  } catch (error) {
    if (error.status === 401) {
      return null;
    }

    throw error;
  }
}

async function requireUser(req) {
  return getUserFromRequest(req);
}

async function requireActiveUser(req) {
  const user = await requireUser(req);

  if (user.accountStatus === "blocked") {
    throw httpError(403, "Profil bloklangan.");
  }

  return user;
}

async function requireAdmin(req) {
  const user = await requireUser(req);

  if (user.role !== "admin") {
    throw httpError(403, "Bu amal faqat admin uchun.");
  }

  return user;
}

function canManageListing(listing, user) {
  if (!listing || !user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  return (
    getListingOwnerId(listing) === getUserId(user) ||
    Boolean(listing.phone && user.phone && listing.phone === user.phone)
  );
}

function validateUserInput(input, { requirePassword = true } = {}) {
  const fields = {};
  const name = cleanText(input.name || "UyTop foydalanuvchi");
  const phone = cleanText(input.phone);
  const email = cleanText(input.email || "");
  const password = String(input.password ?? "");

  if (!name) {
    fields.name = "Ism kiriting.";
  }

  if (normalizePhone(phone).length < 9) {
    fields.phone = "Telefon raqam to'g'ri kiritilmagan.";
  }

  if (email && !email.includes("@")) {
    fields.email = "Email to'g'ri kiritilmagan.";
  }

  if (requirePassword && password.length < 4) {
    fields.password = "Parol kamida 4 belgi bo'lishi kerak.";
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    accountStatus: input.accountStatus === "blocked" ? "blocked" : "active",
    email,
    id: input.id || getUserIdFromPhone(phone),
    name,
    password,
    phone,
    phoneVerified: Boolean(input.phoneVerified),
    role: input.role === "admin" ? "admin" : "user",
  };
}

async function createUser(input) {
  const userInput = validateUserInput(input);
  const existing = await collections.users.findOne({
    $or: [{ id: userInput.id }, { phone: userInput.phone }],
  });

  if (existing) {
    throw httpError(409, "Bu telefon raqam allaqachon ro'yxatdan o'tgan.");
  }

  const password = hashPassword(userInput.password);
  const timestamp = now();
  const doc = {
    _id: userInput.id,
    accountStatus: userInput.accountStatus,
    blockReason: "",
    email: userInput.email,
    id: userInput.id,
    lastLoginAt: timestamp,
    name: userInput.name,
    passwordHash: password.hash,
    passwordSalt: password.salt,
    phone: userInput.phone,
    phoneVerified: Boolean(userInput.phoneVerified),
    registeredAt: timestamp,
    role: userInput.role,
  };

  await collections.users.insertOne(doc);
  return doc;
}

async function ensureSeedUser(input) {
  const existing = await collections.users.findOne({ phone: input.phone });

  if (existing) {
    return existing;
  }

  return createUser(input);
}

async function getNextSequence(name) {
  const result = await collections.counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true }
  );

  return result.value?.seq || result.seq || 1;
}

async function ensureCounterAtLeast(name, value) {
  await collections.counters.updateOne(
    { _id: name },
    { $max: { seq: Number(value || 0) } },
    { upsert: true }
  );
}

function normalizeListingPayload(payload, user, existing = {}) {
  const fields = {};
  const dealType =
    payload.dealType === "rent" || existing.dealType === "rent" ? "rent" : "sale";
  const price = Number(String(payload.price ?? existing.price ?? 0).replace(/\D/g, ""));
  const tags = Array.isArray(payload.tags)
    ? payload.tags.map(cleanText).filter(Boolean)
    : existing.tags || [];

  ["title", "propertyType", "city", "district", "address", "phone", "agent"].forEach(
    (key) => {
      if (!cleanText(payload[key] ?? existing[key])) {
        fields[key] = "Majburiy maydon.";
      }
    }
  );

  if (!price) {
    fields.price = "Narx kiriting.";
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  const timestamp = now();
  const image = cleanText(
    payload.image ||
      existing.image ||
      (Array.isArray(payload.galleryImages) ? payload.galleryImages[0] : "")
  );
  const galleryImages = Array.isArray(payload.galleryImages)
    ? payload.galleryImages.filter(Boolean)
    : existing.galleryImages || (image ? [image] : []);
  const imageMetadata = Array.isArray(payload.imageMetadata)
    ? payload.imageMetadata
        .map((item) => ({
          height: Number(item.height || 0),
          mimeType: cleanText(item.mimeType || ""),
          originalName: cleanText(item.originalName || ""),
          path: cleanText(item.path || ""),
          size: Number(item.size || 0),
          url: cleanText(item.url || item.src || ""),
          width: Number(item.width || 0),
        }))
        .filter((item) => item.url)
    : existing.imageMetadata || [];
  const priceLabel =
    payload.priceLabel ||
    (Number(existing.price || 0) === price && existing.priceLabel
      ? existing.priceLabel
      : formatListingPriceLabel(price, dealType));
  const priceHistory = buildPriceHistory(
    existing,
    payload,
    price,
    priceLabel,
    timestamp
  );

  return {
    address: cleanText(payload.address ?? existing.address),
    adminNote: cleanText(payload.adminNote ?? existing.adminNote ?? ""),
    agent: cleanText(payload.agent ?? existing.agent),
    amenities: cleanTextList(payload.amenities ?? existing.amenities ?? []),
    area: Number(payload.area ?? existing.area ?? 0),
    city: cleanText(payload.city ?? existing.city),
    createdAt: existing.createdAt || timestamp,
    dealType,
    description: cleanText(payload.description ?? existing.description ?? ""),
    district: cleanText(payload.district ?? existing.district),
    documentType: cleanText(payload.documentType ?? existing.documentType ?? ""),
    floor: cleanText(payload.floor ?? existing.floor ?? ""),
    furnished: Boolean(payload.furnished ?? existing.furnished ?? false),
    galleryImages,
    image,
    imageMetadata,
    latitude: payload.latitude === "" ? "" : Number(payload.latitude ?? existing.latitude ?? "") || "",
    listingPlan: cleanText(payload.listingPlan || existing.listingPlan || "standard"),
    longitude: payload.longitude === "" ? "" : Number(payload.longitude ?? existing.longitude ?? "") || "",
    moderationStatus:
      payload.moderationStatus || existing.moderationStatus || "approved",
    negotiable: Boolean(payload.negotiable ?? existing.negotiable ?? false),
    ownerId: payload.ownerId || existing.ownerId || user.id,
    paymentAmount: Number(payload.paymentAmount ?? existing.paymentAmount ?? 0),
    paymentProvider: cleanText(
      payload.paymentProvider ?? existing.paymentProvider ?? ""
    ),
    paymentReference: cleanText(
      payload.paymentReference ?? existing.paymentReference ?? ""
    ),
    paymentStatus: cleanText(
      payload.paymentStatus ?? existing.paymentStatus ?? "not_required"
    ),
    phone: cleanText(payload.phone ?? existing.phone),
    planExpiresAt: cleanText(payload.planExpiresAt || existing.planExpiresAt || ""),
    price,
    priceHistory,
    priceLabel,
    propertyType: cleanText(payload.propertyType ?? existing.propertyType),
    published: payload.published || existing.published || "Hozirgina",
    rooms: Number(payload.rooms ?? existing.rooms ?? 1),
    renovationCondition: cleanText(
      payload.renovationCondition ?? existing.renovationCondition ?? ""
    ),
    tags,
    title: cleanText(payload.title ?? existing.title),
    typeLabel: payload.typeLabel || existing.typeLabel || (dealType === "rent" ? "Ijara" : "Sotuv"),
    updatedAt: timestamp,
    utilities: cleanTextList(payload.utilities ?? existing.utilities ?? []),
    verified: Boolean(payload.verified ?? existing.verified ?? false),
  };
}

function parseJsonList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sqliteListingFromRow(row) {
  return {
    _id: Number(row.id),
    address: row.address,
    adminNote: row.admin_note || "",
    agent: row.agent,
    area: Number(row.area),
    city: row.city,
    createdAt: row.created_at,
    dealType: row.deal_type,
    description: row.description || "",
    district: row.district,
    floor: row.floor || "",
    galleryImages: parseJsonList(row.gallery_images),
    id: Number(row.id),
    image: row.image || "",
    listingPlan: row.listing_plan || "standard",
    moderationStatus: row.moderation_status || "approved",
    negotiable: parseJsonList(row.tags).includes("Kelishiladi"),
    ownerId: row.owner_id,
    phone: row.phone,
    planExpiresAt: row.plan_expires_at || "",
    price: Number(row.price),
    priceLabel: row.price_label,
    propertyType: row.property_type,
    published: row.published || "",
    rooms: Number(row.rooms),
    tags: parseJsonList(row.tags),
    title: row.title,
    typeLabel: row.type_label,
    updatedAt: row.updated_at,
    verified: Boolean(row.verified),
  };
}

async function seedFromSqliteIfAvailable() {
  if (!DatabaseSync || !fs.existsSync(SQLITE_DB_PATH)) {
    return false;
  }

  const sqlite = new DatabaseSync(SQLITE_DB_PATH);

  try {
    const rows = sqlite.prepare("SELECT * FROM listings ORDER BY id").all();

    if (rows.length === 0) {
      return false;
    }

    await collections.listings.insertMany(rows.map(sqliteListingFromRow), {
      ordered: false,
    }).catch(() => null);
    await ensureCounterAtLeast(
      "listings",
      Math.max(...rows.map((row) => Number(row.id)))
    );

    const favorites = sqlite
      .prepare("SELECT * FROM favorites")
      .all()
      .map((row) => ({
        _id: `${row.user_id}:${Number(row.listing_id)}`,
        createdAt: row.created_at,
        listingId: Number(row.listing_id),
        userId: row.user_id,
      }));

    if (favorites.length > 0) {
      await collections.favorites.insertMany(favorites, { ordered: false }).catch(() => null);
    }

    const messages = sqlite
      .prepare("SELECT * FROM messages ORDER BY id")
      .all()
      .map((row) => ({
        _id: Number(row.id),
        attachmentImage: row.attachment_image || "",
        body: row.body || "",
        conversationKey: `${Number(row.listing_id)}:${[
          row.sender_id,
          row.recipient_id,
        ].sort().join(":")}`,
        createdAt: row.created_at,
        createdAtLabel: getNowLabel(row.created_at),
        id: Number(row.id),
        listingId: Number(row.listing_id),
        listingImage: row.listing_image || "",
        listingPrice: row.listing_price || "",
        listingTitle: row.listing_title || "",
        read: Boolean(row.read),
        recipientId: row.recipient_id,
        recipientName: row.recipient_name,
        recipientPhone: row.recipient_phone,
        senderId: row.sender_id,
        senderName: row.sender_name,
        senderPhone: row.sender_phone,
      }));

    if (messages.length > 0) {
      await collections.messages.insertMany(messages, { ordered: false }).catch(() => null);
      await ensureCounterAtLeast(
        "messages",
        Math.max(...messages.map((message) => Number(message.id)))
      );
    }

    return true;
  } catch {
    return false;
  } finally {
    sqlite.close();
  }
}

async function seedState() {
  await ensureSeedUser({
    accountStatus: "active",
    email: "admin@uytop.uz",
    id: getUserIdFromPhone(ADMIN_PHONE),
    name: "UyTop Admin",
    password: ADMIN_PASSWORD,
    phone: ADMIN_PHONE,
    role: "admin",
  });
  await ensureSeedUser({
    accountStatus: "active",
    email: "demo@uytop.uz",
    name: "Doniyor Rakhmonov",
    password: "demo1234",
    phone: "+998 90 123 45 67",
    role: "user",
  });
  await ensureSeedUser({
    accountStatus: "active",
    email: "malika@example.uz",
    name: "Malika Karimova",
    password: "demo1234",
    phone: "+998 97 555 12 34",
    role: "user",
  });

  const listingCount = await collections.listings.countDocuments();

  if (listingCount === 0) {
    const seeded = await seedFromSqliteIfAvailable();

    if (!seeded) {
      const owner = await collections.users.findOne({ phone: "+998 90 123 45 67" });
      const timestamp = now();
      const docs = [
        {
          _id: 1,
          address: "Sebzor 12",
          adminNote: "",
          agent: "Doniyor Rakhmonov",
          area: 64,
          city: "Toshkent",
          createdAt: timestamp,
          dealType: "sale",
          description: "Metroga yaqin, ta'mirlangan va yorug' kvartira.",
          district: "Olmazor",
          floor: "4/9",
          galleryImages: [
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
          ],
          id: 1,
          image:
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
          listingPlan: "standard",
          moderationStatus: "approved",
          negotiable: false,
          ownerId: owner.id,
          phone: owner.phone,
          planExpiresAt: "",
          price: 74000,
          priceLabel: "$74,000",
          propertyType: "Kvartira",
          published: "Bugun",
          rooms: 2,
          tags: ["Metro yaqin", "Ta'mirlangan", "Yangi"],
          title: "Olmazorda 2 xonali kvartira",
          typeLabel: "Sotuv",
          updatedAt: timestamp,
          verified: true,
        },
      ];
      await collections.listings.insertMany(docs);
      await ensureCounterAtLeast("listings", 1);
    }
  }
}

async function initializeMongo() {
  await client.connect();
  database = client.db(MONGODB_DB);
  collections = {
    adminActionLogs: database.collection("admin_action_logs"),
    counters: database.collection("counters"),
    favorites: database.collection("favorites"),
    listingReports: database.collection("listing_reports"),
    listingStats: database.collection("listing_stats"),
    listings: database.collection("listings"),
    messages: database.collection("messages"),
    notifications: database.collection("notifications"),
    phoneOtpCodes: database.collection("phone_otp_codes"),
    savedSearches: database.collection("saved_searches"),
    sessions: database.collection("sessions"),
    users: database.collection("users"),
  };

  await Promise.all([
    collections.users.createIndex({ phone: 1 }, { unique: true }),
    collections.listings.createIndex({ id: 1 }, { unique: true }),
    collections.listings.createIndex({ city: 1, district: 1, price: 1 }),
    collections.listings.createIndex({ ownerId: 1, createdAt: -1 }),
    collections.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    collections.favorites.createIndex({ userId: 1, listingId: 1 }, { unique: true }),
    collections.messages.createIndex({ conversationKey: 1, createdAt: 1 }),
    collections.messages.createIndex({ senderId: 1 }),
    collections.messages.createIndex({ recipientId: 1 }),
    collections.listingReports.createIndex({ id: 1 }, { unique: true }),
    collections.listingReports.createIndex({ listingId: 1, status: 1 }),
    collections.adminActionLogs.createIndex({ id: 1 }, { unique: true }),
    collections.adminActionLogs.createIndex({ createdAt: -1 }),
    collections.savedSearches.createIndex({ id: 1 }, { unique: true }),
    collections.savedSearches.createIndex({ userId: 1, createdAt: -1 }),
    collections.notifications.createIndex({ id: 1 }, { unique: true }),
    collections.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 }),
    collections.phoneOtpCodes.createIndex({ userId: 1, phone: 1 }),
    collections.phoneOtpCodes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    collections.listingStats.createIndex({ listingId: 1 }, { unique: true }),
  ]);

  await seedState();
}

function route(method, pathname, handler) {
  const keys = [];
  const regex = new RegExp(
    `^${pathname
      .replace(/\/+$/, "")
      .replace(/:[^/]+/g, (match) => {
        keys.push(match.slice(1));
        return "([^/]+)";
      })}/?$`
  );

  routes.push({ handler, keys, method, regex });
}

function matchRoute(method, pathname) {
  for (const item of routes) {
    if (item.method !== method) {
      continue;
    }

    const match = pathname.match(item.regex);

    if (!match) {
      continue;
    }

    const params = {};
    item.keys.forEach((key, index) => {
      params[key] = decodeURIComponent(match[index + 1]);
    });
    return { handler: item.handler, params };
  }

  return null;
}

function publicBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${req.headers.host}`;
}

route("GET", "/", async () => ({
  frontend: FRONTEND_URL,
  ok: true,
  service: "uytop-api-mongo",
}));

route("GET", "/health", async () => ({
  allowedOrigins: ALLOWED_ORIGINS,
  database: MONGODB_DB,
  driver: "mongo",
  errorLog: ERROR_LOG_PATH,
  maxBodyMb: Number(process.env.UYTOP_MAX_BODY_MB || 10),
  ok: true,
  paymentProvider: PAYMENT_PROVIDER,
  service: "uytop-api-mongo",
  sessionTtlDays: SESSION_TTL_DAYS,
  smsProvider: SMS_PROVIDER,
  uri: MONGODB_URI.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@"),
}));

route("POST", "/auth/register", async ({ req }) => {
  const payload = await readJson(req);
  const user = await createUser({ ...payload, role: "user" });
  const token = await createSession(user.id);
  return {
    __headers: { "Set-Cookie": buildAuthCookie(token) },
    user: userFromDoc(user),
  };
});

route("POST", "/auth/login", async ({ req }) => {
  const payload = await readJson(req);
  const phone = cleanText(payload.phone);
  const password = String(payload.password ?? "");

  if (!phone || !password) {
    throwValidationError({
      password: !password ? "Parol kiriting." : undefined,
      phone: !phone ? "Telefon raqam kiriting." : undefined,
    });
  }

  const user = await collections.users.findOne({
    $or: [{ phone }, { id: getUserIdFromPhone(phone) }],
  });

  if (!user || !verifyPassword(user, password)) {
    throw httpError(401, "Telefon yoki parol noto'g'ri.");
  }

  const timestamp = now();
  await collections.users.updateOne(
    { id: user.id },
    { $set: { lastLoginAt: timestamp } }
  );
  const nextUser = { ...user, lastLoginAt: timestamp };
  const token = await createSession(nextUser.id);
  return {
    __headers: { "Set-Cookie": buildAuthCookie(token) },
    user: userFromDoc(nextUser),
  };
});

route("POST", "/auth/logout", async ({ req }) => {
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const token = getCookieValue(req, AUTH_COOKIE_NAME) || bearerToken;

  if (token) {
    await collections.sessions.updateOne(
      { _id: hashToken(token) },
      { $set: { revokedAt: now() } }
    );
  }

  return {
    __headers: { "Set-Cookie": buildClearAuthCookie() },
    ok: true,
  };
});

route("GET", "/me", async ({ req }) => ({ user: userFromDoc(await requireUser(req)) }));

route("POST", "/phone-verification/start", async ({ req }) => {
  const user = await requireActiveUser(req);
  const code = String(crypto.randomInt(100000, 1000000));
  const codeHash = hashPassword(code);
  const expiresAtDate = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  const timestamp = now();

  await collections.phoneOtpCodes.updateOne(
    { userId: user.id, phone: user.phone },
    {
      $set: {
        attempts: 0,
        codeHash: codeHash.hash,
        codeSalt: codeHash.salt,
        createdAt: timestamp,
        expiresAt: expiresAtDate,
        phone: user.phone,
        userId: user.id,
      },
    },
    { upsert: true }
  );

  const otpDelivery = await sendOtpCode({ code, phone: user.phone });

  await createNotification(
    user.id,
    "Telefon tasdiqlash kodi",
    otpDelivery.delivery === "dev"
      ? `Local test kodi: ${code}`
      : "Tasdiqlash kodi telefon raqamingizga yuborildi.",
    { type: "phone-verification" }
  );

  return {
    delivery: otpDelivery.delivery,
    devCode: otpDelivery.delivery === "dev" ? code : undefined,
    expiresAt: expiresAtDate.toISOString(),
    ok: true,
  };
});

route("POST", "/phone-verification/verify", async ({ req }) => {
  const user = await requireActiveUser(req);
  const payload = await readJson(req);
  const code = cleanText(payload.code || "");

  if (!/^\d{6}$/.test(code)) {
    throwValidationError({ code: "6 xonali kod kiriting." });
  }

  const otpDoc = await collections.phoneOtpCodes.findOne({
    phone: user.phone,
    userId: user.id,
  });

  if (!otpDoc || new Date(otpDoc.expiresAt).getTime() < Date.now()) {
    throw httpError(400, "Tasdiqlash kodi eskirgan. Yangi kod oling.");
  }

  if (Number(otpDoc.attempts || 0) >= 5) {
    throw httpError(429, "Urinishlar soni oshib ketdi. Yangi kod oling.");
  }

  if (!verifyOtpHash(otpDoc, code)) {
    await collections.phoneOtpCodes.updateOne(
      { _id: otpDoc._id },
      { $inc: { attempts: 1 } }
    );
    throwValidationError({ code: "Kod noto'g'ri." });
  }

  await collections.users.updateOne(
    { id: user.id },
    { $set: { phoneVerified: true } }
  );
  await collections.phoneOtpCodes.deleteOne({ _id: otpDoc._id });

  return { user: userFromDoc(await collections.users.findOne({ id: user.id })) };
});

route("PATCH", "/me", async ({ req }) => {
  const user = await requireUser(req);
  const payload = await readJson(req);
  const nextProfile = validateUserInput(
    { ...user, ...payload, password: "profile-update", role: user.role },
    { requirePassword: false }
  );
  const phoneExists = await collections.users.findOne({
    id: { $ne: user.id },
    phone: nextProfile.phone,
  });

  if (phoneExists) {
    throw httpError(409, "Bu telefon raqam allaqachon ro'yxatdan o'tgan.");
  }

  const phoneVerified =
    nextProfile.phone === user.phone
      ? Boolean(payload.phoneVerified || user.phoneVerified)
      : false;

  await collections.users.updateOne(
    { id: user.id },
    {
      $set: {
        email: nextProfile.email,
        name: nextProfile.name,
        phone: nextProfile.phone,
        phoneVerified,
      },
    }
  );

  return { user: userFromDoc(await collections.users.findOne({ id: user.id })) };
});

route("GET", "/saved-searches", async ({ req }) => {
  const user = await requireUser(req);
  return {
    searches: (
      await collections.savedSearches
        .find({ userId: user.id })
        .sort({ createdAt: -1, id: -1 })
        .toArray()
    ).map(savedSearchFromDoc),
  };
});

route("POST", "/saved-searches", async ({ req }) => {
  const user = await requireActiveUser(req);
  const payload = await readJson(req);
  const name = cleanText(payload.name || "Saqlangan qidiruv");

  if (!payload.filters || typeof payload.filters !== "object") {
    throwValidationError({ filters: "Qidiruv filterlari topilmadi." });
  }

  const id = await getNextSequence("savedSearches");
  const timestamp = now();
  const doc = {
    _id: id,
    createdAt: timestamp,
    createdAtLabel: getNowLabel(timestamp),
    filters: payload.filters,
    id,
    name,
    userId: user.id,
  };

  await collections.savedSearches.insertOne(doc);

  const staleSearchIds = (
    await collections.savedSearches
      .find({ userId: user.id })
      .sort({ createdAt: -1, id: -1 })
      .skip(10)
      .project({ _id: 1 })
      .toArray()
  ).map((item) => item._id);

  if (staleSearchIds.length > 0) {
    await collections.savedSearches.deleteMany({ _id: { $in: staleSearchIds } });
  }

  return { search: savedSearchFromDoc(doc) };
});

route("DELETE", "/saved-searches/:id", async ({ params, req }) => {
  const user = await requireUser(req);
  await collections.savedSearches.deleteOne({
    id: Number(params.id),
    userId: user.id,
  });
  return { ok: true };
});

route("GET", "/notifications", async ({ req }) => {
  const user = await requireUser(req);
  return {
    notifications: (
      await collections.notifications
        .find({ userId: user.id })
        .sort({ createdAt: -1, id: -1 })
        .limit(30)
        .toArray()
    ).map(notificationFromDoc),
  };
});

route("PATCH", "/notifications/:id/read", async ({ params, req }) => {
  const user = await requireUser(req);
  const id = Number(params.id);

  await collections.notifications.updateOne(
    { id, userId: user.id },
    { $set: { read: true } }
  );

  return {
    notification: notificationFromDoc(
      await collections.notifications.findOne({ id, userId: user.id })
    ),
  };
});

route("PATCH", "/notifications/read-all", async ({ req }) => {
  const user = await requireUser(req);
  await collections.notifications.updateMany(
    { userId: user.id, read: false },
    { $set: { read: true } }
  );
  return { ok: true };
});

route("GET", "/listing-stats", async () => {
  const listingIds = (
    await collections.listings
      .find({}, { projection: { id: 1 } })
      .toArray()
  ).map((listing) => Number(listing.id));
  const stats = await Promise.all(listingIds.map(getListingStatsDoc));

  return { stats: stats.map(listingStatsFromDoc) };
});

route("GET", "/listings/:id/stats", async ({ params }) => ({
  stats: listingStatsFromDoc(await getListingStatsDoc(params.id)),
}));

route("POST", "/listings/:id/stats/view", async ({ params }) => ({
  stats: listingStatsFromDoc(await incrementListingStat(params.id, "viewCount")),
}));

route("POST", "/listings/:id/stats/lead", async ({ params }) => ({
  stats: listingStatsFromDoc(await incrementListingStat(params.id, "leadCount")),
}));

route("GET", "/listings", async () => ({
  listings: (await collections.listings.find().sort({ createdAt: -1, id: -1 }).toArray())
    .map(listingFromDoc)
    .filter((listing) => listing.moderationStatus === "approved"),
}));

route("GET", "/listings/:id", async ({ params }) => {
  const listing = listingFromDoc(
    await collections.listings.findOne({ id: Number(params.id) })
  );

  if (!listing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  return { listing };
});

route("POST", "/listings/:id/reports", async ({ params, req }) => {
  const listing = await collections.listings.findOne({ id: Number(params.id) });

  if (!listing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  const payload = await readJson(req);
  const reason = cleanText(payload.reason || "");

  if (!reason) {
    throwValidationError({ reason: "Shikoyat sababini tanlang." });
  }

  const reporter = await getOptionalUser(req);
  const id = await getNextSequence("listingReports");
  const timestamp = now();
  const doc = {
    _id: id,
    createdAt: timestamp,
    createdAtLabel: getNowLabel(timestamp),
    id,
    listingId: listing.id,
    listingTitle: listing.title,
    reason,
    reporterId: reporter?.id || "",
    reporterName:
      cleanText(payload.reporterName || reporter?.name || "") || "Mehmon",
    reporterPhone: cleanText(payload.reporterPhone || reporter?.phone || ""),
    resolvedAt: "",
    status: "open",
  };

  await collections.listingReports.insertOne(doc);
  return { report: reportFromDoc(doc) };
});

route("POST", "/listings", async ({ req }) => {
  const user = await requireActiveUser(req);
  const payload = await readJson(req);
  const id = await getNextSequence("listings");
  const listing = normalizeListingPayload(
    {
      ...payload,
      moderationStatus: "approved",
      ownerId: user.id,
      verified: true,
    },
    user
  );
  const duplicateListing = await collections.listings.findOne({
    address: listing.address,
    city: listing.city,
    ownerId: user.id,
    title: listing.title,
  });

  if (duplicateListing) {
    throw httpError(409, "Bu e'lon avval joylangan. Takroriy e'lon yaratilmadi.");
  }

  const doc = { _id: id, id, ...listing };

  await collections.listings.insertOne(doc);
  await createNotification(
    user.id,
    "E'lon joylandi",
    `"${listing.title}" e'loni saytda ko'rinadi.`,
    { entityId: id, type: "listing" }
  );
  await notifySavedSearchMatches({ id, ...listing }, user.id);
  return { listing: listingFromDoc(doc) };
});

route("PATCH", "/listings/:id", async ({ params, req }) => {
  const user = await requireActiveUser(req);
  const existing = await collections.listings.findOne({ id: Number(params.id) });

  if (!existing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  if (!canManageListing(existing, user)) {
    throw httpError(403, "Bu e'lonni tahrirlash mumkin emas.");
  }

  const payload = await readJson(req);
  const safePayload =
    user.role === "admin"
      ? payload
      : {
          ...payload,
          adminNote: existing.adminNote,
          moderationStatus: existing.moderationStatus,
          ownerId: existing.ownerId,
          verified: existing.verified,
        };
  const nextListing = normalizeListingPayload(safePayload, user, existing);

  await collections.listings.updateOne(
    { id: Number(params.id) },
    { $set: nextListing }
  );

  return {
    listing: listingFromDoc(
      await collections.listings.findOne({ id: Number(params.id) })
    ),
  };
});

route("DELETE", "/listings/:id", async ({ params, req }) => {
  const user = await requireActiveUser(req);
  const listing = await collections.listings.findOne({ id: Number(params.id) });

  if (!listing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  if (!canManageListing(listing, user)) {
    throw httpError(403, "Bu e'lonni o'chirish mumkin emas.");
  }

  await collections.listings.deleteOne({ id: Number(params.id) });
  await collections.favorites.deleteMany({ listingId: Number(params.id) });
  await collections.messages.deleteMany({ listingId: Number(params.id) });
  await collections.listingStats.deleteOne({ _id: Number(params.id) });
  return { ok: true };
});

route("GET", "/favorites", async ({ req }) => {
  const user = await requireUser(req);
  return {
    favorites: await collections.favorites
      .find({ userId: user.id })
      .project({ _id: 0, createdAt: 1, listingId: 1, userId: 1 })
      .toArray(),
  };
});

route("POST", "/favorites/:listingId", async ({ params, req }) => {
  const user = await requireUser(req);
  const listingId = Number(params.listingId);
  const listing = await collections.listings.findOne({ id: listingId });

  if (
    !listing ||
    (listing.moderationStatus !== "approved" && !canManageListing(listing, user))
  ) {
    throw httpError(404, "E'lon topilmadi.");
  }

  await collections.favorites.updateOne(
    { _id: `${user.id}:${listingId}` },
    {
      $set: {
        _id: `${user.id}:${listingId}`,
        createdAt: now(),
        listingId,
        userId: user.id,
      },
    },
    { upsert: true }
  );

  await syncListingFavoriteCount(listingId);
  return {
    stats: listingStatsFromDoc(await getListingStatsDoc(listingId)),
  };
});

route("DELETE", "/favorites/:listingId", async ({ params, req }) => {
  const user = await requireUser(req);
  await collections.favorites.deleteOne({
    _id: `${user.id}:${Number(params.listingId)}`,
  });
  await syncListingFavoriteCount(Number(params.listingId));
  return {
    stats: listingStatsFromDoc(await getListingStatsDoc(params.listingId)),
  };
});

async function getUserConversations(user) {
  const userId = getUserId(user);
  const messages = await collections.messages
    .find({
      $or: [{ senderId: userId }, { recipientId: userId }],
    })
    .sort({ createdAt: 1 })
    .toArray();
  const conversationMap = new Map();

  messages.map(messageFromDoc).forEach((message) => {
    const key = message.conversationKey || getConversationKey(message);
    const isSender = message.senderId === userId;
    const otherUser = isSender
      ? {
          id: message.recipientId,
          name: message.recipientName,
          phone: message.recipientPhone,
        }
      : {
          id: message.senderId,
          name: message.senderName,
          phone: message.senderPhone,
        };

    if (!conversationMap.has(key)) {
      conversationMap.set(key, {
        key,
        lastMessagePreview: "",
        listingId: message.listingId,
        listingImage: message.listingImage,
        listingPrice: message.listingPrice,
        listingTitle: message.listingTitle,
        messages: [],
        otherUser,
        unreadCount: 0,
        updatedAt: message.createdAt,
      });
    }

    const conversation = conversationMap.get(key);
    conversation.messages.push(message);
    conversation.lastMessagePreview = message.body || "Rasm yuborildi";
    conversation.updatedAt = message.createdAt;

    if (message.recipientId === userId && !message.read) {
      conversation.unreadCount += 1;
    }
  });

  return Array.from(conversationMap.values()).sort(
    (first, second) => new Date(second.updatedAt) - new Date(first.updatedAt)
  );
}

route("GET", "/conversations", async ({ req }) => ({
  conversations: await getUserConversations(await requireUser(req)),
}));

route("GET", "/conversations/:key/messages", async ({ params, req }) => {
  await requireUser(req);
  const key = params.key;
  return {
    messages: (await collections.messages.find({ conversationKey: key }).sort({ createdAt: 1 }).toArray()).map(messageFromDoc),
  };
});

route("POST", "/conversations/:key/messages", async ({ params, req }) => {
  const user = await requireActiveUser(req);
  const payload = await readJson(req);
  const id = await getNextSequence("messages");
  const timestamp = now();
  const doc = {
    _id: id,
    attachmentImage: cleanText(payload.attachmentImage || ""),
    body: cleanText(payload.body || ""),
    conversationKey: params.key,
    createdAt: timestamp,
    createdAtLabel: getNowLabel(timestamp),
    id,
    listingId: Number(payload.listingId),
    listingImage: cleanText(payload.listingImage || ""),
    listingPrice: cleanText(payload.listingPrice || ""),
    listingTitle: cleanText(payload.listingTitle || ""),
    read: false,
    recipientId: cleanText(payload.recipientId || ""),
    recipientName: cleanText(payload.recipientName || ""),
    recipientPhone: cleanText(payload.recipientPhone || ""),
    senderId: user.id,
    senderName: user.name,
    senderPhone: user.phone,
  };

  if (!doc.body && !doc.attachmentImage) {
    throwValidationError({ body: "Xabar yoki rasm yuboring." });
  }

  await collections.messages.insertOne(doc);
  if (doc.recipientId && doc.recipientId !== user.id) {
    await createNotification(
      doc.recipientId,
      "Yangi chat xabari",
      `${user.name}: ${doc.body || "Rasm yuborildi"}`,
      { entityId: doc.conversationKey, type: "chat" }
    );
  }
  return { message: messageFromDoc(doc) };
});

route("PATCH", "/conversations/:key/read", async ({ params, req }) => {
  const user = await requireUser(req);
  await collections.messages.updateMany(
    { conversationKey: params.key, recipientId: user.id },
    { $set: { read: true } }
  );
  return { ok: true };
});

route("PATCH", "/conversations/:key/archive", async ({ req }) => {
  await requireUser(req);
  return { ok: true };
});

route("POST", "/uploads/listing-images", async ({ req }) => {
  await requireActiveUser(req);
  const files = await saveUploadedFiles(req, "listing-images", {
    maxFiles: 8,
    minLongSide: MIN_LISTING_IMAGE_LONG_SIDE,
    minShortSide: MIN_LISTING_IMAGE_SHORT_SIDE,
  });

  return {
    files,
    urls: files.map((file) => file.url),
  };
});

route("POST", "/uploads/message-attachments", async ({ req }) => {
  await requireActiveUser(req);
  const files = await saveUploadedFiles(req, "message-attachments", { maxFiles: 1 });

  return {
    files,
    urls: files.map((file) => file.url),
  };
});

route("GET", "/admin/users", async ({ req }) => {
  await requireAdmin(req);
  return {
    users: (await collections.users.find().sort({ registeredAt: -1 }).toArray()).map(userFromDoc),
  };
});

route("PATCH", "/admin/users/:id/status", async ({ params, req }) => {
  await requireAdmin(req);
  const payload = await readJson(req);
  const accountStatus = payload.accountStatus === "blocked" ? "blocked" : "active";
  const blockReason =
    accountStatus === "blocked" ? cleanText(payload.blockReason || "") : "";

  await collections.users.updateOne(
    { id: params.id },
    { $set: { accountStatus, blockReason } }
  );

  await createNotification(
    params.id,
    accountStatus === "blocked" ? "Profil bloklandi" : "Profil aktiv qilindi",
    accountStatus === "blocked"
      ? blockReason || "Profilingiz vaqtincha cheklangan."
      : "Profilingiz yana aktiv holatga o'tkazildi.",
    { entityId: params.id, type: "account" }
  );

  return { user: userFromDoc(await collections.users.findOne({ id: params.id })) };
});

route("GET", "/admin/listings", async ({ req }) => {
  await requireAdmin(req);
  return {
    listings: (await collections.listings.find().sort({ createdAt: -1, id: -1 }).toArray()).map(listingFromDoc),
  };
});

route("PATCH", "/admin/listings/:id/moderation", async ({ params, req }) => {
  await requireAdmin(req);
  const payload = await readJson(req);
  const moderationStatus = ["approved", "pending", "rejected"].includes(
    payload.moderationStatus
  )
    ? payload.moderationStatus
    : "approved";

  await collections.listings.updateOne(
    { id: Number(params.id) },
    { $set: { moderationStatus, updatedAt: now() } }
  );

  const nextListing = await collections.listings.findOne({ id: Number(params.id) });
  await createNotification(
    nextListing?.ownerId,
    "E'lon statusi yangilandi",
    `"${nextListing?.title || "E'lon"}" statusi: ${moderationStatus}.`,
    { entityId: Number(params.id), type: "listing" }
  );

  return {
    listing: listingFromDoc(nextListing),
  };
});

route("PATCH", "/admin/listings/:id/note", async ({ params, req }) => {
  await requireAdmin(req);
  const payload = await readJson(req);

  await collections.listings.updateOne(
    { id: Number(params.id) },
    { $set: { adminNote: cleanText(payload.adminNote || ""), updatedAt: now() } }
  );

  return {
    listing: listingFromDoc(
      await collections.listings.findOne({ id: Number(params.id) })
    ),
  };
});

route("GET", "/admin/messages", async ({ req }) => {
  await requireAdmin(req);
  return {
    messages: (await collections.messages.find().sort({ createdAt: -1 }).toArray()).map(messageFromDoc),
  };
});

route("GET", "/admin/reports", async ({ req }) => {
  await requireAdmin(req);
  return {
    reports: (await collections.listingReports.find().sort({ createdAt: -1 }).toArray())
      .map(reportFromDoc),
  };
});

route("PATCH", "/admin/reports/:id/resolve", async ({ params, req }) => {
  await requireAdmin(req);
  const id = Number(params.id);
  const resolvedAt = now();

  await collections.listingReports.updateOne(
    { id },
    { $set: { resolvedAt, status: "resolved" } }
  );

  return {
    report: reportFromDoc(await collections.listingReports.findOne({ id })),
  };
});

route("GET", "/admin/actions", async ({ req }) => {
  await requireAdmin(req);
  return {
    actions: (await collections.adminActionLogs.find().sort({ createdAt: -1 }).toArray())
      .map(adminActionFromDoc),
  };
});

route("POST", "/admin/actions", async ({ req }) => {
  const admin = await requireAdmin(req);
  const payload = await readJson(req);
  const id = await getNextSequence("adminActions");
  const timestamp = now();
  const doc = {
    _id: id,
    action: cleanText(payload.action || ""),
    actor: admin.name || "Admin",
    adminId: admin.id,
    createdAt: timestamp,
    createdAtLabel: getNowLabel(timestamp),
    entityId: payload.entityId ?? "",
    entityTitle: cleanText(payload.entityTitle || ""),
    id,
    note: cleanText(payload.note || ""),
    type: cleanText(payload.type || "system"),
  };

  if (!doc.action) {
    throwValidationError({ action: "Admin amalini kiriting." });
  }

  await collections.adminActionLogs.insertOne(doc);
  return { action: adminActionFromDoc(doc) };
});

route("POST", "/admin/uploads/cleanup", async ({ req }) => {
  await requireAdmin(req);
  const payload = await readJson(req);
  const olderThanDays =
    Number(payload.olderThanDays) || UPLOAD_CLEANUP_MAX_AGE_DAYS;

  return { cleanup: await cleanupUnusedUploads({ olderThanDays }) };
});

async function start() {
  await initializeMongo();
  cleanupUnusedUploads({ olderThanDays: UPLOAD_CLEANUP_MAX_AGE_DAYS }).catch(
    (error) => console.warn("Upload cleanup xatosi:", error.message)
  );
  const cleanupTimer = setInterval(() => {
    cleanupUnusedUploads({ olderThanDays: UPLOAD_CLEANUP_MAX_AGE_DAYS }).catch(
      (error) => console.warn("Upload cleanup xatosi:", error.message)
    );
  }, 24 * 60 * 60 * 1000);

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }

  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (!isOriginAllowed(req)) {
      sendJson(res, 403, { error: "Origin ruxsat etilmagan." }, req);
      return;
    }

    if (req.method === "OPTIONS") {
      sendNoContent(res, req);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname.startsWith("/uploads/")) {
      serveUpload(req, res, requestUrl.pathname);
      return;
    }

    const matchedRoute = matchRoute(req.method, requestUrl.pathname);

    if (!matchedRoute) {
      sendJson(res, 404, { error: "Endpoint topilmadi." }, req);
      return;
    }

    try {
      checkRateLimit(req, requestUrl.pathname);

      const payload = await matchedRoute.handler({
        params: matchedRoute.params,
        query: requestUrl.searchParams,
        req,
      });

      if (payload === null) {
        sendNoContent(res, req);
        return;
      }

      const { __headers: extraHeaders = {}, ...responsePayload } =
        payload && typeof payload === "object" ? payload : {};

      sendJson(res, 200, responsePayload, req, extraHeaders);
    } catch (error) {
      logServerError(req, error);
      sendJson(
        res,
        error.status || 500,
        {
          details: error.details || null,
          error: error.message || "Server xatosi.",
        },
        req
      );
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`UyTop Mongo API: http://${HOST}:${PORT}`);
    console.log(`MongoDB: ${MONGODB_URI}/${MONGODB_DB}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
