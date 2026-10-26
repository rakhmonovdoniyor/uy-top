export const IMAGE_UPLOAD_LIMITS = {
  maxFiles: 8,
  maxOutputBytes: 2.2 * 1024 * 1024,
  maxSourceBytes: 10 * 1024 * 1024,
  maxDimension: 1600,
  minLongSide: 900,
  minShortSide: 480,
};

const allowedTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function formatFileSize(bytes = 0) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} B`;
}

export function validateImageSelection(files, { maxFiles = IMAGE_UPLOAD_LIMITS.maxFiles } = {}) {
  const selectedFiles = Array.from(files || []);
  const accepted = [];
  const errors = [];

  selectedFiles.slice(0, maxFiles).forEach((file) => {
    if (!allowedTypes.has(file.type)) {
      errors.push(`${file.name}: faqat JPG, PNG, WEBP yoki GIF yuklang.`);
      return;
    }

    if (file.size > IMAGE_UPLOAD_LIMITS.maxSourceBytes) {
      errors.push(
        `${file.name}: fayl ${formatFileSize(
          IMAGE_UPLOAD_LIMITS.maxSourceBytes
        )} dan katta.`
      );
      return;
    }

    accepted.push(file);
  });

  if (selectedFiles.length > maxFiles) {
    errors.push(`Bir e'londa jami ${IMAGE_UPLOAD_LIMITS.maxFiles} tagacha rasm bo'ladi.`);
  }

  return { accepted, errors };
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Rasmni o'qib bo'lmadi."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function getOutputName(file) {
  return `${file.name.replace(/\.[^.]+$/, "") || "uytop-image"}.jpg`;
}

function hasEnoughResolution(image) {
  const longSide = Math.max(image.naturalWidth, image.naturalHeight);
  const shortSide = Math.min(image.naturalWidth, image.naturalHeight);

  return (
    longSide >= IMAGE_UPLOAD_LIMITS.minLongSide &&
    shortSide >= IMAGE_UPLOAD_LIMITS.minShortSide
  );
}

export async function validateImageDimensions(files) {
  if (typeof Image === "undefined" || typeof URL === "undefined") {
    return { accepted: Array.from(files || []), errors: [] };
  }

  const accepted = [];
  const errors = [];

  for (const file of Array.from(files || [])) {
    try {
      const image = await readImage(file);

      if (!hasEnoughResolution(image)) {
        errors.push(
          `${file.name}: rasm kamida ${IMAGE_UPLOAD_LIMITS.minLongSide}x${IMAGE_UPLOAD_LIMITS.minShortSide} px sifatida bo'lishi kerak. Hozirgi o'lcham: ${image.naturalWidth}x${image.naturalHeight} px.`
        );
        continue;
      }

      accepted.push(file);
    } catch (error) {
      errors.push(error.message || `${file.name}: rasmni o'qib bo'lmadi.`);
    }
  }

  return { accepted, errors };
}

export async function optimizeImageFile(file) {
  if (
    file.type === "image/gif" ||
    typeof document === "undefined" ||
    typeof File === "undefined"
  ) {
    return file;
  }

  const image = await readImage(file);
  const ratio = Math.min(
    1,
    IMAGE_UPLOAD_LIMITS.maxDimension / image.naturalWidth,
    IMAGE_UPLOAD_LIMITS.maxDimension / image.naturalHeight
  );
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.88;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);

  while (
    blob &&
    blob.size > IMAGE_UPLOAD_LIMITS.maxOutputBytes &&
    quality > 0.54
  ) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (!blob || blob.size >= file.size) {
    return file;
  }

  return new File([blob], getOutputName(file), {
    lastModified: Date.now(),
    type: "image/jpeg",
  });
}

export async function prepareImageFiles(files) {
  return Promise.all(Array.from(files || []).map((file) => optimizeImageFile(file)));
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Rasm preview tayyorlanmadi."));
    reader.readAsDataURL(file);
  });
}
