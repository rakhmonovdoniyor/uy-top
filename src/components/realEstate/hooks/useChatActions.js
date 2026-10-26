import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { realEstateRepository } from "../../../services/realEstateRepository";

export function useChatActions({
  currentUser,
  handleActionError,
  messages,
  setDataError,
  setMessages,
}) {
  async function sendListingMessage(listing, formState) {
    if (!currentUser || currentUser.accountStatus === "blocked") {
      return null;
    }

    const message = realEstateRepository.createMessage({
      formState,
      listing,
      sender: currentUser,
    });

    try {
      const savedMessage = await realEstateDataGateway.sendListingMessage(message);
      setMessages((current) => [savedMessage, ...current]);
      setDataError("");
      return savedMessage;
    } catch (error) {
      handleActionError(error);
      return null;
    }
  }

  function markMessageRead(messageId) {
    setMessages((current) =>
      realEstateRepository.markMessageRead(current, messageId)
    );
  }

  function markAllInboxMessagesRead() {
    setMessages((current) =>
      realEstateRepository.markUserMessagesRead(current, currentUser)
    );
  }

  function replyToMessage(originalMessage, body) {
    if (!currentUser || !body.trim()) {
      return null;
    }

    const replyMessage = realEstateRepository.createReplyMessage({
      body,
      originalMessage,
      sender: currentUser,
    });

    setMessages((current) =>
      realEstateRepository.markMessageRead(
        [replyMessage, ...current],
        originalMessage.id
      )
    );
    return replyMessage;
  }

  async function sendChatMessage(conversation, body, attachment = "") {
    if (
      !currentUser ||
      currentUser.accountStatus === "blocked" ||
      (!body.trim() && !attachment)
    ) {
      return null;
    }

    let attachmentImage = "";

    try {
      attachmentImage =
        await realEstateDataGateway.resolveMessageAttachment(attachment);
    } catch (error) {
      handleActionError(error);
      return null;
    }

    const chatMessage = realEstateRepository.createConversationMessage({
      attachmentImage,
      body,
      conversation,
      sender: currentUser,
    });

    try {
      const savedMessage = await realEstateDataGateway.sendChatMessage(
        conversation,
        chatMessage
      );
      setMessages((current) => [savedMessage, ...current]);
      setDataError("");
      return savedMessage;
    } catch (error) {
      handleActionError(error);
      return null;
    }
  }

  function markConversationRead(conversationKey) {
    const previousMessages = messages;

    setMessages((current) =>
      realEstateRepository.markConversationRead(
        current,
        conversationKey,
        currentUser
      )
    );

    realEstateDataGateway.markConversationRead(conversationKey).catch((error) => {
      setMessages(previousMessages);
      handleActionError(error);
    });
  }

  return {
    markAllInboxMessagesRead,
    markConversationRead,
    markMessageRead,
    replyToMessage,
    sendChatMessage,
    sendListingMessage,
  };
}
