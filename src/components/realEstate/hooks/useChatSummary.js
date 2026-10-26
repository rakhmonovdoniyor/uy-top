import { useMemo } from "react";
import { realEstateRepository } from "../../../services/realEstateRepository";

export function useChatSummary({ currentUser, messages }) {
  const chatConversations = useMemo(
    () => realEstateRepository.getUserConversations(messages, currentUser),
    [currentUser, messages]
  );
  const unreadChatCount = useMemo(
    () =>
      chatConversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0
      ),
    [chatConversations]
  );

  return {
    chatConversations,
    unreadChatCount,
  };
}
