import { FiSearch } from "react-icons/fi";
import { useI18n } from "../i18n";

function EmptyState({
  icon: Icon = FiSearch,
  text,
  title,
}) {
  const { t } = useI18n();

  return (
    <div className="empty-state">
      <Icon aria-hidden="true" />
      <h3>{title || t("empty.listingTitle")}</h3>
      <p>{text || t("empty.listingText")}</p>
    </div>
  );
}

export default EmptyState;
