import { requestClaraMasterclassAi } from "./clara-masterclass-ai";

export function requestBudgetMasterclassAi(options = {}) {
  return requestClaraMasterclassAi({ ...options, masterclassId: "budget" });
}
