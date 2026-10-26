export function getUserIdFromPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `user-${digits}` : "";
}

export function getUserId(user) {
  return user?.id || getUserIdFromPhone(user?.phone);
}

export function getUserKey(user) {
  return getUserId(user) || user.phone || user.email;
}

export function isToday(value) {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toDateString() === new Date().toDateString();
}

export function hasLikelyLowQualityImage(listing = {}) {
  const metadata = Array.isArray(listing.imageMetadata)
    ? listing.imageMetadata
    : [];
  const hasLowMetadata = metadata.some((item) => {
    const longSide = Math.max(Number(item.width || 0), Number(item.height || 0));
    const shortSide = Math.min(
      Number(item.width || 0),
      Number(item.height || 0)
    );

    return (
      (longSide > 0 && longSide < 1100) ||
      (shortSide > 0 && shortSide < 620) ||
      (Number(item.size || 0) > 0 && Number(item.size || 0) < 80 * 1024)
    );
  });

  if (hasLowMetadata) {
    return true;
  }

  const images = [listing.image, ...(listing.galleryImages || [])].filter(
    Boolean
  );

  if (images.length === 0) {
    return true;
  }

  return images.some((image) => /[?&]w=([1-8]\d{2}|[1-9]\d)\b/.test(image));
}

export function getDuplicateListingKey(listing = {}) {
  return [
    listing.ownerId || getUserIdFromPhone(listing.phone),
    listing.city,
    listing.district,
    listing.address,
    listing.title,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getAdminUserRows({ allListings, messages, users }) {
  return users.map((user) => {
    const userId = getUserId(user);
    const userListings = allListings.filter(
      (listing) => listing.ownerId === userId || listing.phone === user.phone
    );
    const userMessages = messages.filter(
      (message) =>
        message.senderId === userId ||
        message.recipientId === userId ||
        message.recipientPhone === user.phone ||
        message.senderPhone === user.phone
    );

    return {
      ...user,
      accountStatus: user.accountStatus || "active",
      id: userId,
      key: getUserKey(user),
      listingsCount: userListings.length,
      messagesCount: userMessages.length,
      unreadMessagesCount: userMessages.filter(
        (message) =>
          !message.read &&
          (message.recipientId === userId ||
            message.recipientPhone === user.phone)
      ).length,
    };
  });
}

export function getDuplicateGroups(allListings = []) {
  return Object.values(
    allListings.reduce((groups, listing) => {
      const key = getDuplicateListingKey(listing);
      groups[key] = groups[key] || [];
      groups[key].push(listing);
      return groups;
    }, {})
  ).filter((group) => group.length > 1);
}

export function getReportHistoryGroups(listingReports = []) {
  return Object.values(
    listingReports.reduce((groups, report) => {
      const key = String(report.listingId || report.listingTitle);
      groups[key] = groups[key] || {
        listingId: report.listingId,
        listingTitle: report.listingTitle,
        reports: [],
      };
      groups[key].reports.push(report);
      return groups;
    }, {})
  );
}

export function getUserRelatedListings({ allListings, selectedUser }) {
  return selectedUser
    ? allListings.filter(
        (listing) =>
          listing.ownerId === selectedUser.id ||
          listing.phone === selectedUser.phone
      )
    : [];
}

export function getUserRelatedMessages({ messages, selectedUser }) {
  return selectedUser
    ? messages
        .filter(
          (message) =>
            message.senderId === selectedUser.id ||
            message.recipientId === selectedUser.id ||
            message.recipientPhone === selectedUser.phone ||
            message.senderPhone === selectedUser.phone
        )
        .sort(
          (first, second) =>
            new Date(second.createdAt).getTime() -
            new Date(first.createdAt).getTime()
        )
    : [];
}

export function getAdminPageData({
  actionFilter,
  adminActions,
  allListings,
  listingReports,
  messages,
  selectedUserKey,
  statusFilter,
  userSearch,
  users,
}) {
  const filteredAdminListings =
    statusFilter === "all"
      ? allListings
      : allListings.filter(
          (listing) => listing.moderationStatus === statusFilter
        );
  const pendingCount = allListings.filter(
    (listing) => listing.moderationStatus === "pending"
  ).length;
  const approvedCount = allListings.filter(
    (listing) => listing.moderationStatus === "approved"
  ).length;
  const rejectedCount = allListings.filter(
    (listing) => listing.moderationStatus === "rejected"
  ).length;
  const topCount = allListings.filter((listing) =>
    listing.tags?.some((tag) => tag === "Top e'lon" || tag === "Premium")
  ).length;
  const todayListingCount = allListings.filter((listing) =>
    isToday(listing.createdAt || listing.updatedAt)
  ).length;
  const lowQualityListings = allListings.filter(hasLikelyLowQualityImage);
  const openReportCount = listingReports.filter(
    (report) => report.status !== "resolved"
  ).length;
  const duplicateGroups = getDuplicateGroups(allListings);
  const reportHistoryGroups = getReportHistoryGroups(listingReports);
  const userRows = getAdminUserRows({ allListings, messages, users });
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUserRows = normalizedUserSearch
    ? userRows.filter((user) =>
        [user.name, user.phone, user.email, user.role]
          .join(" ")
          .toLowerCase()
          .includes(normalizedUserSearch)
      )
    : userRows;
  const selectedUser =
    filteredUserRows.find((user) => user.key === selectedUserKey) ||
    filteredUserRows[0] ||
    null;
  const selectedUserListings = getUserRelatedListings({
    allListings,
    selectedUser,
  });
  const selectedUserMessages = getUserRelatedMessages({
    messages,
    selectedUser,
  });
  const recentMessages = [...messages].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
  const actionTypes = Array.from(
    new Set(adminActions.map((action) => action.type).filter(Boolean))
  );
  const filteredAdminActions =
    actionFilter === "all"
      ? adminActions
      : adminActions.filter((action) => action.type === actionFilter);

  return {
    actionTypes,
    approvedCount,
    duplicateGroups,
    filteredAdminActions,
    filteredAdminListings,
    filteredUserRows,
    lowQualityImageCount: lowQualityListings.length,
    lowQualityListings,
    openReportCount,
    pendingCount,
    recentMessages,
    rejectedCount,
    reportHistoryGroups,
    selectedUser,
    selectedUserListings,
    selectedUserMessages,
    todayListingCount,
    topCount,
    userCount: userRows.filter((user) => user.role !== "admin").length,
    userRows,
  };
}
