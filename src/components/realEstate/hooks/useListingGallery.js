import { useCallback, useEffect, useMemo, useState } from "react";

export function useListingGallery({ listing, relatedListings }) {
  const galleryItems = useMemo(
    () =>
      listing
        ? listing.galleryImages?.length
          ? listing.galleryImages.map((image, index) => ({
              id: `${listing.id}-${index}`,
              image,
              title: listing.title,
            }))
          : [listing, ...relatedListings].slice(0, 4)
        : [],
    [listing, relatedListings]
  );
  const [activeImage, setActiveImage] = useState(galleryItems[0]?.image);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const mainImage = activeImage || listing?.image || galleryItems[0]?.image;
  const activeImageIndex = Math.max(
    0,
    galleryItems.findIndex((item) => item.image === mainImage)
  );
  const showGalleryImage = useCallback(
    (direction) => {
      if (galleryItems.length === 0) {
        return;
      }

      const nextIndex =
        (activeImageIndex + direction + galleryItems.length) %
        galleryItems.length;
      setActiveImage(galleryItems[nextIndex].image);
    },
    [activeImageIndex, galleryItems]
  );

  useEffect(() => {
    setActiveImage(galleryItems[0]?.image);
  }, [galleryItems, listing?.id]);

  useEffect(() => {
    if (!isGalleryOpen) {
      return undefined;
    }

    function handleGalleryKeydown(event) {
      if (event.key === "Escape") {
        setIsGalleryOpen(false);
      }

      if (event.key === "ArrowLeft") {
        showGalleryImage(-1);
      }

      if (event.key === "ArrowRight") {
        showGalleryImage(1);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleGalleryKeydown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleGalleryKeydown);
    };
  }, [isGalleryOpen, showGalleryImage]);

  function openGallery(image) {
    setActiveImage(image);
    setIsGalleryOpen(true);
  }

  function closeGallery() {
    setIsGalleryOpen(false);
  }

  return {
    activeImageIndex,
    closeGallery,
    galleryItems,
    isGalleryOpen,
    mainImage,
    openGallery,
    setActiveImage,
    showGalleryImage,
  };
}
