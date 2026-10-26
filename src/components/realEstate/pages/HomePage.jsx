import { Link, useNavigate } from "react-router-dom";
import { FiChevronRight, FiSearch, FiShield, FiUser } from "react-icons/fi";
import ListingCard from "../components/ListingCard";
import MarketStrip from "../components/MarketStrip";
import SearchPanel from "../components/SearchPanel";
import WorkflowCard from "../components/WorkflowCard";
import { useI18n } from "../i18n";

function HomePage({
  cities,
  districts,
  favoriteIds,
  filters,
  listingStatsById,
  searchSuggestions,
  toggleFavorite,
  updateFilter,
  visibleListings,
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const featuredListings = visibleListings.slice(0, 3);

  function submitSearch() {
    navigate("/listings");
  }

  return (
    <>
      <section className="estate-hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <span className="estate-kicker">{t("home.heroKicker")}</span>
          <h1 id="hero-title">{t("home.heroTitle")}</h1>
          <p>{t("home.heroText")}</p>

          <SearchPanel
            cities={cities}
            districts={districts}
            filters={filters}
            onSubmit={submitSearch}
            searchSuggestions={searchSuggestions}
            updateFilter={updateFilter}
          />
        </div>

        <div className="hero-property">
          <img
            alt="Zamonaviy uy tashqi ko'rinishi"
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=80"
          />
          <div className="hero-property-info">
            <span className="verified-pill">
              <FiShield aria-hidden="true" />
              {t("home.workflowVerifiedTitle")}
            </span>
            <h2>{t("home.propertyTitle")}</h2>
            <p>{t("home.propertyText")}</p>
            <strong>$165 000</strong>
          </div>
        </div>
      </section>

      <MarketStrip />

      <section className="home-section">
        <div className="section-title-row">
          <div>
            <span className="estate-kicker">{t("home.featuredKicker")}</span>
            <h2>{t("home.recommendations")}</h2>
          </div>
          <Link className="ghost-link" to="/listings">
            {t("action.allListings")}
            <FiChevronRight aria-hidden="true" />
          </Link>
        </div>

        <div className="featured-grid">
          {featuredListings.map((listing) => (
            <ListingCard
              isFavorite={favoriteIds.includes(listing.id)}
              key={listing.id}
              listing={listing}
              onFavorite={toggleFavorite}
              stats={listingStatsById[listing.id]}
            />
          ))}
        </div>
      </section>

      <section className="workflow-section">
        <WorkflowCard
          icon={FiSearch}
          title={t("home.workflowSearchTitle")}
          text={t("home.workflowSearchText")}
        />
        <WorkflowCard
          icon={FiShield}
          title={t("home.workflowVerifiedTitle")}
          text={t("home.workflowVerifiedText")}
        />
        <WorkflowCard
          icon={FiUser}
          title={t("home.workflowAccountTitle")}
          text={t("home.workflowAccountText")}
        />
      </section>
    </>
  );
}

export default HomePage;
