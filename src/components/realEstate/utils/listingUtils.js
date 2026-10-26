import {
  fallbackListingImage,
  initialListingForm,
  listingPlans,
} from "../constants";

const planTags = listingPlans.map((plan) => plan.tag);

function cleanStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

export function formatArea(area) {
  return `${area} m2`;
}

export function normalizePhoneDigits(phone = "") {
  return String(phone).replace(/\D/g, "");
}

export function getUserIdFromPhone(phone = "") {
  const digits = normalizePhoneDigits(phone);
  return digits ? `user-${digits}` : "";
}

export function getUserId(user) {
  return user?.id || getUserIdFromPhone(user?.phone);
}

export function getListingOwnerId(listing) {
  return listing?.ownerId || getUserIdFromPhone(listing?.phone);
}

export function canManageListing(listing, currentUser) {
  if (!listing || !currentUser) {
    return false;
  }

  if (currentUser.role === "admin") {
    return true;
  }

  const currentUserId = getUserId(currentUser);
  const listingOwnerId = getListingOwnerId(listing);

  return (
    Boolean(currentUserId && listingOwnerId && currentUserId === listingOwnerId) ||
    Boolean(listing.phone && currentUser.phone && listing.phone === currentUser.phone)
  );
}

export function canViewListing(listing, currentUser) {
  if (!listing) {
    return false;
  }

  return listing.moderationStatus === "approved" || canManageListing(listing, currentUser);
}

export function getListingPlan(listing = {}) {
  if (listing.listingPlan) {
    return listing.listingPlan;
  }

  const tags = Array.isArray(listing.tags) ? listing.tags : [];
  const matchedPlan = [...listingPlans]
    .reverse()
    .find((plan) => tags.includes(plan.tag));

  return matchedPlan?.value || "standard";
}

function getPlanExpiry(planValue, existingValue = "") {
  if (existingValue) {
    return existingValue;
  }

  if (planValue === "standard") {
    return "";
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (planValue === "premium" ? 30 : 14));
  return expiresAt.toISOString();
}

function formatPriceLabel(price, dealType = "sale") {
  return dealType === "rent"
    ? `$${Number(price || 0).toLocaleString("en-US")} / oy`
    : `$${Number(price || 0).toLocaleString("en-US")}`;
}

function normalizePriceHistoryEntries(value = []) {
  return Array.isArray(value)
    ? value
        .map((item) => ({
          changedAt: item.changedAt || item.createdAt || item.updatedAt || "",
          price: Number(item.price || 0),
          priceLabel: item.priceLabel || formatPriceLabel(item.price),
        }))
        .filter((item) => item.price > 0)
    : [];
}

export function buildPriceHistory(existing = {}, nextPrice, nextPriceLabel, timestamp) {
  const nextPriceNumber = Number(nextPrice || 0);
  const existingPrice = Number(existing.price || 0);
  const existingHistory = normalizePriceHistoryEntries(existing.priceHistory);

  if (!existing.id || !existingPrice || !nextPriceNumber) {
    return existingHistory;
  }

  if (existingPrice === nextPriceNumber) {
    return existingHistory;
  }

  const lastPrice = Number(existingHistory[existingHistory.length - 1]?.price || 0);

  if (lastPrice === nextPriceNumber) {
    return existingHistory;
  }

  const hasPreviousPrice = existingHistory.some(
    (item) => Number(item.price) === existingPrice
  );
  const previousEntry = {
    changedAt: existing.updatedAt || existing.createdAt || timestamp,
    price: existingPrice,
    priceLabel: existing.priceLabel || formatPriceLabel(existingPrice, existing.dealType),
  };
  const nextEntry = {
    changedAt: timestamp,
    price: nextPriceNumber,
    priceLabel: nextPriceLabel || formatPriceLabel(nextPriceNumber, existing.dealType),
  };

  return [
    ...(hasPreviousPrice ? existingHistory : [...existingHistory, previousEntry]),
    nextEntry,
  ].slice(-8);
}

export function isFeaturedListing(listing = {}) {
  return ["top", "premium"].includes(getListingPlan(listing));
}

export function getListingStats(listing, favoriteIds = [], messages = []) {
  const listingId = Number(listing?.id || 0);
  const leadCount = messages.filter(
    (message) => Number(message.listingId) === listingId
  ).length;
  const favoriteCount = favoriteIds.some((id) => Number(id) === listingId) ? 1 : 0;
  const baseViews = listingId ? ((listingId * 37) % 260) + 36 : 0;

  return {
    favorites: favoriteCount,
    leads: leadCount,
    views: Number(listing?.views || listing?.viewCount || baseViews + leadCount * 9),
  };
}

export function getWhatsAppLink(phone, text = "") {
  const digits = normalizePhoneDigits(phone);
  const message = encodeURIComponent(text);

  return `https://wa.me/${digits}${message ? `?text=${message}` : ""}`;
}

export function getTelegramShareLink(title, url) {
  const safeUrl = encodeURIComponent(url || "");
  const text = encodeURIComponent(title || "UyTop e'loni");

  return `https://t.me/share/url?url=${safeUrl}&text=${text}`;
}

const cityAliases = {
  Andijon: ["andijon", "andijan", "андижан"],
  Buxoro: ["buxoro", "bukhara", "бухара"],
  Samarqand: ["samarqand", "samarkand", "самарканд"],
  Toshkent: ["toshkent", "tashkent", "ташкент"],
};

Object.assign(cityAliases, {
  Andijon: ["andijon", "andijan"],
  Buxoro: ["buxoro", "bukhara"],
  "Farg'ona": ["fargona", "farg'ona", "fergana"],
  Jizzax: ["jizzax", "jizzakh"],
  Namangan: ["namangan"],
  Navoiy: ["navoiy", "navoi"],
  Qashqadaryo: ["qashqadaryo", "kashkadarya", "qarshi"],
  "Qoraqalpog'iston": [
    "qoraqalpogiston",
    "qoraqalpog'iston",
    "karakalpakstan",
    "nukus",
  ],
  Samarqand: ["samarqand", "samarkand"],
  Sirdaryo: ["sirdaryo", "syrdarya", "guliston"],
  Surxondaryo: ["surxondaryo", "surkhandarya", "termiz"],
  Toshkent: ["toshkent", "tashkent"],
  "Toshkent viloyati": ["toshkent viloyati", "tashkent region"],
  Xorazm: ["xorazm", "khorezm", "urganch"],
});

const propertyTypeAliases = {
  Hovli: ["hovli", "uy", "house", "home", "дом", "дома"],
  Kvartira: ["kvartira", "xonadon", "apartment", "flat", "квартира"],
};

const numberWords = {
  bir: 1,
  one: 1,
  один: 1,
  ikki: 2,
  two: 2,
  два: 2,
  uch: 3,
  three: 3,
  три: 3,
  tort: 4,
  "to'rt": 4,
  "to‘rt": 4,
  four: 4,
  четыре: 4,
  besh: 5,
  five: 5,
  пять: 5,
  olti: 6,
  six: 6,
  шесть: 6,
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSearchText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`ʻ]/g, "'")
    .replace(/[-_/.,;:!?()[\]{}"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findOptionInText(text, options = [], aliasMap = {}) {
  const matches = [];

  options.forEach((option) => {
    const aliases = aliasMap[option] || [option];

    aliases.forEach((alias) => {
      const normalizedAlias = normalizeSearchText(alias);

      if (!normalizedAlias) {
        return;
      }

      const pattern = new RegExp(
        `(^|\\s)${escapeRegExp(normalizedAlias)}(?=\\s|$)`,
        "i"
      );
      const match = text.match(pattern);

      if (match) {
        matches.push({
          matched: normalizedAlias,
          value: option,
        });
      }
    });
  });

  return matches.sort((first, second) => second.matched.length - first.matched.length)[0];
}

function removePhrase(text, phrase) {
  if (!phrase) {
    return text;
  }

  return text
    .replace(new RegExp(`(^|\\s)${escapeRegExp(phrase)}(?=\\s|$)`, "gi"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNumberFromToken(value) {
  const normalized = normalizeSearchText(value);

  if (numberWords[normalized]) {
    return numberWords[normalized];
  }

  return Number(String(value).replace(/\D/g, ""));
}

function parsePriceNumber(value, unit = "") {
  const number = Number(String(value).replace(/[^\d]/g, ""));
  const normalizedUnit = normalizeSearchText(unit);

  if (!number) {
    return 0;
  }

  if (["k", "ming", "минг", "тыс", "thousand"].includes(normalizedUnit)) {
    return number * 1000;
  }

  if (["m", "mln", "млн", "million"].includes(normalizedUnit)) {
    return number * 1000000;
  }

  return number;
}

export function parseNaturalLanguageSearch(query, options = {}) {
  const originalQuery = String(query || "").trim();

  if (!originalQuery) {
    return {
      applied: [],
      filters: {},
      hasChanges: false,
      query: "",
    };
  }

  let workingText = normalizeSearchText(originalQuery);
  const nextFilters = {};
  const applied = [];

  const cityMatch = findOptionInText(workingText, options.cities || [], cityAliases);
  if (cityMatch) {
    nextFilters.city = cityMatch.value;
    applied.push({ key: "city", value: cityMatch.value });
    workingText = removePhrase(workingText, cityMatch.matched);
  }

  const districtMatch = findOptionInText(workingText, options.districts || []);
  if (districtMatch) {
    nextFilters.district = districtMatch.value;
    applied.push({ key: "district", value: districtMatch.value });
    workingText = removePhrase(workingText, districtMatch.matched);
  }

  const propertyMatch = findOptionInText(
    workingText,
    Object.keys(propertyTypeAliases),
    propertyTypeAliases
  );
  if (propertyMatch) {
    nextFilters.propertyType = propertyMatch.value;
    applied.push({ key: "propertyType", value: propertyMatch.value });
    workingText = removePhrase(workingText, propertyMatch.matched);
  }

  const dealPatterns = [
    {
      pattern: /\b(ijara|arenda|аренда|аренду|rent|rental|oylik)\b/i,
      value: "rent",
    },
    {
      pattern: /\b(sotuv|sotib|sotish|prodaja|продажа|купить|sale|buy)\b/i,
      value: "sale",
    },
  ];
  const dealMatch = dealPatterns.find((item) => item.pattern.test(workingText));
  if (dealMatch) {
    nextFilters.dealType = dealMatch.value;
    applied.push({ key: "dealType", value: dealMatch.value });
    workingText = workingText.replace(dealMatch.pattern, " ").replace(/\s+/g, " ").trim();
  }

  const roomPattern =
    /(^|\s)(\d+|bir|ikki|uch|tort|to'rt|to‘rt|besh|olti|one|two|three|four|five|six|один|два|три|четыре|пять|шесть)\s*(?:ta\s*)?(?:xona|xonali|комнат[а-яё]*|комн[а-яё]*|room\w*|bedroom\w*|br)(?=\s|$)/i;
  const roomMatch = workingText.match(roomPattern);
  if (roomMatch) {
    const roomCount = getNumberFromToken(roomMatch[2]);

    if (roomCount > 0) {
      nextFilters.rooms = String(Math.min(roomCount, 4));
      applied.push({ key: "rooms", value: nextFilters.rooms });
      workingText = workingText.replace(roomMatch[0], " ").replace(/\s+/g, " ").trim();
    }
  }

  const pricePattern =
    /(?:\$|usd)?\s*(\d+(?:[\s.,]\d{3})*|\d+)\s*(k|ming|минг|тыс|thousand|m|mln|млн|million)?\s*(?:\$|usd)?/gi;
  const priceMatches = [...workingText.matchAll(pricePattern)];
  const priceMatch = priceMatches.find((match) => {
    const price = parsePriceNumber(match[1], match[2]);
    return price > 10;
  });

  if (priceMatch) {
    const price = parsePriceNumber(priceMatch[1], priceMatch[2]);
    const matchStart = priceMatch.index || 0;
    const matchEnd = matchStart + priceMatch[0].length;
    const context = workingText.slice(
      Math.max(0, matchStart - 36),
      Math.min(workingText.length, matchEnd + 36)
    );
    const hasMinIntent =
      />=|>\s*\d|dan\s*(yuqori|kop|ko'p)|kamida|qimmat|от|выше|больше|from|above|over/.test(
        context
      );
    const hasMaxIntent =
      /<=|<\s*\d|dan\s*kam|gacha|kamroq|arzon|до|меньше|дешевле|under|below|less/.test(
        context
      );

    if (hasMinIntent && !hasMaxIntent) {
      nextFilters.minPrice = String(price);
      applied.push({ key: "minPrice", value: String(price) });
    } else {
      nextFilters.maxPrice = String(price);
      applied.push({ key: "maxPrice", value: String(price) });
    }

    workingText = workingText
      .replace(priceMatch[0], " ")
      .replace(
        /\b(dan|kam|gacha|kamroq|arzon|qimmat|kamida|yuqori|kop|ko'p|до|от|меньше|больше|дешевле|выше|under|below|less|from|above|over)\b/gi,
        " "
      )
      .replace(/[<>]=?/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const explicitFilterKeys = ["dealType", "rooms", "minPrice", "maxPrice"];
  const hasExplicitFilter = applied.some((item) => explicitFilterKeys.includes(item.key));
  const hasChanges = applied.length >= 2 || hasExplicitFilter;

  if (!hasChanges) {
    return {
      applied: [],
      filters: {},
      hasChanges: false,
      query: originalQuery,
    };
  }

  return {
    applied,
    filters: {
      ...nextFilters,
      query: workingText,
    },
    hasChanges: true,
    query: workingText,
  };
}

export function buildListingFromForm(formState, imagePreview, options = {}) {
  const priceNumber = Number(String(formState.price).replace(/\D/g, ""));
  const existing = options.existing || {};
  const updatedAt = new Date().toISOString();
  const imageItems = (Array.isArray(imagePreview) ? imagePreview : [imagePreview])
    .map((item) =>
      typeof item === "string"
        ? { src: item }
        : {
            metadata: item.metadata || item,
            src: item.src || item.url || item.image || "",
          }
    )
    .filter((item) => item.src);
  const imageList = imageItems.map((item) => item.src);
  const imageMetadata = imageItems
    .map((item) => ({
      height: Number(item.metadata?.height || 0),
      mimeType: item.metadata?.mimeType || "",
      originalName: item.metadata?.originalName || "",
      path: item.metadata?.path || "",
      size: Number(item.metadata?.size || 0),
      url: item.src,
      width: Number(item.metadata?.width || 0),
    }))
    .filter((item) => item.url);
  const galleryImages =
    imageList.length > 0
      ? imageList
      : existing.galleryImages || [existing.image || fallbackListingImage];
  const selectedPlan =
    listingPlans.find((plan) => plan.value === formState.listingPlan) ||
    listingPlans[0];
  const paymentRequired = selectedPlan.value !== "standard";
  const paymentAmount = Number(selectedPlan.price || 0);
  const isNegotiable = Boolean(formState.negotiable);
  const amenities = cleanStringArray(formState.amenities);
  const utilities = cleanStringArray(formState.utilities);
  const existingTags = Array.isArray(existing.tags) ? existing.tags : [];
  const baseTags = existingTags.length
    ? existingTags
    : ["Yangi e'lon", "Saytda", formState.propertyType];
  const tags = Array.from(
    new Set([
      ...baseTags.filter(
        (tag) => !planTags.includes(tag) && tag !== "Kelishiladi"
      ),
      selectedPlan.tag,
      ...(isNegotiable ? ["Kelishiladi"] : []),
      formState.propertyType,
    ])
  );

  const priceLabel =
    formState.dealType === "rent"
      ? `$${priceNumber.toLocaleString("en-US")} / oy`
      : `$${priceNumber.toLocaleString("en-US")}`;

  return {
    id: options.id ?? Date.now(),
    title: formState.title.trim(),
    dealType: formState.dealType,
    typeLabel: formState.dealType === "rent" ? "Ijara" : "Sotuv",
    propertyType: formState.propertyType,
    city: formState.city.trim(),
    district: formState.district.trim(),
    address: formState.address.trim(),
    latitude: formState.latitude ? Number(formState.latitude) : existing.latitude || "",
    longitude: formState.longitude ? Number(formState.longitude) : existing.longitude || "",
    price: priceNumber,
    priceHistory: buildPriceHistory(existing, priceNumber, priceLabel, updatedAt),
    priceLabel,
    rooms: Number(formState.rooms),
    area: Number(formState.area),
    floor: formState.floor.trim(),
    renovationCondition: String(formState.renovationCondition || "").trim(),
    documentType: String(formState.documentType || "").trim(),
    furnished: Boolean(formState.furnished),
    amenities,
    utilities,
    image: galleryImages[0] || fallbackListingImage,
    imageMetadata:
      imageMetadata.length > 0 ? imageMetadata : existing.imageMetadata || [],
    galleryImages,
    ownerId: options.ownerId || existing.ownerId || null,
    tags,
    listingPlan: selectedPlan.value,
    planExpiresAt: getPlanExpiry(selectedPlan.value, existing.planExpiresAt),
    paymentAmount,
    paymentProvider: paymentRequired
      ? formState.paymentProvider || existing.paymentProvider || "click"
      : "",
    paymentReference: paymentRequired
      ? existing.paymentReference || `UYTOP-${Date.now()}`
      : "",
    paymentStatus: paymentRequired
      ? existing.paymentStatus || "pending"
      : "not_required",
    phone: formState.phone.trim(),
    agent: formState.agent.trim(),
    published: existing.published || "Hozirgina",
    verified: existing.verified || selectedPlan.value !== "standard",
    description: formState.description.trim(),
    negotiable: isNegotiable,
    moderationStatus:
      options.moderationStatus || existing.moderationStatus || "approved",
  };
}

export function getFormStateFromListing(listing) {
  return {
    ...initialListingForm,
    title: listing.title || "",
    dealType: listing.dealType || "sale",
    propertyType: listing.propertyType || "Kvartira",
    price: listing.price ? String(listing.price) : "",
    city: listing.city || "Toshkent",
    district: listing.district || "",
    address: listing.address || "",
    latitude: listing.latitude ? String(listing.latitude) : "",
    longitude: listing.longitude ? String(listing.longitude) : "",
    rooms: listing.rooms ? String(listing.rooms) : "",
    area: listing.area ? String(listing.area) : "",
    floor: listing.floor || "",
    renovationCondition:
      listing.renovationCondition || initialListingForm.renovationCondition,
    documentType: listing.documentType || initialListingForm.documentType,
    furnished: Boolean(listing.furnished),
    amenities: cleanStringArray(listing.amenities),
    utilities: cleanStringArray(listing.utilities),
    description: listing.description || "",
    phone: listing.phone || initialListingForm.phone,
    agent: listing.agent || initialListingForm.agent,
    listingPlan: getListingPlan(listing),
    paymentProvider: listing.paymentProvider || initialListingForm.paymentProvider,
    negotiable:
      Boolean(listing.negotiable) ||
      Boolean(listing.tags?.includes("Kelishiladi")),
  };
}

export function filterListings(filters, sourceListings = []) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const minPrice = Number(filters.minPrice || 0);
  const maxPrice = Number(filters.maxPrice || 0);
  const minArea = Number(filters.minArea || 0);
  const maxArea = Number(filters.maxArea || 0);

  const filteredListings = sourceListings.filter((listing) => {
    const matchesDeal =
      filters.dealType === "all" || listing.dealType === filters.dealType;
    const matchesCity = filters.city === "all" || listing.city === filters.city;
    const matchesDistrict =
      !filters.district ||
      filters.district === "all" ||
      listing.district === filters.district;
    const matchesPropertyType =
      filters.propertyType === "all" ||
      listing.propertyType === filters.propertyType;
    const matchesRooms =
      filters.rooms === "all" || listing.rooms >= Number(filters.rooms);
    const matchesPrice =
      (!minPrice || listing.price >= minPrice) &&
      (!maxPrice || listing.price <= maxPrice);
    const matchesArea =
      (!minArea || listing.area >= minArea) &&
      (!maxArea || listing.area <= maxArea);
    const matchesImages =
      !filters.imagesOnly ||
      Boolean(listing.image || listing.galleryImages?.length > 0);
    const matchesFeatured =
      !filters.featuredOnly || isFeaturedListing(listing);
    const matchesQuery =
      !normalizedQuery ||
      `${listing.title} ${listing.district} ${listing.address} ${listing.propertyType} ${listing.agent} ${listing.renovationCondition || ""} ${listing.documentType || ""} ${(listing.amenities || []).join(" ")} ${(listing.utilities || []).join(" ")} ${(listing.tags || []).join(" ")}`
        .toLowerCase()
        .includes(normalizedQuery);

    return (
      matchesDeal &&
      matchesCity &&
      matchesDistrict &&
      matchesPropertyType &&
      matchesRooms &&
      matchesPrice &&
      matchesArea &&
      matchesImages &&
      matchesFeatured &&
      matchesQuery
    );
  });

  return [...filteredListings].sort((first, second) => {
    if (filters.sortBy === "priceAsc") {
      return first.price - second.price;
    }

    if (filters.sortBy === "priceDesc") {
      return second.price - first.price;
    }

    if (filters.sortBy === "areaDesc") {
      return second.area - first.area;
    }

    if (filters.sortBy === "roomsDesc") {
      return second.rooms - first.rooms;
    }

    if (filters.sortBy === "featured") {
      return Number(isFeaturedListing(second)) - Number(isFeaturedListing(first));
    }

    return (
      new Date(second.createdAt || second.updatedAt || 0).getTime() -
      new Date(first.createdAt || first.updatedAt || 0).getTime()
    );
  });
}
