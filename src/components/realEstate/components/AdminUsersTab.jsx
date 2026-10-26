import { Link } from "react-router-dom";
import {
  FiClock,
  FiHome,
  FiMail,
  FiMessageCircle,
  FiPhone,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import EmptyState from "./EmptyState";

function AdminUsersTab({
  blockReason,
  filteredUserRows,
  selectedUser,
  selectedUserListings,
  selectedUserMessages,
  setBlockReason,
  setSelectedUserKey,
  setUserSearch,
  t,
  updateUserStatus,
  userRows,
  userSearch,
}) {
  return (
    <div className="admin-table">
      <div className="admin-table-head">
        <strong>{t("admin.users")}</strong>
        <label className="admin-search">
          <FiSearch aria-hidden="true" />
          <input
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder={t("admin.userSearch")}
            value={userSearch}
          />
        </label>
        <span className="result-count">
          {t("admin.accountCount", {
            shown: filteredUserRows.length,
            total: userRows.length,
          })}
        </span>
      </div>

      {filteredUserRows.length > 0 ? (
        <div className="admin-user-list">
          {filteredUserRows.map((user) => (
            <button
              className={`admin-user-row ${
                selectedUser?.key === user.key ? "active" : ""
              }`}
              key={user.key}
              onClick={() => setSelectedUserKey(user.key)}
              type="button"
            >
              <span className="agent-avatar">
                <FiUsers aria-hidden="true" />
              </span>
              <div className="admin-user-main">
                <strong>{user.name}</strong>
                <div className="admin-user-contact">
                  <span>
                    <FiPhone aria-hidden="true" />
                    {user.phone}
                  </span>
                  <span>
                    <FiMail aria-hidden="true" />
                    {user.email || t("admin.noEmail")}
                  </span>
                </div>
              </div>
              <span
                className={`status-pill ${
                  user.role === "admin" ? "status-pending" : ""
                }`}
              >
                {user.role === "admin"
                  ? t("common.admin")
                  : user.accountStatus === "blocked"
                    ? t("common.blocked")
                    : t("common.user")}
              </span>
              <div className="admin-user-stats">
                <span>{t("listings.count", { count: user.listingsCount })}</span>
                <span>
                  {user.messagesCount} {t("common.chats").toLowerCase()}
                </span>
                {user.unreadMessagesCount > 0 && (
                  <span>
                    {user.unreadMessagesCount} {t("common.new")}
                  </span>
                )}
                <span>{user.lastLoginAtLabel || t("admin.justNow")}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          text={t("admin.emptyUsersText")}
          title={t("admin.emptyUsersTitle")}
        />
      )}

      {selectedUser && (
        <div className="admin-user-detail">
          <div className="admin-user-detail-head">
            <div>
              <span className="estate-kicker">{t("admin.selectedUser")}</span>
              <h2>{selectedUser.name}</h2>
              <p>
                {selectedUser.phone} -{" "}
                {selectedUser.email || t("admin.noEmail")}
              </p>
            </div>
            <span
              className={`status-pill ${
                selectedUser.role === "admin" ? "status-pending" : ""
              }`}
            >
              {selectedUser.role === "admin"
                ? t("common.admin")
                : selectedUser.accountStatus === "blocked"
                  ? t("common.blocked")
                  : t("common.user")}
            </span>
            {selectedUser.blockReason && (
              <p className="admin-note-preview">
                {t("admin.blockReason")}: {selectedUser.blockReason}
              </p>
            )}
          </div>

          <div className="admin-detail-grid">
            <span>
              <FiHome aria-hidden="true" />
              <strong>{selectedUserListings.length}</strong>
              {t("common.listings")}
            </span>
            <span>
              <FiMessageCircle aria-hidden="true" />
              <strong>{selectedUserMessages.length}</strong>
              {t("common.chats")}
            </span>
            <span>
              <FiClock aria-hidden="true" />
              <strong>{selectedUser.lastLoginAtLabel || t("admin.justNow")}</strong>
              {t("auth.login")}
            </span>
          </div>

          <div className="admin-user-detail-columns">
            <div className="admin-compact-list">
              <strong>{t("admin.userListings")}</strong>
              {selectedUserListings.length > 0 ? (
                selectedUserListings.slice(0, 4).map((listing) => (
                  <Link key={listing.id} to={`/listings/${listing.id}`}>
                    <span>{listing.title}</span>
                    <small>{listing.priceLabel}</small>
                  </Link>
                ))
              ) : (
                <p>{t("admin.noListings")}</p>
              )}
            </div>

            <div className="admin-compact-list">
              <strong>{t("admin.recentMessages")}</strong>
              {selectedUserMessages.length > 0 ? (
                selectedUserMessages.slice(0, 4).map((message) => {
                  const isSentByUser = message.senderId === selectedUser.id;

                  return (
                    <article className="admin-message-preview" key={message.id}>
                      <span>
                        {isSentByUser ? t("admin.sent") : t("admin.received")} -{" "}
                        {message.listingTitle}
                      </span>
                      <p>{message.body}</p>
                      <small>{message.createdAtLabel}</small>
                    </article>
                  );
                })
              ) : (
                <p>{t("admin.noMessages")}</p>
              )}
            </div>
          </div>
          {selectedUser.role !== "admin" && (
            <div className="admin-user-control-row">
              <input
                onChange={(event) => setBlockReason(event.target.value)}
                placeholder={t("admin.blockReason")}
                value={blockReason}
              />
              <button
                disabled={selectedUser.accountStatus === "blocked"}
                onClick={() =>
                  updateUserStatus(selectedUser.id, "blocked", blockReason)
                }
                type="button"
              >
                {t("admin.blockUser")}
              </button>
              <button
                disabled={selectedUser.accountStatus !== "blocked"}
                onClick={() => {
                  setBlockReason("");
                  updateUserStatus(selectedUser.id, "active");
                }}
                type="button"
              >
                {t("admin.activeUser")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminUsersTab;
