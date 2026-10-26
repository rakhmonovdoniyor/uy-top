import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiCheckSquare,
  FiEye,
  FiHeart,
  FiMapPin,
  FiMessageCircle,
  FiSquare,
  FiStar,
} from "react-icons/fi";
import { useI18n } from "../i18n";
import { formatArea, isFeaturedListing } from "../utils/listingUtils";

function ListingCard({
  compareDisabled = false,
  isFavorite,
  isCompared = false,
  isSelected,
  listing,
  onCompare,
  onFavorite,
  onPreview,
  showStatus = false,
  stats,
}) {
  const isFeatured = isFeaturedListing(listing);
  const { t, tOption } = useI18n();

  return (
    <article className={`listing-card ${isSelected ? "selected" : ""}`}>
      <Link className="listing-image-button" to={`/listings/${listing.id}`}>
        <img
          alt={listing.title}
          decoding="async"
          loading="lazy"
          src={listing.image}
        />
        <span className="listing-type">{tOption(listing.typeLabel)}</span>
        {isFeatured && (
          <span className="listing-featured-badge">
            <FiStar aria-hidden="true" />
            Top
          </span>
        )}
      </Link>
      <div className="listing-card-body">
        <div className="listing-card-top">
          <strong>{listing.priceLabel}</strong>
          <button
            aria-label={
              isFavorite
                ? "Sevimlilardan olib tashlash"
                : "Sevimlilarga qo'shish"
            }
            className={`favorite-button ${isFavorite ? "active" : ""}`}
            onClick={() => onFavorite(listing.id)}
            type="button"
          >
            <FiHeart aria-hidden="true" />
          </button>
        </div>
        <Link
          className="listing-title-button"
          onFocus={() => onPreview?.(listing.id)}
          onMouseEnter={() => onPreview?.(listing.id)}
          to={`/listings/${listing.id}`}
        >
          {listing.title}
        </Link>
        <p>
          <FiMapPin aria-hidden="true" />
          {tOption(listing.city)}, {tOption(listing.district)}
        </p>
        <div className="listing-specs">
          <span>{t("compare.roomsValue", { count: listing.rooms })}</span>
          <span>{formatArea(listing.area)}</span>
          <span>{listing.floor}</span>
        </div>
        <div className="listing-tags">
          {listing.tags.slice(0, 2).map((tag) => (
            <span key={tag}>{tOption(tag)}</span>
          ))}
        </div>
        {stats && (
          <div className="listing-metrics">
            <span>
              <FiEye aria-hidden="true" />
              {stats.views}
            </span>
            <span>
              <FiHeart aria-hidden="true" />
              {stats.favorites}
            </span>
            <span>
              <FiMessageCircle aria-hidden="true" />
              {stats.leads}
            </span>
          </div>
        )}
        {onCompare && (
          <button
            className={`compare-toggle-button ${isCompared ? "active" : ""}`}
            disabled={compareDisabled && !isCompared}
            onClick={() => onCompare(listing.id)}
            type="button"
          >
            {isCompared ? (
              <FiCheckSquare aria-hidden="true" />
            ) : (
              <FiSquare aria-hidden="true" />
            )}
            {isCompared ? t("compare.added") : t("compare.add")}
          </button>
        )}
        <div className="listing-footer">
          {onPreview ? (
            <button
              className="preview-button"
              onClick={() => onPreview(listing.id)}
              type="button"
            >
              {t("action.preview")}
            </button>
          ) : (
            <Link className="preview-button" to={`/listings/${listing.id}`}>
              {t("action.details")}
            </Link>
          )}
          {showStatus ? (
            <span className={`status-pill status-${listing.moderationStatus}`}>
              {t(`moderation.${listing.moderationStatus}`)}
            </span>
          ) : listing.verified ? (
            <span className="verified-mini">
              <FiCheckCircle aria-hidden="true" />
              {t("common.verified")}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default ListingCard;
