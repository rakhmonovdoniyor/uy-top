import { Link, Navigate, useLocation } from "react-router-dom";
import { FiShield } from "react-icons/fi";
import { useI18n } from "../i18n";

export function RequireAuth({ children, currentUser }) {
  const location = useLocation();

  if (!currentUser) {
    return (
      <Navigate
        replace
        state={{ returnTo: `${location.pathname}${location.search}` }}
        to="/login"
      />
    );
  }

  return children;
}

export function RequireAdmin({ children, currentUser }) {
  const location = useLocation();
  const { t } = useI18n();

  if (!currentUser) {
    return (
      <Navigate
        replace
        state={{ returnTo: `${location.pathname}${location.search}` }}
        to="/login"
      />
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <section className="protected-panel">
        <span className="agent-avatar large">
          <FiShield aria-hidden="true" />
        </span>
        <h1>{t("guard.adminTitle")}</h1>
        <p>{t("guard.adminText")}</p>
        <div className="protected-action-row">
          <Link className="outline-action" to="/profile">
            {t("guard.adminBackProfile")}
          </Link>
          <Link className="estate-header-action" to="/listings">
            {t("guard.adminBackListings")}
          </Link>
        </div>
      </section>
    );
  }

  return children;
}

export function RequireActiveUser({ children, currentUser }) {
  const location = useLocation();
  const { t } = useI18n();

  if (!currentUser) {
    return (
      <Navigate
        replace
        state={{ returnTo: `${location.pathname}${location.search}` }}
        to="/login"
      />
    );
  }

  if (currentUser.accountStatus === "blocked") {
    return (
      <section className="protected-panel">
        <span className="agent-avatar large">
          <FiShield aria-hidden="true" />
        </span>
        <h1>{t("guard.blockedTitle")}</h1>
        <p>{t("guard.blockedText")}</p>
        <Link className="outline-action" to="/profile">
          {t("guard.adminBackProfile")}
        </Link>
      </section>
    );
  }

  return children;
}
