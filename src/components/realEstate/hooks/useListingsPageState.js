import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { defaultFilters } from "../constants";
import {
  filterListings,
  parseNaturalLanguageSearch,
} from "../utils/listingUtils";

const queryFilterKeys = [
  "dealType",
  "city",
  "district",
  "propertyType",
  "rooms",
  "query",
  "minPrice",
  "maxPrice",
  "minArea",
  "maxArea",
  "sortBy",
];

const booleanFilterKeys = ["imagesOnly", "featuredOnly"];
const PAGE_SIZE = 12;

function getFiltersFromSearchParams(searchParams) {
  const nextFilters = { ...defaultFilters };

  queryFilterKeys.forEach((key) => {
    if (searchParams.has(key)) {
      nextFilters[key] = searchParams.get(key) || defaultFilters[key];
    }
  });
  booleanFilterKeys.forEach((key) => {
    if (searchParams.has(key)) {
      nextFilters[key] = searchParams.get(key) === "1";
    }
  });

  return nextFilters;
}

function getSearchParamsFromFilters(filters) {
  const searchParams = new URLSearchParams();

  queryFilterKeys.forEach((key) => {
    const value = filters[key];
    const defaultValue = defaultFilters[key];

    if (String(value || "") && String(value) !== String(defaultValue)) {
      searchParams.set(key, String(value));
    }
  });
  booleanFilterKeys.forEach((key) => {
    if (filters[key]) {
      searchParams.set(key, "1");
    }
  });

  return searchParams;
}

function areFiltersEqual(first, second) {
  return [...queryFilterKeys, ...booleanFilterKeys].every(
    (key) => String(first[key] ?? "") === String(second[key] ?? "")
  );
}

export function useListingsPageState({
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
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState("grid");
  const [selectedId, setSelectedId] = useState(visibleListings[0]?.id);
  const [visibleResultCount, setVisibleResultCount] = useState(PAGE_SIZE);
  const [naturalSearchStatus, setNaturalSearchStatus] = useState("");
  const applyFiltersRef = useRef(applyFilters);
  const filtersRef = useRef(filters);
  const isApplyingUrlFiltersRef = useRef(false);
  const searchParamString = searchParams.toString();
  const filteredListings = useMemo(
    () => filterListings(filters, visibleListings),
    [filters, visibleListings]
  );
  const shownListings = filteredListings.slice(0, visibleResultCount);
  const selectedListing =
    filteredListings.find((listing) => listing.id === selectedId) ||
    filteredListings[0] ||
    null;
  const compareListings = compareIds
    .map((id) =>
      allListings.find((listing) => Number(listing.id) === Number(id))
    )
    .filter(Boolean);
  const hasMoreListings = visibleResultCount < filteredListings.length;

  useEffect(() => {
    applyFiltersRef.current = applyFilters;
    filtersRef.current = filters;
  }, [applyFilters, filters]);

  useEffect(() => {
    const nextFilters = getFiltersFromSearchParams(
      new URLSearchParams(searchParamString)
    );

    if (!areFiltersEqual(filtersRef.current, nextFilters)) {
      isApplyingUrlFiltersRef.current = true;
      applyFiltersRef.current(nextFilters);
    }
  }, [searchParamString]);

  useEffect(() => {
    if (isApplyingUrlFiltersRef.current) {
      isApplyingUrlFiltersRef.current = false;
      return;
    }

    const nextSearchParams = getSearchParamsFromFilters(filters);
    const nextSearchParamString = nextSearchParams.toString();

    if (nextSearchParamString !== searchParamString) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [filters, searchParamString, setSearchParams]);

  useEffect(() => {
    if (
      filteredListings.length > 0 &&
      !filteredListings.some((listing) => listing.id === selectedId)
    ) {
      setSelectedId(filteredListings[0].id);
    }
  }, [filteredListings, selectedId]);

  useEffect(() => {
    setVisibleResultCount(PAGE_SIZE);
  }, [filters, viewMode]);

  async function saveCurrentSearch() {
    const searchName =
      filters.query.trim() ||
      [
        filters.city !== "all" ? filters.city : "",
        filters.district !== "all" ? filters.district : "",
        filters.propertyType !== "all" ? filters.propertyType : "",
      ]
        .filter(Boolean)
        .join(" - ") ||
      "Saqlangan qidiruv";

    await saveSearch({
      filters,
      name: searchName,
    });
  }

  function applySavedSearch(search) {
    applyFilters(search.filters);
  }

  function removeSavedSearch(searchId) {
    deleteSavedSearch(searchId);
  }

  function updateListingFilter(name, value) {
    if (name === "query") {
      setNaturalSearchStatus("");
    }

    if (name === "city") {
      updateFilter("city", value);
      return;
    }

    updateFilter(name, value);
  }

  function submitSearch() {
    const parsedSearch = parseNaturalLanguageSearch(filters.query, {
      cities,
      districts,
    });

    if (parsedSearch.hasChanges) {
      applyFilters({
        ...filters,
        ...parsedSearch.filters,
      });
      setNaturalSearchStatus(
        t("search.naturalApplied", { count: parsedSearch.applied.length })
      );
      return;
    }

    setNaturalSearchStatus("");
    setSelectedId(filteredListings[0]?.id);
  }

  function loadMoreListings() {
    setVisibleResultCount((current) => current + PAGE_SIZE);
  }

  return {
    applySavedSearch,
    compareListings,
    filteredListings,
    hasMoreListings,
    loadMoreListings,
    naturalSearchStatus,
    pageSize: PAGE_SIZE,
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
  };
}
