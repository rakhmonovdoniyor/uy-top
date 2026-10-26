export function clampNumber(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(Math.max(number, min), max);
}

export function calculateMortgagePayment({
  annualRate,
  downPaymentPercent,
  price,
  years,
}) {
  const safePrice = Math.max(Number(price) || 0, 0);
  const safeDownPaymentPercent = clampNumber(downPaymentPercent, 0, 95);
  const safeYears = clampNumber(years, 1, 30);
  const safeAnnualRate = clampNumber(annualRate, 0, 60);
  const downPayment = (safePrice * safeDownPaymentPercent) / 100;
  const loanAmount = Math.max(safePrice - downPayment, 0);
  const months = safeYears * 12;
  const monthlyRate = safeAnnualRate / 100 / 12;
  const monthlyPayment =
    monthlyRate > 0
      ? (loanAmount * monthlyRate * (1 + monthlyRate) ** months) /
        ((1 + monthlyRate) ** months - 1)
      : loanAmount / months;

  return {
    downPayment,
    loanAmount,
    monthlyPayment: Number.isFinite(monthlyPayment) ? monthlyPayment : 0,
  };
}

export function formatUsd(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}

export function formatHistoryDate(value, language = "uz") {
  const date = new Date(value || "");

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (language === "uz") {
    const months = [
      "yanvar",
      "fevral",
      "mart",
      "aprel",
      "may",
      "iyun",
      "iyul",
      "avgust",
      "sentabr",
      "oktabr",
      "noyabr",
      "dekabr",
    ];

    return `${String(date.getDate()).padStart(2, "0")}-${
      months[date.getMonth()]
    }, ${date.getFullYear()}`;
  }

  const localeByLanguage = {
    en: "en-US",
    ru: "ru-RU",
  };

  return new Intl.DateTimeFormat(localeByLanguage[language] || "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getPriceHistory(listing = {}) {
  const entries = Array.isArray(listing.priceHistory)
    ? listing.priceHistory
        .map((item) => ({
          changedAt: item.changedAt || item.createdAt || item.updatedAt || "",
          price: Number(item.price || 0),
          priceLabel: item.priceLabel || formatUsd(item.price),
        }))
        .filter((item) => item.price > 0)
    : [];
  const currentPrice = Number(listing.price || 0);
  const lastPrice = Number(entries[entries.length - 1]?.price || 0);

  if (entries.length > 0 && currentPrice > 0 && lastPrice !== currentPrice) {
    return [
      ...entries,
      {
        changedAt: listing.updatedAt || new Date().toISOString(),
        price: currentPrice,
        priceLabel: listing.priceLabel || formatUsd(currentPrice),
      },
    ];
  }

  return entries;
}

export function getPriceTrend(priceHistory = []) {
  if (priceHistory.length < 2) {
    return null;
  }

  const previous = priceHistory[priceHistory.length - 2];
  const current = priceHistory[priceHistory.length - 1];
  const difference = Number(current.price) - Number(previous.price);

  if (!difference || !previous.price) {
    return null;
  }

  return {
    current,
    direction: difference < 0 ? "down" : "up",
    percent: Math.abs((difference / previous.price) * 100),
    previous,
  };
}
