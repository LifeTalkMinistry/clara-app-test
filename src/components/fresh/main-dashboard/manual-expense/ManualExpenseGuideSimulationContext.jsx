import { createContext, useContext } from "react";

const DEFAULT_GUIDE_SIMULATION = Object.freeze({
  active: false,
  onClose: null,
  onNext: null,
  nextLabel: "Next",
  safetyMessage: "GUIDE MODE — NOTHING WILL BE SAVED",
});

const ManualExpenseGuideSimulationContext = createContext(DEFAULT_GUIDE_SIMULATION);

export function ManualExpenseGuideSimulationProvider({ children, value = {} }) {
  return (
    <ManualExpenseGuideSimulationContext.Provider
      value={{
        ...DEFAULT_GUIDE_SIMULATION,
        ...value,
        active: true,
      }}
    >
      {children}
    </ManualExpenseGuideSimulationContext.Provider>
  );
}

export function useManualExpenseGuideSimulation() {
  return useContext(ManualExpenseGuideSimulationContext);
}
