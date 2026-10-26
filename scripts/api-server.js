const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { DatabaseSync } = require("node:sqlite");

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
const AUTH_COOKIE_NAME = process.env.UYTOP_AUTH_COOKIE_NAME || "uytop_session";
const COOKIE_SECURE =
  String(process.env.UYTOP_COOKIE_SECURE || "").toLowerCase() === "true";
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
const ALLOWED_ORIGINS = (process.env.UYTOP_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const DATA_DIR = path.resolve(__dirname, "..", "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const LOG_DIR = path.resolve(process.env.UYTOP_LOG_DIR || path.join(DATA_DIR, "logs"));
const ERROR_LOG_PATH = path.join(LOG_DIR, "api-errors.log");
const DB_PATH = path.resolve(
  process.env.UYTOP_DB_PATH || path.join(DATA_DIR, "uytop.sqlite")
);

if (process.argv.includes("--reset")) {
  fs.rmSync(DB_PATH, { force: true });
  fs.rmSync(UPLOAD_DIR, { force: true, recursive: true });
  console.log(`UyTop API database reset: ${DB_PATH}`);
  process.exit(0);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
const routes = [];

const seedImages = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80",
];

function now() {
  return new Date().toISOString();
}

function formatDateLabel(value = now()) {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function normalizePhone(phone = "") {
  return String(phone).replace(/\D/g, "");
}

function getUserIdFromPhone(phone = "") {
  const digits = normalizePhone(phone);
  return digits ? `user-${digits}` : `user-${Date.now()}`;
}

function toJsonList(value) {
  return JSON.stringify(Array.isArray(value) ? value : []);
}

function parseJsonList(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function httpError(status, message, details = null) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function logServerError(req, error) {
  const status = error.status || 500;

  if (status < 500) {
    return;
  }

  const entry = {
    at: new Date().toISOString(),
    details: error.details || null,
    message: error.message || "Server xatosi.",
    method: req.method,
    path: req.url,
    status,
    stack: error.stack || "",
  };

  fs.appendFile(ERROR_LOG_PATH, `${JSON.stringify(entry)}\n`, () => {});
}

function timingSafeHexEqual(first, second) {
  if (!first || !second || first.length !== second.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(first, "hex"), Buffer.from(second, "hex"));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return {
    hash: crypto.scryptSync(String(password), salt, 64).toString("hex"),
    salt,
  };
}

function verifyPassword(userRow, password) {
  if (!userRow.password_hash || !userRow.password_salt) {
    return { ok: false, shouldUpgrade: false };
  }

  const nextHash = hashPassword(password, userRow.password_salt).hash;

  if (timingSafeHexEqual(nextHash, userRow.password_hash)) {
    return { ok: true, shouldUpgrade: false };
  }

  const legacyHash = crypto
    .createHash("sha256")
    .update(`${userRow.password_salt}:${password}`)
    .digest("hex");

  return {
    ok: timingSafeHexEqual(legacyHash, userRow.password_hash),
    shouldUpgrade: timingSafeHexEqual(legacyHash, userRow.password_hash),
  };
}

function upgradePasswordHash(userId, password) {
  const nextPassword = hashPassword(password);
  db.prepare(
    "UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?"
  ).run(nextPassword.hash, nextPassword.salt, userId);
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie || "";

  if (!cookieHeader) {
    return "";
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

function getRequestToken(req) {
  return getCookieValue(req, AUTH_COOKIE_NAME) || getBearerToken(req);
}

function buildAuthCookie(token) {
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_DAYS * 24 * 60 * 60}`,
  ];

  if (COOKIE_SECURE) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildClearAuthCookie() {
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (COOKIE_SECURE) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function isOriginAllowed(req) {
  const origin = req.headers.origin;

  return !origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin);
}

function getCorsHeaders(req) {
  const origin = req.headers.origin;
  const allowAll = ALLOWED_ORIGINS.includes("*");
  const allowedOrigin =
    allowAll || ALLOWED_ORIGINS.includes(origin)
      ? allowAll
        ? origin || "*"
        : origin
      : "";

  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    Vary: "Origin",
  };
}

function sendJson(res, status, payload, req = { headers: {} }, extraHeaders = {}) {
  res.writeHead(status, {
    ...getCorsHeaders(req),
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res, req = { headers: {} }) {
  res.writeHead(204, {
    ...getCorsHeaders(req),
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("data", (chunk) => {
      totalBytes += chunk.length;

      if (totalBytes > MAX_BODY_BYTES) {
        req.destroy(httpError(413, "So'rov hajmi juda katta."));
      }
    });
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
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

function createToken(userId, req) {
  const token = crypto.randomBytes(32).toString("base64url");
  const timestamp = now();
  db.prepare(
    `INSERT INTO sessions (
      token_hash, user_id, created_at, expires_at, last_seen_at, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    hashToken(token),
    userId,
    timestamp,
    getSessionExpiry(),
    timestamp,
    req.headers["user-agent"] || ""
  );
  return token;
}

function getRequestUser(req) {
  const token = getRequestToken(req);

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT users.*
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?
         AND sessions.revoked_at IS NULL
         AND sessions.expires_at > ?`
    )
    .get(tokenHash, now());

  if (!row) {
    return null;
  }

  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?").run(
    now(),
    tokenHash
  );

  return userFromRow(row);
}

function revokeRequestSession(req) {
  const token = getRequestToken(req);

  if (!token) {
    return false;
  }

  const result = db
    .prepare(
      `UPDATE sessions
       SET revoked_at = ?
       WHERE token_hash = ? AND revoked_at IS NULL`
    )
    .run(now(), hashToken(token));

  return result.changes > 0;
}

function cleanupExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now());
}

function requireUser(req) {
  const user = getRequestUser(req);

  if (!user) {
    throw httpError(401, "Avval tizimga kiring.");
  }

  return user;
}

function requireActiveUser(req) {
  const user = requireUser(req);

  if (user.accountStatus === "blocked") {
    throw httpError(403, "Hisob bloklangan.");
  }

  return user;
}

function requireAdmin(req) {
  const user = requireActiveUser(req);

  if (user.role !== "admin") {
    throw httpError(403, "Bu amal faqat admin uchun.");
  }

  return user;
}

function userFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    accountStatus: row.account_status,
    blockReason: row.block_reason || "",
    email: row.email || "",
    id: row.id,
    lastLoginAt: row.last_login_at,
    lastLoginAtLabel: formatDateLabel(row.last_login_at),
    name: row.name,
    phone: row.phone,
    registeredAt: row.registered_at,
    registeredAtLabel: formatDateLabel(row.registered_at),
    role: row.role,
  };
}

function listingFromRow(row) {
  if (!row) {
    return null;
  }

  return {
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
    image: row.image,
    listingPlan: row.listing_plan || "standard",
    moderationStatus: row.moderation_status,
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
    negotiable: parseJsonList(row.tags).includes("Kelishiladi"),
    verified: Boolean(row.verified),
  };
}

function messageFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    attachmentImage: row.attachment_image || "",
    body: row.body || "",
    conversationKey: row.conversation_key,
    createdAt: row.created_at,
    createdAtLabel: formatDateLabel(row.created_at),
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
  };
}

function listingReportFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    createdAt: row.created_at,
    createdAtLabel: formatDateLabel(row.created_at),
    id: Number(row.id),
    listingId: Number(row.listing_id),
    listingTitle: row.listing_title || "",
    reason: row.reason || "",
    reporterId: row.reporter_id || "",
    reporterName: row.reporter_name || "Mehmon",
    reporterPhone: row.reporter_phone || "",
    resolvedAt: row.resolved_at || "",
    status: row.status || "open",
  };
}

function adminActionFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    action: row.action || "",
    actor: row.actor || "Admin",
    createdAt: row.created_at,
    createdAtLabel: formatDateLabel(row.created_at),
    entityId: row.entity_id || "",
    entityTitle: row.note || "",
    id: Number(row.id),
    type: row.entity_type || "system",
  };
}

function savedSearchFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    createdAt: row.created_at,
    createdAtLabel: formatDateLabel(row.created_at),
    filters: (() => {
      try {
        return JSON.parse(row.filters_json || "{}");
      } catch {
        return {};
      }
    })(),
    id: Number(row.id),
    name: row.name || "Saqlangan qidiruv",
    userId: row.user_id,
  };
}

function notificationFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    body: row.body || "",
    createdAt: row.created_at,
    createdAtLabel: formatDateLabel(row.created_at),
    id: Number(row.id),
    read: Boolean(row.read),
    text: row.body || "",
    title: row.title || "Bildirishnoma",
    type: "system",
    userId: row.user_id,
  };
}

function listingStatsFromRow(row) {
  if (!row) {
    return null;
  }

  return {
    favorites: Number(row.favorite_count || 0),
    favoriteCount: Number(row.favorite_count || 0),
    leads: Number(row.lead_count || 0),
    leadCount: Number(row.lead_count || 0),
    listingId: Number(row.listing_id),
    updatedAt: row.updated_at || "",
    views: Number(row.view_count || 0),
    viewCount: Number(row.view_count || 0),
  };
}

function findUserRowByPhone(phone) {
  return db
    .prepare("SELECT * FROM users WHERE phone = ? OR id = ?")
    .get(phone, getUserIdFromPhone(phone));
}

function findUserRowById(userId) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
}

function findUserById(userId) {
  return userFromRow(findUserRowById(userId));
}

function findListingById(listingId) {
  return listingFromRow(
    db.prepare("SELECT * FROM listings WHERE id = ?").get(Number(listingId))
  );
}

function getListingOwnerId(listing) {
  return listing?.ownerId || getUserIdFromPhone(listing?.phone);
}

function canManageListing(listing, user) {
  return Boolean(
    listing &&
      user &&
      (user.role === "admin" ||
        getListingOwnerId(listing) === user.id ||
        listing.phone === user.phone)
  );
}

function canViewListing(listing, user) {
  return Boolean(
    listing &&
      (listing.moderationStatus === "approved" || canManageListing(listing, user))
  );
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function hasMinDigits(value, minDigits = 9) {
  return normalizePhone(value).length >= minDigits;
}

function isValidEmail(value) {
  const email = cleanText(value);
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPositiveNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function throwValidationError(fields) {
  throw httpError(400, "Ma'lumotlarni to'g'ri kiriting.", { fields });
}

function validateUserInput(input, { requirePassword = true } = {}) {
  const fields = {};
  const name = cleanText(input.name);
  const phone = cleanText(input.phone);
  const email = cleanText(input.email);
  const password = String(input.password ?? "");

  if (name.length < 2) {
    fields.name = "Ism kamida 2 belgi bo'lishi kerak.";
  }

  if (!hasMinDigits(phone)) {
    fields.phone = "Telefon raqam to'g'ri kiritilmagan.";
  }

  if (!isValidEmail(email)) {
    fields.email = "Email formati noto'g'ri.";
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
    role: input.role === "admin" ? "admin" : "user",
  };
}

function validateProfileInput(input, currentUser) {
  return validateUserInput(
    {
      ...currentUser,
      ...input,
      password: "profile-update",
      role: currentUser.role,
    },
    { requirePassword: false }
  );
}

function createUser(input) {
  const userInput = validateUserInput(input);

  if (findUserRowByPhone(userInput.phone)) {
    throw httpError(409, "Bu telefon raqam allaqachon ro'yxatdan o'tgan.");
  }

  const timestamp = now();
  const password = hashPassword(userInput.password);

  db.prepare(
    `INSERT INTO users (
      id, name, phone, email, role, account_status, password_hash,
      password_salt, registered_at, last_login_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userInput.id,
    userInput.name,
    userInput.phone,
    userInput.email,
    userInput.role,
    userInput.accountStatus,
    password.hash,
    password.salt,
    timestamp,
    timestamp
  );

  return findUserById(userInput.id);
}

function ensureSeedUser(input) {
  const existing = findUserRowByPhone(input.phone);

  if (existing) {
    return userFromRow(existing);
  }

  return createUser(input);
}

function updateLastLogin(userId) {
  const timestamp = now();
  db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(
    timestamp,
    userId
  );
  return findUserById(userId);
}

function updateUserProfile(user, payload) {
  const nextProfile = validateProfileInput(payload, user);
  const nextPhone = nextProfile.phone;
  const conflictingUser = db
    .prepare("SELECT id FROM users WHERE phone = ? AND id <> ?")
    .get(nextPhone, user.id);

  if (conflictingUser) {
    throw httpError(409, "Bu telefon raqam boshqa profilda ishlatilgan.");
  }

  db.prepare(
    `UPDATE users
     SET name = ?, phone = ?, email = ?
     WHERE id = ?`
  ).run(nextProfile.name, nextPhone, nextProfile.email, user.id);

  return findUserById(user.id);
}

function validateListingInput(payload, existing = {}) {
  const merged = { ...existing, ...payload };
  const fields = {};
  const dealType = cleanText(merged.dealType || "sale");
  const title = cleanText(merged.title);
  const city = cleanText(merged.city);
  const district = cleanText(merged.district);
  const address = cleanText(merged.address);
  const floor = cleanText(merged.floor);
  const propertyType = cleanText(merged.propertyType);
  const description = cleanText(merged.description);
  const phone = cleanText(merged.phone);
  const agent = cleanText(merged.agent);
  const price = getPositiveNumber(merged.price);
  const rooms = getPositiveNumber(merged.rooms);
  const area = getPositiveNumber(merged.area);

  if (!["sale", "rent"].includes(dealType)) {
    fields.dealType = "E'lon turi noto'g'ri.";
  }

  if (title.length < 3) {
    fields.title = "Sarlavha kamida 3 belgi bo'lishi kerak.";
  }

  if (!propertyType) {
    fields.propertyType = "Uy turi kerak.";
  }

  if (!city) {
    fields.city = "Shahar kerak.";
  }

  if (district.length < 2) {
    fields.district = "Tuman kiriting.";
  }

  if (address.length < 3) {
    fields.address = "Manzil kiriting.";
  }

  if (!price) {
    fields.price = "Narx musbat son bo'lishi kerak.";
  }

  if (!rooms) {
    fields.rooms = "Xona soni musbat son bo'lishi kerak.";
  }

  if (!area) {
    fields.area = "Maydon musbat son bo'lishi kerak.";
  }

  if (!floor) {
    fields.floor = "Qavat ma'lumoti kerak.";
  }

  if (description.length < 20) {
    fields.description = "Tavsif kamida 20 belgi bo'lishi kerak.";
  }

  if (!hasMinDigits(phone)) {
    fields.phone = "Telefon raqam to'g'ri kiritilmagan.";
  }

  if (agent.length < 2) {
    fields.agent = "E'lon egasi nomi kerak.";
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  return {
    ...merged,
    address,
    agent,
    area,
    city,
    dealType,
    description,
    district,
    floor,
    phone,
    price,
    propertyType,
    rooms,
    title,
  };
}

function normalizeListingPayload(payload, user, existing = {}) {
  const timestamp = now();
  const listingInput = validateListingInput(payload, existing);
  const price = listingInput.price;
  const dealType = listingInput.dealType;
  const galleryImages = (
    Array.isArray(listingInput.galleryImages) && listingInput.galleryImages.length > 0
      ? listingInput.galleryImages.map(cleanText).filter(Boolean)
      : [listingInput.image || existing.image || seedImages[0]]
  ).filter(Boolean);
  const safeGalleryImages =
    galleryImages.length > 0 ? galleryImages : [seedImages[0]];

  return {
    address: listingInput.address,
    adminNote: payload.adminNote ?? existing.adminNote ?? "",
    agent: listingInput.agent || user.name,
    area: listingInput.area,
    city: listingInput.city,
    createdAt: existing.createdAt || timestamp,
    dealType,
    description: listingInput.description,
    district: listingInput.district,
    floor: listingInput.floor,
    galleryImages: safeGalleryImages,
    image: safeGalleryImages[0],
    listingPlan: cleanText(payload.listingPlan || existing.listingPlan || "standard"),
    moderationStatus:
      payload.moderationStatus || existing.moderationStatus || "approved",
    ownerId: payload.ownerId || existing.ownerId || user.id,
    phone: listingInput.phone,
    planExpiresAt: cleanText(payload.planExpiresAt || existing.planExpiresAt || ""),
    price,
    priceLabel:
      payload.priceLabel ||
      (dealType === "rent"
        ? `$${price.toLocaleString("en-US")} / oy`
        : `$${price.toLocaleString("en-US")}`),
    propertyType: listingInput.propertyType,
    published: payload.published || existing.published || "Hozirgina",
    rooms: listingInput.rooms,
    tags: Array.isArray(payload.tags) ? payload.tags.map(cleanText).filter(Boolean) : existing.tags || [],
    title: listingInput.title,
    typeLabel: payload.typeLabel || (dealType === "rent" ? "Ijara" : "Sotuv"),
    updatedAt: timestamp,
    negotiable: Boolean(payload.negotiable ?? existing.negotiable ?? false),
    verified: Boolean(payload.verified ?? existing.verified ?? false),
  };
}

function insertListing(payload, user) {
  const listing = normalizeListingPayload(
    {
      ...payload,
      moderationStatus: "approved",
      ownerId: user.id,
      verified: true,
    },
    user
  );
  const result = db
    .prepare(
      `INSERT INTO listings (
        owner_id, title, deal_type, type_label, property_type, city, district,
        address, price, price_label, rooms, area, floor, image, gallery_images,
        tags, phone, agent, published, verified, description, moderation_status,
        admin_note, listing_plan, plan_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      listing.ownerId,
      listing.title,
      listing.dealType,
      listing.typeLabel,
      listing.propertyType,
      listing.city,
      listing.district,
      listing.address,
      listing.price,
      listing.priceLabel,
      listing.rooms,
      listing.area,
      listing.floor,
      listing.image,
      toJsonList(listing.galleryImages),
      toJsonList(listing.tags),
      listing.phone,
      listing.agent,
      listing.published,
      listing.verified ? 1 : 0,
      listing.description,
      listing.moderationStatus,
      listing.adminNote,
      listing.listingPlan,
      listing.planExpiresAt,
      listing.createdAt,
      listing.updatedAt
    );

  return findListingById(Number(result.lastInsertRowid));
}

function updateListingRecord(listingId, payload, user) {
  const existing = findListingById(listingId);

  if (!existing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  if (!canManageListing(existing, user)) {
    throw httpError(403, "Bu e'lonni tahrirlash mumkin emas.");
  }

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
  const listing = normalizeListingPayload(safePayload, user, existing);

  db.prepare(
    `UPDATE listings
     SET owner_id = ?, title = ?, deal_type = ?, type_label = ?,
         property_type = ?, city = ?, district = ?, address = ?, price = ?,
         price_label = ?, rooms = ?, area = ?, floor = ?, image = ?,
         gallery_images = ?, tags = ?, phone = ?, agent = ?, published = ?,
         verified = ?, description = ?, moderation_status = ?, admin_note = ?,
         listing_plan = ?, plan_expires_at = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(
    listing.ownerId,
    listing.title,
    listing.dealType,
    listing.typeLabel,
    listing.propertyType,
    listing.city,
    listing.district,
    listing.address,
    listing.price,
    listing.priceLabel,
    listing.rooms,
    listing.area,
    listing.floor,
    listing.image,
    toJsonList(listing.galleryImages),
    toJsonList(listing.tags),
    listing.phone,
    listing.agent,
    listing.published,
    listing.verified ? 1 : 0,
    listing.description,
    listing.moderationStatus,
    listing.adminNote,
    listing.listingPlan,
    listing.planExpiresAt,
    listing.updatedAt,
    Number(listingId)
  );

  return findListingById(listingId);
}

function getVisibleListings(user) {
  if (user?.role === "admin") {
    return db
      .prepare("SELECT * FROM listings ORDER BY created_at DESC, id DESC")
      .all()
      .map(listingFromRow);
  }

  if (user) {
    return db
      .prepare(
        `SELECT * FROM listings
         WHERE moderation_status = 'approved' OR owner_id = ?
         ORDER BY created_at DESC, id DESC`
      )
      .all(user.id)
      .map(listingFromRow);
  }

  return db
    .prepare(
      `SELECT * FROM listings
       WHERE moderation_status = 'approved'
       ORDER BY created_at DESC, id DESC`
    )
    .all()
    .map(listingFromRow);
}

function getConversationKey(message) {
  const participants = [message.senderId, message.recipientId].filter(Boolean).sort();
  return `${message.listingId}:${participants.join(":")}`;
}

function getUserConversations(user) {
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE sender_id = ? OR recipient_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(user.id, user.id);
  const conversationMap = new Map();

  rows.map(messageFromRow).forEach((message) => {
    const key = message.conversationKey || getConversationKey(message);
    const isSender = message.senderId === user.id;
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
        listingId: message.listingId,
        listingImage: message.listingImage,
        listingPrice: message.listingPrice,
        listingTitle: message.listingTitle,
        messages: [],
        otherUser,
        unreadCount: 0,
      });
    }

    const conversation = conversationMap.get(key);
    conversation.messages.push(message);

    if (!message.read && message.recipientId === user.id) {
      conversation.unreadCount += 1;
    }
  });

  return Array.from(conversationMap.values())
    .map((conversation) => {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      return {
        ...conversation,
        lastMessage,
        lastMessagePreview:
          lastMessage.body || (lastMessage.attachmentImage ? "Rasm yuborildi" : ""),
      };
    })
    .sort(
      (first, second) =>
        new Date(second.lastMessage.createdAt).getTime() -
        new Date(first.lastMessage.createdAt).getTime()
    );
}

function findConversationMessages(key, user) {
  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE conversation_key = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(key);
  return rows
    .map(messageFromRow)
    .filter(
      (message) =>
        user.role === "admin" ||
        message.senderId === user.id ||
        message.recipientId === user.id
    );
}

function insertMessage(payload, user, conversationKey) {
  const fields = {};
  const listingId = Number(payload.listingId);
  const body = cleanText(payload.body);
  const attachmentImage = cleanText(payload.attachmentImage);

  if (!Number.isFinite(listingId) || listingId <= 0) {
    fields.listingId = "E'lon topilmadi.";
  }

  if (!body && !attachmentImage) {
    fields.body = "Xabar matni yoki rasm kerak.";
  }

  if (body.length > 1200) {
    fields.body = "Xabar 1200 belgidan oshmasin.";
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  const listing = findListingById(listingId);

  if (!canViewListing(listing, user)) {
    throw httpError(404, "E'lon topilmadi.");
  }

  const recipientId =
    payload.recipientId ||
    (listing && getListingOwnerId(listing) !== user.id ? getListingOwnerId(listing) : "");

  if (!recipientId || recipientId === user.id) {
    throwValidationError({
      recipientId: "Xabar qabul qiluvchisi topilmadi.",
    });
  }

  const recipientRow =
    findUserRowById(recipientId) ||
    (payload.recipientPhone ? findUserRowByPhone(payload.recipientPhone) : null);
  const recipient = userFromRow(recipientRow) || {
    id: recipientId || getUserIdFromPhone(payload.recipientPhone),
    name: payload.recipientName || listing?.agent || "UyTop user",
    phone: payload.recipientPhone || listing?.phone || "",
  };
  const createdAt = now();
  const result = db
    .prepare(
      `INSERT INTO messages (
        conversation_key, listing_id, listing_image, listing_price,
        listing_title, sender_id, sender_name, sender_phone, recipient_id,
        recipient_name, recipient_phone, body, attachment_image, read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      conversationKey,
      Number(payload.listingId || listing?.id || 0),
      payload.listingImage || listing?.image || "",
      payload.listingPrice || listing?.priceLabel || "",
      payload.listingTitle || listing?.title || "",
      user.id,
      cleanText(payload.senderName) || user.name,
      cleanText(payload.senderPhone) || user.phone,
      recipient.id,
      recipient.name,
      recipient.phone,
      body,
      attachmentImage,
      0,
      createdAt
    );

  createNotification(
    recipient.id,
    "Yangi chat xabari",
    `${user.name}: ${body || "Rasm yuborildi"}`
  );

  return messageFromRow(
    db.prepare("SELECT * FROM messages WHERE id = ?").get(Number(result.lastInsertRowid))
  );
}

function parseMultipartFiles(buffer, contentType = "") {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    throw httpError(400, "Multipart boundary topilmadi.");
  }

  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const body = buffer.toString("latin1");

  return body
    .split(boundary)
    .slice(1, -1)
    .map((rawPart) => rawPart.replace(/^\r\n/, "").replace(/\r\n$/, ""))
    .map((rawPart) => {
      const headerEnd = rawPart.indexOf("\r\n\r\n");

      if (headerEnd === -1) {
        return null;
      }

      const rawHeaders = rawPart.slice(0, headerEnd);
      const data = rawPart.slice(headerEnd + 4);
      const disposition = rawHeaders
        .split("\r\n")
        .find((header) => header.toLowerCase().startsWith("content-disposition"));

      if (!disposition || !disposition.includes("filename=")) {
        return null;
      }

      const filenameMatch = disposition.match(/filename="([^"]*)"/);
      const nameMatch = disposition.match(/name="([^"]*)"/);
      const typeHeader = rawHeaders
        .split("\r\n")
        .find((header) => header.toLowerCase().startsWith("content-type"));

      return {
        buffer: Buffer.from(data, "latin1"),
        contentType: typeHeader ? typeHeader.split(":").slice(1).join(":").trim() : "",
        filename: filenameMatch?.[1] || "upload.bin",
        name: nameMatch?.[1] || "file",
      };
    })
    .filter(Boolean);
}

function sanitizeFilename(filename) {
  return String(filename)
    .replace(/[^\w.\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
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

function validateImageFile(file, limits = {}) {
  const contentType = cleanText(file.contentType).toLowerCase();
  const extension = path.extname(file.filename).toLowerCase();
  const allowedExtensions = {
    "image/gif": [".gif"],
    "image/jpeg": [".jpg", ".jpeg", ""],
    "image/png": [".png", ""],
    "image/webp": [".webp", ""],
  };

  if (!imageSignatures[contentType]) {
    throwValidationError({
      file: "Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin.",
    });
  }

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

  if (!allowedExtensions[contentType].includes(extension)) {
    throwValidationError({ file: "Fayl kengaytmasi rasm turiga mos emas." });
  }

  if (!imageSignatures[contentType](file.buffer)) {
    throwValidationError({ file: "Fayl haqiqiy rasm emas." });
  }

  validateImageResolution(file, contentType, limits);
}

function getExtension(filename, contentType) {
  const extension = path.extname(filename).toLowerCase();

  if (extension) {
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
    validateImageFile(file, { minLongSide, minShortSide });
    const cleanName = sanitizeFilename(file.filename) || "upload";
    const extension = getExtension(cleanName, file.contentType);
    const savedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const filePath = path.join(targetDir, savedName);
    fs.writeFileSync(filePath, file.buffer);
    return `${getPublicBaseUrl(req)}/uploads/${folder}/${savedName}`;
  });
}

function getPublicBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${req.headers.host}`;
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

function getReferencedUploadPaths() {
  const referenced = new Set();
  const listings = db
    .prepare("SELECT image, gallery_images FROM listings")
    .all();
  const messages = db
    .prepare("SELECT attachment_image, listing_image FROM messages")
    .all();

  listings.forEach((listing) => {
    [listing.image, ...parseJsonList(listing.gallery_images)]
      .map(getUploadRelativePath)
      .filter(Boolean)
      .forEach((item) => referenced.add(item));
  });

  messages.forEach((message) => {
    [message.attachment_image, message.listing_image]
      .map(getUploadRelativePath)
      .filter(Boolean)
      .forEach((item) => referenced.add(item));
  });

  return referenced;
}

function cleanupUnusedUploads({ olderThanDays = UPLOAD_CLEANUP_MAX_AGE_DAYS } = {}) {
  const referenced = getReferencedUploadPaths();
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

function createNotification(userId, title, body = "") {
  if (!userId) {
    return null;
  }

  const createdAt = now();
  const result = db
    .prepare(
      `INSERT INTO notifications (user_id, title, body, read, created_at)
       VALUES (?, ?, ?, 0, ?)`
    )
    .run(userId, cleanText(title) || "Bildirishnoma", cleanText(body), createdAt);

  return notificationFromRow(
    db.prepare("SELECT * FROM notifications WHERE id = ?").get(Number(result.lastInsertRowid))
  );
}

function syncListingFavoriteCount(listingId) {
  const numericListingId = Number(listingId);
  const favoriteCount = db
    .prepare("SELECT COUNT(*) AS count FROM favorites WHERE listing_id = ?")
    .get(numericListingId).count;
  const updatedAt = now();

  db.prepare(
    `INSERT INTO listing_stats (
      listing_id, view_count, favorite_count, lead_count, updated_at
    ) VALUES (?, 0, ?, 0, ?)
    ON CONFLICT(listing_id) DO UPDATE SET
      favorite_count = excluded.favorite_count,
      updated_at = excluded.updated_at`
  ).run(numericListingId, Number(favoriteCount || 0), updatedAt);

  return Number(favoriteCount || 0);
}

function getListingStatsRow(listingId) {
  const numericListingId = Number(listingId);

  if (!Number.isFinite(numericListingId) || numericListingId <= 0) {
    throwValidationError({ listingId: "E'lon topilmadi." });
  }

  const listing = findListingById(numericListingId);

  if (!listing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  syncListingFavoriteCount(numericListingId);
  return db
    .prepare("SELECT * FROM listing_stats WHERE listing_id = ?")
    .get(numericListingId);
}

function incrementListingStat(listingId, column) {
  const numericListingId = Number(listingId);
  const listing = findListingById(numericListingId);

  if (!listing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  syncListingFavoriteCount(numericListingId);
  const updatedAt = now();
  db.prepare(
    `UPDATE listing_stats
     SET ${column} = ${column} + 1, updated_at = ?
     WHERE listing_id = ?`
  ).run(updatedAt, numericListingId);

  return db
    .prepare("SELECT * FROM listing_stats WHERE listing_id = ?")
    .get(numericListingId);
}

function route(method, pathname, handler) {
  routes.push({ handler, method, pathname });
}

function matchRoute(method, pathname) {
  const pathParts = pathname.split("/").filter(Boolean);

  for (const routeItem of routes) {
    if (routeItem.method !== method) {
      continue;
    }

    const routeParts = routeItem.pathname.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) {
      continue;
    }

    const params = {};
    const matches = routeParts.every((part, index) => {
      if (part.startsWith(":")) {
        params[part.slice(1)] = decodeURIComponent(pathParts[index]);
        return true;
      }

      return part === pathParts[index];
    });

    if (matches) {
      return { handler: routeItem.handler, params };
    }
  }

  return null;
}

const migrations = [
  {
    id: "001_initial_schema",
    up() {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT NOT NULL UNIQUE,
          email TEXT DEFAULT '',
          role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
          account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'blocked')),
          block_reason TEXT DEFAULT '',
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          registered_at TEXT NOT NULL,
          last_login_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS listings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          owner_id TEXT NOT NULL,
          title TEXT NOT NULL,
          deal_type TEXT NOT NULL,
          type_label TEXT NOT NULL,
          property_type TEXT NOT NULL,
          city TEXT NOT NULL,
          district TEXT NOT NULL,
          address TEXT NOT NULL,
          price INTEGER NOT NULL,
          price_label TEXT NOT NULL,
          rooms INTEGER NOT NULL,
          area INTEGER NOT NULL,
          floor TEXT DEFAULT '',
          image TEXT DEFAULT '',
          gallery_images TEXT NOT NULL DEFAULT '[]',
          tags TEXT NOT NULL DEFAULT '[]',
          phone TEXT NOT NULL,
          agent TEXT NOT NULL,
          published TEXT DEFAULT '',
          verified INTEGER NOT NULL DEFAULT 0,
          description TEXT DEFAULT '',
          moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
          admin_note TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS favorites (
          user_id TEXT NOT NULL,
          listing_id INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (user_id, listing_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_key TEXT NOT NULL,
          listing_id INTEGER NOT NULL,
          listing_image TEXT DEFAULT '',
          listing_price TEXT DEFAULT '',
          listing_title TEXT DEFAULT '',
          sender_id TEXT NOT NULL,
          sender_name TEXT NOT NULL,
          sender_phone TEXT NOT NULL,
          recipient_id TEXT NOT NULL,
          recipient_name TEXT NOT NULL,
          recipient_phone TEXT NOT NULL,
          body TEXT DEFAULT '',
          attachment_image TEXT DEFAULT '',
          read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
        CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(moderation_status);
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_key);
        CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, recipient_id);
      `);
    },
  },
  {
    id: "002_persistent_sessions",
    up() {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          last_seen_at TEXT NOT NULL,
          revoked_at TEXT DEFAULT NULL,
          user_agent TEXT DEFAULT '',
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
      `);
    },
  },
  {
    id: "003_marketplace_workflow",
    up() {
      const listingColumns = new Set(
        db
          .prepare("PRAGMA table_info(listings)")
          .all()
          .map((column) => column.name)
      );

      if (!listingColumns.has("listing_plan")) {
        db.exec(
          "ALTER TABLE listings ADD COLUMN listing_plan TEXT NOT NULL DEFAULT 'standard';"
        );
      }

      if (!listingColumns.has("plan_expires_at")) {
        db.exec("ALTER TABLE listings ADD COLUMN plan_expires_at TEXT DEFAULT '';");
      }

      db.exec(`
        CREATE TABLE IF NOT EXISTS listing_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          listing_id INTEGER NOT NULL,
          reporter_id TEXT DEFAULT '',
          reporter_name TEXT DEFAULT '',
          reporter_phone TEXT DEFAULT '',
          reason TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
          created_at TEXT NOT NULL,
          resolved_at TEXT DEFAULT '',
          FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS listing_stats (
          listing_id INTEGER PRIMARY KEY,
          view_count INTEGER NOT NULL DEFAULT 0,
          favorite_count INTEGER NOT NULL DEFAULT 0,
          lead_count INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS saved_searches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          filters_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT DEFAULT '',
          read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS admin_action_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_id TEXT NOT NULL,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT DEFAULT '',
          note TEXT DEFAULT '',
          created_at TEXT NOT NULL,
          FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_reports_listing ON listing_reports(listing_id);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON listing_reports(status);
        CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
        CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_action_logs(created_at);
      `);
    },
  },
  {
    id: "004_user_block_reason",
    up() {
      const userColumns = new Set(
        db
          .prepare("PRAGMA table_info(users)")
          .all()
          .map((column) => column.name)
      );

      if (!userColumns.has("block_reason")) {
        db.exec("ALTER TABLE users ADD COLUMN block_reason TEXT DEFAULT '';");
      }
    },
  },
];

function initializeSchema() {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedMigrations = new Set(
    db.prepare("SELECT id FROM schema_migrations").all().map((row) => row.id)
  );

  migrations.forEach((migration) => {
    if (appliedMigrations.has(migration.id)) {
      return;
    }

    db.exec("BEGIN");

    try {
      migration.up();
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
        migration.id,
        now()
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}

function insertSeedListing(payload, owner) {
  if (findListingById(payload.id)) {
    return;
  }

  db.prepare(
    `INSERT INTO listings (
      id, owner_id, title, deal_type, type_label, property_type, city, district,
      address, price, price_label, rooms, area, floor, image, gallery_images,
      tags, phone, agent, published, verified, description, moderation_status,
      admin_note, listing_plan, plan_expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    payload.id,
    owner.id,
    payload.title,
    payload.dealType,
    payload.typeLabel,
    payload.propertyType,
    payload.city,
    payload.district,
    payload.address,
    payload.price,
    payload.priceLabel,
    payload.rooms,
    payload.area,
    payload.floor,
    payload.image,
    toJsonList(payload.galleryImages),
    toJsonList(payload.tags),
    payload.phone,
    payload.agent,
    payload.published,
    payload.verified ? 1 : 0,
    payload.description,
    payload.moderationStatus,
    payload.adminNote || "",
    payload.listingPlan || "standard",
    payload.planExpiresAt || "",
    payload.createdAt,
    payload.updatedAt
  );
}

function seedState() {
  const timestamp = now();
  const admin = ensureSeedUser({
    accountStatus: "active",
    email: "admin@uytop.uz",
    id: getUserIdFromPhone(ADMIN_PHONE),
    name: "UyTop Admin",
    password: ADMIN_PASSWORD,
    phone: ADMIN_PHONE,
    role: "admin",
  });
  const owner = ensureSeedUser({
    accountStatus: "active",
    email: "demo@uytop.uz",
    name: "Doniyor Rakhmonov",
    password: "demo1234",
    phone: "+998 90 123 45 67",
    role: "user",
  });
  const buyer = ensureSeedUser({
    accountStatus: "active",
    email: "malika@example.uz",
    name: "Malika Karimova",
    password: "demo1234",
    phone: "+998 97 555 12 34",
    role: "user",
  });

  if (db.prepare("SELECT COUNT(*) AS count FROM listings").get().count === 0) {
    insertSeedListing(
      {
        address: "Sebzor 12",
        agent: owner.name,
        area: 64,
        city: "Toshkent",
        createdAt: timestamp,
        dealType: "sale",
        description: "Metroga yaqin, ta'mirlangan va yorug' kvartira.",
        district: "Olmazor",
        floor: "4/9",
        galleryImages: [seedImages[0], seedImages[1]],
        id: 1,
        image: seedImages[0],
        moderationStatus: "approved",
        phone: owner.phone,
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
      owner
    );
    insertSeedListing(
      {
        address: "Buyuk Ipak yo'li",
        agent: "Sardor Akbarov",
        area: 118,
        city: "Toshkent",
        createdAt: timestamp,
        dealType: "rent",
        description: "Oilaviy yashash uchun tinch hududdagi keng uy.",
        district: "Mirzo Ulug'bek",
        floor: "2/3",
        galleryImages: [seedImages[2], seedImages[3]],
        id: 2,
        image: seedImages[2],
        moderationStatus: "approved",
        phone: ADMIN_PHONE,
        price: 1200,
        priceLabel: "$1,200 / oy",
        propertyType: "Hovli",
        published: "Kecha",
        rooms: 4,
        tags: ["Hovli", "Oilaviy", "Bog'"],
        title: "Mirzo Ulug'bekda oilaviy hovli",
        typeLabel: "Ijara",
        updatedAt: timestamp,
        verified: true,
      },
      admin
    );
    insertSeedListing(
      {
        address: "Universitet xiyoboni",
        adminNote: "Hujjat rasmini tekshirish kerak.",
        agent: owner.name,
        area: 92,
        city: "Samarqand",
        createdAt: timestamp,
        dealType: "sale",
        description: "Markazga yaqin yangi qurilishdagi 3 xonali uy.",
        district: "Universitet",
        floor: "6/12",
        galleryImages: [seedImages[4]],
        id: 3,
        image: seedImages[4],
        moderationStatus: "pending",
        phone: owner.phone,
        price: 98000,
        priceLabel: "$98,000",
        propertyType: "Yangi qurilish",
        published: "Qayta ko'rishda",
        rooms: 3,
        tags: ["Yangi e'lon", "Qayta ko'rish"],
        title: "Samarqandda yangi qurilish",
        typeLabel: "Sotuv",
        updatedAt: timestamp,
        verified: false,
      },
      owner
    );
  }

  db.prepare(
    `UPDATE listings
     SET published = ?, tags = ?
     WHERE id = 3 AND moderation_status = 'pending' AND published = 'Saytda'`
  ).run("Qayta ko'rishda", toJsonList(["Yangi e'lon", "Qayta ko'rish"]));

  if (db.prepare("SELECT COUNT(*) AS count FROM favorites").get().count === 0) {
    db.prepare(
      "INSERT OR IGNORE INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)"
    ).run(buyer.id, 1, timestamp);
    db.prepare(
      "INSERT OR IGNORE INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)"
    ).run(buyer.id, 2, timestamp);
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM messages").get().count === 0) {
    insertMessage(
      {
        body: "Assalomu alaykum, kvartirani bugun ko'rsa bo'ladimi?",
        listingId: 1,
        recipientId: owner.id,
      },
      buyer,
      `1:${[buyer.id, owner.id].sort().join(":")}`
    );
  }
}

route("GET", "/health", async () => ({
  allowedOrigins: ALLOWED_ORIGINS,
  database: DB_PATH,
  errorLog: ERROR_LOG_PATH,
  maxBodyMb: Number(process.env.UYTOP_MAX_BODY_MB || 10),
  ok: true,
  sessionTtlDays: SESSION_TTL_DAYS,
  sessionStore: "sqlite",
  service: "uytop-api",
}));

route("GET", "/", async () => ({
  frontend: FRONTEND_URL,
  health: "/health",
  message: "UyTop backend API ishlayapti. Saytni frontend portida oching.",
  service: "uytop-api",
}));

route("POST", "/auth/login", async ({ req }) => {
  const payload = await readJson(req);
  const fields = {};
  const phone = cleanText(payload.phone);
  const password = String(payload.password ?? "");

  if (!hasMinDigits(phone)) {
    fields.phone = "Telefon raqam to'g'ri kiritilmagan.";
  }

  if (!password) {
    fields.password = "Parol kiriting.";
  }

  if (Object.keys(fields).length > 0) {
    throwValidationError(fields);
  }

  const userRow = findUserRowByPhone(phone);
  const verification = userRow
    ? verifyPassword(userRow, password)
    : { ok: false, shouldUpgrade: false };

  if (!userRow || !verification.ok) {
    throw httpError(401, "Telefon yoki parol noto'g'ri.");
  }

  if (verification.shouldUpgrade) {
    upgradePasswordHash(userRow.id, password);
  }

  const user = updateLastLogin(userRow.id);
  const token = createToken(user.id, req);
  cleanupExpiredSessions();
  return {
    __headers: { "Set-Cookie": buildAuthCookie(token) },
    user,
  };
});

route("POST", "/auth/register", async ({ req }) => {
  const payload = await readJson(req);
  const user = createUser({
    accountStatus: "active",
    email: payload.email || "",
    name: payload.name || "UyTop foydalanuvchisi",
    password: payload.password || "",
    phone: payload.phone || "",
    role: "user",
  });

  cleanupExpiredSessions();
  const token = createToken(user.id, req);
  return {
    __headers: { "Set-Cookie": buildAuthCookie(token) },
    user,
  };
});

route("POST", "/auth/logout", async ({ req }) => {
  revokeRequestSession(req);
  return {
    __headers: { "Set-Cookie": buildClearAuthCookie() },
    ok: true,
  };
});

route("GET", "/me", async ({ req }) => ({ user: requireUser(req) }));

route("PATCH", "/me", async ({ req }) => {
  const user = requireActiveUser(req);
  const payload = await readJson(req);
  return { user: updateUserProfile(user, payload) };
});

route("GET", "/saved-searches", async ({ req }) => {
  const user = requireUser(req);
  return {
    searches: db
      .prepare(
        `SELECT * FROM saved_searches
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC`
      )
      .all(user.id)
      .map(savedSearchFromRow),
  };
});

route("POST", "/saved-searches", async ({ req }) => {
  const user = requireActiveUser(req);
  const payload = await readJson(req);

  if (!payload.filters || typeof payload.filters !== "object") {
    throwValidationError({ filters: "Qidiruv filterlari topilmadi." });
  }

  const createdAt = now();
  const result = db
    .prepare(
      `INSERT INTO saved_searches (user_id, name, filters_json, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      user.id,
      cleanText(payload.name || "Saqlangan qidiruv"),
      JSON.stringify(payload.filters),
      createdAt
    );

  const staleRows = db
    .prepare(
      `SELECT id FROM saved_searches
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT -1 OFFSET 10`
    )
    .all(user.id);

  staleRows.forEach((row) => {
    db.prepare("DELETE FROM saved_searches WHERE id = ? AND user_id = ?").run(
      Number(row.id),
      user.id
    );
  });

  return {
    search: savedSearchFromRow(
      db.prepare("SELECT * FROM saved_searches WHERE id = ?").get(
        Number(result.lastInsertRowid)
      )
    ),
  };
});

route("DELETE", "/saved-searches/:id", async ({ params, req }) => {
  const user = requireUser(req);
  db.prepare("DELETE FROM saved_searches WHERE id = ? AND user_id = ?").run(
    Number(params.id),
    user.id
  );
  return { ok: true };
});

route("GET", "/notifications", async ({ req }) => {
  const user = requireUser(req);
  return {
    notifications: db
      .prepare(
        `SELECT * FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 30`
      )
      .all(user.id)
      .map(notificationFromRow),
  };
});

route("PATCH", "/notifications/:id/read", async ({ params, req }) => {
  const user = requireUser(req);
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(
    Number(params.id),
    user.id
  );
  return {
    notification: notificationFromRow(
      db.prepare("SELECT * FROM notifications WHERE id = ? AND user_id = ?").get(
        Number(params.id),
        user.id
      )
    ),
  };
});

route("PATCH", "/notifications/read-all", async ({ req }) => {
  const user = requireUser(req);
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(user.id);
  return { ok: true };
});

route("GET", "/listing-stats", async () => ({
  stats: db
    .prepare("SELECT id FROM listings ORDER BY id ASC")
    .all()
    .map((listing) => listingStatsFromRow(getListingStatsRow(listing.id))),
}));

route("GET", "/listings/:id/stats", async ({ params }) => ({
  stats: listingStatsFromRow(getListingStatsRow(params.id)),
}));

route("POST", "/listings/:id/stats/view", async ({ params }) => ({
  stats: listingStatsFromRow(incrementListingStat(params.id, "view_count")),
}));

route("POST", "/listings/:id/stats/lead", async ({ params }) => ({
  stats: listingStatsFromRow(incrementListingStat(params.id, "lead_count")),
}));

route("GET", "/listings", async ({ req }) => ({
  listings: getVisibleListings(getRequestUser(req)),
}));

route("GET", "/listings/:id", async ({ params, req }) => {
  const user = getRequestUser(req);
  const listing = findListingById(params.id);

  if (!canViewListing(listing, user)) {
    throw httpError(404, "E'lon topilmadi.");
  }

  return { listing };
});

route("POST", "/listings/:id/reports", async ({ params, req }) => {
  const user = getRequestUser(req);
  const listing = findListingById(params.id);

  if (!canViewListing(listing, user)) {
    throw httpError(404, "E'lon topilmadi.");
  }

  const payload = await readJson(req);
  const reason = cleanText(payload.reason);

  if (reason.length < 3) {
    throwValidationError({
      reason: "Shikoyat sababini yozing.",
    });
  }

  const createdAt = now();
  const result = db
    .prepare(
      `INSERT INTO listing_reports (
        listing_id, reporter_id, reporter_name, reporter_phone, reason, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'open', ?)`
    )
    .run(
      Number(listing.id),
      user?.id || "",
      cleanText(payload.reporterName) || user?.name || "Mehmon",
      cleanText(payload.reporterPhone) || user?.phone || "",
      reason,
      createdAt
    );

  const row = db
    .prepare(
      `SELECT listing_reports.*, listings.title AS listing_title
       FROM listing_reports
       LEFT JOIN listings ON listings.id = listing_reports.listing_id
       WHERE listing_reports.id = ?`
    )
    .get(Number(result.lastInsertRowid));

  return { report: listingReportFromRow(row) };
});

route("POST", "/listings", async ({ req }) => {
  const user = requireActiveUser(req);
  const payload = await readJson(req);
  const listing = insertListing(payload, user);
  createNotification(
    user.id,
    "E'lon joylandi",
    `"${listing.title}" e'loni saytda ko'rinadi.`
  );
  return { listing };
});

route("PATCH", "/listings/:id", async ({ params, req }) => {
  const user = requireActiveUser(req);
  const payload = await readJson(req);
  return { listing: updateListingRecord(params.id, payload, user) };
});

route("DELETE", "/listings/:id", async ({ params, req }) => {
  const user = requireActiveUser(req);
  const listing = findListingById(params.id);

  if (!listing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  if (!canManageListing(listing, user)) {
    throw httpError(403, "Bu e'lonni o'chirish mumkin emas.");
  }

  db.prepare("DELETE FROM listing_stats WHERE listing_id = ?").run(Number(params.id));
  db.prepare("DELETE FROM listings WHERE id = ?").run(Number(params.id));
  return null;
});

route("POST", "/uploads/listing-images", async ({ req }) => {
  requireActiveUser(req);
  return {
    urls: await saveUploadedFiles(req, "listing-images", {
      maxFiles: 8,
      minLongSide: MIN_LISTING_IMAGE_LONG_SIDE,
      minShortSide: MIN_LISTING_IMAGE_SHORT_SIDE,
    }),
  };
});

route("POST", "/uploads/message-attachments", async ({ req }) => {
  requireActiveUser(req);
  const urls = await saveUploadedFiles(req, "message-attachments", { maxFiles: 1 });
  return { url: urls[0] || "" };
});

route("GET", "/favorites", async ({ req }) => {
  const user = requireUser(req);
  const favorites = db
    .prepare(
      `SELECT user_id, listing_id, created_at
       FROM favorites
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(user.id)
    .map((favorite) => ({
      id: `${favorite.user_id}-${favorite.listing_id}`,
      listingId: Number(favorite.listing_id),
      userId: favorite.user_id,
    }));

  return { favorites };
});

route("POST", "/favorites/:listingId", async ({ params, req }) => {
  const user = requireUser(req);
  const listing = findListingById(params.listingId);

  if (!canViewListing(listing, user)) {
    throw httpError(404, "E'lon topilmadi.");
  }

  db.prepare(
    "INSERT OR IGNORE INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)"
  ).run(user.id, Number(params.listingId), now());

  syncListingFavoriteCount(Number(params.listingId));
  return {
    stats: listingStatsFromRow(getListingStatsRow(params.listingId)),
  };
});

route("DELETE", "/favorites/:listingId", async ({ params, req }) => {
  const user = requireUser(req);
  const listingId = Number(params.listingId);

  if (!Number.isFinite(listingId) || listingId <= 0) {
    throwValidationError({ listingId: "E'lon topilmadi." });
  }

  db.prepare("DELETE FROM favorites WHERE user_id = ? AND listing_id = ?").run(
    user.id,
    listingId
  );

  syncListingFavoriteCount(listingId);
  return {
    stats: listingStatsFromRow(getListingStatsRow(listingId)),
  };
});

route("GET", "/conversations", async ({ req }) => ({
  conversations: getUserConversations(requireUser(req)),
}));

route("GET", "/conversations/:key/messages", async ({ params, req }) => {
  const user = requireUser(req);
  return { messages: findConversationMessages(params.key, user) };
});

route("POST", "/conversations/:key/messages", async ({ params, req }) => {
  const user = requireActiveUser(req);
  const payload = await readJson(req);
  return { message: insertMessage(payload, user, params.key) };
});

route("PATCH", "/conversations/:key/read", async ({ params, req }) => {
  const user = requireUser(req);
  db.prepare(
    `UPDATE messages
     SET read = 1
     WHERE conversation_key = ? AND recipient_id = ?`
  ).run(params.key, user.id);

  return { ok: true };
});

route("PATCH", "/conversations/:key/archive", async ({ req }) => {
  requireUser(req);
  return { ok: true };
});

route("GET", "/admin/users", async ({ req }) => {
  requireAdmin(req);
  return {
    users: db
      .prepare("SELECT * FROM users ORDER BY registered_at DESC")
      .all()
      .map(userFromRow),
  };
});

route("PATCH", "/admin/users/:id/status", async ({ params, req }) => {
  requireAdmin(req);
  const payload = await readJson(req);
  const accountStatus = payload.accountStatus === "blocked" ? "blocked" : "active";
  const blockReason =
    accountStatus === "blocked" ? cleanText(payload.blockReason || "") : "";

  db.prepare("UPDATE users SET account_status = ?, block_reason = ? WHERE id = ?").run(
    accountStatus,
    blockReason,
    params.id
  );

  createNotification(
    params.id,
    accountStatus === "blocked" ? "Profil bloklandi" : "Profil aktiv qilindi",
    accountStatus === "blocked"
      ? blockReason || "Profilingiz vaqtincha cheklangan."
      : "Profilingiz yana aktiv holatga o'tkazildi."
  );

  return { user: findUserById(params.id) };
});

route("GET", "/admin/listings", async ({ req }) => {
  requireAdmin(req);
  return {
    listings: db
      .prepare("SELECT * FROM listings ORDER BY created_at DESC, id DESC")
      .all()
      .map(listingFromRow),
  };
});

route("PATCH", "/admin/listings/:id/moderation", async ({ params, req }) => {
  requireAdmin(req);
  const payload = await readJson(req);
  const allowedStatuses = new Set(["pending", "approved", "rejected"]);
  const moderationStatus = allowedStatuses.has(payload.moderationStatus)
    ? payload.moderationStatus
    : "pending";

  db.prepare(
    `UPDATE listings
     SET moderation_status = ?, verified = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    moderationStatus,
    moderationStatus === "approved" ? 1 : 0,
    now(),
    Number(params.id)
  );

  const listing = findListingById(params.id);
  createNotification(
    listing?.ownerId,
    "E'lon statusi yangilandi",
    `"${listing?.title || "E'lon"}" statusi: ${moderationStatus}.`
  );

  return { listing };
});

route("PATCH", "/admin/listings/:id/note", async ({ params, req }) => {
  requireAdmin(req);
  const payload = await readJson(req);

  db.prepare(
    `UPDATE listings
     SET admin_note = ?, updated_at = ?
     WHERE id = ?`
  ).run(payload.adminNote || "", now(), Number(params.id));

  return { listing: findListingById(params.id) };
});

route("GET", "/admin/messages", async ({ req }) => {
  requireAdmin(req);
  return {
    messages: db
      .prepare("SELECT * FROM messages ORDER BY created_at DESC, id DESC")
      .all()
      .map(messageFromRow),
  };
});

route("GET", "/admin/reports", async ({ req }) => {
  requireAdmin(req);
  return {
    reports: db
      .prepare(
        `SELECT listing_reports.*, listings.title AS listing_title
         FROM listing_reports
         LEFT JOIN listings ON listings.id = listing_reports.listing_id
         ORDER BY listing_reports.created_at DESC, listing_reports.id DESC`
      )
      .all()
      .map(listingReportFromRow),
  };
});

route("PATCH", "/admin/reports/:id/resolve", async ({ params, req }) => {
  requireAdmin(req);
  const resolvedAt = now();

  db.prepare(
    `UPDATE listing_reports
     SET status = 'resolved', resolved_at = ?
     WHERE id = ?`
  ).run(resolvedAt, Number(params.id));

  const row = db
    .prepare(
      `SELECT listing_reports.*, listings.title AS listing_title
       FROM listing_reports
       LEFT JOIN listings ON listings.id = listing_reports.listing_id
       WHERE listing_reports.id = ?`
    )
    .get(Number(params.id));

  if (!row) {
    throw httpError(404, "Shikoyat topilmadi.");
  }

  return { report: listingReportFromRow(row) };
});

route("GET", "/admin/actions", async ({ req }) => {
  requireAdmin(req);
  return {
    actions: db
      .prepare(
        `SELECT admin_action_logs.*, users.name AS actor
         FROM admin_action_logs
         LEFT JOIN users ON users.id = admin_action_logs.admin_id
         ORDER BY admin_action_logs.created_at DESC, admin_action_logs.id DESC`
      )
      .all()
      .map(adminActionFromRow),
  };
});

route("POST", "/admin/actions", async ({ req }) => {
  const user = requireAdmin(req);
  const payload = await readJson(req);
  const action = cleanText(payload.action);

  if (!action) {
    throwValidationError({
      action: "Admin harakati nomini kiriting.",
    });
  }

  const createdAt = now();
  const result = db
    .prepare(
      `INSERT INTO admin_action_logs (
        admin_id, action, entity_type, entity_id, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      action,
      cleanText(payload.type || payload.entityType || "system"),
      cleanText(payload.entityId),
      cleanText(payload.entityTitle || payload.note),
      createdAt
    );

  const row = db
    .prepare(
      `SELECT admin_action_logs.*, users.name AS actor
       FROM admin_action_logs
       LEFT JOIN users ON users.id = admin_action_logs.admin_id
       WHERE admin_action_logs.id = ?`
    )
    .get(Number(result.lastInsertRowid));

  return { action: adminActionFromRow(row) };
});

route("POST", "/admin/uploads/cleanup", async ({ req }) => {
  requireAdmin(req);
  const payload = await readJson(req);
  const olderThanDays =
    Number(payload.olderThanDays) || UPLOAD_CLEANUP_MAX_AGE_DAYS;

  return { cleanup: cleanupUnusedUploads({ olderThanDays }) };
});

initializeSchema();
seedState();
cleanupExpiredSessions();

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
    sendJson(res, error.status || 500, {
      details: error.details || null,
      error: error.message || "Server xatosi.",
    }, req);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`UyTop API: http://${HOST}:${PORT}`);
  console.log(`SQLite: ${DB_PATH}`);
});
