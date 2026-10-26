import { listings } from "../data/realEstateData";
import { estateStorage } from "./realEstateStorage";

const defaultEstateState = {
  adminActions: [],
  baseListings: listings,
  createdListings: [],
  currentUser: null,
  deletedListingIds: [],
  favoriteIds: [2, 5],
  listingOverrides: {},
  listingReports: [],
  listingStatsById: {},
  messages: [],
  notifications: [],
  savedSearches: [],
  users: [],
};

function getDefaultEstateState() {
  return {
    createdListings: [],
    adminActions: [],
    baseListings: listings,
    currentUser: null,
    deletedListingIds: [],
    favoriteIds: [...defaultEstateState.favoriteIds],
    listingOverrides: {},
    listingReports: [],
    listingStatsById: {},
    messages: [],
    notifications: [],
    savedSearches: [],
    users: [],
  };
}

function getUserIdFromPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `user-${digits}` : `user-${Date.now()}`;
}

function getListingOwnerId(listing) {
  return listing.ownerId || getUserIdFromPhone(listing.phone);
}

function getUserId(user) {
  return user?.id || getUserIdFromPhone(user?.phone);
}

function getMessageRecipientId(message) {
  return message.recipientId || getUserIdFromPhone(message.recipientPhone);
}

function getMessageSenderId(message) {
  return message.senderId || getUserIdFromPhone(message.senderPhone);
}

function getConversationKey(message) {
  const participantIds = [
    getMessageSenderId(message),
    getMessageRecipientId(message),
  ].sort();

  return `${message.listingId}:${participantIds.join(":")}`;
}

function getNowLabel() {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

function getNowDateTime() {
  const createdAt = new Date().toISOString();

  return {
    value: createdAt,
    label: getNowLabel(createdAt),
  };
}

function normalizeListingId(listingId) {
  return Number(listingId);
}

function hasCreatedListing(createdListings, listingId) {
  const numericId = normalizeListingId(listingId);
  return createdListings.some((listing) => listing.id === numericId);
}

function getBaseListingsWithOverrides(listingOverrides = {}, baseListings = listings) {
  return baseListings.map((listing) => {
    const override = listingOverrides[listing.id];

    return override
      ? { ...listing, moderationStatus: "approved", ...override }
      : { ...listing, moderationStatus: "approved" };
  });
}

export const realEstateRepository = {
  applyListingUpdate({
    createdListings,
    listingId,
    listingOverrides,
    updatedListing,
  }) {
    const numericId = normalizeListingId(listingId);

    if (hasCreatedListing(createdListings, numericId)) {
      return {
        createdListings: createdListings.map((listing) =>
          listing.id === numericId ? updatedListing : listing
        ),
        listingOverrides,
      };
    }

    return {
      createdListings,
      listingOverrides: {
        ...listingOverrides,
        [numericId]: updatedListing,
      },
    };
  },
  applyModerationStatus({
    allListings,
    createdListings,
    listingId,
    listingOverrides,
    moderationStatus,
  }) {
    const numericId = normalizeListingId(listingId);
    const existingListing = allListings.find((listing) => listing.id === numericId);

    if (!existingListing) {
      return null;
    }

    if (hasCreatedListing(createdListings, numericId)) {
      return {
        createdListings: createdListings.map((listing) =>
          listing.id === numericId ? { ...listing, moderationStatus } : listing
        ),
        listingOverrides,
      };
    }

    return {
      createdListings,
      listingOverrides: {
        ...listingOverrides,
        [numericId]: {
          ...existingListing,
          ...listingOverrides[numericId],
          moderationStatus,
        },
      },
    };
  },
  clearDemoState() {
    estateStorage.clearDemoState();
    return getDefaultEstateState();
  },
  composeListings(
    createdListings,
    listingOverrides,
    deletedListingIds = [],
    baseListings = listings
  ) {
    const deletedIds = new Set(deletedListingIds.map(Number));

    return [
      ...createdListings,
      ...getBaseListingsWithOverrides(listingOverrides, baseListings),
    ].filter((listing) => !deletedIds.has(Number(listing.id)));
  },
  createMessage({ formState, listing, sender }) {
    const createdAt = new Date().toISOString();

    return {
      id: Date.now(),
      body: formState.message.trim(),
      createdAt,
      createdAtLabel: getNowLabel(createdAt),
      listingId: listing.id,
      listingImage: listing.image,
      listingPrice: listing.priceLabel,
      listingTitle: listing.title,
      read: false,
      recipientId: getListingOwnerId(listing),
      recipientName: listing.agent,
      recipientPhone: listing.phone,
      senderId: sender.id,
      senderName: formState.name.trim() || sender.name,
      senderPhone: formState.phone.trim() || sender.phone,
    };
  },
  createReplyMessage({ body, originalMessage, sender }) {
    const createdAt = new Date().toISOString();

    return {
      id: Date.now(),
      body: body.trim(),
      createdAt,
      createdAtLabel: getNowLabel(createdAt),
      listingId: originalMessage.listingId,
      listingImage: originalMessage.listingImage,
      listingPrice: originalMessage.listingPrice,
      listingTitle: originalMessage.listingTitle,
      read: false,
      recipientId: originalMessage.senderId,
      recipientName: originalMessage.senderName,
      recipientPhone: originalMessage.senderPhone,
      replyToId: originalMessage.id,
      senderId: sender.id,
      senderName: sender.name,
      senderPhone: sender.phone,
    };
  },
  createConversationMessage({ attachmentImage, body, conversation, sender }) {
    const createdAt = new Date().toISOString();

    return {
      id: Date.now(),
      body: body.trim(),
      attachmentImage: attachmentImage || "",
      createdAt,
      createdAtLabel: getNowLabel(createdAt),
      listingId: conversation.listingId,
      listingImage: conversation.listingImage,
      listingPrice: conversation.listingPrice,
      listingTitle: conversation.listingTitle,
      read: false,
      recipientId: conversation.otherUser.id,
      recipientName: conversation.otherUser.name,
      recipientPhone: conversation.otherUser.phone,
      senderId: getUserId(sender),
      senderName: sender.name,
      senderPhone: sender.phone,
    };
  },
  deleteListing({ createdListings, deletedListingIds, listingId, listingOverrides }) {
    const numericId = normalizeListingId(listingId);
    const isCreatedListing = hasCreatedListing(createdListings, numericId);
    const nextOverrides = { ...listingOverrides };

    delete nextOverrides[numericId];

    return {
      createdListings: isCreatedListing
        ? createdListings.filter((listing) => listing.id !== numericId)
        : createdListings,
      deletedListingIds: Array.from(new Set([...deletedListingIds, numericId])),
      listingOverrides: nextOverrides,
    };
  },
  getVisibleListings(allListings, currentUser) {
    if (currentUser?.role === "admin") {
      return allListings;
    }

    return allListings.filter(
      (listing) => listing.moderationStatus === "approved"
    );
  },
  getUserIdFromPhone,
  getUserConversations(messages, currentUser) {
    if (!currentUser) {
      return [];
    }

    const currentUserId = getUserId(currentUser);
    const userMessages = messages.filter(
      (message) =>
        getMessageSenderId(message) === currentUserId ||
        getMessageRecipientId(message) === currentUserId ||
        message.recipientPhone === currentUser.phone ||
        message.senderPhone === currentUser.phone
    );
    const conversationMap = new Map();

    userMessages.forEach((message) => {
      const key = getConversationKey(message);
      const isSender = getMessageSenderId(message) === currentUserId;
      const otherUser = isSender
        ? {
            id: getMessageRecipientId(message),
            name: message.recipientName,
            phone: message.recipientPhone,
          }
        : {
            id: getMessageSenderId(message),
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

      if (!message.read && getMessageRecipientId(message) === currentUserId) {
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
  },
  getUserMessages(messages, currentUser) {
    if (!currentUser) {
      return { inbox: [], sent: [], unreadCount: 0 };
    }

    const userId = currentUser.id || getUserIdFromPhone(currentUser.phone);
    const inbox = messages.filter(
      (message) =>
        message.recipientId === userId ||
        message.recipientPhone === currentUser.phone
    );
    const sent = messages.filter((message) => message.senderId === userId);

    return {
      inbox,
      sent,
      unreadCount: inbox.filter((message) => !message.read).length,
    };
  },
  markMessageRead(messages, messageId) {
    const numericId = Number(messageId);

    return messages.map((message) =>
      message.id === numericId ? { ...message, read: true } : message
    );
  },
  markConversationRead(messages, conversationKey, currentUser) {
    const currentUserId = getUserId(currentUser);

    return messages.map((message) =>
      getConversationKey(message) === conversationKey &&
      (getMessageRecipientId(message) === currentUserId ||
        message.recipientPhone === currentUser.phone)
        ? { ...message, read: true }
        : message
    );
  },
  markUserMessagesRead(messages, currentUser) {
    const currentUserId = getUserId(currentUser);

    return messages.map((message) =>
      getMessageRecipientId(message) === currentUserId ||
      message.recipientPhone === currentUser.phone
        ? { ...message, read: true }
        : message
    );
  },
  updateListingAdminNote({
    allListings,
    createdListings,
    listingId,
    listingOverrides,
    adminNote,
  }) {
    const numericId = normalizeListingId(listingId);
    const existingListing = allListings.find((listing) => listing.id === numericId);

    if (!existingListing) {
      return null;
    }

    if (hasCreatedListing(createdListings, numericId)) {
      return {
        createdListings: createdListings.map((listing) =>
          listing.id === numericId ? { ...listing, adminNote } : listing
        ),
        listingOverrides,
      };
    }

    return {
      createdListings,
      listingOverrides: {
        ...listingOverrides,
        [numericId]: {
          ...existingListing,
          ...listingOverrides[numericId],
          adminNote,
        },
      },
    };
  },
  updateUserStatus(users, userId, accountStatus, blockReason = "") {
    return users.map((user) =>
      getUserId(user) === userId
        ? {
            ...user,
            accountStatus,
            blockReason: accountStatus === "blocked" ? blockReason : "",
          }
        : user
    );
  },
  upsertUser(users, user) {
    const userId = user.id || getUserIdFromPhone(user.phone);
    const existingUser = users.find(
      (item) => item.id === userId || item.phone === user.phone
    );
    const loginDateTime = getNowDateTime();
    const nextUser = {
      ...existingUser,
      ...user,
      id: userId,
      lastLoginAt: loginDateTime.value,
      lastLoginAtLabel: loginDateTime.label,
      accountStatus: existingUser?.accountStatus || user.accountStatus || "active",
      registeredAt: existingUser?.registeredAt || loginDateTime.value,
      registeredAtLabel: existingUser?.registeredAtLabel || loginDateTime.label,
      role: user.role || existingUser?.role || "user",
    };

    return {
      user: nextUser,
      users: existingUser
        ? users.map((item) =>
            item.id === existingUser.id ? nextUser : item
          )
        : [...users, nextUser],
    };
  },
  loadState() {
    const currentUser = estateStorage.loadCurrentUser();
    const users = estateStorage.loadUsers();
    const normalizedCurrentUser = currentUser
      ? {
          ...currentUser,
          id: currentUser.id || getUserIdFromPhone(currentUser.phone),
        }
      : null;
    const normalizedUsers =
      normalizedCurrentUser &&
      !users.some(
        (user) =>
          user.id === normalizedCurrentUser.id ||
          user.phone === normalizedCurrentUser.phone
      )
        ? [normalizedCurrentUser, ...users]
        : users;

    return {
      createdListings: estateStorage.loadCreatedListings(),
      adminActions: [],
      baseListings: listings,
      currentUser: normalizedCurrentUser,
      deletedListingIds: estateStorage.loadDeletedListingIds(),
      favoriteIds: estateStorage.loadFavoriteIds(),
      listingOverrides: estateStorage.loadListingOverrides(),
      listingReports: estateStorage.loadListingReports(),
      listingStatsById: estateStorage.loadListingStatsById(),
      messages: estateStorage.loadMessages(),
      notifications: estateStorage.loadNotifications(),
      savedSearches: estateStorage.loadSavedSearches(),
      users: normalizedUsers,
    };
  },
  saveCreatedListings(value) {
    return estateStorage.saveCreatedListings(value);
  },
  saveCurrentUser(value) {
    return estateStorage.saveCurrentUser(value);
  },
  saveDeletedListingIds(value) {
    return estateStorage.saveDeletedListingIds(value);
  },
  saveFavoriteIds(value) {
    return estateStorage.saveFavoriteIds(value);
  },
  saveListingOverrides(value) {
    return estateStorage.saveListingOverrides(value);
  },
  saveListingReports(value) {
    return estateStorage.saveListingReports(value);
  },
  saveListingStatsById(value) {
    return estateStorage.saveListingStatsById(value);
  },
  saveMessages(value) {
    return estateStorage.saveMessages(value);
  },
  saveNotifications(value) {
    return estateStorage.saveNotifications(value);
  },
  saveSavedSearches(value) {
    return estateStorage.saveSavedSearches(value);
  },
  saveUsers(value) {
    return estateStorage.saveUsers(value);
  },
};
