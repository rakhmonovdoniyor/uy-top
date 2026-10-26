import { useState } from "react";
import { defaultFilters } from "../constants";

export function useListingFilters() {
  const [filters, setFilters] = useState(defaultFilters);

  function updateFilter(name, value) {
    setFilters((current) => {
      const nextFilters = { ...current, [name]: value };

      if (name === "city" && current.city !== value) {
        nextFilters.district = "all";
      }

      return nextFilters;
    });
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  function applyFilters(nextFilters) {
    setFilters({ ...defaultFilters, ...nextFilters });
  }

  return {
    applyFilters,
    filters,
    resetFilters,
    updateFilter,
  };
}
