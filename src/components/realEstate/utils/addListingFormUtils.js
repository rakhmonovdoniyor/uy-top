import { initialListingForm } from "../constants";
import { getFormStateFromListing } from "./listingUtils";

const DRAFT_KEY = "uytop.addListingDraft";

export const formSteps = [
  { key: "basics", labelKey: "add.basic" },
  { key: "location", labelKey: "add.location" },
  { key: "media", labelKey: "add.images" },
  { key: "contact", labelKey: "add.contact" },
];

export const fieldStepMap = {
  address: "location",
  agent: "contact",
  area: "location",
  description: "location",
  district: "location",
  floor: "location",
  latitude: "location",
  longitude: "location",
  phone: "contact",
  price: "basics",
  rooms: "location",
  title: "basics",
};

const requiredFields = [
  "title",
  "price",
  "district",
  "address",
  "rooms",
  "area",
  "floor",
];

export function loadDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveDraft(formState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(formState));
}

export function clearDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DRAFT_KEY);
}

export function getBlankListingFormState(currentUser) {
  return {
    ...initialListingForm,
    agent: currentUser?.name || initialListingForm.agent,
    phone: currentUser?.phone || initialListingForm.phone,
  };
}

export function getInitialListingFormState({ currentUser, initialListing }) {
  if (initialListing) {
    return getFormStateFromListing(initialListing);
  }

  const draft = loadDraft();

  return {
    ...initialListingForm,
    ...draft,
    agent: draft?.agent || currentUser?.name || initialListingForm.agent,
    phone: draft?.phone || currentUser?.phone || initialListingForm.phone,
  };
}

export function getListingFormProgress(formState) {
  const completedFields = requiredFields.filter((field) =>
    String(formState[field] || "").trim()
  ).length;

  return {
    completedFields,
    completionPercent: Math.round(
      (completedFields / requiredFields.length) * 100
    ),
    requiredFields,
  };
}

export function getPreviewPrice(formState) {
  const previewPriceNumber = Number(String(formState.price).replace(/\D/g, ""));

  if (previewPriceNumber) {
    return formState.dealType === "rent"
      ? `$${previewPriceNumber.toLocaleString("en-US")} / oy`
      : `$${previewPriceNumber.toLocaleString("en-US")}`;
  }

  return formState.dealType === "rent" ? "$850 / oy" : "$75 000";
}

export function validateListingForm(formState, t) {
  const nextErrors = {};
  const priceNumber = Number(String(formState.price).replace(/\D/g, ""));

  if (!formState.title.trim()) {
    nextErrors.title = t("add.validation.title");
  }

  if (!priceNumber) {
    nextErrors.price = t("add.validation.price");
  }

  if (!formState.district.trim()) {
    nextErrors.district = t("add.validation.district");
  }

  if (!formState.address.trim()) {
    nextErrors.address = t("add.validation.address");
  }

  if (!Number(formState.rooms)) {
    nextErrors.rooms = t("add.validation.rooms");
  }

  if (!Number(formState.area)) {
    nextErrors.area = t("add.validation.area");
  }

  if (!formState.floor.trim()) {
    nextErrors.floor = t("add.validation.floor");
  }

  if (formState.description.trim().length < 20) {
    nextErrors.description = t("add.validation.description");
  }

  if (!formState.phone.trim() || formState.phone.trim() === "+998") {
    nextErrors.phone = t("add.validation.phone");
  }

  if (!formState.agent.trim()) {
    nextErrors.agent = t("add.validation.agent");
  }

  return nextErrors;
}
