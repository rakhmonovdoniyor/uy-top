import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiShield,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import MiniStat from "./MiniStat";

function AdminDashboardStats({
  approvedCount,
  duplicateCount,
  lowQualityImageCount,
  openReportCount,
  pendingCount,
  rejectedCount,
  t,
  todayListingCount,
  topCount,
  userCount,
}) {
  return (
    <div className="admin-dashboard-grid">
      <MiniStat
        icon={FiClock}
        label={t("moderation.pending")}
        value={pendingCount}
      />
      <MiniStat
        icon={FiCheckCircle}
        label={t("moderation.approved")}
        value={approvedCount}
      />
      <MiniStat
        icon={FiShield}
        label={t("moderation.rejected")}
        value={rejectedCount}
      />
      <MiniStat icon={FiClock} label={t("admin.today")} value={todayListingCount} />
      <MiniStat icon={FiUsers} label={t("admin.users")} value={userCount} />
      <MiniStat icon={FiStar} label={t("common.featured")} value={topCount} />
      <MiniStat
        icon={FiEye}
        label={t("admin.imageQualityShort")}
        value={lowQualityImageCount}
      />
      <MiniStat
        icon={FiAlertTriangle}
        label={t("admin.reports")}
        value={openReportCount}
      />
      <MiniStat
        icon={FiAlertTriangle}
        label={t("admin.duplicates")}
        value={duplicateCount}
      />
    </div>
  );
}

export default AdminDashboardStats;
