import { useState } from "react";
import {
  formatFileSize,
  IMAGE_UPLOAD_LIMITS,
  prepareImageFiles,
  readFileAsDataUrl,
  validateImageDimensions,
  validateImageSelection,
} from "../../../services/imageUploadOptimizer";
import { fallbackListingImage } from "../constants";

export function useListingImageUpload({
  initialListing,
  isSubmitting,
  setErrors,
  setIsDirty,
  t,
}) {
  const [imagePreviews, setImagePreviews] = useState(
    initialListing?.galleryImages?.length
      ? initialListing.galleryImages
      : [initialListing?.image || fallbackListingImage]
  );
  const [imageFilesByPreview, setImageFilesByPreview] = useState({});
  const [activeImage, setActiveImage] = useState(imagePreviews[0]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [imageUploadNotice, setImageUploadNotice] = useState("");
  const imagePreview = activeImage || imagePreviews[0] || fallbackListingImage;

  async function processSelectedImages(selectedFiles) {
    const realPreviewCount =
      imagePreviews.length === 1 && imagePreviews[0] === fallbackListingImage
        ? 0
        : imagePreviews.length;
    const availableSlots = IMAGE_UPLOAD_LIMITS.maxFiles - realPreviewCount;

    if (selectedFiles.length === 0) {
      return;
    }

    if (availableSlots <= 0) {
      setErrors((current) => ({
        ...current,
        images: t("add.imagesTooMany", {
          count: IMAGE_UPLOAD_LIMITS.maxFiles,
        }),
      }));
      return;
    }

    const { accepted, errors: imageErrors } = validateImageSelection(
      selectedFiles,
      { maxFiles: availableSlots }
    );

    if (accepted.length === 0) {
      setErrors((current) => ({
        ...current,
        images: imageErrors[0] || t("add.validation.images"),
      }));
      return;
    }

    setIsDirty(true);
    setIsProcessingImages(true);
    setSelectedFileName(t("add.imagesProcessing"));
    setImageUploadNotice("");
    setErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors.images;
      return nextErrors;
    });

    try {
      const {
        accepted: resolutionAccepted,
        errors: resolutionErrors,
      } = await validateImageDimensions(accepted);

      if (resolutionAccepted.length === 0) {
        setErrors((current) => ({
          ...current,
          images:
            resolutionErrors[0] ||
            t("add.validation.imageLow"),
        }));
        return;
      }

      const optimizedFiles = await prepareImageFiles(resolutionAccepted);
      const nextItems = await Promise.all(
        optimizedFiles.map(async (file, index) => ({
          file,
          originalSize: resolutionAccepted[index].size,
          optimizedSize: file.size,
          src: await readFileAsDataUrl(file),
        }))
      );
      const cleanItems = nextItems.filter((item) => item.src);

      if (cleanItems.length === 0) {
        return;
      }

      setImagePreviews((current) => {
        const baseImages =
          current.length === 1 && current[0] === fallbackListingImage
            ? []
            : current;
        return [...baseImages, ...cleanItems.map((item) => item.src)].slice(
          0,
          IMAGE_UPLOAD_LIMITS.maxFiles
        );
      });
      setImageFilesByPreview((current) => {
        const nextMap = { ...current };

        cleanItems.forEach((item) => {
          nextMap[item.src] = item.file;
        });

        return nextMap;
      });
      setActiveImage(cleanItems[0].src);
      setSelectedFileName(
        cleanItems.length === 1
          ? cleanItems[0].file.name
          : t("add.imagesReady", { count: cleanItems.length })
      );

      const originalBytes = cleanItems.reduce(
        (sum, item) => sum + item.originalSize,
        0
      );
      const optimizedBytes = cleanItems.reduce(
        (sum, item) => sum + item.optimizedSize,
        0
      );

      setImageUploadNotice(
        t("add.imagesCompressed", {
          from: formatFileSize(originalBytes),
          to: formatFileSize(optimizedBytes),
        })
      );

      const uploadWarnings = [...imageErrors, ...resolutionErrors];

      if (uploadWarnings.length > 0) {
        setErrors((current) => ({
          ...current,
          images: uploadWarnings[0],
        }));
      }
    } catch (error) {
      setErrors((current) => ({
        ...current,
        images: error.message || t("add.validation.imageError"),
      }));
    } finally {
      setIsProcessingImages(false);
    }
  }

  async function handleImageChange(event) {
    await processSelectedImages(Array.from(event.target.files || []));
    event.target.value = "";
  }

  async function handleImageDrop(event) {
    event.preventDefault();
    setIsDragActive(false);

    if (isProcessingImages || isSubmitting) {
      return;
    }

    await processSelectedImages(Array.from(event.dataTransfer.files || []));
  }

  function removeImage(image) {
    setIsDirty(true);
    setImagePreviews((current) => {
      const nextImages = current.filter((item) => item !== image);
      const safeImages =
        nextImages.length > 0 ? nextImages : [fallbackListingImage];

      if (activeImage === image) {
        setActiveImage(safeImages[0]);
      }

      return safeImages;
    });
    setImageFilesByPreview((current) => {
      const nextMap = { ...current };
      delete nextMap[image];
      return nextMap;
    });
  }

  function makeMainImage(image) {
    setIsDirty(true);
    setImagePreviews((current) => [
      image,
      ...current.filter((item) => item !== image),
    ]);
    setActiveImage(image);
  }

  function moveImage(image, direction) {
    setIsDirty(true);
    setImagePreviews((current) => {
      const currentIndex = current.indexOf(image);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextImages = [...current];
      [nextImages[currentIndex], nextImages[nextIndex]] = [
        nextImages[nextIndex],
        nextImages[currentIndex],
      ];

      if (currentIndex === 0 || nextIndex === 0) {
        setActiveImage(nextImages[0]);
      }

      return nextImages;
    });
  }

  function resetImages() {
    setImagePreviews([fallbackListingImage]);
    setImageFilesByPreview({});
    setActiveImage(fallbackListingImage);
    setSelectedFileName("");
    setImageUploadNotice("");
  }

  function getImagePayload() {
    return imagePreviews.map((image) => ({
      file: imageFilesByPreview[image] || null,
      src: image,
    }));
  }

  return {
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
  };
}
