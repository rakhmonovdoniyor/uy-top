import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiEdit3,
  FiDollarSign,
  FiEye,
  FiHeart,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
  FiSend,
  FiStar,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiX,
} from "react-icons/fi";
import ListingCard from "../components/ListingCard";
import ListingMap from "../components/ListingMap";
import { reportReasons } from "../constants";
import { useListingGallery } from "../hooks/useListingGallery";
import { useListingReport } from "../hooks/useListingReport";
import { useMortgageCalculator } from "../hooks/useMortgageCalculator";
import { useI18n } from "../i18n";
import {
  canManageListing,
  canViewListing,
  formatArea,
  getListingOwnerId,
  getTelegramShareLink,
  getWhatsAppLink,
  normalizePhoneDigits,
} from "../utils/listingUtils";
import {
  formatHistoryDate,
  formatUsd,
  getPriceHistory,
  getPriceTrend,
} from "../utils/listingDetailUtils";
import NotFoundPage from "./NotFoundPage";

function ListingDetailPage({
  allListings,
  currentUser,
  favoriteIds,
  listingStatsById,
  reportListing,
  trackListingLead,
  trackListingView,
  toggleFavorite,
}) {
  const { listingId } = useParams();
  const { language, t, tOption } = useI18n();
  const listing = allListings.find((item) => item.id === Number(listingId));
  const relatedListings = useMemo(
    () =>
      listing
        ? allListings
            .filter(
              (item) =>
                item.id !== Number(listingId) &&
                canViewListing(item, currentUser)
            )
            .map((item) => ({
              item,
              score:
                Number(item.city === listing.city) * 4 +
                Number(item.propertyType === listing.propertyType) * 3 +
                Number(item.dealType === listing.dealType) * 2 +
                Number(
                  Math.abs(Number(item.rooms) - Number(listing.rooms)) <= 1
                ) +
                Number(
                  Math.abs(Number(item.price) - Number(listing.price)) <=
                    Number(listing.price) * 0.18
                ),
            }))
            .sort((first, second) => second.score - first.score)
            .map(({ item }) => item)
            .slice(0, 3)
        : [],
    [allListings, currentUser, listing, listingId]
  );
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const {
    activeImageIndex,
    closeGallery,
    galleryItems,
    isGalleryOpen,
    mainImage,
    openGallery,
    setActiveImage,
    showGalleryImage,
  } = useListingGallery({
    listing,
    relatedListings,
  });
  const {
    mortgageForm,
    mortgageSummary,
    updateMortgageField,
  } = useMortgageCalculator(listing?.price || 0);
  const {
    reportReason,
    reportStatus,
    setReportReason,
    submitReport,
  } = useListingReport({
    listing,
    reportListing,
    t,
  });
  const priceHistory = useMemo(() => getPriceHistory(listing), [listing]);
  const priceTrend = useMemo(() => getPriceTrend(priceHistory), [priceHistory]);

  useEffect(() => {
    if (canViewListing(listing, currentUser)) {
      trackListingView?.(listing.id);
    }
  }, [currentUser, listing, trackListingView]);

  if (!canViewListing(listing, currentUser)) {
    return <NotFoundPage />;
  }

  const isFavorite = favoriteIds.includes(listing.id);
  const isBlocked = currentUser?.accountStatus === "blocked";
  const canEditListing = canManageListing(listing, currentUser);
  const agentListings = allListings.filter(
    (item) =>
      item.id !== listing.id &&
      (item.ownerId === listing.ownerId || item.phone === listing.phone)
  );
  const stats = listingStatsById[listing.id] || {
    favorites: 0,
    leads: 0,
    views: 0,
  };
  const listingUrl =
    typeof window === "undefined" ? "" : window.location.href;
  const contactText = t("detail.contactText", { title: listing.title });
  const chatLink = `/chats?listing=${listing.id}`;
  const agentKey = encodeURIComponent(
    getListingOwnerId(listing) || normalizePhoneDigits(listing.phone) || listing.agent
  );
  const detailFeatureItems = [
    listing.renovationCondition,
    listing.documentType,
    listing.furnished ? t("add.furnished") : "",
    ...(listing.amenities || []),
    ...(listing.utilities || []),
    ...listing.tags,
  ].filter(Boolean);

  function trackLeadAction() {
    trackListingLead?.(listing.id);
  }

  return (
    <section className="page-stack">
      <Link className="back-link" to="/listings">
        <FiArrowLeft aria-hidden="true" />
        {t("detail.backToListings")}
      </Link>

      <div className="detail-page-grid">
        <div className="detail-page-main">
          <div className="gallery-panel">
            <button
              className="gallery-main-button"
              onClick={() => openGallery(mainImage)}
              type="button"
            >
              <img alt={listing.title} src={mainImage} />
            </button>
            <div className="gallery-thumbs">
              {galleryItems.map((item) => (
                <button
                  aria-label={t("detail.viewImage", { title: item.title })}
                  className={`gallery-thumb-button ${
                    mainImage === item.image ? "active" : ""
                  }`}
                  key={item.id}
                  onClick={() => setActiveImage(item.image)}
                  type="button"
                >
                  <img
                    alt={item.title}
                    decoding="async"
                    loading="lazy"
                    src={item.image}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="content-panel">
            <div className="detail-heading">
              <div>
                <span className="estate-kicker">{tOption(listing.typeLabel)}</span>
                <h1>{listing.title}</h1>
              </div>
              <button
                className={`favorite-button large ${isFavorite ? "active" : ""}`}
                onClick={() => toggleFavorite(listing.id)}
                type="button"
              >
                <FiHeart aria-hidden="true" />
              </button>
            </div>

            <p className="detail-address">
              <FiMapPin aria-hidden="true" />
              {tOption(listing.city)}, {listing.address}
            </p>

            <div className="detail-specs expanded">
              <span>{t("compare.roomsValue", { count: listing.rooms })}</span>
              <span>{formatArea(listing.area)}</span>
              <span>{listing.floor}</span>
              <span>{tOption(listing.propertyType)}</span>
              {listing.renovationCondition && (
                <span>{tOption(listing.renovationCondition)}</span>
              )}
              {listing.documentType && <span>{tOption(listing.documentType)}</span>}
              {listing.furnished && <span>{t("add.furnished")}</span>}
            </div>

            <div className="stat-strip">
              <span>
                <FiEye aria-hidden="true" />
                <strong>{stats.views}</strong>
                {t("listing.views")}
              </span>
              <span>
                <FiHeart aria-hidden="true" />
                <strong>{stats.favorites}</strong>
                {t("listing.favorites")}
              </span>
              <span>
                <FiMessageCircle aria-hidden="true" />
                <strong>{stats.leads}</strong>
                {t("listing.contacts")}
              </span>
            </div>

            <div className="description-block">
              <h2>{t("detail.description")}</h2>
              <p>
                {listing.description ||
                  t("detail.fallbackDescription", {
                    district: tOption(listing.district),
                  })}
              </p>
              {listing.adminNote && currentUser?.role === "admin" && (
                <p className="admin-visible-note">
                  {t("admin.notePreview", { note: listing.adminNote })}
                </p>
              )}
            </div>

            <div className="amenity-grid">
              {detailFeatureItems.map((item) => (
                <span key={item}>
                  <FiCheckCircle aria-hidden="true" />
                  {tOption(item)}
                </span>
              ))}
            </div>
          </div>

          <div className="content-panel location-panel">
            <div className="section-title-row compact-row">
              <div>
                <span className="estate-kicker">{t("detail.location")}</span>
                <h2>{t("detail.mapTitle")}</h2>
              </div>
            </div>
            <ListingMap listing={listing} />
          </div>
        </div>

        <aside className="contact-card">
          <strong className="detail-price">{listing.priceLabel}</strong>
          {(listing.negotiable || listing.tags.includes("Kelishiladi")) && (
            <span className="status-pill status-pending">
              {t("detail.negotiable")}
            </span>
          )}
          {priceTrend && (
            <div className={`price-history-card ${priceTrend.direction}`}>
              <div className="price-history-head">
                <span className="agent-avatar">
                  {priceTrend.direction === "down" ? (
                    <FiTrendingDown aria-hidden="true" />
                  ) : (
                    <FiTrendingUp aria-hidden="true" />
                  )}
                </span>
                <div>
                  <strong>{t("priceHistory.title")}</strong>
                  <small>
                    {priceTrend.direction === "down"
                      ? t("priceHistory.dropped", {
                          percent: priceTrend.percent.toFixed(0),
                        })
                      : t("priceHistory.raised", {
                          percent: priceTrend.percent.toFixed(0),
                        })}
                  </small>
                </div>
              </div>
              <div className="price-history-change">
                <span>{priceTrend.previous.priceLabel}</span>
                <strong>{priceTrend.current.priceLabel}</strong>
              </div>
              <div className="price-history-list">
                {priceHistory.slice(-3).map((item) => (
                  <span key={`${item.changedAt}-${item.price}`}>
                    {formatHistoryDate(item.changedAt, language)}
                    <strong>{item.priceLabel}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          {listing.dealType === "sale" && (
            <div className="mortgage-card">
              <div className="mortgage-card-head">
                <span className="agent-avatar">
                  <FiDollarSign aria-hidden="true" />
                </span>
                <div>
                  <strong>{t("mortgage.title")}</strong>
                  <small>{t("mortgage.text")}</small>
                </div>
              </div>
              <strong className="mortgage-payment">
                {formatUsd(mortgageSummary.monthlyPayment)}
                <span>{t("mortgage.perMonth")}</span>
              </strong>
              <div className="mortgage-input-grid">
                <label>
                  {t("mortgage.downPayment")}
                  <input
                    inputMode="numeric"
                    min="0"
                    max="95"
                    onChange={(event) =>
                      updateMortgageField("downPaymentPercent", event.target.value)
                    }
                    type="number"
                    value={mortgageForm.downPaymentPercent}
                  />
                </label>
                <label>
                  {t("mortgage.years")}
                  <input
                    inputMode="numeric"
                    min="1"
                    max="30"
                    onChange={(event) =>
                      updateMortgageField("years", event.target.value)
                    }
                    type="number"
                    value={mortgageForm.years}
                  />
                </label>
                <label>
                  {t("mortgage.rate")}
                  <input
                    inputMode="decimal"
                    min="0"
                    max="60"
                    onChange={(event) =>
                      updateMortgageField("annualRate", event.target.value)
                    }
                    step="0.1"
                    type="number"
                    value={mortgageForm.annualRate}
                  />
                </label>
              </div>
              <div className="mortgage-summary-grid">
                <span>
                  {t("mortgage.loanAmount")}
                  <strong>{formatUsd(mortgageSummary.loanAmount)}</strong>
                </span>
                <span>
                  {t("mortgage.downPaymentAmount")}
                  <strong>{formatUsd(mortgageSummary.downPayment)}</strong>
                </span>
              </div>
            </div>
          )}
          <span className={`status-pill status-${listing.moderationStatus}`}>
            {t(`moderation.${listing.moderationStatus}`)}
          </span>
          {listing.tags.includes("Top e'lon") || listing.tags.includes("Premium") ? (
            <span className="status-pill status-pending">
              <FiStar aria-hidden="true" />
              {t("detail.topPlacement")}
            </span>
          ) : null}
          <div className="agent-row">
            <span className="agent-avatar">
              <FiUser aria-hidden="true" />
            </span>
            <div>
              <strong>{listing.agent}</strong>
              <small>
                {listing.verified ? t("agent.verifiedAgent") : t("agent.owner")}
              </small>
            </div>
          </div>
          <div className="agent-mini-profile">
            <span>{t("agent.listingCount", { count: agentListings.length + 1 })}</span>
            <span>{tOption(listing.city)}</span>
            <span>
              {listing.verified ? t("agent.phoneVerified") : t("agent.phoneContact")}
            </span>
          </div>
          <Link className="outline-action" to={`/agents/${agentKey}`}>
            <FiUser aria-hidden="true" />
            {t("detail.agentProfile")}
          </Link>
          {canEditListing && (
            <Link className="outline-action" to={`/edit-listing/${listing.id}`}>
              <FiEdit3 aria-hidden="true" />
              {t("detail.editListing")}
            </Link>
          )}
          {isPhoneVisible ? (
            <a className="phone-button" href={`tel:${listing.phone}`}>
              <FiPhone aria-hidden="true" />
              {listing.phone}
            </a>
          ) : (
            <button
              className="phone-button"
              onClick={() => {
                trackLeadAction();
                setIsPhoneVisible(true);
              }}
              type="button"
            >
              <FiPhone aria-hidden="true" />
              {t("detail.phone")}
            </button>
          )}
          <div className="contact-action-grid">
            <a
              className="outline-action"
              href={getWhatsAppLink(listing.phone, contactText)}
              onClick={trackLeadAction}
              rel="noreferrer"
              target="_blank"
            >
              <FiMessageCircle aria-hidden="true" />
              WhatsApp
            </a>
            <a
              className="outline-action"
              href={getTelegramShareLink(listing.title, listingUrl)}
              rel="noreferrer"
              target="_blank"
            >
              <FiSend aria-hidden="true" />
              Telegram
            </a>
          </div>
          {currentUser && !isBlocked ? (
            <Link
              className="outline-action"
              onClick={trackLeadAction}
              to={chatLink}
            >
              <FiMessageCircle aria-hidden="true" />
              {t("detail.message")}
            </Link>
          ) : currentUser && isBlocked ? (
            <span className="blocked-contact-note">
              {t("detail.blockedMessage")}
            </span>
          ) : (
            <Link
              className="outline-action"
              state={{ returnTo: chatLink }}
              to="/login"
            >
              <FiMessageCircle aria-hidden="true" />
              {t("detail.message")}
            </Link>
          )}
          <ListingMap compact listing={listing} />
          <div className="report-box">
            <strong>{t("detail.report")}</strong>
            <select
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value)}
            >
              {reportReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {t(`reportReason.${reportReasons.indexOf(reason)}`)}
                </option>
              ))}
            </select>
            <button onClick={submitReport} type="button">
              {t("detail.reportButton")}
            </button>
            {reportStatus && <small>{reportStatus}</small>}
          </div>
        </aside>
      </div>

      <div className="mobile-contact-bar">
        <a href={`tel:${listing.phone}`} onClick={trackLeadAction}>
          <FiPhone aria-hidden="true" />
          {t("detail.call")}
        </a>
        <a
          href={getWhatsAppLink(listing.phone, contactText)}
          onClick={trackLeadAction}
          rel="noreferrer"
          target="_blank"
        >
          <FiMessageCircle aria-hidden="true" />
          WhatsApp
        </a>
        {currentUser && !isBlocked ? (
          <Link onClick={trackLeadAction} to={chatLink}>
            <FiSend aria-hidden="true" />
            {t("detail.chat")}
          </Link>
        ) : (
          <Link state={{ returnTo: chatLink }} to="/login">
            <FiSend aria-hidden="true" />
            {t("detail.chat")}
          </Link>
        )}
      </div>

      {isGalleryOpen && (
        <div
          className="modal-backdrop gallery-backdrop"
          onMouseDown={closeGallery}
          role="presentation"
        >
          <div
            className="gallery-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="gallery-modal-head">
              <div>
                <strong>{listing.title}</strong>
                <span>
                  {activeImageIndex + 1} / {galleryItems.length}
                </span>
              </div>
              <button
                aria-label={t("detail.closeGallery")}
                onClick={closeGallery}
                type="button"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
            <div className="gallery-modal-body">
              {galleryItems.length > 1 && (
                <button
                  aria-label={t("detail.previousImage")}
                  className="gallery-nav-button previous"
                  onClick={() => showGalleryImage(-1)}
                  type="button"
                >
                  <FiChevronLeft aria-hidden="true" />
                </button>
              )}
              <img alt={listing.title} src={mainImage} />
              {galleryItems.length > 1 && (
                <button
                  aria-label={t("detail.nextImage")}
                  className="gallery-nav-button next"
                  onClick={() => showGalleryImage(1)}
                  type="button"
                >
                  <FiChevronRight aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="gallery-modal-thumbs">
              {galleryItems.map((item) => (
                <button
                  className={mainImage === item.image ? "active" : ""}
                  key={item.id}
                  onClick={() => setActiveImage(item.image)}
                  type="button"
                >
                  <img alt={item.title} src={item.image} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="home-section">
        <div className="section-title-row">
          <div>
            <span className="estate-kicker">{t("detail.similarKicker")}</span>
            <h2>{t("detail.similarTitle")}</h2>
          </div>
        </div>
        <div className="featured-grid">
          {relatedListings.map((item) => (
            <ListingCard
              isFavorite={favoriteIds.includes(item.id)}
              key={item.id}
              listing={item}
              onFavorite={toggleFavorite}
              stats={listingStatsById[item.id]}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

export default ListingDetailPage;
