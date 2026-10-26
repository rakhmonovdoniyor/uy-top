import { useState } from "react";

export function useCompareListings(maxItems = 3) {
  const [compareIds, setCompareIds] = useState([]);

  function toggleCompareListing(listingId) {
    const numericId = Number(listingId);

    setCompareIds((current) => {
      if (current.includes(numericId)) {
        return current.filter((id) => id !== numericId);
      }

      if (current.length >= maxItems) {
        return current;
      }

      return [...current, numericId];
    });
  }

  function clearCompareListings() {
    setCompareIds([]);
  }

  function removeCompareListing(listingId) {
    const numericId = Number(listingId);
    setCompareIds((current) => current.filter((id) => Number(id) !== numericId));
  }

  return {
    clearCompareListings,
    compareIds,
    removeCompareListing,
    toggleCompareListing,
  };
}
