import { realEstateDataGateway } from "../../../services/realEstateDataGateway";

export function useAdminActions({
  currentUser,
  handleActionError,
  setAdminActions,
  setDataError,
}) {
  function addAdminAction(action) {
    const createdAt = new Date().toISOString();
    const createdAtLabel = new Intl.DateTimeFormat("uz-UZ", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
    }).format(new Date(createdAt));

    const optimisticAction = {
      ...action,
      actor: currentUser?.name || "Admin",
      createdAt,
      createdAtLabel,
      id: Date.now(),
    };

    setAdminActions((current) => [optimisticAction, ...current]);

    if (realEstateDataGateway.isApiMode()) {
      realEstateDataGateway
        .createAdminAction(action)
        .then((savedAction) => {
          if (!savedAction) {
            return;
          }

          setAdminActions((current) =>
            current.map((item) =>
              item.id === optimisticAction.id ? savedAction : item
            )
          );
        })
        .catch((error) => {
          setAdminActions((current) =>
            current.filter((item) => item.id !== optimisticAction.id)
          );
          handleActionError(error);
        });
    }
  }

  async function cleanupUploads() {
    try {
      const cleanup = await realEstateDataGateway.cleanupUploads({
        olderThanDays: 7,
      });

      addAdminAction({
        action: "Upload cleanup bajarildi",
        entityId: String(cleanup.deletedCount || 0),
        entityTitle: `${cleanup.deletedCount || 0} fayl o'chirildi`,
        type: "uploads",
      });
      setDataError("");
      return cleanup;
    } catch (error) {
      handleActionError(error);
      return null;
    }
  }

  return {
    addAdminAction,
    cleanupUploads,
  };
}
