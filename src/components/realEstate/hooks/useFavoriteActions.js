import { realEstateDataGateway } from "../../../services/realEstateDataGateway";

export function useFavoriteActions({
  applyListingStats,
  currentUser,
  favoriteIds,
  handleActionError,
  incrementStoredListingStat,
  setDataError,
  setFavoriteIds,
}) {
  async function toggleFavorite(listingId) {
    if (!currentUser && realEstateDataGateway.isApiMode()) {
      setDataError("Sevimlilarga qo'shish uchun avval tizimga kiring.");
      return;
    }

    const isFavorite = favoriteIds.includes(listingId);
    const nextIsFavorite = !isFavorite;

    setFavoriteIds((current) =>
      current.includes(listingId)
        ? current.filter((id) => id !== listingId)
        : [...current, listingId]
    );

    try {
      incrementStoredListingStat(
        listingId,
        "favorites",
        nextIsFavorite ? 1 : -1
      );

      const stats = await realEstateDataGateway.setFavorite(
        listingId,
        nextIsFavorite
      );

      if (stats && stats !== true) {
        applyListingStats(stats);
      }

      setDataError("");
    } catch (error) {
      incrementStoredListingStat(
        listingId,
        "favorites",
        nextIsFavorite ? -1 : 1
      );
      setFavoriteIds((current) =>
        nextIsFavorite
          ? current.filter((id) => id !== listingId)
          : [...current, listingId]
      );
      handleActionError(error);
    }
  }

  return { toggleFavorite };
}
