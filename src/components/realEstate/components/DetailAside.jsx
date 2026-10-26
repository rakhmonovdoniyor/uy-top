import { Link } from "react-router-dom";
import {
  FiChevronRight,
  FiEye,
  FiHeart,
  FiMapPin,
  FiMessageCircle,
  FiPhone,
} from "react-icons/fi";
import ListingMap from "./ListingMap";
import { useI18n } from "../i18n";
import { formatArea, getWhatsAppLink } from "../utils/listingUtils";

function DetailAside({ listing, stats }) {
  const { t, tOption } = useI18n();
  const whatsAppText = t("detail.contactText", { title: listing.title });

  return (
    <aside className="detail-panel" aria-label={t("detail.selectedListing")}>
      <div className="detail-image-wrap">
        <img alt={listing.title} decoding="async" loading="lazy" src={listing.image} />
        <span>{tOption(listing.typeLabel)}</span>
      </div>
      <div className="detail-body">
        <span className="estate-kicker">{tOption(listing.district)}</span>
        <h3>{listing.title}</h3>
        <strong className="detail-price">{listing.priceLabel}</strong>
        <span className={`status-pill status-${listing.moderationStatus}`}>
          {t(`moderation.${listing.moderationStatus}`)}
        </span>
        {stats && (
          <div className="compact-stat-row">
            <span>
              <FiEye aria-hidden="true" />
              {stats.views} {t("listing.views")}
            </span>
            <span>
              <FiHeart aria-hidden="true" />
              {stats.favorites} {t("listing.favorites")}
            </span>
            <span>
              <FiMessageCircle aria-hidden="true" />
              {stats.leads} {t("listing.contacts")}
            </span>
          </div>
        )}
        <p>
          <FiMapPin aria-hidden="true" />
          {tOption(listing.city)}, {listing.address}
        </p>
        <div className="detail-specs">
          <span>{t("compare.roomsValue", { count: listing.rooms })}</span>
          <span>{formatArea(listing.area)}</span>
          <span>{listing.floor}</span>
          {listing.renovationCondition && (
            <span>{tOption(listing.renovationCondition)}</span>
          )}
        </div>
        <Link className="outline-action" to={`/listings/${listing.id}`}>
          {t("action.details")}
          <FiChevronRight aria-hidden="true" />
        </Link>
        <a className="phone-button" href={`tel:${listing.phone}`}>
          <FiPhone aria-hidden="true" />
          {listing.phone}
        </a>
        <a
          className="outline-action"
          href={getWhatsAppLink(listing.phone, whatsAppText)}
          rel="noreferrer"
          target="_blank"
        >
          <FiMessageCircle aria-hidden="true" />
          WhatsApp
        </a>
        <ListingMap compact listing={listing} />
      </div>
    </aside>
  );
}

export default DetailAside;
