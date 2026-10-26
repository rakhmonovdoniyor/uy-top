import { useCallback, useEffect, useState } from "react";
import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { usePersistLocalEstateState } from "./usePersistLocalEstateState";

export function useEstateState() {
  const [initialEstateState] = useState(() =>
    realEstateDataGateway.loadLocalState()
  );
  const [baseListings, setBaseListings] = useState(
    initialEstateState.baseListings
  );
  const [adminActions, setAdminActions] = useState(
    initialEstateState.adminActions || []
  );
  const [favoriteIds, setFavoriteIds] = useState(
    initialEstateState.favoriteIds
  );
  const [createdListings, setCreatedListings] = useState(
    initialEstateState.createdListings
  );
  const [deletedListingIds, setDeletedListingIds] = useState(
    initialEstateState.deletedListingIds
  );
  const [listingOverrides, setListingOverrides] = useState(
    initialEstateState.listingOverrides
  );
  const [listingReports, setListingReports] = useState(
    initialEstateState.listingReports || []
  );
  const [storedListingStatsById, setStoredListingStatsById] = useState(
    initialEstateState.listingStatsById || {}
  );
  const [messages, setMessages] = useState(initialEstateState.messages);
  const [storedNotifications, setStoredNotifications] = useState(
    initialEstateState.notifications || []
  );
  const [savedSearches, setSavedSearches] = useState(
    initialEstateState.savedSearches || []
  );
  const [users, setUsers] = useState(initialEstateState.users);
  const [currentUser, setCurrentUser] = useState(initialEstateState.currentUser);
  const [dataSource, setDataSource] = useState("local");
  const [dataError, setDataError] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const applyEstateState = useCallback(
    (nextState) => {
      setAdminActions(nextState.adminActions || []);
      setBaseListings(nextState.baseListings || initialEstateState.baseListings);
      setFavoriteIds(nextState.favoriteIds || []);
      setCreatedListings(nextState.createdListings || []);
      setDeletedListingIds(nextState.deletedListingIds || []);
      setListingOverrides(nextState.listingOverrides || {});
      if (nextState.listingReports) {
        setListingReports(nextState.listingReports);
      }
      setStoredListingStatsById(nextState.listingStatsById || {});
      setMessages(nextState.messages || []);
      setStoredNotifications(nextState.notifications || []);
      setSavedSearches(nextState.savedSearches || []);
      setUsers(nextState.users || []);
      setCurrentUser(nextState.currentUser || null);
    },
    [initialEstateState.baseListings]
  );

  usePersistLocalEstateState({
    createdListings,
    currentUser,
    deletedListingIds,
    favoriteIds,
    listingOverrides,
    listingReports,
    listingStatsById: storedListingStatsById,
    messages,
    notifications: storedNotifications,
    savedSearches,
    users,
  });

  useEffect(() => {
    let isMounted = true;

    realEstateDataGateway.loadInitialState().then((result) => {
      if (!isMounted) {
        return;
      }

      applyEstateState(result.state);
      setDataSource(result.source);
      setDataError(result.error ? result.error.message : "");
      setIsInitialLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [applyEstateState]);

  return {
    adminActions,
    applyEstateState,
    baseListings,
    createdListings,
    currentUser,
    dataError,
    dataSource,
    deletedListingIds,
    favoriteIds,
    isInitialLoading,
    listingOverrides,
    listingReports,
    messages,
    savedSearches,
    setAdminActions,
    setCreatedListings,
    setCurrentUser,
    setDataError,
    setDataSource,
    setDeletedListingIds,
    setFavoriteIds,
    setListingOverrides,
    setListingReports,
    setMessages,
    setSavedSearches,
    setStoredListingStatsById,
    setStoredNotifications,
    setUsers,
    storedListingStatsById,
    storedNotifications,
    users,
  };
}
