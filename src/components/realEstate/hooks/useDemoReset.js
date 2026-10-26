import { realEstateDataGateway } from "../../../services/realEstateDataGateway";
import { realEstateRepository } from "../../../services/realEstateRepository";

export function useDemoReset({
  applyEstateState,
  clearCompareListings,
  resetFilters,
}) {
  function resetDemoState() {
    if (!realEstateDataGateway.shouldPersistLocalState()) {
      return;
    }

    applyEstateState(realEstateRepository.clearDemoState());
    resetFilters();
    clearCompareListings();
  }

  return { resetDemoState };
}
