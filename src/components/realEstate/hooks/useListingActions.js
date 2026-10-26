import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { realEstateRepository } from "../../../services/realEstateRepository";
import {
  buildListingFromForm,
  canManageListing,
} from "../utils/listingUtils";

export function useListingActions({
  addAdminAction,
  allListings,
  createdListings,
  currentUser,
  deletedListingIds,
  favoriteIds,
  handleActionError,
  listingOverrides,
  removeCompareListing,
  setCreatedListings,
  setDataError,
  setDeletedListingIds,
  setFavoriteIds,
  setListingOverrides,
  setStoredListingStatsById,
  storedListingStatsById,
}) {
  async function createListing(formState, imagePayload) {
    if (currentUser?.accountStatus === "blocked") {
      return null;
    }

    try {
      const galleryImages =
        await realEstateDataGateway.resolveListingImageUrls(imagePayload);
      const newListing = buildListingFromForm(formState, galleryImages, {
        moderationStatus: "approved",
        ownerId: currentUser?.id,
      });
      const savedListing = await realEstateDataGateway.createListing(newListing);

      setCreatedListings((current) => [savedListing, ...current]);
      setStoredListingStatsById((current) => ({
        ...current,
        [savedListing.id]: {
          favorites: 0,
          leads: 0,
          listingId: Number(savedListing.id),
          updatedAt: "",
          views: 0,
        },
      }));
      setDataError("");
      return savedListing;
    } catch (error) {
      handleActionError(error);
      return null;
    }
  }

  async function deleteListing(listingId) {
    const numericId = Number(listingId);
    const existingListing = allListings.find((listing) => listing.id === numericId);

    if (!canManageListing(existingListing, currentUser)) {
      return false;
    }

    const previousState = {
      createdListings,
      deletedListingIds,
      favoriteIds,
      listingOverrides,
      storedListingStatsById,
    };
    const nextState = realEstateRepository.deleteListing({
      createdListings,
      deletedListingIds,
      listingId: numericId,
      listingOverrides,
    });

    setCreatedListings(nextState.createdListings);
    setDeletedListingIds(nextState.deletedListingIds);
    setListingOverrides(nextState.listingOverrides);
    setFavoriteIds((current) =>
      current.filter((id) => Number(id) !== numericId)
    );
    removeCompareListing(numericId);
    setStoredListingStatsById((current) => {
      const nextStats = { ...current };
      delete nextStats[numericId];
      return nextStats;
    });

    try {
      await realEstateDataGateway.deleteListing(numericId);
      setDataError("");
      return true;
    } catch (error) {
      setCreatedListings(previousState.createdListings);
      setDeletedListingIds(previousState.deletedListingIds);
      setListingOverrides(previousState.listingOverrides);
      setFavoriteIds(previousState.favoriteIds);
      setStoredListingStatsById(previousState.storedListingStatsById);
      handleActionError(error);
      return false;
    }
  }

  async function updateListing(listingId, formState, imagePayload) {
    if (currentUser?.accountStatus === "blocked") {
      return null;
    }

    const numericId = Number(listingId);
    const existingListing = allListings.find((listing) => listing.id === numericId);

    if (!canManageListing(existingListing, currentUser)) {
      return null;
    }

    let savedListing = null;

    try {
      const galleryImages =
        await realEstateDataGateway.resolveListingImageUrls(imagePayload);
      const updatedListing = buildListingFromForm(formState, galleryImages, {
        existing: existingListing,
        id: numericId,
      });
      savedListing = await realEstateDataGateway.updateListing(
        numericId,
        updatedListing
      );
    } catch (error) {
      handleActionError(error);
      return null;
    }

    const nextState = realEstateRepository.applyListingUpdate({
      createdListings,
      listingId: numericId,
      listingOverrides,
      updatedListing: savedListing,
    });

    setCreatedListings(nextState.createdListings);
    setListingOverrides(nextState.listingOverrides);
    setDataError("");

    return savedListing;
  }

  async function updateListingModerationStatus(listingId, moderationStatus) {
    const numericId = Number(listingId);
    const previousState = {
      createdListings,
      listingOverrides,
    };
    const nextState = realEstateRepository.applyModerationStatus({
      allListings,
      createdListings,
      listingId: numericId,
      listingOverrides,
      moderationStatus,
    });

    if (!nextState) {
      return;
    }

    setCreatedListings(nextState.createdListings);
    setListingOverrides(nextState.listingOverrides);

    try {
      await realEstateDataGateway.updateListingModeration(
        numericId,
        moderationStatus
      );
      addAdminAction({
        action: `E'lon statusi: ${moderationStatus}`,
        entityId: numericId,
        entityTitle: allListings.find((item) => item.id === numericId)?.title || "",
        type: "listing",
      });
      setDataError("");
    } catch (error) {
      setCreatedListings(previousState.createdListings);
      setListingOverrides(previousState.listingOverrides);
      handleActionError(error);
    }
  }

  async function updateListingAdminNote(listingId, adminNote) {
    const previousState = {
      createdListings,
      listingOverrides,
    };
    const nextState = realEstateRepository.updateListingAdminNote({
      allListings,
      createdListings,
      listingId,
      listingOverrides,
      adminNote,
    });

    if (!nextState) {
      return;
    }

    setCreatedListings(nextState.createdListings);
    setListingOverrides(nextState.listingOverrides);

    try {
      await realEstateDataGateway.updateListingNote(listingId, adminNote);
      addAdminAction({
        action: "Admin izohi yangilandi",
        entityId: Number(listingId),
        entityTitle:
          allListings.find((item) => item.id === Number(listingId))?.title || "",
        type: "listing",
      });
      setDataError("");
    } catch (error) {
      setCreatedListings(previousState.createdListings);
      setListingOverrides(previousState.listingOverrides);
      handleActionError(error);
    }
  }

  async function toggleListingFeatured(listingId, planValue = "top", durationDays) {
    const numericId = Number(listingId);
    const existingListing = allListings.find((listing) => listing.id === numericId);

    if (currentUser?.role !== "admin" || !existingListing) {
      return;
    }

    const previousState = {
      createdListings,
      listingOverrides,
    };
    const targetTag = planValue === "premium" ? "Premium" : "Top e'lon";
    const existingTags = Array.isArray(existingListing.tags)
      ? existingListing.tags
      : [];
    const hasTargetTag =
      existingListing.listingPlan === planValue || existingTags.includes(targetTag);
    const planExpiresAt = new Date();
    planExpiresAt.setDate(
      planExpiresAt.getDate() +
        (durationDays || (planValue === "premium" ? 30 : 14))
    );
    const nextTags = hasTargetTag
      ? existingTags.filter((tag) => tag !== targetTag)
      : Array.from(
          new Set([
            targetTag,
            ...existingTags.filter(
              (tag) => tag !== "Top e'lon" && tag !== "Premium"
            ),
          ])
        );
    const nextPlan = hasTargetTag
      ? nextTags.includes("Premium")
        ? "premium"
        : nextTags.includes("Top e'lon")
          ? "top"
          : "standard"
      : planValue;
    const updatedListing = {
      ...existingListing,
      tags: nextTags,
      listingPlan: nextPlan,
      planExpiresAt: nextPlan === "standard" ? "" : planExpiresAt.toISOString(),
      verified: true,
    };
    const nextState = realEstateRepository.applyListingUpdate({
      createdListings,
      listingId: numericId,
      listingOverrides,
      updatedListing,
    });

    setCreatedListings(nextState.createdListings);
    setListingOverrides(nextState.listingOverrides);

    try {
      const savedListing = await realEstateDataGateway.updateListing(
        numericId,
        updatedListing
      );
      const savedState = realEstateRepository.applyListingUpdate({
        createdListings: nextState.createdListings,
        listingId: numericId,
        listingOverrides: nextState.listingOverrides,
        updatedListing: savedListing,
      });

      setCreatedListings(savedState.createdListings);
      setListingOverrides(savedState.listingOverrides);
      addAdminAction({
        action: hasTargetTag
          ? `${targetTag} status olib tashlandi`
          : `${targetTag} status ${
              durationDays || (planValue === "premium" ? 30 : 14)
            } kunga berildi`,
        entityId: numericId,
        entityTitle: existingListing.title,
        type: "listing",
      });
      setDataError("");
    } catch (error) {
      setCreatedListings(previousState.createdListings);
      setListingOverrides(previousState.listingOverrides);
      handleActionError(error);
    }
  }

  return {
    createListing,
    deleteListing,
    toggleListingFeatured,
    updateListing,
    updateListingAdminNote,
    updateListingModerationStatus,
  };
}
