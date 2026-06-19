import { createContext, useContext } from "react";

export const ClaraGuideSimulationContext = createContext(null);

export function useClaraGuideSimulation() {
  return useContext(ClaraGuideSimulationContext);
}
