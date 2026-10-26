import { defaultUser } from "../components/realEstate/constants";
import { buildDemoAuthUser } from "./realEstateAuth";
import {
  optimizeImageFile,
  prepareImageFiles,
} from "./imageUploadOptimizer";
import { realEstateApi } from "./realEstateApi";
import { realEstateRepository } from "./realEstateRepository";
import { estateStorage } from "./realEstateStorage";

function asArray(payload, keys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  if (payload.data) {
    return asArray(payload.data, keys);
  }

  return [];
}

function getAuthToken(payload) {
  return (
    payload?.token ||
    payload?.accessToken ||
    payload?.access_token ||
    payload?.data?.token ||
    payload?.data?.accessToken ||
    ""
  );
}

function getAuthUser(payload) {
  return (
    payload?.user ||
    payload?.data?.user ||
    payload?.data?.me ||
    payload?.me ||
    payload
  );
}

function getEntity(payload, keys = []) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  for (const key of keys) {
    if (payload[key]) {
      return payload[key];
    }
  }

  if (payload.data) {
    return getEntity(payload.data, keys);
  }

  return payload;
}

function getUploadedUrls(payload) {
  const items = asArray(payload, ["urls", "images", "files", "attachments"]);

  if (items.length > 0) {
    return items
      .map((item) =>
        typeof item === "string"
          ? item
          : item.url || item.src || item.image || item.path || ""
      )
      .filter(Boolean);
  }

  const entity = getEntity(payload, ["url", "src", "image", "path"]);

  return typeof entity === "string" ? [entity] : [];
}

function getUploadedImageItems(payload) {
  const items = asArray(payload, ["files", "images", "attachments"]);

  return items
    .map((item) => {
      if (typeof item === "string") {
        return { src: item };
      }

      const src = item.url || item.src || item.image || item.path || "";
      return src ? { metadata: item, src } : null;
    })
    .filter(Boolean);
}

function getStatsById(payload) {
  return Object.fromEntries(
    asArray(payload, ["stats"])
      .filter(Boolean)
      .map((item) => [
        Number(item.listingId || item.id),
        {
          favorites: Number(item.favorites ?? item.favoriteCount ?? 0),
          leads: Number(item.leads ?? item.leadCount ?? 0),
          listingId: Number(item.listingId || item.id),
          updatedAt: item.updatedAt || "",
          views: Number(item.views ?? item.viewCount ?? 0),
        },
      ])
  );
}

function normalizeImagePayload(imagePayload) {
  if (!imagePayload) {
    return [];
  }

  if (Array.isArray(imagePayload)) {
    return imagePayload
      .map((item) =>
        typeof item === "string"
          ? { file: null, src: item }
          : { file: item.file || null, src: item.src || item.url || "" }
      )
      .filter((item) => item.src || item.file);
  }

  return normalizeImagePayload(imagePayload.imageItems || imagePayload.imageUrls);
}

function getMessagesFromConversations(payload) {
  const conversations = asArray(payload, ["conversations"]);

  return conversations.flatMap((conversation) =>
    asArray(conversation.messages, ["messages"]).map((message) => ({
      ...message,
      listingId: message.listingId || conversation.listingId,
      listingImage: message.listingImage || conversation.listingImage,
      listingPrice: message.listingPrice || conversation.listingPrice,
      listingTitle: message.listingTitle || conversation.listingTitle,
    }))
  );
}

function getEmptyApiState() {
  return {
    adminActions: [],
    baseListings: [],
    createdListings: [],
    currentUser: null,
    deletedListingIds: [],
    favoriteIds: [],
    listingOverrides: {},
    listingReports: estateStorage.loadListingReports(),
    listingStatsById: estateStorage.loadListingStatsById(),
    messages: [],
    notifications: estateStorage.loadNotifications(),
    savedSearches: estateStorage.loadSavedSearches(),
    users: [],
  };
}

function getToken() {
  return estateStorage.loadApiToken();
}

async function loadApiState() {
  const token = getToken();
  const listingPayload = await realEstateApi.getListings({}, token);
  const baseListings = asArray(listingPayload, ["listings"]);
  const listingStatsPayload = await realEstateApi
    .getListingStats(token)
    .catch(() => null);
  const ignoreAuthError = () => {
    return null;
  };
  const mePayload = await realEstateApi.getMe(token).catch(ignoreAuthError);
  const currentUser = mePayload ? getAuthUser(mePayload) : null;

  if (token) {
    estateStorage.clearApiToken();
  }

  const [
    favoritePayload,
    conversationPayload,
    savedSearchPayload,
    notificationPayload,
  ] = currentUser
    ? await Promise.all([
        realEstateApi.getFavorites(token).catch(ignoreAuthError),
        realEstateApi.getConversations(token).catch(ignoreAuthError),
        realEstateApi.getSavedSearches(token).catch(ignoreAuthError),
        realEstateApi.getNotifications(token).catch(ignoreAuthError),
      ])
    : [null, null, null, null];

  const favoriteIds = asArray(favoritePayload, ["favorites"]).map((favorite) =>
    Number(favorite.listingId || favorite.id || favorite)
  );
  const savedSearches = asArray(savedSearchPayload, ["searches"]);
  const notifications = asArray(notificationPayload, ["notifications"]);
  const [
    adminUserPayload,
    adminListingPayload,
    adminMessagePayload,
    adminReportPayload,
    adminActionPayload,
  ] =
    currentUser?.role === "admin"
      ? await Promise.all([
          realEstateApi.getAdminUsers(token),
          realEstateApi.getAdminListings(token),
          realEstateApi.getAdminMessages(token),
          realEstateApi.getAdminReports(token),
          realEstateApi.getAdminActions(token),
        ])
      : [null, null, null, null, null];
  const adminUsers = asArray(adminUserPayload, ["users"]);
  const adminListings = asArray(adminListingPayload, ["listings"]);
  const adminMessages = asArray(adminMessagePayload, ["messages"]);
  const adminReports = asArray(adminReportPayload, ["reports"]);
  const adminActions = asArray(adminActionPayload, ["actions"]);

  return {
    ...getEmptyApiState(),
    baseListings: adminListings.length > 0 ? adminListings : baseListings,
    createdListings: [],
    currentUser: currentUser || null,
    deletedListingIds: [],
    favoriteIds: favoriteIds.length > 0 ? favoriteIds : [],
    adminActions,
    listingReports: adminReports,
    listingOverrides: {},
    listingStatsById: getStatsById(listingStatsPayload),
    messages:
      currentUser?.role === "admin"
        ? adminMessages
        : getMessagesFromConversations(conversationPayload),
    notifications,
    savedSearches,
    users: adminUsers.length > 0 ? adminUsers : currentUser ? [currentUser] : [],
  };
}

export const realEstateDataGateway = {
  isApiMode() {
    return realEstateApi.isConfigured();
  },

  loadLocalState() {
    return realEstateRepository.loadState();
  },

  async loadInitialState() {
    if (!realEstateApi.isConfigured()) {
      return {
        source: "local",
        state: realEstateRepository.loadState(),
      };
    }

    try {
      return {
        source: "api",
        state: await loadApiState(),
      };
    } catch (error) {
      return {
        error,
        source: "api",
        state: getEmptyApiState(),
      };
    }
  },

  async authenticate(mode, formState) {
    if (!realEstateApi.isConfigured()) {
      return {
        source: "local",
        user: buildDemoAuthUser(formState, defaultUser),
      };
    }

    const payload =
      mode === "register"
        ? await realEstateApi.register(formState)
        : await realEstateApi.login(formState);
    const token = getAuthToken(payload);
    estateStorage.clearApiToken();

    return {
      source: "api",
      token,
      user: getAuthUser(payload),
    };
  },

  logout() {
    const token = getToken();

    estateStorage.clearApiToken();

    if (realEstateApi.isConfigured()) {
      realEstateApi.logout(token).catch(() => null);
    }
  },

  async createListing(listing) {
    if (!realEstateApi.isConfigured()) {
      return listing;
    }

    const payload = await realEstateApi.createListing(listing, getToken());
    return getEntity(payload, ["listing"]) || listing;
  },

  async resolveListingImageUrls(imagePayload) {
    const imageItems = normalizeImagePayload(imagePayload);

    if (!realEstateApi.isConfigured()) {
      return imageItems.map((item) => item.src).filter(Boolean);
    }

    const files = await prepareImageFiles(
      imageItems.filter((item) => item.file).map((item) => item.file)
    );

    if (files.length === 0) {
      return imageItems.map((item) => item.src).filter(Boolean);
    }

    const payload = await realEstateApi.uploadListingImages(files, getToken());
    const uploadedItems = getUploadedImageItems(payload);
    const uploadedUrls = getUploadedUrls(payload);
    let uploadIndex = 0;

    return imageItems
      .map((item) => {
        if (!item.file) {
          return item.src;
        }

        const uploadedItem = uploadedItems[uploadIndex];
        const uploadedUrl = uploadedItem?.src || uploadedUrls[uploadIndex];
        uploadIndex += 1;
        return uploadedItem || uploadedUrl || item.src;
      })
      .filter(Boolean);
  },

  async resolveMessageAttachment(attachment) {
    if (!attachment) {
      return "";
    }

    if (typeof attachment === "string") {
      return attachment;
    }

    if (!realEstateApi.isConfigured() || !attachment.file) {
      return attachment.src || "";
    }

    const file = await optimizeImageFile(attachment.file);
    const payload = await realEstateApi.uploadMessageAttachment(file, getToken());
    const [uploadedUrl] = getUploadedUrls(payload);

    return uploadedUrl || attachment.src || "";
  },

  async updateListing(listingId, listing) {
    if (!realEstateApi.isConfigured()) {
      return listing;
    }

    const payload = await realEstateApi.updateListing(listingId, listing, getToken());
    return getEntity(payload, ["listing"]) || listing;
  },

  async deleteListing(listingId) {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    await realEstateApi.deleteListing(listingId, getToken());
    return true;
  },

  async setFavorite(listingId, isFavorite) {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    let payload = null;

    if (isFavorite) {
      payload = await realEstateApi.addFavorite(listingId, getToken());
    } else {
      payload = await realEstateApi.removeFavorite(listingId, getToken());
    }

    return getEntity(payload, ["stats"]) || true;
  },

  async trackListingView(listingId) {
    if (!realEstateApi.isConfigured()) {
      return null;
    }

    const payload = await realEstateApi.trackListingView(listingId, getToken());
    return getEntity(payload, ["stats"]) || null;
  },

  async trackListingLead(listingId) {
    if (!realEstateApi.isConfigured()) {
      return null;
    }

    const payload = await realEstateApi.trackListingLead(listingId, getToken());
    return getEntity(payload, ["stats"]) || null;
  },

  async updateProfile(profile) {
    if (!realEstateApi.isConfigured()) {
      return profile;
    }

    const payload = await realEstateApi.updateMe(profile, getToken());
    return getAuthUser(payload) || profile;
  },

  async startPhoneVerification() {
    if (!realEstateApi.isConfigured()) {
      return {
        delivery: "dev",
        devCode: "123456",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        ok: true,
      };
    }

    return realEstateApi.startPhoneVerification(getToken());
  },

  async verifyPhoneCode(code) {
    if (!realEstateApi.isConfigured()) {
      return { phoneVerified: code === "123456" };
    }

    const payload = await realEstateApi.verifyPhoneCode(code, getToken());
    return getAuthUser(payload);
  },

  async sendListingMessage(message) {
    if (!realEstateApi.isConfigured()) {
      return message;
    }

    const conversationKey = `${message.listingId}:${[
      message.senderId,
      message.recipientId,
    ]
      .filter(Boolean)
      .sort()
      .join(":")}`;
    const payload = await realEstateApi.sendConversationMessage(
      conversationKey,
      message,
      getToken()
    );

    return getEntity(payload, ["message"]) || message;
  },

  async sendChatMessage(conversation, message) {
    if (!realEstateApi.isConfigured()) {
      return message;
    }

    const payload = await realEstateApi.sendConversationMessage(
      conversation.key,
      message,
      getToken()
    );

    return getEntity(payload, ["message"]) || message;
  },

  async markConversationRead(conversationKey) {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    await realEstateApi.markConversationRead(conversationKey, getToken());
    return true;
  },

  async updateUserStatus(userId, accountStatus, blockReason = "") {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    await realEstateApi.updateAdminUserStatus(
      userId,
      accountStatus,
      blockReason,
      getToken()
    );
    return true;
  },

  async updateListingModeration(listingId, moderationStatus) {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    await realEstateApi.updateListingModeration(
      listingId,
      moderationStatus,
      getToken()
    );
    return true;
  },

  async updateListingNote(listingId, adminNote) {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    await realEstateApi.updateListingNote(listingId, adminNote, getToken());
    return true;
  },

  async createListingReport(listing, reason, reporter = null) {
    const createdAt = new Date().toISOString();
    const fallbackReport = {
      createdAt,
      createdAtLabel: new Intl.DateTimeFormat("uz-UZ", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      }).format(new Date(createdAt)),
      id: Date.now(),
      listingId: listing.id,
      listingTitle: listing.title,
      reason,
      reporterName: reporter?.name || "Mehmon",
      reporterPhone: reporter?.phone || "",
      status: "open",
    };

    if (!realEstateApi.isConfigured()) {
      return fallbackReport;
    }

    const payload = await realEstateApi.createListingReport(
      listing.id,
      {
        reason,
        reporterName: reporter?.name || "",
        reporterPhone: reporter?.phone || "",
      },
      getToken()
    );
    return getEntity(payload, ["report"]) || fallbackReport;
  },

  async resolveListingReport(reportId) {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    const payload = await realEstateApi.resolveListingReport(reportId, getToken());
    return getEntity(payload, ["report"]) || true;
  },

  async createAdminAction(action) {
    if (!realEstateApi.isConfigured()) {
      return action;
    }

    const payload = await realEstateApi.createAdminAction(action, getToken());
    return getEntity(payload, ["action"]) || action;
  },

  async cleanupUploads({ olderThanDays = 7 } = {}) {
    if (!realEstateApi.isConfigured()) {
      return { deletedCount: 0, keptCount: 0, olderThanDays };
    }

    const payload = await realEstateApi.cleanupUploads(
      { olderThanDays },
      getToken()
    );
    return getEntity(payload, ["cleanup"]) || payload;
  },

  async createSavedSearch(search) {
    const fallbackSearch = {
      createdAt: new Date().toISOString(),
      filters: search.filters || {},
      id: Date.now(),
      name: search.name || "Saqlangan qidiruv",
    };

    if (!realEstateApi.isConfigured()) {
      return fallbackSearch;
    }

    const payload = await realEstateApi.createSavedSearch(search, getToken());
    return getEntity(payload, ["search"]) || fallbackSearch;
  },

  async deleteSavedSearch(searchId) {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    await realEstateApi.deleteSavedSearch(searchId, getToken());
    return true;
  },

  async markNotificationRead(notificationId) {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    const payload = await realEstateApi.markNotificationRead(
      notificationId,
      getToken()
    );
    return getEntity(payload, ["notification"]) || true;
  },

  async markAllNotificationsRead() {
    if (!realEstateApi.isConfigured()) {
      return true;
    }

    await realEstateApi.markAllNotificationsRead(getToken());
    return true;
  },

  shouldPersistLocalState() {
    return !realEstateApi.isConfigured();
  },
};
