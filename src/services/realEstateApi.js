const ENV_API_BASE_URL = (process.env.REACT_APP_UYTOP_API_URL || "").replace(
  /\/+$/,
  ""
);

export class RealEstateApiError extends Error {
  constructor(message, { cause = null, payload = null, status = 0 } = {}) {
    super(message);
    this.name = "RealEstateApiError";
    this.cause = cause;
    this.payload = payload;
    this.status = status;
  }
}

function isLocalishHost(hostname = "") {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

function getApiBaseUrl() {
  if (!ENV_API_BASE_URL) {
    return "";
  }

  if (typeof window === "undefined") {
    return ENV_API_BASE_URL;
  }

  try {
    const apiUrl = new URL(ENV_API_BASE_URL);
    const pageHost = window.location.hostname;

    if (
      pageHost &&
      isLocalishHost(pageHost) &&
      isLocalishHost(apiUrl.hostname) &&
      pageHost !== apiUrl.hostname
    ) {
      apiUrl.hostname = pageHost;
      return apiUrl.toString().replace(/\/+$/, "");
    }
  } catch {
    return ENV_API_BASE_URL;
  }

  return ENV_API_BASE_URL;
}

function getApiUrl(path) {
  const apiBaseUrl = getApiBaseUrl();
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function getErrorMessage(payload, status) {
  if (payload && typeof payload === "object") {
    const message = payload.error || payload.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (status === 401) {
    return "Sessiya tugagan yoki kirish ma'lumotlari noto'g'ri.";
  }

  if (status === 403) {
    return "Bu amal uchun ruxsat yo'q.";
  }

  return "UyTop API so'rovi bajarilmadi.";
}

async function request(path, options = {}) {
  if (!getApiBaseUrl()) {
    throw new RealEstateApiError(
      "REACT_APP_UYTOP_API_URL sozlanmagan. Hozir demo localStorage rejimi ishlaydi."
    );
  }

  const { body, headers = {}, token, ...requestOptions } = options;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  let response;

  try {
    response = await fetch(getApiUrl(path), {
      ...requestOptions,
      body:
        body === undefined || isFormData
          ? body
          : JSON.stringify(body),
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch (error) {
    throw new RealEstateApiError(
      "Backendga ulanish bo'lmadi. API server ishlayotganini tekshiring.",
      { cause: error }
    );
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new RealEstateApiError(getErrorMessage(payload, response.status), {
      payload,
      status: response.status,
    });
  }

  return payload;
}

export const realEstateApi = {
  isConfigured() {
    return Boolean(getApiBaseUrl());
  },

  login(credentials) {
    return request("/auth/login", {
      body: credentials,
      method: "POST",
    });
  },

  register(payload) {
    return request("/auth/register", {
      body: payload,
      method: "POST",
    });
  },

  logout(token) {
    return request("/auth/logout", {
      method: "POST",
      token,
    });
  },

  getMe(token) {
    return request("/me", { token });
  },

  updateMe(payload, token) {
    return request("/me", {
      body: payload,
      method: "PATCH",
      token,
    });
  },

  startPhoneVerification(token) {
    return request("/phone-verification/start", {
      method: "POST",
      token,
    });
  },

  verifyPhoneCode(code, token) {
    return request("/phone-verification/verify", {
      body: { code },
      method: "POST",
      token,
    });
  },

  getListings(params = {}, token) {
    const query = new URLSearchParams(params).toString();

    return request(`/listings${query ? `?${query}` : ""}`, { token });
  },

  getListing(listingId, token) {
    return request(`/listings/${listingId}`, { token });
  },

  getListingStats(token) {
    return request("/listing-stats", { token });
  },

  trackListingView(listingId, token) {
    return request(`/listings/${listingId}/stats/view`, {
      method: "POST",
      token,
    });
  },

  trackListingLead(listingId, token) {
    return request(`/listings/${listingId}/stats/lead`, {
      method: "POST",
      token,
    });
  },

  createListing(payload, token) {
    return request("/listings", {
      body: payload,
      method: "POST",
      token,
    });
  },

  updateListing(listingId, payload, token) {
    return request(`/listings/${listingId}`, {
      body: payload,
      method: "PATCH",
      token,
    });
  },

  uploadListingImages(files, token) {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("images", file);
    });

    return request("/uploads/listing-images", {
      body: formData,
      method: "POST",
      token,
    });
  },

  uploadMessageAttachment(file, token) {
    const formData = new FormData();

    formData.append("attachment", file);

    return request("/uploads/message-attachments", {
      body: formData,
      method: "POST",
      token,
    });
  },

  deleteListing(listingId, token) {
    return request(`/listings/${listingId}`, {
      method: "DELETE",
      token,
    });
  },

  getFavorites(token) {
    return request("/favorites", { token });
  },

  addFavorite(listingId, token) {
    return request(`/favorites/${listingId}`, {
      method: "POST",
      token,
    });
  },

  removeFavorite(listingId, token) {
    return request(`/favorites/${listingId}`, {
      method: "DELETE",
      token,
    });
  },

  getConversations(token) {
    return request("/conversations", { token });
  },

  getConversationMessages(conversationKey, token) {
    return request(`/conversations/${encodeURIComponent(conversationKey)}/messages`, {
      token,
    });
  },

  sendConversationMessage(conversationKey, payload, token) {
    return request(`/conversations/${encodeURIComponent(conversationKey)}/messages`, {
      body: payload,
      method: "POST",
      token,
    });
  },

  markConversationRead(conversationKey, token) {
    return request(`/conversations/${encodeURIComponent(conversationKey)}/read`, {
      method: "PATCH",
      token,
    });
  },

  archiveConversation(conversationKey, token) {
    return request(`/conversations/${encodeURIComponent(conversationKey)}/archive`, {
      method: "PATCH",
      token,
    });
  },

  getSavedSearches(token) {
    return request("/saved-searches", { token });
  },

  createSavedSearch(payload, token) {
    return request("/saved-searches", {
      body: payload,
      method: "POST",
      token,
    });
  },

  deleteSavedSearch(searchId, token) {
    return request(`/saved-searches/${searchId}`, {
      method: "DELETE",
      token,
    });
  },

  getNotifications(token) {
    return request("/notifications", { token });
  },

  markNotificationRead(notificationId, token) {
    return request(`/notifications/${notificationId}/read`, {
      method: "PATCH",
      token,
    });
  },

  markAllNotificationsRead(token) {
    return request("/notifications/read-all", {
      method: "PATCH",
      token,
    });
  },

  getAdminUsers(token) {
    return request("/admin/users", { token });
  },

  updateAdminUserStatus(userId, accountStatus, blockReason, token) {
    return request(`/admin/users/${userId}/status`, {
      body: { accountStatus, blockReason },
      method: "PATCH",
      token,
    });
  },

  getAdminListings(token) {
    return request("/admin/listings", { token });
  },

  updateListingModeration(listingId, moderationStatus, token) {
    return request(`/admin/listings/${listingId}/moderation`, {
      body: { moderationStatus },
      method: "PATCH",
      token,
    });
  },

  updateListingNote(listingId, adminNote, token) {
    return request(`/admin/listings/${listingId}/note`, {
      body: { adminNote },
      method: "PATCH",
      token,
    });
  },

  getAdminMessages(token) {
    return request("/admin/messages", { token });
  },

  getAdminReports(token) {
    return request("/admin/reports", { token });
  },

  createListingReport(listingId, payload, token) {
    return request(`/listings/${listingId}/reports`, {
      body: payload,
      method: "POST",
      token,
    });
  },

  resolveListingReport(reportId, token) {
    return request(`/admin/reports/${reportId}/resolve`, {
      method: "PATCH",
      token,
    });
  },

  getAdminActions(token) {
    return request("/admin/actions", { token });
  },

  createAdminAction(payload, token) {
    return request("/admin/actions", {
      body: payload,
      method: "POST",
      token,
    });
  },

  cleanupUploads(payload, token) {
    return request("/admin/uploads/cleanup", {
      body: payload,
      method: "POST",
      token,
    });
  },
};
