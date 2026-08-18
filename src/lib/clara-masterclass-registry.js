import {
  BUDGET_MASTERCLASS_LANGUAGE_OPTIONS,
  buildBudgetMasterclassFollowUpPrompt,
  getBudgetMasterclassExperience,
  getBudgetMasterclassSupportSequenceForLanguage,
} from "./clara-budget-masterclass-i18n";
import { getBudgetMasterclassPointQuestions } from "./clara-budget-masterclass-questions";
import { getBudgetMasterclassQuestionSupports } from "./clara-budget-masterclass-question-supports";
import {
  EMERGENCY_FUND_MASTERCLASS_LANGUAGE_OPTIONS,
  buildEmergencyFundMasterclassFollowUpPrompt,
  getEmergencyFundMasterclassCompletionExample,
  getEmergencyFundMasterclassExperience,
  getEmergencyFundMasterclassSupportSequenceForLanguage,
} from "./clara-emergency-fund-masterclass-i18n";
import { getEmergencyFundMasterclassPointQuestions } from "./clara-emergency-fund-masterclass-questions";
import { getEmergencyFundMasterclassQuestionSupports } from "./clara-emergency-fund-masterclass-question-supports";

const MASTERCLASS_DEFINITIONS = Object.freeze({
  budget: Object.freeze({
    id: "budget",
    subjectLabel: "BUDGETING MASTERCLASS",
    languageOptions: BUDGET_MASTERCLASS_LANGUAGE_OPTIONS,
    getExperience: getBudgetMasterclassExperience,
    getSupportSequence: getBudgetMasterclassSupportSequenceForLanguage,
    getPointQuestions: getBudgetMasterclassPointQuestions,
    getQuestionSupports: getBudgetMasterclassQuestionSupports,
    buildFollowUpPrompt: buildBudgetMasterclassFollowUpPrompt,
    backRoute: "/community?view=home",
    closeRoute: "/community?view=orb",
    completedRoute: "/community?view=home",
    closeAriaLabel: "Close Budgeting Masterclass",
    preserveBudgetLanguageGateMarker: true,
    useLegacyBudgetStyleHooks: true,
    liveSession: Object.freeze({
      storageKey: "clara_budget_masterclass_live_context_v1",
      source: "budget-masterclass",
      stateKey: "budgetMasterclass",
    }),
  }),
  "emergency-fund": Object.freeze({
    id: "emergency-fund",
    subjectLabel: "EMERGENCY FUND MASTERCLASS",
    languageOptions: EMERGENCY_FUND_MASTERCLASS_LANGUAGE_OPTIONS,
    getExperience: getEmergencyFundMasterclassExperience,
    getSupportSequence: getEmergencyFundMasterclassSupportSequenceForLanguage,
    getPointQuestions: getEmergencyFundMasterclassPointQuestions,
    getQuestionSupports: getEmergencyFundMasterclassQuestionSupports,
    buildFollowUpPrompt: buildEmergencyFundMasterclassFollowUpPrompt,
    getCompletionExample: getEmergencyFundMasterclassCompletionExample,
    backRoute: "/community?view=home",
    closeRoute: "/community?view=orb",
    completedRoute: "/community?view=home",
    closeAriaLabel: "Close Emergency Fund Masterclass",
    preserveBudgetLanguageGateMarker: true,
    useLegacyBudgetStyleHooks: true,
    liveSession: Object.freeze({
      storageKey: "clara_emergency_fund_masterclass_live_context_v1",
      source: "emergency-fund-masterclass",
      stateKey: "emergencyFundMasterclass",
    }),
  }),
});

export const CLARA_MASTERCLASS_IDS = Object.freeze(Object.keys(MASTERCLASS_DEFINITIONS));

export function getClaraMasterclassDefinition(masterclassId = "") {
  const id = String(masterclassId || "").trim().toLowerCase();
  return MASTERCLASS_DEFINITIONS[id] || null;
}

export function isSupportedClaraMasterclass(masterclassId = "") {
  return Boolean(getClaraMasterclassDefinition(masterclassId));
}
