import { FiExternalLink, FiMap, FiMapPin } from "react-icons/fi";
import { useI18n } from "../i18n";

function getMapQuery(listing) {
  if (listing.latitude && listing.longitude) {
    return `${listing.latitude},${listing.longitude}`;
  }

  return `${listing.city}, ${listing.address}, Uzbekistan`;
}

function getMapLabel(listing, tOption) {
  if (listing.latitude && listing.longitude) {
    return `${listing.latitude}, ${listing.longitude}`;
  }

  return `${tOption(listing.city)}, ${listing.address}`;
}

function ListingMap({ listing, compact = false }) {
  const { t, tOption } = useI18n();
  const mapQuery = getMapQuery(listing);
  const encodedQuery = encodeURIComponent(mapQuery);
  const embedUrl = `https://www.google.com/maps?q=${encodedQuery}&output=embed`;
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return (
    <div className={`listing-map ${compact ? "compact" : ""}`}>
      <div className="map-frame">
        <iframe
          title={t("detail.mapFrameTitle", { title: listing.title })}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="map-meta">
        <span>
          <FiMapPin aria-hidden="true" />
          {getMapLabel(listing, tOption)}
        </span>
        <a href={externalUrl} rel="noreferrer" target="_blank">
          <FiMap aria-hidden="true" />
          {t("detail.openInMaps")}
          <FiExternalLink aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}

export default ListingMap;
