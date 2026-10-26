import { useMemo, useState } from "react";
import { calculateMortgagePayment } from "../utils/listingDetailUtils";

export function useMortgageCalculator(price) {
  const [mortgageForm, setMortgageForm] = useState({
    annualRate: "18",
    downPaymentPercent: "25",
    years: "15",
  });
  const mortgageSummary = useMemo(
    () =>
      calculateMortgagePayment({
        annualRate: mortgageForm.annualRate,
        downPaymentPercent: mortgageForm.downPaymentPercent,
        price,
        years: mortgageForm.years,
      }),
    [mortgageForm, price]
  );

  function updateMortgageField(name, value) {
    setMortgageForm((current) => ({ ...current, [name]: value }));
  }

  return {
    mortgageForm,
    mortgageSummary,
    updateMortgageField,
  };
}
