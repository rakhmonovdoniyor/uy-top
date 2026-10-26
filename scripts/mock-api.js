const crypto = require("crypto");
const http = require("http");
const { URL } = require("url");

const PORT = Number(process.env.PORT || process.env.MOCK_API_PORT || 4000);
const HOST = process.env.HOST || "127.0.0.1";
const ADMIN_PHONE = process.env.UYTOP_ADMIN_PHONE || "+998 99 000 00 01";
const ADMIN_PASSWORD = process.env.UYTOP_ADMIN_PASSWORD || "admin1234";

const uploadImages = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80",
];

const now = () => new Date().toISOString();

function formatNowLabel(value = now()) {
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

function createToken(userId) {
  const token = crypto.randomUUID();
  tokens.set(token, userId);
  return token;
}

function getRequestUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const userId = tokens.get(token);

  return users.find((user) => user.id === userId) || null;
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

function httpError(status, message, details = {}) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": "*",
  });
  res.end();
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
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

function getUploadCount(buffer) {
  const text = buffer.toString("latin1");
  const matches = text.match(/filename="/g);
  return Math.max(matches ? matches.length : 0, 1);
}

function publicUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function upsertUser(input) {
  const phone = input.phone || "";
  const id = input.id || getUserIdFromPhone(phone);
  const existing = users.find((user) => user.id === id || user.phone === phone);
  const timestamp = now();
  const nextUser = {
    ...existing,
    accountStatus: "active",
    email: input.email || "",
    id,
    lastLoginAt: timestamp,
    lastLoginAtLabel: formatNowLabel(timestamp),
    name: input.name || "UyTop foydalanuvchisi",
    phone,
    registeredAt: existing?.registeredAt || timestamp,
    registeredAtLabel: existing?.registeredAtLabel || formatNowLabel(timestamp),
    ...input,
    accountStatus: input.accountStatus || existing?.accountStatus || "active",
    lastLoginAt: timestamp,
    lastLoginAtLabel: formatNowLabel(timestamp),
    role: existing?.role === "admin" || input.role === "admin" ? "admin" : "user",
  };

  if (existing) {
    users = users.map((user) => (user.id === existing.id ? nextUser : user));
  } else {
    users.push(nextUser);
  }

  return nextUser;
}

function getListingOwnerId(listing) {
  return listing.ownerId || getUserIdFromPhone(listing.phone);
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

function normalizeListingPayload(payload, user, existing = {}) {
  const timestamp = now();
  const price = Number(payload.price || existing.price || 0);
  const priceLabel =
    payload.priceLabel ||
    (Number(existing.price || 0) === price && existing.priceLabel
      ? existing.priceLabel
      : payload.dealType === "rent" || existing.dealType === "rent"
        ? `$${price.toLocaleString("en-US")} / oy`
        : `$${price.toLocaleString("en-US")}`);
  const existingHistory = Array.isArray(payload.priceHistory)
    ? payload.priceHistory
    : existing.priceHistory || [];
  const priceHistory =
    existing.id && Number(existing.price || 0) && Number(existing.price) !== price
      ? [
          ...(existingHistory.some((item) => Number(item.price) === Number(existing.price))
            ? existingHistory
            : [
                ...existingHistory,
                {
                  changedAt: existing.updatedAt || existing.createdAt || timestamp,
                  price: Number(existing.price),
                  priceLabel: existing.priceLabel || `$${Number(existing.price).toLocaleString("en-US")}`,
                },
              ]),
          { changedAt: timestamp, price, priceLabel },
        ].slice(-8)
      : existingHistory;
  const galleryImages =
    Array.isArray(payload.galleryImages) && payload.galleryImages.length > 0
      ? payload.galleryImages
      : [payload.image || existing.image || uploadImages[0]];

  return {
    address: payload.address || existing.address || "",
    adminNote: payload.adminNote ?? existing.adminNote ?? "",
    agent: payload.agent || existing.agent || user.name,
    area: Number(payload.area || existing.area || 0),
    city: payload.city || existing.city || "Toshkent",
    createdAt: existing.createdAt || timestamp,
    description: payload.description || existing.description || "",
    dealType: payload.dealType || existing.dealType || "sale",
    district: payload.district || existing.district || "",
    floor: payload.floor || existing.floor || "",
    galleryImages,
    id: existing.id || nextListingId++,
    image: galleryImages[0],
    listingPlan: payload.listingPlan || existing.listingPlan || "standard",
    moderationStatus:
      payload.moderationStatus || existing.moderationStatus || "approved",
    ownerId: payload.ownerId || existing.ownerId || user.id,
    paymentAmount: Number(payload.paymentAmount || existing.paymentAmount || 0),
    paymentProvider: payload.paymentProvider || existing.paymentProvider || "",
    paymentReference: payload.paymentReference || existing.paymentReference || "",
    paymentStatus: payload.paymentStatus || existing.paymentStatus || "not_required",
    phone: payload.phone || existing.phone || user.phone,
    planExpiresAt: payload.planExpiresAt || existing.planExpiresAt || "",
    price,
    priceHistory,
    priceLabel,
    propertyType: payload.propertyType || existing.propertyType || "Kvartira",
    published: payload.published || existing.published || "Hozirgina",
    rooms: Number(payload.rooms || existing.rooms || 1),
    tags: Array.isArray(payload.tags) ? payload.tags : existing.tags || [],
    title: payload.title || existing.title || "Yangi e'lon",
    typeLabel:
      payload.typeLabel ||
      (payload.dealType === "rent" || existing.dealType === "rent"
        ? "Ijara"
        : "Sotuv"),
    updatedAt: timestamp,
    negotiable: Boolean(payload.negotiable ?? existing.negotiable ?? false),
    verified: Boolean(payload.verified ?? existing.verified ?? false),
  };
}

function getConversationKey(message) {
  const participants = [message.senderId, message.recipientId].filter(Boolean).sort();
  return `${message.listingId}:${participants.join(":")}`;
}

function getUserConversations(user) {
  const userMessages = messages.filter(
    (message) => message.senderId === user.id || message.recipientId === user.id
  );
  const conversationMap = new Map();

  userMessages.forEach((message) => {
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
      const sortedMessages = conversation.messages.sort(
        (first, second) =>
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime()
      );
      const lastMessage = sortedMessages[sortedMessages.length - 1];

      return {
        ...conversation,
        lastMessage,
        lastMessagePreview:
          lastMessage.body || (lastMessage.attachmentImage ? "Rasm yuborildi" : ""),
        messages: sortedMessages,
      };
    })
    .sort(
      (first, second) =>
        new Date(second.lastMessage.createdAt).getTime() -
        new Date(first.lastMessage.createdAt).getTime()
    );
}

function findConversationMessages(key, user) {
  return messages.filter((message) => {
    const messageKey = message.conversationKey || getConversationKey(message);
    const isParticipant =
      message.senderId === user.id || message.recipientId === user.id;
    return messageKey === key && (user.role === "admin" || isParticipant);
  });
}

function normalizeMessagePayload(payload, user, key) {
  const listing = listings.find((item) => Number(item.id) === Number(payload.listingId));
  const recipientId =
    payload.recipientId ||
    (listing && getListingOwnerId(listing) !== user.id ? getListingOwnerId(listing) : "");
  const recipient =
    users.find((item) => item.id === recipientId) ||
    users.find((item) => item.phone === payload.recipientPhone) || {
      id: recipientId,
      name: payload.recipientName || listing?.agent || "UyTop user",
      phone: payload.recipientPhone || listing?.phone || "",
    };
  const createdAt = now();

  return {
    attachmentImage: payload.attachmentImage || "",
    body: payload.body || "",
    conversationKey: key,
    createdAt,
    createdAtLabel: formatNowLabel(createdAt),
    id: nextMessageId++,
    listingId: Number(payload.listingId || listing?.id || 0),
    listingImage: payload.listingImage || listing?.image || "",
    listingPrice: payload.listingPrice || listing?.priceLabel || "",
    listingTitle: payload.listingTitle || listing?.title || "",
    read: false,
    recipientId: recipient.id,
    recipientName: recipient.name,
    recipientPhone: recipient.phone,
    senderId: user.id,
    senderName: payload.senderName || user.name,
    senderPhone: payload.senderPhone || user.phone,
  };
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

function seedState() {
  const timestamp = now();
  const admin = upsertUser({
    accountStatus: "active",
    email: "admin@uytop.uz",
    id: getUserIdFromPhone(ADMIN_PHONE),
    name: "UyTop Admin",
    password: ADMIN_PASSWORD,
    phone: ADMIN_PHONE,
    role: "admin",
  });
  const owner = upsertUser({
    accountStatus: "active",
    email: "demo@uytop.uz",
    name: "Doniyor Rakhmonov",
    phone: "+998 90 123 45 67",
    role: "user",
  });
  const buyer = upsertUser({
    accountStatus: "active",
    email: "malika@example.uz",
    name: "Malika Karimova",
    phone: "+998 97 555 12 34",
    role: "user",
  });

  listings = [
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
      galleryImages: [uploadImages[0], uploadImages[1]],
      id: 1,
      image: uploadImages[0],
      moderationStatus: "approved",
      ownerId: owner.id,
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
      galleryImages: [uploadImages[2], uploadImages[3]],
      id: 2,
      image: uploadImages[2],
      moderationStatus: "approved",
      ownerId: admin.id,
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
      galleryImages: [uploadImages[4]],
      id: 3,
      image: uploadImages[4],
      moderationStatus: "pending",
      ownerId: owner.id,
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
  ];
  nextListingId = Math.max(...listings.map((listing) => listing.id)) + 1;
  favoritesByUser.set(buyer.id, new Set([1, 2]));
  messages = [
    normalizeMessagePayload(
      {
        body: "Assalomu alaykum, kvartirani bugun ko'rsa bo'ladimi?",
        listingId: 1,
        recipientId: owner.id,
      },
      buyer,
      `1:${[buyer.id, owner.id].sort().join(":")}`
    ),
  ];
}

let users = [];
let listings = [];
let messages = [];
let nextListingId = 1;
let nextMessageId = 1;
const favoritesByUser = new Map();
const tokens = new Map();
const routes = [];

route("GET", "/health", async () => ({ ok: true, service: "uytop-mock-api" }));

route("POST", "/auth/login", async ({ req }) => {
  const payload = await readJson(req);
  const phone = payload.phone || "";
  const password = payload.password || "";
  const isAdmin = normalizePhone(phone) === normalizePhone(ADMIN_PHONE);

  if (isAdmin && password !== ADMIN_PASSWORD) {
    throw httpError(401, "Admin paroli noto'g'ri.");
  }

  const user = upsertUser({
    email: payload.email || (isAdmin ? "admin@uytop.uz" : ""),
    name: payload.name || (isAdmin ? "UyTop Admin" : "UyTop foydalanuvchisi"),
    password: isAdmin ? ADMIN_PASSWORD : password,
    phone,
    role: isAdmin ? "admin" : "user",
  });

  return { token: createToken(user.id), user: publicUser(user) };
});

route("POST", "/auth/register", async ({ req }) => {
  const payload = await readJson(req);
  const user = upsertUser({
    accountStatus: "active",
    email: payload.email || "",
    name: payload.name || "UyTop foydalanuvchisi",
    password: payload.password || "",
    phone: payload.phone || "",
    role: "user",
  });

  return { token: createToken(user.id), user: publicUser(user) };
});

route("GET", "/me", async ({ req }) => ({ user: publicUser(requireUser(req)) }));

route("PATCH", "/me", async ({ req }) => {
  const user = requireUser(req);
  const payload = await readJson(req);
  const updatedUser = upsertUser({
    ...user,
    email: payload.email ?? user.email,
    name: payload.name ?? user.name,
    phone: payload.phone ?? user.phone,
  });

  return { user: publicUser(updatedUser) };
});

route("GET", "/listings", async ({ req }) => {
  const user = getRequestUser(req);
  return {
    listings: listings.filter((listing) => canViewListing(listing, user)),
  };
});

route("GET", "/listings/:id", async ({ params, req }) => {
  const user = getRequestUser(req);
  const listing = listings.find((item) => Number(item.id) === Number(params.id));

  if (!canViewListing(listing, user)) {
    throw httpError(404, "E'lon topilmadi.");
  }

  return { listing };
});

route("POST", "/listings", async ({ req }) => {
  const user = requireActiveUser(req);
  const payload = await readJson(req);
  const listing = normalizeListingPayload(payload, user, {
    moderationStatus: "approved",
    verified: true,
  });

  listings = [listing, ...listings];

  return { listing };
});

route("PATCH", "/listings/:id", async ({ params, req }) => {
  const user = requireActiveUser(req);
  const payload = await readJson(req);
  const existing = listings.find((item) => Number(item.id) === Number(params.id));

  if (!existing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  if (!canManageListing(existing, user)) {
    throw httpError(403, "Bu e'lonni tahrirlash mumkin emas.");
  }

  const updatedListing = normalizeListingPayload(payload, user, existing);
  listings = listings.map((item) =>
    Number(item.id) === Number(params.id) ? updatedListing : item
  );

  return { listing: updatedListing };
});

route("DELETE", "/listings/:id", async ({ params, req }) => {
  const user = requireActiveUser(req);
  const existing = listings.find((item) => Number(item.id) === Number(params.id));

  if (!existing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  if (!canManageListing(existing, user)) {
    throw httpError(403, "Bu e'lonni o'chirish mumkin emas.");
  }

  listings = listings.filter((item) => Number(item.id) !== Number(params.id));

  return null;
});

route("POST", "/uploads/listing-images", async ({ req }) => {
  requireActiveUser(req);
  const body = await readBody(req);
  const count = getUploadCount(body);

  return {
    urls: Array.from({ length: count }, (_, index) => uploadImages[index % uploadImages.length]),
  };
});

route("POST", "/uploads/message-attachments", async ({ req }) => {
  requireActiveUser(req);
  await readBody(req);

  return { url: uploadImages[Math.floor(Math.random() * uploadImages.length)] };
});

route("GET", "/favorites", async ({ req }) => {
  const user = requireUser(req);
  const favoriteIds = Array.from(favoritesByUser.get(user.id) || []);

  return {
    favorites: favoriteIds.map((listingId) => ({
      id: `${user.id}-${listingId}`,
      listingId,
      userId: user.id,
    })),
  };
});

route("POST", "/favorites/:listingId", async ({ params, req }) => {
  const user = requireActiveUser(req);
  const favoriteSet = favoritesByUser.get(user.id) || new Set();
  favoriteSet.add(Number(params.listingId));
  favoritesByUser.set(user.id, favoriteSet);

  return { ok: true };
});

route("DELETE", "/favorites/:listingId", async ({ params, req }) => {
  const user = requireActiveUser(req);
  const favoriteSet = favoritesByUser.get(user.id) || new Set();
  favoriteSet.delete(Number(params.listingId));
  favoritesByUser.set(user.id, favoriteSet);

  return { ok: true };
});

route("GET", "/conversations", async ({ req }) => {
  const user = requireUser(req);
  return { conversations: getUserConversations(user) };
});

route("GET", "/conversations/:key/messages", async ({ params, req }) => {
  const user = requireUser(req);
  return { messages: findConversationMessages(params.key, user) };
});

route("POST", "/conversations/:key/messages", async ({ params, req }) => {
  const user = requireActiveUser(req);
  const payload = await readJson(req);
  const message = normalizeMessagePayload(payload, user, params.key);

  messages.push(message);

  return { message };
});

route("PATCH", "/conversations/:key/read", async ({ params, req }) => {
  const user = requireUser(req);
  messages = messages.map((message) =>
    (message.conversationKey || getConversationKey(message)) === params.key &&
    message.recipientId === user.id
      ? { ...message, read: true }
      : message
  );

  return { ok: true };
});

route("PATCH", "/conversations/:key/archive", async ({ req }) => {
  requireUser(req);
  return { ok: true };
});

route("GET", "/admin/users", async ({ req }) => {
  requireAdmin(req);
  return { users: users.map(publicUser) };
});

route("PATCH", "/admin/users/:id/status", async ({ params, req }) => {
  requireAdmin(req);
  const payload = await readJson(req);

  users = users.map((user) =>
    user.id === params.id
      ? {
          ...user,
          accountStatus: payload.accountStatus || user.accountStatus,
          blockReason:
            payload.accountStatus === "blocked" ? payload.blockReason || "" : "",
        }
      : user
  );

  const user = users.find((item) => item.id === params.id);
  return { user: user ? publicUser(user) : null };
});

route("GET", "/admin/listings", async ({ req }) => {
  requireAdmin(req);
  return { listings };
});

route("PATCH", "/admin/listings/:id/moderation", async ({ params, req }) => {
  requireAdmin(req);
  const payload = await readJson(req);
  let updatedListing = null;

  listings = listings.map((listing) => {
    if (Number(listing.id) !== Number(params.id)) {
      return listing;
    }

    updatedListing = {
      ...listing,
      moderationStatus: payload.moderationStatus || listing.moderationStatus,
      updatedAt: now(),
    };
    return updatedListing;
  });

  if (!updatedListing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  return { listing: updatedListing };
});

route("PATCH", "/admin/listings/:id/note", async ({ params, req }) => {
  requireAdmin(req);
  const payload = await readJson(req);
  let updatedListing = null;

  listings = listings.map((listing) => {
    if (Number(listing.id) !== Number(params.id)) {
      return listing;
    }

    updatedListing = {
      ...listing,
      adminNote: payload.adminNote || "",
      updatedAt: now(),
    };
    return updatedListing;
  });

  if (!updatedListing) {
    throw httpError(404, "E'lon topilmadi.");
  }

  return { listing: updatedListing };
});

route("GET", "/admin/messages", async ({ req }) => {
  requireAdmin(req);
  return { messages };
});

seedState();

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendNoContent(res);
    return;
  }

  const matchedRoute = matchRoute(req.method, requestUrl.pathname);

  if (!matchedRoute) {
    sendJson(res, 404, { error: "Endpoint topilmadi." });
    return;
  }

  try {
    const payload = await matchedRoute.handler({
      params: matchedRoute.params,
      query: requestUrl.searchParams,
      req,
    });

    if (payload === null) {
      sendNoContent(res);
      return;
    }

    sendJson(res, 200, payload);
  } catch (error) {
    const status = error.status || 500;
    sendJson(res, status, {
      details: error.details || null,
      error: error.message || "Server xatosi.",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`UyTop mock API: http://${HOST}:${PORT}`);
});
