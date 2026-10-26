import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";
import { useI18n } from "../i18n";

function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="estate-footer">
      <span>UyTop</span>
      <Link to="/">
        {t("footer.home")}
        <FiArrowUpRight aria-hidden="true" />
      </Link>
    </footer>
  );
}

export default SiteFooter;
