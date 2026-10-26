import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiBell,
  FiEdit3,
  FiEye,
  FiHeart,
  FiHome,
  FiLogOut,
  FiMessageCircle,
  FiPlus,
  FiShield,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import ListingCard from "../components/ListingCard";
import MiniStat from "../components/MiniStat";
import PageIntro from "../components/PageIntro";
import { useI18n } from "../i18n";
import { getUserId } from "../utils/listingUtils";

function ProfilePage({
  allListings,
  chatConversations,
  currentUser,
  dataSource,
  favoriteIds,
  listingStatsById,
  markAllNotificationsRead,
  markNotificationRead,
  notifications,
  onDeleteListing,
  onLogout,
  onResetDemo,
  onStartPhoneVerification,
  onUpdateProfile,
  onVerifyPhoneCode,
}) {
  const { t } = useI18n();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name || "",
    phone: currentUser.phone || "",
    email: currentUser.email || "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isStartingOtp, setIsStartingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpStatus, setOtpStatus] = useState("");
  const [otpDevCode, setOtpDevCode] = useState("");

  useEffect(() => {
    setProfileForm({
      name: currentUser.name || "",
      phone: currentUser.phone || "",
      email: currentUser.email || "",
    });
  }, [currentUser.email, currentUser.name, currentUser.phone]);
  const currentUserId = getUserId(currentUser);
  const favorites = allListings.filter((listing) => favoriteIds.includes(listing.id));
  const ownedListings = allListings.filter(
    (listing) =>
      listing.ownerId === currentUserId || listing.phone === currentUser.phone
  );
  const unreadCount = chatConversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );
  const latestConversation = chatConversations[0];
  const profileListings = ownedListings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: listing.priceLabel,
      status: t(`moderation.${listing.moderationStatus}`),
      views: listingStatsById[listing.id]?.views || 0,
      leads: listingStatsById[listing.id]?.leads || 0,
  }));
  const totalViews = profileListings.reduce((total, item) => total + item.views, 0);

  function updateProfileField(name, value) {
    setProfileForm((current) => ({ ...current, [name]: value }));
    setProfileErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  async function submitProfile(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!profileForm.name.trim()) {
      nextErrors.name = t("profile.validation.name");
    }

    if (!profileForm.phone.trim() || profileForm.phone.trim() === "+998") {
      nextErrors.phone = t("profile.validation.phone");
    }

    if (profileForm.email && !profileForm.email.includes("@")) {
      nextErrors.email = t("profile.validation.email");
    }

    setProfileErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSavingProfile(true);
    const savedUser = await onUpdateProfile({
      email: profileForm.email.trim(),
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
    });

    if (savedUser) {
      setIsEditingProfile(false);
    }

    setIsSavingProfile(false);
  }

  async function startOtp() {
    setIsStartingOtp(true);
    setOtpStatus("");
    const result = await onStartPhoneVerification?.();

    if (result) {
      setOtpDevCode(result.devCode || "");
      setOtpStatus(
        result.delivery === "dev"
          ? t("profile.otpDevSent")
          : t("profile.otpSmsSent")
      );
    }

    setIsStartingOtp(false);
  }

  async function verifyOtp(event) {
    event.preventDefault();

    if (!/^\d{6}$/.test(otpCode.trim())) {
      setOtpStatus(t("profile.validation.code"));
      return;
    }

    setIsVerifyingOtp(true);
    const user = await onVerifyPhoneCode?.(otpCode.trim());

    if (user?.phoneVerified) {
      setOtpCode("");
      setOtpDevCode("");
      setOtpStatus(t("profile.otpConfirmed"));
    } else {
      setOtpStatus(t("profile.otpFailed"));
    }

    setIsVerifyingOtp(false);
  }

  async function deleteListing(listingId) {
    const shouldDelete = window.confirm(t("add.deleteConfirm"));

    if (shouldDelete) {
      await onDeleteListing(listingId);
    }
  }

  return (
    <section className="page-stack">
      <PageIntro
        kicker={t("profile.introKicker")}
        title={t("profile.introTitle")}
        text={t("profile.introText")}
      />

      <div className="profile-grid">
        <aside className="profile-card">
          <span className="agent-avatar large">
            <FiUser aria-hidden="true" />
          </span>
          <h2>{currentUser.name}</h2>
          <p>
            {currentUser.role === "admin"
              ? t("profile.adminText")
              : t("profile.activeText")}
          </p>
          <span className="status-pill">
            {currentUser.phone} - {currentUser.role}
          </span>
          <span
            className={`status-pill ${
              currentUser.phoneVerified ? "status-approved" : "status-pending"
            }`}
          >
            {currentUser.phoneVerified
              ? t("profile.phoneVerified")
              : t("profile.phoneNotVerified")}
          </span>
          {!currentUser.phoneVerified && (
            <form className="otp-panel" onSubmit={verifyOtp}>
              <button
                className="outline-action"
                disabled={isStartingOtp}
                onClick={startOtp}
                type="button"
              >
                <FiCheckCircle aria-hidden="true" />
                {isStartingOtp ? t("profile.otpSending") : t("profile.otpSend")}
              </button>
              <label>
                {t("profile.otpCode")}
                <input
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="123456"
                  value={otpCode}
                />
              </label>
              {otpDevCode && <small>{t("profile.devCode", { code: otpDevCode })}</small>}
              {otpStatus && <small>{otpStatus}</small>}
              <button disabled={isVerifyingOtp} type="submit">
                {isVerifyingOtp ? t("auth.submitting") : t("profile.otpVerify")}
              </button>
            </form>
          )}
          {currentUser.accountStatus === "blocked" && (
            <span className="status-pill status-rejected">{t("profile.accountBlocked")}</span>
          )}
          <button
            className="outline-action"
            onClick={() => setIsEditingProfile((current) => !current)}
            type="button"
          >
            {isEditingProfile ? (
              <FiX aria-hidden="true" />
            ) : (
              <FiEdit3 aria-hidden="true" />
            )}
            {isEditingProfile ? t("common.close") : t("profile.editProfile")}
          </button>
          {isEditingProfile && (
            <form className="profile-edit-form" onSubmit={submitProfile}>
              <label className={profileErrors.name ? "has-error" : ""}>
                {t("profile.name")}
                <input
                  value={profileForm.name}
                  onChange={(event) =>
                    updateProfileField("name", event.target.value)
                  }
                />
                {profileErrors.name && <small>{profileErrors.name}</small>}
              </label>
              <label className={profileErrors.phone ? "has-error" : ""}>
                {t("profile.phone")}
                <input
                  inputMode="tel"
                  value={profileForm.phone}
                  onChange={(event) =>
                    updateProfileField("phone", event.target.value)
                  }
                />
                {profileErrors.phone && <small>{profileErrors.phone}</small>}
              </label>
              <label className={profileErrors.email ? "has-error" : ""}>
                {t("profile.email")}
                <input
                  value={profileForm.email}
                  onChange={(event) =>
                    updateProfileField("email", event.target.value)
                  }
                />
                {profileErrors.email && <small>{profileErrors.email}</small>}
              </label>
              <button disabled={isSavingProfile} type="submit">
                <FiCheckCircle aria-hidden="true" />
                {isSavingProfile ? t("common.saving") : t("common.save")}
              </button>
            </form>
          )}
          <button className="outline-action" onClick={onLogout} type="button">
            <FiLogOut aria-hidden="true" />
            {t("auth.logout")}
          </button>
          {dataSource !== "api" && (
            <button className="outline-action danger-action" onClick={onResetDemo} type="button">
              <FiShield aria-hidden="true" />
              {t("profile.demoReset")}
            </button>
          )}
        </aside>

        <div className="dashboard-panel">
          <div className="mini-stat-grid">
            <MiniStat
              icon={FiHome}
              label={t("profile.listings")}
              value={profileListings.length}
            />
            <MiniStat icon={FiHeart} label={t("profile.favorites")} value={favorites.length} />
            <MiniStat
              icon={FiMessageCircle}
              label={t("profile.newMessages")}
              value={unreadCount}
            />
            <MiniStat icon={FiEye} label={t("listing.views")} value={totalViews} />
          </div>

          <div className="table-panel notification-panel">
            <div className="table-header">
              <strong>{t("profile.notifications")}</strong>
              <div className="table-header-actions">
                <span className="result-count">
                  {t("profile.count", { count: notifications.length })}
                </span>
                {notifications.some((notification) => !notification.read) && (
                  <button onClick={markAllNotificationsRead} type="button">
                    {t("profile.allRead")}
                  </button>
                )}
              </div>
            </div>
            {notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <article
                  className={notification.read ? "is-read" : ""}
                  key={notification.id}
                >
                  <FiBell aria-hidden="true" />
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.text}</p>
                    {notification.createdAtLabel && (
                      <small>{notification.createdAtLabel}</small>
                    )}
                  </div>
                  {!notification.read && notification.id && (
                    <button
                      aria-label={t("common.read")}
                      onClick={() => markNotificationRead(notification.id)}
                      type="button"
                    >
                      {t("common.read")}
                    </button>
                  )}
                </article>
              ))
            ) : (
              <p>{t("profile.noNotifications")}</p>
            )}
          </div>

          <div className="table-panel">
            <div className="table-header">
              <strong>{t("profile.listings")}</strong>
              <Link to="/add-listing">
                {t("profile.newListing")}
                <FiPlus aria-hidden="true" />
              </Link>
            </div>
            {profileListings.length > 0 ? (
              profileListings.map((item) => (
                <div className="table-row" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.price}</span>
                  <span>{item.views} {t("listing.views")}</span>
                  <span>{item.leads} {t("listing.contacts")}</span>
                  <span className="status-pill">{item.status}</span>
                  <Link className="table-edit-button" to={`/edit-listing/${item.id}`}>
                    <FiEdit3 aria-hidden="true" />
                    {t("common.edit")}
                  </Link>
                  <button
                    className="table-edit-button danger-table-button"
                    onClick={() => deleteListing(item.id)}
                    type="button"
                  >
                    <FiTrash2 aria-hidden="true" />
                    {t("common.delete")}
                  </button>
                </div>
              ))
            ) : (
              <EmptyState
                title={t("profile.emptyListingTitle")}
                text={t("profile.emptyListingText")}
              />
            )}
          </div>

          <div className="table-panel message-panel profile-chat-panel">
            <div className="table-header">
              <strong>{t("profile.chats")}</strong>
              <Link to="/chats">
                {t("profile.chatOpen")}
                <FiMessageCircle aria-hidden="true" />
              </Link>
            </div>

            {latestConversation ? (
              <div className="profile-chat-summary">
                <span className="agent-avatar">
                  <FiMessageCircle aria-hidden="true" />
                </span>
                <div>
                  <strong>
                    {unreadCount > 0
                      ? t("profile.newMessageCount", { count: unreadCount })
                      : t("profile.totalChats", { count: chatConversations.length })}
                  </strong>
                  <p>
                    {t("profile.chatLatest", {
                      name: latestConversation.otherUser.name,
                      listing: latestConversation.listingTitle,
                    })}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <span className="status-pill status-pending">{t("common.new")}</span>
                )}
              </div>
            ) : (
              <EmptyState
                icon={FiMessageCircle}
                title={t("profile.chatEmptyTitle")}
                text={t("profile.chatEmptyText")}
              />
            )}
          </div>
        </div>
      </div>

      <section className="home-section">
        <div className="section-title-row">
          <div>
            <span className="estate-kicker">{t("profile.favorites")}</span>
            <h2>{t("profile.savedListings")}</h2>
          </div>
        </div>
        <div className="featured-grid">
          {favorites.map((listing) => (
            <ListingCard
              isFavorite
              key={listing.id}
              listing={listing}
              onFavorite={() => {}}
              stats={listingStatsById[listing.id]}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

export default ProfilePage;
