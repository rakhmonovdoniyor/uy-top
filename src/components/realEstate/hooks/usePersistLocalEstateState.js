import { useEffect } from "react";
import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { realEstateRepository } from "../../../services/realEstateRepository";

export function usePersistLocalEstateState({
  createdListings,
  currentUser,
  deletedListingIds,
  favoriteIds,
  listingOverrides,
  listingReports,
  messages,
  notifications,
  savedSearches,
  listingStatsById,
  users,
}) {
  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveFavoriteIds(favoriteIds);
    }
  }, [favoriteIds]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveCreatedListings(createdListings);
    }
  }, [createdListings]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveDeletedListingIds(deletedListingIds);
    }
  }, [deletedListingIds]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveListingOverrides(listingOverrides);
    }
  }, [listingOverrides]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveListingReports(listingReports);
    }
  }, [listingReports]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveListingStatsById(listingStatsById);
    }
  }, [listingStatsById]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveCurrentUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveNotifications(notifications);
    }
  }, [notifications]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveSavedSearches(savedSearches);
    }
  }, [savedSearches]);

  useEffect(() => {
    if (realEstateDataGateway.shouldPersistLocalState()) {
      realEstateRepository.saveUsers(users);
    }
  }, [users]);
}
