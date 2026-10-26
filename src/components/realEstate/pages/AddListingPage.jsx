import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiCheckCircle,
  FiCreditCard,
  FiHome,
  FiImage,
  FiMapPin,
  FiPlus,
  FiSave,
  FiShield,
  FiStar,
  FiTrash2,
} from "react-icons/fi";
import { propertyTypes } from "../../../data/realEstateData";
import {
  amenityOptions,
  cityOptions,
  districtOptions,
  documentTypeOptions,
  listingPlans,
  renovationOptions,
  utilityOptions,
} from "../constants";
import AddListingImagePanel from "../components/AddListingImagePanel";
import { useListingImageUpload } from "../hooks/useListingImageUpload";
import {
  clearDraft,
  fieldStepMap,
  formSteps,
  getBlankListingFormState,
  getInitialListingFormState,
  getListingFormProgress,
  getPreviewPrice,
  saveDraft,
  validateListingForm,
} from "../utils/addListingFormUtils";
import PageIntro from "../components/PageIntro";
import { useI18n } from "../i18n";

function AddListingPage({
  currentUser,
  initialListing,
  mode = "create",
  onCreateListing,
  onDeleteListing,
  onUpdateListing,
}) {
  const navigate = useNavigate();
  const { t, tOption } = useI18n();
  const isEditMode = mode === "edit";
  const [activeStep, setActiveStep] = useState("basics");
  const [isDirty, setIsDirty] = useState(false);
  const [formState, setFormState] = useState(() =>
    getInitialListingFormState({ currentUser, initialListing })
  );
  const [errors, setErrors] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishedListing, setPublishedListing] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const selectedListingPlan =
    listingPlans.find((plan) => plan.value === formState.listingPlan) ||
    listingPlans[0];
  const isPaidListingPlan = selectedListingPlan.value !== "standard";
  const {
    getImagePayload,
    handleImageChange,
    handleImageDrop,
    imagePreview,
    imagePreviews,
    imageUploadNotice,
    isDragActive,
    isProcessingImages,
    makeMainImage,
    moveImage,
    removeImage,
    resetImages,
    selectedFileName,
    setActiveImage,
    setIsDragActive,
  } = useListingImageUpload({
    initialListing,
    isSubmitting,
    setErrors,
    setIsDirty,
    t,
  });
  const { completedFields, completionPercent, requiredFields } =
    getListingFormProgress(formState);
  const activeStepIndex = formSteps.findIndex((step) => step.key === activeStep);
  const previewPrice = getPreviewPrice(formState);
  const cityDistrictOptions = districtOptions[formState.city] || [];

  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }

    function warnBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  function updateFormField(name, value) {
    setIsDirty(true);
    setDraftStatus("");
    setFormState((current) => {
      const nextState = { ...current, [name]: value };

      if (
        name === "city" &&
        !districtOptions[value]?.includes(current.district)
      ) {
        nextState.district = "";
      }

      return nextState;
    });
    setErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  function toggleFormArrayValue(name, value) {
    setIsDirty(true);
    setDraftStatus("");
    setFormState((current) => {
      const currentValues = Array.isArray(current[name]) ? current[name] : [];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return { ...current, [name]: nextValues };
    });
  }

  function moveStep(direction) {
    const nextIndex = Math.min(
      formSteps.length - 1,
      Math.max(0, activeStepIndex + direction)
    );
    setActiveStep(formSteps[nextIndex].key);
  }

  function handleSaveDraft() {
    saveDraft(formState);
    setIsDirty(false);
    setDraftStatus(t("add.draftSaved"));
  }

  function startNewListing() {
    setPublishedListing(null);
    setFormState(getBlankListingFormState(currentUser));
    resetImages();
    setErrors({});
    setActiveStep("basics");
    setIsDirty(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateListingForm(formState, t);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const [firstField] = Object.keys(nextErrors);
      setActiveStep(fieldStepMap[firstField] || "basics");
      return;
    }

    setIsSubmitting(true);

    const imagePayload = getImagePayload();
    const savedListing =
      isEditMode && initialListing
        ? await onUpdateListing(initialListing.id, formState, imagePayload)
        : await onCreateListing(formState, imagePayload);

    if (!savedListing) {
      setErrors((current) => ({
        ...current,
        submit: t("add.validation.submit"),
      }));
      setIsSubmitting(false);
      return;
    }

    clearDraft();
    setIsDirty(false);
    setIsSubmitting(false);

    if (isEditMode) {
      navigate(`/listings/${savedListing.id}`);
      return;
    }

    setPublishedListing(savedListing);
  }

  async function handleDeleteListing() {
    if (!isEditMode || !initialListing || !onDeleteListing) {
      return;
    }

    const shouldDelete = window.confirm(t("add.deleteConfirm"));

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    const isDeleted = await onDeleteListing(initialListing.id);

    if (isDeleted) {
      setIsDirty(false);
      navigate("/profile");
      return;
    }

    setIsDeleting(false);
  }

  return (
    <section className="page-stack">
      <PageIntro
        kicker={isEditMode ? t("add.editKicker") : t("add.postKicker")}
        title={isEditMode ? t("add.editTitle") : t("add.postTitle")}
        text={
          isEditMode
            ? t("add.editText")
            : t("add.postText")
        }
      />

      {publishedListing && !isEditMode ? (
        <section className="publish-success-panel">
          <span className="agent-avatar large">
            <FiCheckCircle aria-hidden="true" />
          </span>
          <div>
            <span className="estate-kicker">{t("add.successKicker")}</span>
            <h2>{publishedListing.title}</h2>
            <p>{t("add.successText")}</p>
          </div>
          <div className="success-action-row">
            <Link
              className="estate-header-action"
              to={`/listings/${publishedListing.id}`}
            >
              {t("add.viewListing")}
            </Link>
            <Link className="outline-action" to="/profile">
              {t("add.viewProfileListings")}
            </Link>
            <button className="outline-action" onClick={startNewListing} type="button">
              {t("action.addListing")}
            </button>
          </div>
        </section>
      ) : null}

      {!publishedListing && (
      <div className="publish-page-layout">
        <form
          className="publish-form full-form wizard-form"
          onSubmit={handleSubmit}
          aria-label={t("add.formTitle")}
        >
          <div className="form-section-title">
            <FiHome aria-hidden="true" />
            <strong>{t("add.formSections")}</strong>
          </div>
          <div className="form-step-tabs" aria-label={t("add.formTitle")}>
            {formSteps.map((step, index) => (
              <button
                className={activeStep === step.key ? "active" : ""}
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                type="button"
              >
                <span>{index + 1}</span>
                {t(step.labelKey)}
              </button>
            ))}
          </div>
          <div className="form-progress-card">
            <div>
              <strong>
                {completedFields}/{requiredFields.length}
              </strong>
              <span>{t("add.stepProgress")}</span>
            </div>
            <span>{completionPercent}%</span>
            <div className="form-progress-track" aria-hidden="true">
              <span style={{ width: `${completionPercent}%` }} />
            </div>
          </div>

          {activeStep === "basics" && (
            <div className="form-step-section">
              <label className={errors.title ? "has-error" : ""}>
                {t("add.title")}
                <input
                  name="title"
                  value={formState.title}
                  onChange={(event) => updateFormField("title", event.target.value)}
                  placeholder={t("add.titlePlaceholder")}
                />
                {errors.title && <small>{errors.title}</small>}
              </label>
              <div className="form-grid">
                <label>
                  {t("add.dealType")}
                  <select
                    value={formState.dealType}
                    onChange={(event) =>
                      updateFormField("dealType", event.target.value)
                    }
                  >
                    <option value="sale">{t("common.forSale")}</option>
                    <option value="rent">{t("common.forRent")}</option>
                  </select>
                </label>
                <label>
                  {t("add.propertyType")}
                  <select
                    value={formState.propertyType}
                    onChange={(event) =>
                      updateFormField("propertyType", event.target.value)
                    }
                  >
                    {propertyTypes.map((type) => (
                      <option key={type} value={type}>
                        {tOption(type)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label className={errors.price ? "has-error" : ""}>
                  {t("add.price")}
                  <input
                    name="price"
                    inputMode="numeric"
                    value={formState.price}
                    onChange={(event) => updateFormField("price", event.target.value)}
                    placeholder="$75 000"
                  />
                  {errors.price && <small>{errors.price}</small>}
                </label>
                <label>
                  {t("filter.city")}
                  <select
                    value={formState.city}
                    onChange={(event) => updateFormField("city", event.target.value)}
                  >
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {tOption(city)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid">
                <label>
                  {t("add.renovationCondition")}
                  <select
                    value={formState.renovationCondition || renovationOptions[1]}
                    onChange={(event) =>
                      updateFormField("renovationCondition", event.target.value)
                    }
                  >
                    {renovationOptions.map((option) => (
                      <option key={option} value={option}>
                        {tOption(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("add.documentType")}
                  <select
                    value={formState.documentType || documentTypeOptions[0]}
                    onChange={(event) =>
                      updateFormField("documentType", event.target.value)
                    }
                  >
                    {documentTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {tOption(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid listing-flag-grid">
                <label className="inline-toggle-card">
                  <input
                    checked={Boolean(formState.furnished)}
                    onChange={(event) =>
                      updateFormField("furnished", event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span className="toggle-indicator">
                    <FiCheckCircle aria-hidden="true" />
                  </span>
                  <span>{t("add.furnished")}</span>
                </label>
                <label className="inline-toggle-card">
                  <input
                    checked={Boolean(formState.negotiable)}
                    onChange={(event) =>
                      updateFormField("negotiable", event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span className="toggle-indicator">
                    <FiCheckCircle aria-hidden="true" />
                  </span>
                  <span>{t("add.negotiable")}</span>
                </label>
              </div>
              <div className="form-section-title">
                <FiStar aria-hidden="true" />
                <strong>{t("add.plan")}</strong>
              </div>
              <div className="listing-plan-grid" role="group" aria-label={t("add.plan")}>
                {listingPlans.map((plan) => (
                  <button
                    className={formState.listingPlan === plan.value ? "active" : ""}
                    key={plan.value}
                    onClick={() => updateFormField("listingPlan", plan.value)}
                    type="button"
                  >
                    <strong>{t(`plan.${plan.value}.label`)}</strong>
                    <span>{t(`plan.${plan.value}.text`)}</span>
                    <em>
                      {plan.price
                        ? t("payment.planPrice", {
                            amount: plan.price.toLocaleString("en-US"),
                          })
                        : t("payment.free")}
                    </em>
                  </button>
                ))}
              </div>
              <div
                className={`payment-readiness-card ${
                  isPaidListingPlan ? "active" : ""
                }`}
              >
                <span className="payment-readiness-icon">
                  <FiCreditCard aria-hidden="true" />
                </span>
                <div>
                  <strong>{t("payment.title")}</strong>
                  <p>
                    {isPaidListingPlan
                      ? t("payment.pendingText", {
                          amount: selectedListingPlan.price.toLocaleString("en-US"),
                          days: selectedListingPlan.durationDays,
                        })
                      : t("payment.freeText")}
                  </p>
                  {isPaidListingPlan && (
                    <div
                      className="payment-provider-row"
                      aria-label={t("payment.provider")}
                    >
                      {["click", "payme"].map((provider) => (
                        <button
                          className={
                            formState.paymentProvider === provider ? "active" : ""
                          }
                          key={provider}
                          onClick={() => updateFormField("paymentProvider", provider)}
                          type="button"
                        >
                          {t(`payment.${provider}`)}
                        </button>
                      ))}
                    </div>
                  )}
                  <small>{t("payment.productionNote")}</small>
                </div>
              </div>
            </div>
          )}

          {activeStep === "location" && (
            <div className="form-step-section">
              <div className="form-grid">
                <label className={errors.district ? "has-error" : ""}>
                  {t("filter.district")}
                  <select
                    name="district"
                    value={formState.district}
                    onChange={(event) =>
                      updateFormField("district", event.target.value)
                    }
                  >
                    <option value="" disabled>
                      {t("add.selectDistrict")}
                    </option>
                    {cityDistrictOptions.map((district) => (
                      <option key={district} value={district}>
                        {tOption(district)}
                      </option>
                    ))}
                  </select>
                  {errors.district && <small>{errors.district}</small>}
                </label>
                <label className={errors.address ? "has-error" : ""}>
                  {t("add.address")}
                  <input
                    name="address"
                    value={formState.address}
                    onChange={(event) =>
                      updateFormField("address", event.target.value)
                    }
                    placeholder={t("add.addressPlaceholder")}
                  />
                  {errors.address && <small>{errors.address}</small>}
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Latitude
                  <input
                    inputMode="decimal"
                    name="latitude"
                    value={formState.latitude}
                    onChange={(event) =>
                      updateFormField("latitude", event.target.value)
                    }
                    placeholder={t("add.latitudePlaceholder")}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    inputMode="decimal"
                    name="longitude"
                    value={formState.longitude}
                    onChange={(event) =>
                      updateFormField("longitude", event.target.value)
                    }
                    placeholder={t("add.longitudePlaceholder")}
                  />
                </label>
              </div>
              <p className="location-coordinate-note">
                <FiMapPin aria-hidden="true" />
                {t("add.locationNote")}
              </p>
              <div className="form-grid three">
                <label className={errors.rooms ? "has-error" : ""}>
                  {t("add.rooms")}
                  <input
                    name="rooms"
                    inputMode="numeric"
                    value={formState.rooms}
                    onChange={(event) => updateFormField("rooms", event.target.value)}
                    placeholder="3"
                  />
                  {errors.rooms && <small>{errors.rooms}</small>}
                </label>
                <label className={errors.area ? "has-error" : ""}>
                  {t("add.area")}
                  <input
                    name="area"
                    inputMode="numeric"
                    value={formState.area}
                    onChange={(event) => updateFormField("area", event.target.value)}
                    placeholder="86"
                  />
                  {errors.area && <small>{errors.area}</small>}
                </label>
                <label className={errors.floor ? "has-error" : ""}>
                  {t("add.floors")}
                  <input
                    name="floor"
                    value={formState.floor}
                    onChange={(event) => updateFormField("floor", event.target.value)}
                    placeholder="6 / 9"
                  />
                  {errors.floor && <small>{errors.floor}</small>}
                </label>
              </div>
              <label className={errors.description ? "has-error" : ""}>
                {t("add.description")}
                <textarea
                  name="description"
                  value={formState.description}
                  onChange={(event) =>
                    updateFormField("description", event.target.value)
                  }
                  placeholder={t("add.descriptionPlaceholder")}
                />
                {errors.description && <small>{errors.description}</small>}
              </label>
              <div className="form-section-title">
                <FiCheckCircle aria-hidden="true" />
                <strong>{t("add.amenities")}</strong>
              </div>
              <div className="checkbox-grid">
                {amenityOptions.map((option) => (
                  <label className="feature-check" key={option}>
                    <input
                      checked={(formState.amenities || []).includes(option)}
                      onChange={() => toggleFormArrayValue("amenities", option)}
                      type="checkbox"
                    />
                    <span>{tOption(option)}</span>
                  </label>
                ))}
              </div>
              <div className="form-section-title">
                <FiShield aria-hidden="true" />
                <strong>{t("add.utilities")}</strong>
              </div>
              <div className="checkbox-grid">
                {utilityOptions.map((option) => (
                  <label className="feature-check" key={option}>
                    <input
                      checked={(formState.utilities || []).includes(option)}
                      onChange={() => toggleFormArrayValue("utilities", option)}
                      type="checkbox"
                    />
                    <span>{tOption(option)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeStep === "media" && (
            <div className="form-step-section">
              <div className="media-step-card">
                <FiImage aria-hidden="true" />
                <strong>{t("add.mediaCardTitle")}</strong>
                <p>{t("add.mediaCardText")}</p>
              </div>
            </div>
          )}

          {activeStep === "contact" && (
            <div className="form-step-section">
              <div className="form-grid">
                <label className={errors.phone ? "has-error" : ""}>
                  {t("add.phone")}
                  <input
                    name="phone"
                    inputMode="tel"
                    value={formState.phone}
                    onChange={(event) => updateFormField("phone", event.target.value)}
                    placeholder="+998 90 123 45 67"
                  />
                  {errors.phone && <small>{errors.phone}</small>}
                </label>
                <label className={errors.agent ? "has-error" : ""}>
                  {t("add.agent")}
                  <input
                    name="agent"
                    value={formState.agent}
                    onChange={(event) => updateFormField("agent", event.target.value)}
                    placeholder={t("add.agentPlaceholder")}
                  />
                  {errors.agent && <small>{errors.agent}</small>}
                </label>
              </div>
              <div className="form-submit-row">
                <button disabled={isSubmitting} type="submit">
                  {isEditMode ? (
                    <FiCheckCircle aria-hidden="true" />
                  ) : (
                    <FiPlus aria-hidden="true" />
                  )}
                  {isSubmitting
                    ? t("add.publishing")
                    : isEditMode
                      ? t("add.saveChanges")
                      : t("add.publish")}
                </button>
                {isEditMode && onDeleteListing && (
                  <button
                    className="danger-submit"
                    disabled={isDeleting}
                    onClick={handleDeleteListing}
                    type="button"
                  >
                    <FiTrash2 aria-hidden="true" />
                    {isDeleting ? t("add.deleting") : t("add.deleteListing")}
                  </button>
                )}
                {errors.submit && <small>{errors.submit}</small>}
              </div>
            </div>
          )}

          <div className="wizard-actions">
            <button
              disabled={activeStepIndex === 0}
              onClick={() => moveStep(-1)}
              type="button"
            >
              {t("add.previous")}
            </button>
            {!isEditMode && (
              <button onClick={handleSaveDraft} type="button">
                <FiSave aria-hidden="true" />
                {t("add.saveDraft")}
              </button>
            )}
            <button
              disabled={activeStepIndex === formSteps.length - 1}
              onClick={() => moveStep(1)}
              type="button"
            >
              {t("add.next")}
            </button>
            {draftStatus && <small>{draftStatus}</small>}
          </div>
        </form>

        <AddListingImagePanel
          errors={errors}
          formState={formState}
          handleImageChange={handleImageChange}
          handleImageDrop={handleImageDrop}
          imagePreview={imagePreview}
          imagePreviews={imagePreviews}
          imageUploadNotice={imageUploadNotice}
          isDragActive={isDragActive}
          isProcessingImages={isProcessingImages}
          isSubmitting={isSubmitting}
          makeMainImage={makeMainImage}
          moveImage={moveImage}
          previewPrice={previewPrice}
          removeImage={removeImage}
          selectedFileName={selectedFileName}
          setActiveImage={setActiveImage}
          setIsDragActive={setIsDragActive}
          t={t}
        />
      </div>
      )}
    </section>
  );
}

export default AddListingPage;
