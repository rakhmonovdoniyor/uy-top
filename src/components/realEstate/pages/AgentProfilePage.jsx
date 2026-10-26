import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiHome,
  FiMessageCircle,
  FiPhone,
  FiStar,
  FiUser,
} from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import ListingCard from "../components/ListingCard";
import MiniStat from "../components/MiniStat";
import PageIntro from "../components/PageIntro";
import { useI18n } from "../i18n";
import {
  getListingOwnerId,
  normalizePhoneDigits,
} from "../utils/listingUtils";

function getAgentKey(listing = {}) {
  return (
    getListingOwnerId(listing) ||
    normalizePhoneDigits(listing.phone) ||
    listing.agent ||
    ""
  );
}

function AgentProfilePage({
  allListings,
  favoriteIds,
  listingStatsById,
  messages,
  toggleFavorite,
  users,
  visibleListings,
}) {
  const { t } = useI18n();
  const { agentKey = "" } = useParams();
  const decodedKey = decodeURIComponent(agentKey).toLowerCase();
  const agentListings = visibleListings.filter((listing) => {
    const ownerKey = getAgentKey(listing).toLowerCase();
    const phoneKey = normalizePhoneDigits(listing.phone);
    const nameKey = String(listing.agent || "").toLowerCase();

    return (
      ownerKey === decodedKey ||
      phoneKey === decodedKey ||
      nameKey === decodedKey
    );
  });
  const fallbackListing =
    agentListings[0] ||
    allListings.find((listing) => getAgentKey(listing).toLowerCase() === decodedKey);
  const agentName = fallbackListing?.agent || t("agent.fallbackName");
  const agentPhone = fallbackListing?.phone || "";
  const agentUser = users?.find(
    (user) =>
      normalizePhoneDigits(user.phone) === normalizePhoneDigits(agentPhone) ||
      user.id === fallbackListing?.ownerId
  );
  const agentMessages = messages.filter((message) =>
    agentListings.some((listing) => Number(listing.id) === Number(message.listingId))
  );
  const totalViews = agentListings.reduce(
    (sum, listing) => sum + Number(listingStatsById[listing.id]?.views || 0),
    0
  );
  const agentRating = Math.min(
    5,
    4.3 + agentListings.length * 0.08 + Math.min(agentMessages.length, 10) * 0.02
  ).toFixed(1);
  const responseSpeed =
    agentMessages.length > 8
      ? t("agent.responseFast")
      : agentMessages.length > 2
        ? t("agent.responseHour")
        : t("agent.responseDay");
  const agentBio =
    agentUser?.bio ||
    t("agent.bio", { count: agentListings.length, name: agentName });

  return (
    <section className="page-stack">
      <Link className="back-link" to="/listings">
        <FiArrowLeft aria-hidden="true" />
        {t("detail.backToListings")}
      </Link>

      <PageIntro
        kicker={t("agent.profile")}
        title={agentName}
        text={t("agent.introText")}
      />

      <div className="agent-profile-panel">
        <div className="agent-row">
          <span className="agent-avatar large">
            <FiUser aria-hidden="true" />
          </span>
          <div>
            <strong>{agentName}</strong>
            <small>{agentPhone || t("agent.phoneMissing")}</small>
          </div>
        </div>
        <div className="agent-profile-summary">
          <div className="agent-badge-row">
            <span>
              <FiStar aria-hidden="true" />
              {t("agent.rating", { rating: agentRating })}
            </span>
            <span>
              <FiClock aria-hidden="true" />
              {responseSpeed}
            </span>
            <span>
              <FiCheckCircle aria-hidden="true" />
              {agentUser?.phoneVerified
                ? t("agent.phoneVerified")
                : t("agent.phoneOpen")}
            </span>
          </div>
          <p>{agentBio}</p>
        </div>
        <div className="mini-stat-grid">
          <MiniStat icon={FiHome} label={t("common.listings")} value={agentListings.length} />
          <MiniStat icon={FiMessageCircle} label={t("common.chats")} value={agentMessages.length} />
          <MiniStat icon={FiCheckCircle} label={t("agent.views")} value={totalViews} />
        </div>
        {agentPhone && (
          <a className="phone-button" href={`tel:${agentPhone}`}>
            <FiPhone aria-hidden="true" />
            {t("agent.call")}
          </a>
        )}
      </div>

      <section className="home-section">
        <div className="section-title-row">
          <div>
            <span className="estate-kicker">{t("agent.listingsKicker")}</span>
            <h2>{t("listings.count", { count: agentListings.length })}</h2>
          </div>
        </div>
        {agentListings.length > 0 ? (
          <div className="featured-grid">
            {agentListings.map((listing) => (
              <ListingCard
                isFavorite={favoriteIds.includes(listing.id)}
                key={listing.id}
                listing={listing}
                onFavorite={toggleFavorite}
                stats={listingStatsById[listing.id]}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("agent.emptyTitle")}
            text={t("agent.emptyText")}
          />
        )}
      </section>
    </section>
  );
}

export default AgentProfilePage;
