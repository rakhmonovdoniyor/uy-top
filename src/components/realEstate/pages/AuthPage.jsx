import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiLock, FiShield, FiUser, FiUserPlus } from "react-icons/fi";
import { useI18n } from "../i18n";

function AuthPage({ currentUser, onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const returnTo = location.state?.returnTo;
  const [mode, setMode] = useState("login");
  const [formState, setFormState] = useState({
    name: "",
    phone: "+998 ",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateAuthField(name, value) {
    setFormState((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  function validateAuth() {
    const nextErrors = {};

    if (mode === "register" && !formState.name.trim()) {
      nextErrors.name = t("auth.validation.name");
    }

    if (!formState.phone.trim() || formState.phone.trim() === "+998") {
      nextErrors.phone = t("auth.validation.phone");
    }

    if (mode === "register" && !formState.email.includes("@")) {
      nextErrors.email = t("auth.validation.email");
    }

    if (formState.password.length < 4) {
      nextErrors.password = t("auth.validation.password");
    }

    return nextErrors;
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const nextErrors = validateAuth();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedInUser = await onLogin(formState, mode);

      navigate(returnTo || (loggedInUser.role === "admin" ? "/admin" : "/profile"), {
        replace: true,
      });
    } catch (error) {
      const fields = error.payload?.details?.fields;
      const submitMessage =
        error.status === 401
          ? t("auth.validation.unauthorized")
          : error.status === 409
            ? t("auth.validation.userExists")
            : error.payload?.error ||
              t("auth.validation.loginFailed");

      setErrors({
        ...(fields || {}),
        submit: submitMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (currentUser) {
    return (
      <section className="auth-layout">
        <div className="auth-copy">
          <span className="estate-kicker">{t("auth.activeKicker")}</span>
          <h1>{t("auth.activeTitle")}</h1>
          <p>{t("auth.activeText", { name: currentUser.name })}</p>
        </div>

        <div className="auth-signed-card">
          <span className="agent-avatar large">
            <FiUser aria-hidden="true" />
          </span>
          <h2>{currentUser.name}</h2>
          <p>
            {currentUser.role === "admin"
              ? t("auth.roleAdmin")
              : t("auth.roleUser")}
          </p>
          <Link className="phone-button" to="/profile">
            {t("auth.goProfile")}
          </Link>
          {currentUser.role === "admin" && (
            <Link className="outline-action" to="/admin">
              <FiShield aria-hidden="true" />
              {t("auth.adminPanel")}
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="auth-layout">
      <div className="auth-copy">
        <span className="estate-kicker">{t("auth.login")}</span>
        <h1>{t("auth.copyTitle")}</h1>
        <p>{t("auth.copyText")}</p>
        <div className="auth-benefits">
          <span>
            <FiShield aria-hidden="true" />
            {t("auth.benefitAccount")}
          </span>
          <span>
            <FiUserPlus aria-hidden="true" />
            {t("auth.benefitListings")}
          </span>
          <span>
            <FiLock aria-hidden="true" />
            {t("auth.benefitMessages")}
          </span>
        </div>
      </div>

      <form className="publish-form auth-form" onSubmit={handleAuthSubmit}>
        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            {t("auth.login")}
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
            type="button"
          >
            {t("auth.register")}
          </button>
        </div>

        {mode === "register" && (
          <label className={errors.name ? "has-error" : ""}>
            {t("auth.fullName")}
            <input
              value={formState.name}
              onChange={(event) => updateAuthField("name", event.target.value)}
              placeholder={t("auth.fullName")}
            />
            {errors.name && <small>{errors.name}</small>}
          </label>
        )}

        <label className={errors.phone ? "has-error" : ""}>
          {t("auth.phone")}
          <input
            value={formState.phone}
            onChange={(event) => updateAuthField("phone", event.target.value)}
            placeholder="+998 90 123 45 67"
          />
          {errors.phone && <small>{errors.phone}</small>}
        </label>

        {mode === "register" && (
          <label className={errors.email ? "has-error" : ""}>
            {t("auth.email")}
            <input
              value={formState.email}
              onChange={(event) => updateAuthField("email", event.target.value)}
              placeholder="email@uytop.uz"
            />
            {errors.email && <small>{errors.email}</small>}
          </label>
        )}

        <label className={errors.password ? "has-error" : ""}>
          {t("auth.password")}
          <input
            value={formState.password}
            onChange={(event) => updateAuthField("password", event.target.value)}
            placeholder={t("auth.password")}
            type="password"
          />
          {errors.password && <small>{errors.password}</small>}
        </label>

        {errors.submit && <small>{errors.submit}</small>}

        <button disabled={isSubmitting} type="submit">
          <FiLock aria-hidden="true" />
          {isSubmitting
            ? t("auth.submitting")
            : mode === "login"
              ? t("auth.login")
              : t("auth.accountCreate")}
        </button>
        <p>
          {returnTo
            ? t("auth.loginRequired")
            : t("auth.loginHelp")}
        </p>
      </form>
    </section>
  );
}

export default AuthPage;
