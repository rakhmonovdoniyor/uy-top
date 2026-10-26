import { useEffect, useRef, useState } from "react";

export function useChatToast({
  chatConversations,
  currentUser,
  unreadChatCount,
}) {
  const [chatToast, setChatToast] = useState(null);
  const previousUnreadRef = useRef(0);
  const hasMountedUnreadRef = useRef(false);

  useEffect(() => {
    if (!currentUser) {
      previousUnreadRef.current = 0;
      hasMountedUnreadRef.current = false;
      setChatToast(null);
      return;
    }

    if (!hasMountedUnreadRef.current) {
      previousUnreadRef.current = unreadChatCount;
      hasMountedUnreadRef.current = true;
      return;
    }

    if (unreadChatCount > previousUnreadRef.current) {
      const latestUnreadConversation = chatConversations.find(
        (conversation) => conversation.unreadCount > 0
      );

      if (latestUnreadConversation) {
        setChatToast({
          key: latestUnreadConversation.key,
          sender: latestUnreadConversation.otherUser.name,
          text: latestUnreadConversation.lastMessagePreview,
        });
      }
    }

    previousUnreadRef.current = unreadChatCount;
  }, [chatConversations, currentUser, unreadChatCount]);

  return [chatToast, setChatToast];
}
