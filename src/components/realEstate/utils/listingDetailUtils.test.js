import {
  calculateMortgagePayment,
  formatHistoryDate,
  getPriceHistory,
  getPriceTrend,
} from "./listingDetailUtils";

test("calculates mortgage payment with down payment and interest", () => {
  const result = calculateMortgagePayment({
    annualRate: 18,
    downPaymentPercent: 25,
    price: 100000,
    years: 15,
  });

  expect(result.downPayment).toBe(25000);
  expect(result.loanAmount).toBe(75000);
  expect(Math.round(result.monthlyPayment)).toBe(1208);
});

test("appends current listing price when price history is stale", () => {
  const history = getPriceHistory({
    price: 90000,
    priceHistory: [
      {
        changedAt: "2026-01-01T00:00:00.000Z",
        price: 100000,
      },
    ],
    priceLabel: "$90,000",
    updatedAt: "2026-02-01T00:00:00.000Z",
  });

  expect(history).toHaveLength(2);
  expect(history[1]).toMatchObject({
    changedAt: "2026-02-01T00:00:00.000Z",
    price: 90000,
    priceLabel: "$90,000",
  });
});

test("detects price trend direction and percent", () => {
  const trend = getPriceTrend([
    { price: 100000, priceLabel: "$100,000" },
    { price: 85000, priceLabel: "$85,000" },
  ]);

  expect(trend.direction).toBe("down");
  expect(trend.percent).toBe(15);
});

test("formats Uzbek price history date without browser-specific month code", () => {
  expect(formatHistoryDate("2026-05-10T00:00:00.000Z", "uz")).toBe(
    "10-may, 2026",
  );
});
