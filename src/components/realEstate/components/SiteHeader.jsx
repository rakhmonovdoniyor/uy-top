import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiChevronDown,
  FiHome,
  FiLock,
  FiLogOut,
  FiMessageCircle,
  FiPlus,
  FiUser,
} from "react-icons/fi";
import { useI18n } from "../i18n";

function LanguageMenu({ language, languages, setLanguage, t }) {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const languageMenuRef = useRef(null);
  const activeLanguage =
    languages.find((item) => item.code === language) || languages[0];

  useEffect(() => {
    if (!isLanguageOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!languageMenuRef.current?.contains(event.target)) {
        setIsLanguageOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsLanguageOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLanguageOpen]);

  function handleLanguageChange(code) {
    setLanguage(code);
    setIsLanguageOpen(false);
  }

  return (
    <div
      className={`language-menu ${isLanguageOpen ? "open" : ""}`}
      ref={languageMenuRef}
    >
      <button
        aria-expanded={isLanguageOpen}
        aria-haspopup="menu"
        aria-label={t("language.select")}
        className="language-menu-trigger"
        onClick={() => setIsLanguageOpen((isOpen) => !isOpen)}
        title={activeLanguage.name}
        type="button"
      >
        <span>{activeLanguage.label}</span>
        <FiChevronDown aria-hidden="true" />
      </button>
      {isLanguageOpen && (
        <div className="language-menu-panel" role="menu">
          {languages.map((item) => {
            const isActive = language === item.code;

            return (
              <button
                aria-checked={isActive}
                className={isActive ? "active" : ""}
                key={item.code}
                onClick={() => handleLanguageChange(item.code)}
                role="menuitemradio"
                type="button"
              >
                <span className="language-option-code">{item.label}</span>
                <span className="language-option-name">{item.name}</span>
                {isActive && <FiCheck aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SiteHeader({
  currentUser,
  notificationCount = 0,
  onLogout,
  unreadChatCount = 0,
}) {
  const { language, languages, setLanguage, t } = useI18n();

  return (
    <header className={`estate-header ${currentUser ? "with-account" : ""}`}>
      <Link className="estate-brand" to="/" aria-label="UyTop bosh sahifa">
        <span className="estate-brand-mark">
          <FiHome aria-hidden="true" />
        </span>
        <span>
          <strong>UyTop</strong>
          <small>{t("brand.subtitle")}</small>
        </span>
      </Link>

      <div className="mobile-language-slot">
        <LanguageMenu
          language={language}
          languages={languages}
          setLanguage={setLanguage}
          t={t}
        />
      </div>

      <nav className="estate-nav" aria-label="Asosiy menyu">
        <NavLink to="/listings">{t("common.listings")}</NavLink>
        <NavLink to="/add-listing">{t("common.post")}</NavLink>
        {currentUser && (
          <NavLink className="nav-with-badge" to="/chats">
            {t("common.chats")}
            {unreadChatCount > 0 && <span>{unreadChatCount}</span>}
          </NavLink>
        )}
        {currentUser ? (
          <NavLink to="/profile">{t("common.profile")}</NavLink>
        ) : (
          <NavLink to="/login">{t("auth.login")}</NavLink>
        )}
        {currentUser?.role === "admin" && (
          <NavLink to="/admin">{t("common.admin")}</NavLink>
        )}
      </nav>

      <div className="header-account">
        <LanguageMenu
          language={language}
          languages={languages}
          setLanguage={setLanguage}
          t={t}
        />
        {currentUser && (
          <Link className="header-user header-chat-shortcut" to="/chats">
            <FiMessageCircle aria-hidden="true" />
            <span className="header-chip-text">
              {unreadChatCount > 0
                ? `${unreadChatCount} ${t("common.new")}`
                : t("common.chats")}
            </span>
          </Link>
        )}
        {currentUser && (
          <Link className="header-user header-notification-shortcut" to="/profile">
            <FiBell aria-hidden="true" />
            <span className="header-chip-text">
              {notificationCount > 0
                ? `${notificationCount} xabar`
                : t("common.notifications")}
            </span>
          </Link>
        )}
        {currentUser && (
          <span className="header-user header-profile-chip">
            <FiUser aria-hidden="true" />
            <span className="header-chip-text">{currentUser.name}</span>
          </span>
        )}
        {currentUser ? (
          <button className="logout-button" onClick={onLogout} type="button">
            <FiLogOut aria-hidden="true" />
            <span className="header-chip-text">{t("auth.logout")}</span>
          </button>
        ) : (
          <Link className="header-login" to="/login">
            <FiLock aria-hidden="true" />
            <span className="header-chip-text">{t("auth.login")}</span>
          </Link>
        )}
        <Link className="estate-header-action" to="/add-listing">
          <FiPlus aria-hidden="true" />
          <span className="header-chip-text">{t("action.addListing")}</span>
        </Link>
      </div>
    </header>
  );
}

export default SiteHeader;
