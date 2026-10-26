import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiCalendar,
  FiChevronRight,
  FiImage,
  FiMessageCircle,
  FiPhone,
  FiSearch,
  FiSend,
  FiSlash,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import PageIntro from "../components/PageIntro";
import { useI18n } from "../i18n";

function getUserIdFromPhone(phone = "") {
  const digits = String(phone).replace(/\D/g, "");
  return digits ? `user-${digits}` : "";
}

function getUserId(user) {
  return user?.id || getUserIdFromPhone(user?.phone);
}

function getListingOwnerId(listing) {
  return listing?.ownerId || getUserIdFromPhone(listing?.phone);
}

function getListingConversationKey(listing, currentUser) {
  const currentUserId = getUserId(currentUser);
  const ownerId = getListingOwnerId(listing);

  if (!listing || !currentUserId || !ownerId) {
    return "";
  }

  return `${listing.id}:${[currentUserId, ownerId].sort().join(":")}`;
}

const localeByLanguage = {
  en: "en-US",
  ru: "ru-RU",
  uz: "uz-UZ",
};

function getDateLabel(value, language = "uz") {
  const messageDate = new Date(value);

  if (Number.isNaN(messageDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(localeByLanguage[language] || "uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(messageDate);
}

function shouldShowDateSeparator(messages, index) {
  if (index === 0) {
    return true;
  }

  const currentDate = new Date(messages[index].createdAt).toDateString();
  const previousDate = new Date(messages[index - 1].createdAt).toDateString();

  return currentDate !== previousDate;
}

function ChatPage({
  allListings = [],
  chatConversations = [],
  currentUser,
  markConversationRead,
  reportListing,
  sendChatMessage,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language, t } = useI18n();
  const chatKeyFromUrl = searchParams.get("chat");
  const listingIdFromUrl = Number(searchParams.get("listing") || 0);
  const currentUserId = getUserId(currentUser);
  const listingFromUrl = useMemo(
    () =>
      allListings.find((listing) => Number(listing.id) === listingIdFromUrl) ||
      null,
    [allListings, listingIdFromUrl]
  );
  const listingConversationKey = getListingConversationKey(
    listingFromUrl,
    currentUser
  );
  const pendingConversation = useMemo(() => {
    if (!listingFromUrl || !listingConversationKey) {
      return null;
    }

    const existingConversation = chatConversations.find(
      (conversation) => conversation.key === listingConversationKey
    );

    if (existingConversation) {
      return null;
    }

    return {
      key: listingConversationKey,
      lastMessagePreview: t("chat.noChatTitle"),
      listingId: listingFromUrl.id,
      listingImage: listingFromUrl.image,
      listingPrice: listingFromUrl.priceLabel,
      listingTitle: listingFromUrl.title,
      messages: [],
      otherUser: {
        id: getListingOwnerId(listingFromUrl),
        name: listingFromUrl.agent,
        phone: listingFromUrl.phone,
      },
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }, [chatConversations, listingConversationKey, listingFromUrl, t]);
  const availableConversations = useMemo(
    () =>
      pendingConversation
        ? [pendingConversation, ...chatConversations]
        : chatConversations,
    [chatConversations, pendingConversation]
  );
  const initialSelectedKey =
    availableConversations.find((conversation) => conversation.key === chatKeyFromUrl)
      ?.key ||
    availableConversations.find(
      (conversation) => conversation.key === listingConversationKey
    )?.key ||
    availableConversations[0]?.key;
  const [selectedKey, setSelectedKey] = useState(initialSelectedKey);
  const [conversationSearch, setConversationSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentImage, setAttachmentImage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hiddenConversationKeys, setHiddenConversationKeys] = useState(() => {
    const storageKey = `uytop.hiddenChats.${currentUser?.id || currentUser?.phone}`;
    const storedValue = window.localStorage.getItem(storageKey);

    try {
      return storedValue ? JSON.parse(storedValue) : [];
    } catch {
      return [];
    }
  });
  const [blockedConversationKeys, setBlockedConversationKeys] = useState(() => {
    const storageKey = `uytop.blockedChats.${currentUser?.id || currentUser?.phone}`;
    const storedValue = window.localStorage.getItem(storageKey);

    try {
      return storedValue ? JSON.parse(storedValue) : [];
    } catch {
      return [];
    }
  });
  const [viewDate, setViewDate] = useState("");
  const [viewTime, setViewTime] = useState("");
  const [chatActionStatus, setChatActionStatus] = useState("");
  const messageEndRef = useRef(null);
  const hiddenKeySet = useMemo(
    () => new Set(hiddenConversationKeys),
    [hiddenConversationKeys]
  );
  const blockedKeySet = useMemo(
    () => new Set(blockedConversationKeys),
    [blockedConversationKeys]
  );
  const visibleConversations = useMemo(
    () =>
      availableConversations.filter(
        (conversation) => !hiddenKeySet.has(conversation.key)
      ),
    [availableConversations, hiddenKeySet]
  );
  const activeConversation =
    visibleConversations.find((conversation) => conversation.key === selectedKey) ||
    visibleConversations[0] ||
    null;
  const activeListing = activeConversation
    ? allListings.find(
        (listing) => Number(listing.id) === Number(activeConversation.listingId)
      )
    : null;
  const isConversationBlocked = activeConversation
    ? blockedKeySet.has(activeConversation.key)
    : false;
  const filteredConversations = useMemo(() => {
    const searchValue = conversationSearch.trim().toLowerCase();

    if (!searchValue) {
      return visibleConversations;
    }

    return visibleConversations.filter((conversation) =>
      [
        conversation.otherUser.name,
        conversation.otherUser.phone,
        conversation.listingTitle,
        conversation.lastMessagePreview,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchValue)
    );
  }, [conversationSearch, visibleConversations]);
  const quickReplies = activeConversation
    ? [
        t("chat.quick1", { listing: activeConversation.listingTitle }),
        t("chat.quick2"),
        t("chat.quick3"),
      ]
    : [];

  useEffect(() => {
    const storageKey = `uytop.hiddenChats.${currentUser?.id || currentUser?.phone}`;
    window.localStorage.setItem(storageKey, JSON.stringify(hiddenConversationKeys));
  }, [currentUser?.id, currentUser?.phone, hiddenConversationKeys]);

  useEffect(() => {
    const storageKey = `uytop.blockedChats.${currentUser?.id || currentUser?.phone}`;
    window.localStorage.setItem(storageKey, JSON.stringify(blockedConversationKeys));
  }, [blockedConversationKeys, currentUser?.id, currentUser?.phone]);

  useEffect(() => {
    if (!listingConversationKey) {
      return;
    }

    setHiddenConversationKeys((current) =>
      current.filter((key) => key !== listingConversationKey)
    );
  }, [listingConversationKey]);

  useEffect(() => {
    if (visibleConversations.length === 0) {
      return;
    }

    const queryConversation = visibleConversations.find(
      (conversation) => conversation.key === chatKeyFromUrl
    );
    const listingConversation = visibleConversations.find(
      (conversation) => conversation.key === listingConversationKey
    );
    const requestedConversation = queryConversation || listingConversation;

    if (requestedConversation && selectedKey !== requestedConversation.key) {
      setSelectedKey(requestedConversation.key);
      return;
    }

    if (!visibleConversations.some((conversation) => conversation.key === selectedKey)) {
      setSelectedKey(visibleConversations[0].key);
    }
  }, [chatKeyFromUrl, listingConversationKey, selectedKey, visibleConversations]);

  useEffect(() => {
    if (activeConversation?.unreadCount > 0) {
      markConversationRead(activeConversation.key);
    }
  }, [activeConversation, markConversationRead]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeConversation?.key, activeConversation?.messages.length]);

  function selectConversation(key) {
    setSelectedKey(key);
    setSearchParams({ chat: key });
    setDraft("");
    setAttachmentFile(null);
    setAttachmentImage("");
    setError("");
    setChatActionStatus("");
  }

  function hideConversation() {
    if (!activeConversation) {
      return;
    }

    setHiddenConversationKeys((current) =>
      current.includes(activeConversation.key)
        ? current
        : [...current, activeConversation.key]
    );
    setDraft("");
    setAttachmentFile(null);
    setAttachmentImage("");
    setError("");
  }

  function scheduleViewingMessage() {
    if (!viewDate || !viewTime) {
      setError(t("chat.validation.schedule"));
      return;
    }

    const dateLabel = new Intl.DateTimeFormat(localeByLanguage[language] || "uz-UZ", {
      day: "numeric",
      month: "long",
      weekday: "short",
    }).format(new Date(`${viewDate}T${viewTime}`));
    const text = t("chat.scheduleMessage", {
      date: dateLabel,
      time: viewTime,
    });

    addQuickReply(text);
  }

  function toggleConversationBlock() {
    if (!activeConversation) {
      return;
    }

    setBlockedConversationKeys((current) =>
      current.includes(activeConversation.key)
        ? current.filter((key) => key !== activeConversation.key)
        : [...current, activeConversation.key]
    );
    setChatActionStatus(
      isConversationBlocked
        ? t("chat.unblockedStatus")
        : t("chat.blockedStatus")
    );
  }

  async function reportActiveConversation() {
    if (!activeListing || !reportListing) {
      return;
    }

    const isReported = await reportListing(
      activeListing,
      t("chat.reportReason")
    );

    if (isReported) {
      setChatActionStatus(t("chat.reportedStatus"));
    }
  }

  function addQuickReply(text) {
    setDraft((current) => (current.trim() ? `${current.trim()}\n${text}` : text));
    setError("");
  }

  function handleAttachmentChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentFile(file);
      setAttachmentImage(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  async function submitMessage(event) {
    event.preventDefault();
    const body = draft.trim();

    if (!body && !attachmentImage) {
      setError(t("chat.validation.message"));
      return;
    }

    setIsSending(true);
    const savedMessage = await sendChatMessage(
      activeConversation,
      body,
      attachmentImage
        ? {
            file: attachmentFile,
            src: attachmentImage,
          }
        : ""
    );

    if (!savedMessage) {
      setError(t("chat.validation.send"));
      setIsSending(false);
      return;
    }

    setDraft("");
    setAttachmentFile(null);
    setAttachmentImage("");
    setError("");
    setSearchParams({ chat: activeConversation.key });
    setIsSending(false);
  }

  const isBlocked = currentUser?.accountStatus === "blocked" || isConversationBlocked;

  return (
    <section className="page-stack">
      <PageIntro
        kicker={t("chat.introKicker")}
        title={t("chat.introTitle")}
        text={t("chat.introText")}
      />

      {visibleConversations.length > 0 ? (
        <div className="chat-shell">
          <aside className="chat-list-panel">
            <div className="chat-panel-head">
              <strong>{t("chat.windowTitle")}</strong>
              <span>{visibleConversations.length}</span>
            </div>
            <label className="chat-search">
              <FiSearch aria-hidden="true" />
              <input
                value={conversationSearch}
                onChange={(event) => setConversationSearch(event.target.value)}
                placeholder={t("chat.searchPlaceholder")}
              />
            </label>
            <div className="chat-list">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <button
                    className={`chat-list-item ${
                      activeConversation?.key === conversation.key ? "active" : ""
                    } ${conversation.unreadCount > 0 ? "unread" : ""}`}
                    key={conversation.key}
                    onClick={() => selectConversation(conversation.key)}
                    type="button"
                  >
                    <img
                      alt={conversation.listingTitle}
                      decoding="async"
                      loading="lazy"
                      src={conversation.listingImage}
                    />
                    <span>
                      <strong>{conversation.otherUser.name}</strong>
                      <small>{conversation.listingTitle}</small>
                      <em>{conversation.lastMessagePreview}</em>
                    </span>
                    {conversation.unreadCount > 0 && (
                      <b>{conversation.unreadCount}</b>
                    )}
                  </button>
                ))
              ) : (
                <p className="chat-list-empty">{t("chat.emptySearch")}</p>
              )}
            </div>
          </aside>

          <div className="chat-window">
            <div className="chat-window-head">
              <div className="agent-row">
                <span className="agent-avatar">
                  <FiUser aria-hidden="true" />
                </span>
                <div>
                  <strong>{activeConversation.otherUser.name}</strong>
                  <small>{activeConversation.otherUser.phone}</small>
                </div>
              </div>
              <div className="chat-window-actions">
                <a href={`tel:${activeConversation.otherUser.phone}`}>
                  <FiPhone aria-hidden="true" />
                  {t("chat.call")}
                </a>
                <Link to={`/listings/${activeConversation.listingId}`}>
                  {t("chat.listing")}
                  <FiChevronRight aria-hidden="true" />
                </Link>
                <button onClick={toggleConversationBlock} type="button">
                  <FiSlash aria-hidden="true" />
                  {isConversationBlocked ? t("chat.unblock") : t("chat.block")}
                </button>
                <button onClick={reportActiveConversation} type="button">
                  <FiAlertTriangle aria-hidden="true" />
                  {t("chat.report")}
                </button>
                <button onClick={hideConversation} type="button">
                  <FiTrash2 aria-hidden="true" />
                  {t("chat.hide")}
                </button>
              </div>
            </div>

            <div className="chat-listing-strip">
              <img
                alt={activeConversation.listingTitle}
                decoding="async"
                src={activeConversation.listingImage}
              />
              <div>
                <strong>{activeConversation.listingTitle}</strong>
                <span>{activeConversation.listingPrice}</span>
              </div>
              <em className={`status-pill status-${activeListing?.moderationStatus || "approved"}`}>
                {activeListing?.moderationStatus === "pending"
                  ? t("chat.waitingListing")
                  : activeListing?.moderationStatus === "rejected"
                    ? t("chat.rejectedListing")
                    : t("chat.activeListing")}
              </em>
            </div>

            <div className="chat-messages" aria-live="polite">
              {activeConversation.messages.length === 0 && (
                <div className="chat-empty-thread">
                  <FiMessageCircle aria-hidden="true" />
                  <strong>{t("chat.noChatTitle")}</strong>
                  <p>
                    {t("chat.emptyThreadText", {
                      listing: activeConversation.listingTitle,
                    })}
                  </p>
                </div>
              )}
              {activeConversation.messages.map((message, index) => {
                const isOwnMessage = message.senderId === currentUserId;

                return (
                  <div className="chat-message-group" key={message.id}>
                    {shouldShowDateSeparator(activeConversation.messages, index) && (
                      <span className="chat-date-separator">
                        {getDateLabel(message.createdAt, language)}
                      </span>
                    )}
                    <article
                      className={`chat-bubble ${isOwnMessage ? "own" : ""}`}
                    >
                      {message.attachmentImage && (
                        <img
                          alt={t("chat.withImage")}
                          src={message.attachmentImage}
                        />
                      )}
                      {message.body && <p>{message.body}</p>}
                      <span>
                        {message.createdAtLabel} -{" "}
                        {isOwnMessage
                          ? message.read
                            ? t("chat.read")
                            : t("chat.sent")
                          : message.read
                            ? t("chat.read")
                            : t("common.new")}
                      </span>
                    </article>
                  </div>
                );
              })}
              {draft.trim() && (
                <span className="typing-indicator">{t("chat.typing")}</span>
              )}
              <span ref={messageEndRef} />
            </div>

            <form className="chat-compose" onSubmit={submitMessage}>
              <div className="quick-reply-row" aria-label={t("chat.quickReplies")}>
                {quickReplies.map((reply) => (
                  <button
                    disabled={isBlocked || isSending}
                    key={reply}
                    onClick={() => addQuickReply(reply)}
                    type="button"
                  >
                    {reply}
                  </button>
                ))}
              </div>
              <div className="chat-schedule-row">
                <label>
                  {t("chat.date")}
                  <input
                    disabled={isBlocked || isSending}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setViewDate(event.target.value)}
                    type="date"
                    value={viewDate}
                  />
                </label>
                <label>
                  {t("chat.time")}
                  <input
                    disabled={isBlocked || isSending}
                    onChange={(event) => setViewTime(event.target.value)}
                    type="time"
                    value={viewTime}
                  />
                </label>
                <button
                  disabled={isBlocked || isSending}
                  onClick={scheduleViewingMessage}
                  type="button"
                >
                  <FiCalendar aria-hidden="true" />
                  {t("chat.schedule")}
                </button>
              </div>
              <label>
                {t("chat.message")}
                <textarea
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setError("");
                  }}
                  disabled={isBlocked || isSending}
                  placeholder={t("chat.messagePlaceholder", {
                    name: activeConversation.otherUser.name,
                  })}
                />
              </label>
              {attachmentImage && (
                <div className="chat-attachment-preview">
                  <img alt={t("chat.attachmentSelected")} src={attachmentImage} />
                  <span>{attachmentFile?.name || t("chat.attachmentSelected")}</span>
                  <button
                    onClick={() => {
                      setAttachmentFile(null);
                      setAttachmentImage("");
                    }}
                    type="button"
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </div>
              )}
              {error && <small>{error}</small>}
              {isBlocked && (
                <small>
                  {isConversationBlocked
                    ? t("chat.blocked")
                    : t("chat.blockedByProfile")}
                </small>
              )}
              {chatActionStatus && <small className="chat-action-status">{chatActionStatus}</small>}
              <label className="chat-attach-button">
                <FiImage aria-hidden="true" />
                <input
                  accept="image/*"
                  disabled={isBlocked || isSending}
                  onChange={handleAttachmentChange}
                  type="file"
                />
              </label>
              <button disabled={isBlocked || isSending} type="submit">
                <FiSend aria-hidden="true" />
                {isSending ? t("chat.sending") : t("chat.send")}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FiMessageCircle}
          title={t("chat.noChatTitle")}
          text={t("chat.noChatText")}
        />
      )}
    </section>
  );
}

export default ChatPage;
