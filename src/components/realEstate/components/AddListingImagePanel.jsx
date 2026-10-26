import {
  FiArrowLeft,
  FiArrowRight,
  FiCamera,
  FiCheckCircle,
  FiImage,
  FiShield,
  FiX,
} from "react-icons/fi";
import {
  formatFileSize,
  IMAGE_UPLOAD_LIMITS,
} from "../../../services/imageUploadOptimizer";
import { fallbackListingImage } from "../constants";

function AddListingImagePanel({
  errors,
  formState,
  handleImageChange,
  handleImageDrop,
  imagePreview,
  imagePreviews,
  imageUploadNotice,
  isDragActive,
  isProcessingImages,
  isSubmitting,
  makeMainImage,
  moveImage,
  previewPrice,
  removeImage,
  selectedFileName,
  setActiveImage,
  setIsDragActive,
  t,
}) {
  return (
    <aside className="upload-preview-panel">
      <label
        className={`upload-box ${isDragActive ? "drag-active" : ""}`}
        htmlFor="listing-image-upload"
        onDragLeave={() => setIsDragActive(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDrop={handleImageDrop}
      >
        <FiImage aria-hidden="true" />
        <strong>{t("add.imageUpload")}</strong>
        <span>
          {isProcessingImages
            ? t("add.imagesProcessing")
            : selectedFileName ||
              t("add.imageUploadRules", {
                long: IMAGE_UPLOAD_LIMITS.minLongSide,
                short: IMAGE_UPLOAD_LIMITS.minShortSide,
                size: formatFileSize(IMAGE_UPLOAD_LIMITS.maxSourceBytes),
              })}
        </span>
        <em>{t("add.imageUploadHint")}</em>
        <input
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={isProcessingImages || isSubmitting}
          id="listing-image-upload"
          multiple
          onChange={handleImageChange}
          type="file"
        />
      </label>
      {imageUploadNotice && (
        <small className="upload-status">{imageUploadNotice}</small>
      )}
      {errors.images && <small className="form-error">{errors.images}</small>}
      <div className="image-preview-grid">
        {imagePreviews.map((image, index) => (
          <div
            className={`image-preview-tile ${
              imagePreview === image ? "active" : ""
            }`}
            key={`${image}-${index}`}
          >
            <button
              aria-label={t("add.imageSelect", { index: index + 1 })}
              className="image-preview-select"
              onClick={() => setActiveImage(image)}
              type="button"
            >
              <img
                alt={t("add.imageSelect", { index: index + 1 })}
                src={image}
              />
            </button>
            {index === 0 && <strong>{t("add.imageMain")}</strong>}
            {imagePreviews.length > 1 && (
              <div className="image-order-actions">
                <button
                  aria-label={t("add.imageMoveForward")}
                  disabled={index === 0}
                  onClick={() => moveImage(image, -1)}
                  type="button"
                >
                  <FiArrowLeft aria-hidden="true" />
                </button>
                <button
                  aria-label={t("add.imageMoveBack")}
                  disabled={index === imagePreviews.length - 1}
                  onClick={() => moveImage(image, 1)}
                  type="button"
                >
                  <FiArrowRight aria-hidden="true" />
                </button>
              </div>
            )}
            {index !== 0 && (
              <button
                aria-label={t("add.imageMakeMain")}
                className="image-main-action"
                onClick={() => makeMainImage(image)}
                type="button"
              >
                {t("add.imageMakeMain")}
              </button>
            )}
            {image !== fallbackListingImage && (
              <button
                aria-label={t("add.imageRemove")}
                className="image-remove-action"
                onClick={() => removeImage(image)}
                type="button"
              >
                <FiX aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="preview-card">
        <img alt={t("add.preview")} src={imagePreview} />
        <div>
          <span className="estate-kicker">{t("add.preview")}</span>
          <h3>{formState.title || t("add.previewTitle")}</h3>
          <strong className="preview-price">
            {previewPrice}
            {formState.negotiable ? ` - ${t("detail.negotiable")}` : ""}
          </strong>
          <p>
            {formState.city}
            {formState.district ? `, ${formState.district}` : ""} -
            {formState.rooms || "2"} {t("add.rooms").toLowerCase()},{" "}
            {formState.area || "86"} m2
          </p>
        </div>
      </div>
      <div className="publish-steps vertical">
        <span>
          <FiCamera aria-hidden="true" />
          {t("add.imageAndDocs")}
        </span>
        <span>
          <FiShield aria-hidden="true" />
          {t("add.adminControl")}
        </span>
        <span>
          <FiCheckCircle aria-hidden="true" />
          {t("add.availableOnSite")}
        </span>
      </div>
    </aside>
  );
}

export default AddListingImagePanel;
