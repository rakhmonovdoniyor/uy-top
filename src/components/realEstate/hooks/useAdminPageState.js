import { useMemo } from "react";
import { getAdminPageData } from "../utils/adminPageUtils";

export function useAdminPageState({
  actionFilter,
  adminActions,
  allListings,
  listingReports,
  messages,
  selectedUserKey,
  statusFilter,
  userSearch,
  users,
}) {
  return useMemo(
    () =>
      getAdminPageData({
        actionFilter,
        adminActions,
        allListings,
        listingReports,
        messages,
        selectedUserKey,
        statusFilter,
        userSearch,
        users,
      }),
    [
      actionFilter,
      adminActions,
      allListings,
      listingReports,
      messages,
      selectedUserKey,
      statusFilter,
      userSearch,
      users,
    ]
  );
}
