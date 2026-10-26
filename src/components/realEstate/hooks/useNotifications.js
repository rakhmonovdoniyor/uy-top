import { useMemo } from "react";
import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { getUserId } from "../utils/listingUtils";

export function useNotifications({
  allListings,
  chatConversations,
  currentUser,
  handleActionError,
  setDataError,
  setStoredNotifications,
  storedNotifications,
}) {
  const derivedNotifications = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    const currentUserId = getUserId(currentUser);
    const ownedListings = allListings.filter(
      (listing) =>
        listing.ownerId === currentUserId || listing.phone === currentUser.phone
    );
    const listingNotifications = ownedListings
      .filter((listing) => listing.moderationStatus !== "approved")
      .map((listing) => ({
        id: `listing-${listing.id}-${listing.moderationStatus}`,
        text:
          listing.moderationStatus === "rejected"
            ? "Admin e'lonni rad etdi. Izoh bo'lsa admin panelda ko'rinadi."
            : "E'lon qayta ko'rish statusida.",
        title: listing.title,
      }));
    const chatNotifications = chatConversations
      .filter((conversation) => conversation.unreadCount > 0)
      .map((conversation) => ({
        id: `chat-${conversation.key}`,
        text: `${conversation.otherUser.name}: ${conversation.lastMessagePreview}`,
        title: "Yangi chat xabari",
      }));

    return [...chatNotifications, ...listingNotifications];
  }, [allListings, chatConversations, currentUser]);

  const notifications = useMemo(() => {
    const items = realEstateDataGateway.isApiMode()
      ? storedNotifications
      : [...storedNotifications, ...derivedNotifications];
    const seen = new Set();

    return items.filter((item) => {
      const key = item.id || `${item.title}-${item.text}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [derivedNotifications, storedNotifications]);

  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  async function markNotificationRead(notificationId) {
    setStoredNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );

    try {
      const savedNotification =
        await realEstateDataGateway.markNotificationRead(notificationId);

      if (savedNotification && savedNotification !== true) {
        setStoredNotifications((current) =>
          current.map((notification) =>
            notification.id === notificationId ? savedNotification : notification
          )
        );
      }

      setDataError("");
    } catch (error) {
      handleActionError(error);
    }
  }

  async function markAllNotificationsRead() {
    setStoredNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );

    try {
      await realEstateDataGateway.markAllNotificationsRead();
      setDataError("");
    } catch (error) {
      handleActionError(error);
    }
  }

  return {
    markAllNotificationsRead,
    markNotificationRead,
    notifications,
    unreadNotificationCount,
  };
}
