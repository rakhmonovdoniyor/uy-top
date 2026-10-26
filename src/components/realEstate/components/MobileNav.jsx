import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { useI18n } from "../i18n";

function MobileNav({ currentUser, unreadChatCount = 0 }) {
  const { t } = useI18n();
  const navClassName =
    currentUser?.role === "admin" ? "mobile-nav has-admin" : "mobile-nav";

  return (
    <nav className={navClassName} aria-label="Mobil menyu">
      <NavLink to="/">
        <FiHome aria-hidden="true" />
        {t("common.home")}
      </NavLink>
      <NavLink to="/listings">
        <FiSearch aria-hidden="true" />
        {t("common.search")}
      </NavLink>
      <NavLink to="/add-listing">
        <FiPlus aria-hidden="true" />
        {t("common.post")}
      </NavLink>
      {currentUser && (
        <NavLink className="mobile-nav-badge-wrap" to="/chats">
          <FiMessageCircle aria-hidden="true" />
          {t("common.chat")}
          {unreadChatCount > 0 && <span>{unreadChatCount}</span>}
        </NavLink>
      )}
      {currentUser?.role === "admin" && (
        <NavLink to="/admin">
          <FiShield aria-hidden="true" />
          {t("common.admin")}
        </NavLink>
      )}
      <NavLink to={currentUser ? "/profile" : "/login"}>
        <FiUser aria-hidden="true" />
        {currentUser ? t("common.profile") : t("auth.login")}
      </NavLink>
    </nav>
  );
}

export default MobileNav;
