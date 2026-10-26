import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiGrid,
  FiHome,
  FiList,
  FiMap,
  FiMapPin,
  FiSave,
  FiSliders,
  FiStar,
} from "react-icons/fi";
import { propertyTypes } from "../../../data/realEstateData";
import { districtOptions } from "../constants";
import DetailAside from "../components/DetailAside";
import EmptyState from "../components/EmptyState";
import ListingCard from "../components/ListingCard";
import ListingMap from "../components/ListingMap";
import PageIntro from "../components/PageIntro";
import SearchPanel from "../components/SearchPanel";
import { useListingsPageState } from "../hooks/useListingsPageState";
import { useI18n } from "../i18n";

function ListingsPage({
  applyFilters,
  allListings,
  cities,
  clearCompareListings,
  compareIds,
  currentUser,
  deleteSavedSearch,
  districts,
  favoriteIds,
  filters,
  listingStatsById,
  resetFilters,
  savedSearches,
  saveSearch,
  searchSuggestions,
  toggleCompareListing,
  toggleFavorite,
  updateFilter,
  visibleListings,
}) {
  const { t, tOption } = useI18n();
  const {
    applySavedSearch,
    compareListings,
    filteredListings,
    hasMoreListings,
    loadMoreListings,
    naturalSearchStatus,
    pageSize,
    removeSavedSearch,
    saveCurrentSearch,
    selectedListing,
    setSelectedId,
    setViewMode,
    shownListings,
    submitSearch,
    updateListingFilter,
    viewMode,
    visibleResultCount,
  } = useListingsPageState({
    allListings,
    applyFilters,
    cities,
    compareIds,
    deleteSavedSearch,
    districts,
    filters,
    saveSearch,
    t,
    updateFilter,
    visibleListings,
  });
  const cityDistricts =
    filters.city !== "all" ? districtOptions[filters.city] || [] : [];
  const availableDistricts = cityDistricts.length > 0 ? cityDistricts : districts;

  return (
    <section className="page-stack">
      <PageIntro
        kicker={t("listings.introKicker")}
        title={t("listings.introTitle")}
        text={
          currentUser?.role === "admin"
            ? t("listings.adminText")
            : t("listings.introText")
        }
      />

      <SearchPanel
        cities={cities}
        districts={availableDistricts}
        filters={filters}
        naturalSearchStatus={naturalSearchStatus}
        onSubmit={submitSearch}
        searchSuggestions={searchSuggestions}
        updateFilter={updateListingFilter}
      />

      {compareListings.length > 0 && (
        <div className="compare-strip" role="status">
          <strong>
            {t("compare.selectedCount", { count: compareListings.length })}
          </strong>
          <div className="compare-chip-list">
            {compareListings.map((listing) => (
              <span className="compare-chip" key={listing.id}>
                {listing.title}
                <button
                  aria-label={t("compare.removeListing", {
                    title: listing.title,
                  })}
                  onClick={() => toggleCompareListing(listing.id)}
                  type="button"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <div className="compare-strip-actions">
            <Link
              className={`estate-header-action ${
                compareListings.length < 2 ? "disabled" : ""
              }`}
              onClick={(event) => {
                if (compareListings.length < 2) {
                  event.preventDefault();
                }
              }}
              to="/compare"
            >
              {compareListings.length < 2 ? t("compare.needMore") : t("compare.open")}
            </Link>
            <button className="ghost-button" onClick={clearCompareListings} type="button">
              {t("compare.clear")}
            </button>
          </div>
        </div>
      )}

      <div className="section-title-row compact-row">
        <div>
          <span className="result-count">
            {t("listings.count", { count: filteredListings.length })}
          </span>
        </div>
        <div className="view-actions">
          <button
            className={viewMode === "grid" ? "active" : ""}
            onClick={() => setViewMode("grid")}
            type="button"
            aria-label="Grid ko'rinish"
          >
            <FiGrid aria-hidden="true" />
          </button>
          <button
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
            type="button"
            aria-label="List ko'rinish"
          >
            <FiList aria-hidden="true" />
          </button>
          <button
            className={viewMode === "map" ? "active" : ""}
            onClick={() => setViewMode("map")}
            type="button"
            aria-label="Xarita ko'rinish"
          >
            <FiMap aria-hidden="true" />
          </button>
          <button className="ghost-button" onClick={resetFilters} type="button">
            <FiSliders aria-hidden="true" />
            {t("action.clear")}
          </button>
          {currentUser && (
            <button className="ghost-button" onClick={saveCurrentSearch} type="button">
              <FiSave aria-hidden="true" />
              {t("action.saveSearch")}
            </button>
          )}
        </div>
      </div>

      {currentUser && savedSearches.length > 0 && (
        <div className="saved-search-strip" aria-label="Saqlangan qidiruvlar">
          <strong>{t("listings.savedSearches")}</strong>
          {savedSearches.map((search) => (
            <span key={search.id}>
              <button onClick={() => applySavedSearch(search)} type="button">
                <FiStar aria-hidden="true" />
                {search.name}
              </button>
              <button
                aria-label={`${search.name} qidiruvini o'chirish`}
                onClick={() => removeSavedSearch(search.id)}
                type="button"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="listings-layout route-listings-layout">
        <aside className="filter-rail" aria-label="Uy turi bo'yicha filter">
          <h3>{t("listings.propertyFilter")}</h3>
          <div className="property-type-list">
            <button
              className={filters.propertyType === "all" ? "active" : ""}
              onClick={() => updateFilter("propertyType", "all")}
              type="button"
            >
              <FiHome aria-hidden="true" />
              {t("common.all")}
            </button>
            {propertyTypes.map((type) => (
              <button
                className={filters.propertyType === type ? "active" : ""}
                key={type}
                onClick={() => updateFilter("propertyType", type)}
                type="button"
              >
                <FiHome aria-hidden="true" />
                {tOption(type)}
              </button>
            ))}
          </div>
          <div className="trust-box">
            <FiCheckCircle aria-hidden="true" />
            <p>{t("listings.trustText")}</p>
          </div>
        </aside>

        {viewMode === "map" ? (
          <div className="map-explorer" aria-live="polite">
            {filteredListings.length > 0 ? (
              <>
                <div className="map-explorer-frame">
                  <div className="map-cluster-summary">
                    <div>
                      <strong>
                        {t("map.resultCount", { count: filteredListings.length })}
                      </strong>
                      <span>{t("map.clusterHint")}</span>
                    </div>
                    <div className="map-marker-list">
                      {shownListings.slice(0, 8).map((listing) => (
                        <button
                          className={
                            selectedListing?.id === listing.id ? "active" : ""
                          }
                          key={listing.id}
                          onClick={() => setSelectedId(listing.id)}
                          type="button"
                        >
                          <FiMapPin aria-hidden="true" />
                          <span>
                            {tOption(listing.city)} - {listing.priceLabel}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <ListingMap listing={selectedListing} />
                  <small>
                    {selectedListing.city}, {selectedListing.district} -{" "}
                    {selectedListing.priceLabel}
                  </small>
                </div>
                <div className="map-explorer-list">
                  {shownListings.map((listing) => (
                    <ListingCard
                      compareDisabled={
                        compareIds.length >= 3 &&
                        !compareIds.includes(Number(listing.id))
                      }
                      isFavorite={favoriteIds.includes(listing.id)}
                      isCompared={compareIds.includes(Number(listing.id))}
                      isSelected={selectedListing?.id === listing.id}
                      key={listing.id}
                      listing={listing}
                      onCompare={toggleCompareListing}
                      onFavorite={toggleFavorite}
                      onPreview={setSelectedId}
                      showStatus={currentUser?.role === "admin"}
                      stats={listingStatsById[listing.id]}
                    />
                  ))}
                </div>
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        ) : (
          <div
            className={`listing-grid ${viewMode === "list" ? "listing-list" : ""}`}
            aria-live="polite"
          >
            {filteredListings.length > 0 ? (
              shownListings.map((listing) => (
                <ListingCard
                  compareDisabled={
                    compareIds.length >= 3 &&
                    !compareIds.includes(Number(listing.id))
                  }
                  isFavorite={favoriteIds.includes(listing.id)}
                  isCompared={compareIds.includes(Number(listing.id))}
                  isSelected={selectedListing?.id === listing.id}
                  key={listing.id}
                  listing={listing}
                  onCompare={toggleCompareListing}
                  onFavorite={toggleFavorite}
                  onPreview={setSelectedId}
                  showStatus={currentUser?.role === "admin"}
                  stats={listingStatsById[listing.id]}
                />
              ))
            ) : (
              <EmptyState />
            )}
          </div>
        )}

        {filteredListings.length > 0 && hasMoreListings && (
          <button
            className="load-more-button"
            onClick={loadMoreListings}
            type="button"
          >
            {t("listings.loadMore", {
              count: Math.min(
                pageSize,
                filteredListings.length - visibleResultCount
              ),
            })}
          </button>
        )}

        {selectedListing && (
          <DetailAside
            listing={selectedListing}
            stats={listingStatsById[selectedListing.id]}
          />
        )}
      </div>
    </section>
  );
}

export default ListingsPage;
