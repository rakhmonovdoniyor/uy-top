import { useMemo } from "react";
import { allDistrictOptions, cityOptions } from "../constants";
import { realEstateRepository } from "../../../services/realEstateRepository";

export function useListingCatalog({
  baseListings,
  createdListings,
  currentUser,
  deletedListingIds,
  listingOverrides,
}) {
  const allListings = useMemo(
    () =>
      realEstateRepository.composeListings(
        createdListings,
        listingOverrides,
        deletedListingIds,
        baseListings
      ),
    [baseListings, createdListings, deletedListingIds, listingOverrides]
  );

  const visibleListings = useMemo(
    () => realEstateRepository.getVisibleListings(allListings, currentUser),
    [allListings, currentUser]
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set([...cityOptions, ...allListings.map((listing) => listing.city)])
      ).filter(Boolean),
    [allListings]
  );

  const districts = useMemo(
    () =>
      Array.from(
        new Set([
          ...allDistrictOptions,
          ...allListings.map((listing) => listing.district),
        ])
      ).filter(Boolean),
    [allListings]
  );

  const searchSuggestions = useMemo(() => {
    const values = allListings.flatMap((listing) => [
      listing.city,
      listing.district,
      listing.address,
      listing.propertyType,
      listing.agent,
      ...(listing.tags || []),
    ]);

    return Array.from(
      new Set(values.map((value) => String(value || "").trim()).filter(Boolean))
    ).slice(0, 50);
  }, [allListings]);

  return {
    allListings,
    cities,
    districts,
    searchSuggestions,
    visibleListings,
  };
}
