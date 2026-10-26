import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiImage,
  FiMessageCircle,
  FiShield,
  FiTrash2,
} from "react-icons/fi";
import AdminDashboardStats from "../components/AdminDashboardStats";
import AdminMainTabs from "../components/AdminMainTabs";
import AdminUsersTab from "../components/AdminUsersTab";
import EmptyState from "../components/EmptyState";
import PageIntro from "../components/PageIntro";
import { moderationFilters } from "../constants";
import { useAdminPageState } from "../hooks/useAdminPageState";
import { useI18n } from "../i18n";
import { hasLikelyLowQualityImage } from "../utils/adminPageUtils";

function AdminPage({
  adminActions,
  allListings,
  cleanupUploads,
  currentUser,
  listingReports,
  listingStatsById,
  messages,
  resolveListingReport,
  toggleListingFeatured,
  updateListingAdminNote,
  updateListingModerationStatus,
  updateUserStatus,
  users,
}) {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserKey, setSelectedUserKey] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [blockReason, setBlockReason] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState("users");
  const [actionFilter, setActionFilter] = useState("all");
  const [cleanupStatus, setCleanupStatus] = useState("");
  const {
    actionTypes,
    approvedCount,
    duplicateGroups,
    filteredAdminActions,
    filteredAdminListings,
    filteredUserRows,
    lowQualityImageCount,
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
    userCount,
    userRows,
  } = useAdminPageState({
    actionFilter,
    adminActions,
    allListings,
    listingReports,
    messages,
    selectedUserKey,
    statusFilter,
    userSearch,
    users,
  });
  const adminTabs = [
    { label: t("admin.users"), value: "users" },
    { label: t("admin.listings"), value: "listings" },
    { label: t("admin.duplicatesTab"), value: "duplicates" },
    { label: t("admin.imageQualityTab"), value: "imageQuality" },
    { label: t("admin.messages"), value: "messages" },
    { label: t("admin.reports"), value: "reports" },
    { label: t("admin.log"), value: "actions" },
  ];

  function getNoteDraft(listing) {
    return noteDrafts[listing.id] ?? listing.adminNote ?? "";
  }

  function updateNoteDraft(listingId, value) {
    setNoteDrafts((current) => ({ ...current, [listingId]: value }));
  }

  function saveAdminNote(listing) {
    updateListingAdminNote(listing.id, getNoteDraft(listing).trim());
  }

  async function runUploadCleanup() {
    setCleanupStatus(t("auth.submitting"));
    const cleanup = cleanupUploads ? await cleanupUploads() : null;

    if (!cleanup) {
      setCleanupStatus(t("admin.cleanupFailed"));
      return;
    }

    setCleanupStatus(
      t("admin.cleanupStatus", {
        deleted: cleanup.deletedCount || 0,
        kept: cleanup.keptCount || 0,
      })
    );
  }

  return (
    <section className="page-stack">
      <PageIntro
        kicker={t("admin.introKicker")}
        title={t("admin.introTitle")}
        text={t("admin.introText", { name: currentUser.name })}
      />

      <AdminDashboardStats
        approvedCount={approvedCount}
        duplicateCount={duplicateGroups.length}
        lowQualityImageCount={lowQualityImageCount}
        openReportCount={openReportCount}
        pendingCount={pendingCount}
        rejectedCount={rejectedCount}
        t={t}
        todayListingCount={todayListingCount}
        topCount={topCount}
        userCount={userCount}
      />

      <div className="admin-priority-strip" aria-label={t("admin.priorityTitle")}>
        <button
          onClick={() => {
            setActiveAdminTab("listings");
            setStatusFilter("pending");
          }}
          type="button"
        >
          <FiClock aria-hidden="true" />
          <span>{t("admin.priorityPending")}</span>
          <strong>{pendingCount}</strong>
        </button>
        <button
          onClick={() => setActiveAdminTab("reports")}
          type="button"
        >
          <FiAlertTriangle aria-hidden="true" />
          <span>{t("admin.priorityReports")}</span>
          <strong>{openReportCount}</strong>
        </button>
        <button
          onClick={() => setActiveAdminTab("imageQuality")}
          type="button"
        >
          <FiImage aria-hidden="true" />
          <span>{t("admin.priorityImages")}</span>
          <strong>{lowQualityImageCount}</strong>
        </button>
        <button
          onClick={() => setActiveAdminTab("duplicates")}
          type="button"
        >
          <FiShield aria-hidden="true" />
          <span>{t("admin.priorityDuplicates")}</span>
          <strong>{duplicateGroups.length}</strong>
        </button>
      </div>

      <AdminMainTabs
        activeAdminTab={activeAdminTab}
        adminTabs={adminTabs}
        setActiveAdminTab={setActiveAdminTab}
        t={t}
      />

      {activeAdminTab === "users" && (
        <AdminUsersTab
          blockReason={blockReason}
          filteredUserRows={filteredUserRows}
          selectedUser={selectedUser}
          selectedUserListings={selectedUserListings}
          selectedUserMessages={selectedUserMessages}
          setBlockReason={setBlockReason}
          setSelectedUserKey={setSelectedUserKey}
          setUserSearch={setUserSearch}
          t={t}
          updateUserStatus={updateUserStatus}
          userRows={userRows}
          userSearch={userSearch}
        />
      )}

      {activeAdminTab === "listings" && (
      <div className="admin-table">
        <div className="admin-table-head">
          <strong>{t("admin.listingControl")}</strong>
          <div className="admin-filter-tabs" aria-label={t("admin.statusFilter")}>
            {moderationFilters.map((item) => (
              <button
                className={statusFilter === item.value ? "active" : ""}
                key={item.value}
                onClick={() => setStatusFilter(item.value)}
                type="button"
              >
                {t(`moderation.${item.value}`)}
              </button>
            ))}
          </div>
        </div>
        {filteredAdminListings.length > 0 ? (
          filteredAdminListings.map((item) => (
            <div className="admin-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>
                  {item.city}, {item.district} - {item.priceLabel}
                </p>
                <div className="admin-inline-stats">
                  <span>
                    <FiEye aria-hidden="true" />
                    {t("admin.views", { count: listingStatsById[item.id]?.views || 0 })}
                  </span>
                  <span>
                    <FiMessageCircle aria-hidden="true" />
                    {t("admin.leads", { count: listingStatsById[item.id]?.leads || 0 })}
                  </span>
                  {item.tags?.includes("Top e'lon") && <span>Top e'lon</span>}
                  {item.tags?.includes("Premium") && <span>Premium</span>}
                  {item.planExpiresAt && (
                    <span>
                      {t("admin.topDuration", {
                        date: new Date(item.planExpiresAt).toLocaleDateString("uz-UZ"),
                      })}
                    </span>
                  )}
                  {item.imageMetadata?.[0]?.width > 0 && (
                    <span>
                      {t("admin.imageSize", {
                        width: item.imageMetadata[0].width,
                        height: item.imageMetadata[0].height,
                      })}
                    </span>
                  )}
                  {hasLikelyLowQualityImage(item) && (
                    <span className="status-rejected">{t("admin.imageQualityFlag")}</span>
                  )}
                </div>
                {item.adminNote && (
                  <small className="admin-note-preview">
                    {t("admin.notePreview", { note: item.adminNote })}
                  </small>
                )}
              </div>
              <span className={`status-pill status-${item.moderationStatus}`}>
                {t(`moderation.${item.moderationStatus}`)}
              </span>
              <div className="admin-actions">
                <button
                  disabled={item.moderationStatus === "approved"}
                  onClick={() =>
                    updateListingModerationStatus(item.id, "approved")
                  }
                  type="button"
                >
                  {t("admin.approve")}
                </button>
                <button
                  disabled={item.moderationStatus === "rejected"}
                  onClick={() =>
                    updateListingModerationStatus(item.id, "rejected")
                  }
                  type="button"
                >
                  {t("admin.reject")}
                </button>
                <button
                  disabled={item.moderationStatus === "pending"}
                  onClick={() =>
                    updateListingModerationStatus(item.id, "pending")
                  }
                  type="button"
                >
                  {t("admin.review")}
                </button>
                <button
                  onClick={() => toggleListingFeatured(item.id, "top", 14)}
                  type="button"
                >
                  {item.tags?.includes("Top e'lon")
                    ? t("admin.topOff")
                    : t("admin.topOn")}
                </button>
                <button
                  onClick={() => toggleListingFeatured(item.id, "premium", 30)}
                  type="button"
                >
                  {item.tags?.includes("Premium")
                    ? t("admin.premiumOff")
                    : t("admin.premiumOn")}
                </button>
              </div>
              <div className="admin-note-form">
                <label>
                  {t("admin.adminNote")}
                  <textarea
                    value={getNoteDraft(item)}
                    onChange={(event) =>
                      updateNoteDraft(item.id, event.target.value)
                    }
                    placeholder={t("admin.notePlaceholder")}
                  />
                </label>
                <button onClick={() => saveAdminNote(item)} type="button">
                  {t("admin.saveNote")}
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title={t("admin.emptyListingsTitle")}
            text={t("admin.emptyListingsText")}
          />
        )}
      </div>
      )}

      {activeAdminTab === "duplicates" && (
        <div className="admin-table">
          <div className="admin-table-head">
            <strong>{t("admin.duplicates")}</strong>
            <span className="result-count">
              {t("admin.groupCount", { count: duplicateGroups.length })}
            </span>
          </div>

          {duplicateGroups.length > 0 ? (
            <div className="admin-group-list">
              {duplicateGroups.map((group) => (
                <article className="duplicate-group-card" key={group.map((item) => item.id).join("-")}>
                  <div className="admin-group-head">
                    <strong>{group[0].title}</strong>
                    <span className="status-pill status-pending">
                      {t("admin.duplicateCount", { count: group.length })}
                    </span>
                  </div>
                  <div className="admin-message-list">
                    {group.map((listing) => (
                      <div className="admin-message-row" key={listing.id}>
                        <div>
                          <strong>{listing.agent}</strong>
                          <span>{listing.phone}</span>
                        </div>
                        <p>
                          {listing.city}, {listing.district} - {listing.address}
                        </p>
                        <div>
                          <Link to={`/listings/${listing.id}`}>{listing.priceLabel}</Link>
                          <span className={`status-pill status-${listing.moderationStatus}`}>
                            {t(`moderation.${listing.moderationStatus}`)}
                          </span>
                          <button
                            onClick={() =>
                              updateListingModerationStatus(listing.id, "pending")
                            }
                            type="button"
                          >
                            {t("admin.review")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiCheckCircle}
              title={t("admin.duplicateEmptyTitle")}
              text={t("admin.duplicateEmptyText")}
            />
          )}
        </div>
      )}

      {activeAdminTab === "imageQuality" && (
        <div className="admin-table">
          <div className="admin-table-head">
            <strong>{t("admin.imageQuality")}</strong>
            <span className="result-count">
              {t("listings.count", { count: lowQualityListings.length })}
            </span>
          </div>

          {lowQualityListings.length > 0 ? (
            <div className="admin-message-list">
              {lowQualityListings.map((listing) => (
                <article className="admin-message-row" key={listing.id}>
                  <div>
                    <strong>{listing.title}</strong>
                    <span>{listing.agent}</span>
                  </div>
                  <p>
                    {listing.imageMetadata?.[0]?.width
                      ? `${listing.imageMetadata[0].width}x${listing.imageMetadata[0].height}, ${Math.round(
                          Number(listing.imageMetadata[0].size || 0) / 1024
                        )} KB`
                      : t("admin.metadataMissing")}
                  </p>
                  <div>
                    <Link to={`/listings/${listing.id}`}>{t("admin.listingOpen")}</Link>
                    <span className="status-pill status-rejected">
                      {t("admin.imageTooSmall")}
                    </span>
                    <button
                      onClick={() =>
                        updateListingAdminNote(
                          listing.id,
                          t("admin.imageQualityNote")
                        )
                      }
                      type="button"
                    >
                      {t("admin.saveNote")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiEye}
              title={t("admin.imageQualityEmptyTitle")}
              text={t("admin.imageQualityEmptyText")}
            />
          )}
        </div>
      )}

      {activeAdminTab === "messages" && (
        <div className="admin-table">
          <div className="admin-table-head">
            <strong>{t("admin.messages")}</strong>
            <span className="result-count">
              {t("admin.messageCount", { count: recentMessages.length })}
            </span>
          </div>

          {recentMessages.length > 0 ? (
            <div className="admin-message-list">
              {recentMessages.map((message) => (
                <article className="admin-message-row" key={message.id}>
                  <div>
                    <strong>{message.senderName}</strong>
                    <span>{message.senderPhone}</span>
                  </div>
                  <p>{message.body || t("chat.withImage")}</p>
                  {message.attachmentImage && (
                    <img alt={t("chat.withImage")} src={message.attachmentImage} />
                  )}
                  <div>
                    <Link to={`/listings/${message.listingId}`}>
                      {message.listingTitle}
                    </Link>
                    <span>{message.createdAtLabel}</span>
                    <span className={`status-pill ${message.read ? "" : "status-pending"}`}>
                      {message.read ? t("common.read") : t("common.new")}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t("admin.emptyMessagesTitle")}
              text={t("admin.emptyMessagesText")}
            />
          )}
        </div>
      )}

      {activeAdminTab === "reports" && (
        <div className="admin-table">
          <div className="admin-table-head">
            <strong>{t("admin.reportsTitle")}</strong>
            <span className="result-count">
              {t("admin.reportCount", { count: listingReports.length })}
            </span>
          </div>

          {listingReports.length > 0 ? (
            <div className="admin-message-list">
              {listingReports.map((report) => (
                <article className="admin-message-row" key={report.id}>
                  <div>
                    <strong>{report.reporterName}</strong>
                    <span>{report.createdAtLabel}</span>
                  </div>
                  <p>{report.reason}</p>
                  <div>
                    <Link to={`/listings/${report.listingId}`}>
                      {report.listingTitle}
                    </Link>
                    <span
                      className={`status-pill ${
                        report.status === "resolved" ? "" : "status-pending"
                      }`}
                    >
                      {report.status === "resolved"
                        ? t("admin.statusResolved")
                        : t("admin.statusOpen")}
                    </span>
                    <button
                      disabled={report.status === "resolved"}
                      onClick={() => resolveListingReport(report.id)}
                      type="button"
                    >
                      {t("admin.closeReport")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiAlertTriangle}
              title={t("admin.emptyReportsTitle")}
              text={t("admin.emptyReportsText")}
            />
          )}
          {reportHistoryGroups.length > 0 && (
            <div className="admin-report-history">
              <strong>{t("admin.reportHistory")}</strong>
              {reportHistoryGroups.map((group) => (
                <article className="admin-message-row" key={group.listingId || group.listingTitle}>
                  <div>
                    <strong>{group.listingTitle}</strong>
                    <span>
                      {t("admin.reportCount", { count: group.reports.length })}
                    </span>
                  </div>
                  <p>
                    {group.reports
                      .map((report) => `${report.createdAtLabel}: ${report.reason}`)
                      .join(" | ")}
                  </p>
                  <div>
                    <Link to={`/listings/${group.listingId}`}>
                      {t("admin.listingOpen")}
                    </Link>
                    <span className="status-pill status-pending">History</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {activeAdminTab === "actions" && (
        <div className="admin-table">
          <div className="admin-table-head">
            <strong>{t("admin.actions")}</strong>
            <div className="admin-table-actions">
              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
              >
                <option value="all">{t("admin.allLogs")}</option>
                {actionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button onClick={runUploadCleanup} type="button">
                <FiTrash2 aria-hidden="true" />
                {t("admin.uploadCleanup")}
              </button>
              <span className="result-count">
                {t("admin.actionCount", {
                  shown: filteredAdminActions.length,
                  total: adminActions.length,
                })}
              </span>
            </div>
          </div>
          {cleanupStatus && <small className="admin-cleanup-status">{cleanupStatus}</small>}

          {filteredAdminActions.length > 0 ? (
            <div className="admin-message-list">
              {filteredAdminActions.map((action) => (
                <article className="admin-message-row" key={action.id}>
                  <div>
                    <strong>{action.actor}</strong>
                    <span>{action.createdAtLabel}</span>
                  </div>
                  <p>{action.action}</p>
                  <div>
                    <span>{action.type}</span>
                    <span>{action.entityTitle || action.entityId}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FiShield}
              title={t("admin.emptyActionsTitle")}
              text={t("admin.emptyActionsText")}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default AdminPage;
