import { useMemo, useRef } from "react";
import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { getListingStats } from "../utils/listingUtils";

export function useListingStats({
  allListings,
  favoriteIds,
  messages,
  setStoredListingStatsById,
  storedListingStatsById,
}) {
  const trackedListingViewsRef = useRef(new Set());

  const derivedListingStatsById = useMemo(
    () =>
      Object.fromEntries(
        allListings.map((listing) => [
          listing.id,
          getListingStats(listing, favoriteIds, messages),
        ])
      ),
    [allListings, favoriteIds, messages]
  );

  const listingStatsById = useMemo(
    () =>
      Object.fromEntries(
        allListings.map((listing) => {
          const fallbackStats = derivedListingStatsById[listing.id] || {};
          const storedStats = storedListingStatsById[listing.id] || {};

          return [
            listing.id,
            {
              favorites: Number(
                storedStats.favorites ?? fallbackStats.favorites ?? 0
              ),
              leads: Number(storedStats.leads ?? fallbackStats.leads ?? 0),
              listingId: listing.id,
              updatedAt: storedStats.updatedAt || "",
              views: Number(storedStats.views ?? fallbackStats.views ?? 0),
            },
          ];
        })
      ),
    [allListings, derivedListingStatsById, storedListingStatsById]
  );

  function applyListingStats(stats) {
    if (!stats?.listingId) {
      return;
    }

    setStoredListingStatsById((current) => ({
      ...current,
      [stats.listingId]: {
        favorites: Number(stats.favorites ?? stats.favoriteCount ?? 0),
        leads: Number(stats.leads ?? stats.leadCount ?? 0),
        listingId: Number(stats.listingId),
        updatedAt: stats.updatedAt || "",
        views: Number(stats.views ?? stats.viewCount ?? 0),
      },
    }));
  }

  function incrementStoredListingStat(listingId, key, amount = 1) {
    const numericListingId = Number(listingId);

    setStoredListingStatsById((current) => {
      const currentStats =
        current[numericListingId] ||
        derivedListingStatsById[numericListingId] || {
          favorites: 0,
          leads: 0,
          views: 0,
        };

      return {
        ...current,
        [numericListingId]: {
          ...currentStats,
          [key]: Math.max(0, Number(currentStats[key] || 0) + amount),
          listingId: numericListingId,
        },
      };
    });
  }

  async function trackListingView(listingId) {
    const numericListingId = Number(listingId);

    if (!numericListingId || trackedListingViewsRef.current.has(numericListingId)) {
      return;
    }

    trackedListingViewsRef.current.add(numericListingId);
    incrementStoredListingStat(numericListingId, "views", 1);

    try {
      const stats = await realEstateDataGateway.trackListingView(numericListingId);
      applyListingStats(stats);
    } catch {
      // View tracking should never block browsing.
    }
  }

  async function trackListingLead(listingId) {
    const numericListingId = Number(listingId);

    if (!numericListingId) {
      return;
    }

    incrementStoredListingStat(numericListingId, "leads", 1);

    try {
      const stats = await realEstateDataGateway.trackListingLead(numericListingId);
      applyListingStats(stats);
    } catch {
      // Lead tracking is best-effort; contact actions should still continue.
    }
  }

  return {
    applyListingStats,
    incrementStoredListingStat,
    listingStatsById,
    trackListingLead,
    trackListingView,
  };
}
