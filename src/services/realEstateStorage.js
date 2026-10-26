const STORAGE_KEYS = {
  apiToken: "uytop.apiToken",
  createdListings: "uytop.createdListings",
  currentUser: "uytop.currentUser",
  deletedListingIds: "uytop.deletedListingIds",
  favoriteIds: "uytop.favoriteIds",
  listingOverrides: "uytop.listingOverrides",
  listingReports: "uytop.listingReports",
  listingStatsById: "uytop.listingStatsById",
  messages: "uytop.messages",
  notifications: "uytop.notifications",
  savedSearches: "uytop.savedSearches",
  users: "uytop.users",
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJson(key, fallbackValue) {
  if (!canUseStorage()) {
    return fallbackValue;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeValue(key) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(key);
}

export const estateStorage = {
  clearDemoState() {
    Object.values(STORAGE_KEYS)
      .filter((key) => key !== STORAGE_KEYS.apiToken)
      .forEach(removeValue);
  },
  clearApiToken() {
    removeValue(STORAGE_KEYS.apiToken);
  },
  loadApiToken() {
    return readJson(STORAGE_KEYS.apiToken, "");
  },
  loadCreatedListings() {
    return readJson(STORAGE_KEYS.createdListings, []);
  },
  loadCurrentUser() {
    return readJson(STORAGE_KEYS.currentUser, null);
  },
  loadDeletedListingIds() {
    return readJson(STORAGE_KEYS.deletedListingIds, []);
  },
  loadFavoriteIds() {
    return readJson(STORAGE_KEYS.favoriteIds, [2, 5]);
  },
  loadListingOverrides() {
    return readJson(STORAGE_KEYS.listingOverrides, {});
  },
  loadListingReports() {
    return readJson(STORAGE_KEYS.listingReports, []);
  },
  loadListingStatsById() {
    return readJson(STORAGE_KEYS.listingStatsById, {});
  },
  loadMessages() {
    return readJson(STORAGE_KEYS.messages, []);
  },
  loadNotifications() {
    return readJson(STORAGE_KEYS.notifications, []);
  },
  loadSavedSearches() {
    return readJson(STORAGE_KEYS.savedSearches, []);
  },
  loadUsers() {
    return readJson(STORAGE_KEYS.users, []);
  },
  saveCreatedListings(value) {
    return writeJson(STORAGE_KEYS.createdListings, value);
  },
  saveApiToken(value) {
    if (!value) {
      removeValue(STORAGE_KEYS.apiToken);
      return true;
    }

    return writeJson(STORAGE_KEYS.apiToken, value);
  },
  saveCurrentUser(value) {
    if (!value) {
      removeValue(STORAGE_KEYS.currentUser);
      return true;
    }

    return writeJson(STORAGE_KEYS.currentUser, value);
  },
  saveDeletedListingIds(value) {
    return writeJson(STORAGE_KEYS.deletedListingIds, value);
  },
  saveFavoriteIds(value) {
    return writeJson(STORAGE_KEYS.favoriteIds, value);
  },
  saveListingOverrides(value) {
    return writeJson(STORAGE_KEYS.listingOverrides, value);
  },
  saveListingReports(value) {
    return writeJson(STORAGE_KEYS.listingReports, value);
  },
  saveListingStatsById(value) {
    return writeJson(STORAGE_KEYS.listingStatsById, value);
  },
  saveMessages(value) {
    return writeJson(STORAGE_KEYS.messages, value);
  },
  saveNotifications(value) {
    return writeJson(STORAGE_KEYS.notifications, value);
  },
  saveSavedSearches(value) {
    return writeJson(STORAGE_KEYS.savedSearches, value);
  },
  saveUsers(value) {
    return writeJson(STORAGE_KEYS.users, value);
  },
};
