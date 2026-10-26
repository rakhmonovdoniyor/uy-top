import { useState } from "react";
import {
  FiChevronDown,
  FiDollarSign,
  FiImage,
  FiMaximize2,
  FiSearch,
  FiSliders,
  FiStar,
} from "react-icons/fi";
import { districtOptions } from "../constants";
import { useI18n } from "../i18n";

function SearchPanel({
  cities,
  districts = [],
  filters,
  naturalSearchStatus = "",
  onSubmit,
  searchSuggestions = [],
  updateFilter,
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { t, tOption } = useI18n();
  const scopedDistricts =
    filters.city !== "all" && districtOptions[filters.city]
      ? districtOptions[filters.city]
      : districts;

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <>
      <div className="intent-tabs" aria-label={t("filter.dealType")}>
        {[
          { label: t("common.all"), value: "all" },
          { label: t("common.forSale"), value: "sale" },
          { label: t("common.forRent"), value: "rent" },
        ].map((item) => (
          <button
            className={filters.dealType === item.value ? "active" : ""}
            key={item.value}
            onClick={() => updateFilter("dealType", item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        className={`search-panel ${isAdvancedOpen ? "advanced-open" : ""}`}
        onSubmit={handleSubmit}
        role="search"
      >
        <div className="search-main-row">
          <label className="search-field search-query">
            <span>{t("filter.address")}</span>
            <span className="field-control">
              <FiSearch aria-hidden="true" />
              <input
                list="listing-search-suggestions"
                value={filters.query}
                onChange={(event) => updateFilter("query", event.target.value)}
                placeholder={t("filter.naturalQueryPlaceholder")}
                type="search"
              />
              <datalist id="listing-search-suggestions">
                {searchSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </span>
          </label>

          <label className="search-field search-city">
            <span>{t("filter.city")}</span>
            <select
              value={filters.city}
              onChange={(event) => updateFilter("city", event.target.value)}
            >
              <option value="all">{t("common.allCities")}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {tOption(city)}
                </option>
              ))}
            </select>
          </label>

          <label className="search-field search-price-min">
            <span>{t("filter.priceFrom")}</span>
            <span className="field-control">
              <FiDollarSign aria-hidden="true" />
              <input
                inputMode="numeric"
                value={filters.minPrice}
                onChange={(event) => updateFilter("minPrice", event.target.value)}
                placeholder="50 000"
              />
            </span>
          </label>

          <label className="search-field search-district">
            <span>{t("filter.district")}</span>
            <select
              key={`district-${filters.city}`}
              value={filters.district}
              onChange={(event) => updateFilter("district", event.target.value)}
            >
              <option value="all">{t("common.allDistricts")}</option>
              {scopedDistricts.map((district) => (
                <option key={district} value={district}>
                  {tOption(district)}
                </option>
              ))}
            </select>
          </label>

          <label className="search-field search-price-max">
            <span>{t("filter.priceTo")}</span>
            <span className="field-control">
              <FiDollarSign aria-hidden="true" />
              <input
                inputMode="numeric"
                value={filters.maxPrice}
                onChange={(event) => updateFilter("maxPrice", event.target.value)}
                placeholder="150 000"
              />
            </span>
          </label>

          <button className="search-button" type="submit">
            <FiSearch aria-hidden="true" />
            {t("action.search")}
          </button>
        </div>

        {naturalSearchStatus && (
          <div className="natural-search-status" role="status">
            <FiSearch aria-hidden="true" />
            {naturalSearchStatus}
          </div>
        )}

        <button
          className="advanced-toggle"
          onClick={() => setIsAdvancedOpen((current) => !current)}
          type="button"
        >
          <FiSliders aria-hidden="true" />
          {t("action.advancedFilter")}
          <FiChevronDown aria-hidden="true" />
        </button>

        {isAdvancedOpen && (
          <div className="advanced-filter-grid">
            <label className="search-field search-rooms">
              <span>{t("filter.rooms")}</span>
              <select
                value={filters.rooms}
                onChange={(event) => updateFilter("rooms", event.target.value)}
              >
                <option value="all">{t("common.all")}</option>
                <option value="1">{t("filter.roomsAtLeast", { count: 1 })}</option>
                <option value="2">{t("filter.roomsAtLeast", { count: 2 })}</option>
                <option value="3">{t("filter.roomsAtLeast", { count: 3 })}</option>
                <option value="4">{t("filter.roomsAtLeast", { count: 4 })}</option>
              </select>
            </label>

            <label className="search-field search-area-min">
              <span>{t("filter.areaFrom")}</span>
              <span className="field-control">
                <FiMaximize2 aria-hidden="true" />
                <input
                  inputMode="numeric"
                  value={filters.minArea}
                  onChange={(event) => updateFilter("minArea", event.target.value)}
                  placeholder="60"
                />
              </span>
            </label>

            <label className="search-field search-area-max">
              <span>{t("filter.areaTo")}</span>
              <span className="field-control">
                <FiMaximize2 aria-hidden="true" />
                <input
                  inputMode="numeric"
                  value={filters.maxArea}
                  onChange={(event) => updateFilter("maxArea", event.target.value)}
                  placeholder="140"
                />
              </span>
            </label>

            <label className="search-field search-sort">
              <span>{t("filter.sort")}</span>
              <select
                value={filters.sortBy}
                onChange={(event) => updateFilter("sortBy", event.target.value)}
              >
                <option value="newest">{t("sort.newest")}</option>
                <option value="featured">{t("sort.featured")}</option>
                <option value="priceAsc">{t("sort.priceAsc")}</option>
                <option value="priceDesc">{t("sort.priceDesc")}</option>
                <option value="areaDesc">{t("sort.areaDesc")}</option>
                <option value="roomsDesc">{t("sort.roomsDesc")}</option>
              </select>
            </label>

            <div className="search-check-row">
              <label className="filter-check">
                <input
                  checked={Boolean(filters.imagesOnly)}
                  onChange={(event) =>
                    updateFilter("imagesOnly", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  <FiImage aria-hidden="true" />
                  {t("filter.imagesOnly")}
                </span>
              </label>
              <label className="filter-check">
                <input
                  checked={Boolean(filters.featuredOnly)}
                  onChange={(event) =>
                    updateFilter("featuredOnly", event.target.checked)
                  }
                  type="checkbox"
                />
                <span>
                  <FiStar aria-hidden="true" />
                  {t("common.featured")}
                </span>
              </label>
            </div>
          </div>
        )}
      </form>
    </>
  );
}

export default SearchPanel;
