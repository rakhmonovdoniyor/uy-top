import { fallbackListingImage } from "../constants";

function isLocalishHost(hostname = "") {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

export function getDisplayImageUrl(image, fallback = fallbackListingImage) {
  const rawSource =
    typeof image === "string"
      ? image
      : image?.url || image?.src || image?.image || image?.path || "";
  const source = String(rawSource || "").trim();

  if (!source) {
    return fallback;
  }

  if (typeof window === "undefined") {
    return source;
  }

  try {
    const url = new URL(source, window.location.origin);
    const pageHost = window.location.hostname;

    if (
      pageHost &&
      isLocalishHost(pageHost) &&
      isLocalishHost(url.hostname) &&
      pageHost !== url.hostname
    ) {
      url.hostname = pageHost;
      return url.toString();
    }

    return url.toString();
  } catch {
    return source;
  }
}

export function showFallbackImage(event) {
  const image = event.currentTarget;

  if (image.src === fallbackListingImage) {
    return;
  }

  image.src = fallbackListingImage;
}
