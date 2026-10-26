import { realEstateDataGateway } from "../../../services/realEstateDataGateway";

export function useSavedSearchActions({
  currentUser,
  handleActionError,
  savedSearches,
  setDataError,
  setSavedSearches,
}) {
  async function saveSearch(search) {
    if (!currentUser) {
      setDataError("Qidiruvni saqlash uchun avval tizimga kiring.");
      return null;
    }

    const optimisticSearch = {
      createdAt: new Date().toISOString(),
      filters: search.filters,
      id: Date.now(),
      name: search.name || "Saqlangan qidiruv",
    };

    setSavedSearches((current) => [optimisticSearch, ...current].slice(0, 10));

    try {
      const savedSearch = await realEstateDataGateway.createSavedSearch(search);
      setSavedSearches((current) =>
        [savedSearch, ...current.filter((item) => item.id !== optimisticSearch.id)]
          .slice(0, 10)
      );
      setDataError("");
      return savedSearch;
    } catch (error) {
      setSavedSearches((current) =>
        current.filter((item) => item.id !== optimisticSearch.id)
      );
      handleActionError(error);
      return null;
    }
  }

  async function deleteSavedSearch(searchId) {
    const previousSearches = savedSearches;

    setSavedSearches((current) =>
      current.filter((search) => search.id !== searchId)
    );

    try {
      await realEstateDataGateway.deleteSavedSearch(searchId);
      setDataError("");
    } catch (error) {
      setSavedSearches(previousSearches);
      handleActionError(error);
    }
  }

  return {
    deleteSavedSearch,
    saveSearch,
  };
}
