import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { realEstateRepository } from "../../../services/realEstateRepository";
import { getUserId } from "../utils/listingUtils";

export function useModerationActions({
  addAdminAction,
  currentUser,
  handleActionError,
  listingReports,
  setCurrentUser,
  setDataError,
  setListingReports,
  setUsers,
  users,
}) {
  async function updateUserStatus(userId, accountStatus, reason = "") {
    const previousUsers = users;
    const previousCurrentUser = currentUser;

    setUsers((current) =>
      realEstateRepository.updateUserStatus(current, userId, accountStatus, reason)
    );

    if (currentUser?.id === userId) {
      setCurrentUser((current) =>
        current ? { ...current, accountStatus, blockReason: reason } : current
      );
    }

    try {
      await realEstateDataGateway.updateUserStatus(userId, accountStatus, reason);
      addAdminAction({
        action:
          accountStatus === "blocked"
            ? `User bloklandi${reason ? `: ${reason}` : ""}`
            : "User aktiv qilindi",
        entityId: userId,
        entityTitle: users.find((user) => getUserId(user) === userId)?.name || userId,
        type: "user",
      });
      setDataError("");
    } catch (error) {
      setUsers(previousUsers);
      setCurrentUser(previousCurrentUser);
      handleActionError(error);
    }
  }

  async function reportListing(listing, reason) {
    if (!listing) {
      return false;
    }

    try {
      const savedReport = await realEstateDataGateway.createListingReport(
        listing,
        reason,
        currentUser
      );

      setListingReports((current) => [savedReport, ...current]);
      setDataError("");
      return true;
    } catch (error) {
      handleActionError(error);
      return false;
    }
  }

  async function resolveListingReport(reportId) {
    const report = listingReports.find((item) => item.id === reportId);

    setListingReports((current) =>
      current.map((report) =>
        report.id === reportId ? { ...report, status: "resolved" } : report
      )
    );
    addAdminAction({
      action: "Shikoyat yopildi",
      entityId: reportId,
      entityTitle: report?.listingTitle || "",
      type: "report",
    });

    try {
      const savedReport =
        await realEstateDataGateway.resolveListingReport(reportId);

      if (savedReport && savedReport !== true) {
        setListingReports((current) =>
          current.map((report) =>
            report.id === reportId ? savedReport : report
          )
        );
      }

      setDataError("");
    } catch (error) {
      handleActionError(error);
    }
  }

  return {
    reportListing,
    resolveListingReport,
    updateUserStatus,
  };
}
