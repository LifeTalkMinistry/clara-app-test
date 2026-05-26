import { getSelectedLifeStageKey, normalizeLifeStageKey } from "./life-stage-flow";
import { LIVING_WITH_PARTNER_STAGE_KEY, getLivingWithPartnerSignals } from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";
import { YOUNG_PROFESSIONAL_STAGE_KEY } from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";

export const LIFE_STAGE_SIGNAL_REGISTRY = {
  "Working Student": [
    { id: "tired", icon: "\uD83D\uDE34", label: "Tired", ariaLabel: "Tired" },
    { id: "stress", icon: "\uD83E\uDDE0", label: "Stressed", ariaLabel: "Stressed" },
    { id: "sleepy", icon: "\uD83C\uDF19", label: "Sleepy", ariaLabel: "Sleepy" },
    { id: "hungry", icon: "\uD83C\uDF5C", label: "Hungry", ariaLabel: "Hungry" },
    { id: "pressure", icon: "\u23F0", label: "Time Pressure", ariaLabel: "Time Pressure" },
    { id: "moneyTiming", icon: "\uD83D\uDCB8", label: "Money Timing", ariaLabel: "Money Timing" },
    { id: "commute", icon: "\uD83D\uDE8C", label: "Commute Pressure", ariaLabel: "Commute Pressure" }
  ],
  [YOUNG_PROFESSIONAL_STAGE_KEY]: [
    { id: "workPressure", icon: "\uD83D\uDCBC", label: "Work Pressure", ariaLabel: "Work Pressure" },
    { id: "salaryLeak", icon: "\uD83D\uDCB8", label: "Salary Leak", ariaLabel: "Salary Leak" },
    { id: "billsPressure", icon: "\uD83E\uDDFE", label: "Bills", ariaLabel: "Bills" },
    { id: "careerPressure", icon: "\uD83D\uDCC8", label: "Career", ariaLabel: "Career" },
    { id: "burnoutRisk", icon: "\uD83E\uDDE0", label: "Burnout", ariaLabel: "Burnout" },
    { id: "familySupportPressure", icon: "\uD83E\uDD1D", label: "Family Support", ariaLabel: "Family Support" },
    { id: "socialLifestylePressure", icon: "\u2728", label: "Lifestyle", ariaLabel: "Lifestyle" }
  ],
  [LIVING_WITH_PARTNER_STAGE_KEY]: getLivingWithPartnerSignals().map((signal) => ({
    id: signal.key,
    icon: signal.icon,
    label: signal.label,
    ariaLabel: signal.label,
  })),
  "Family Household": [
    { id: "homeBills", icon: "\uD83E\uDDFE", label: "Home Bills", ariaLabel: "Home Bills" },
    { id: "foodNeeds", icon: "\uD83C\uDF5A", label: "Food Needs", ariaLabel: "Food Needs" },
    { id: "supportRequests", icon: "\uD83E\uDD1D", label: "Support Requests", ariaLabel: "Support Requests" },
    { id: "familyExpectations", icon: "\uD83C\uDFE0", label: "Family Expectations", ariaLabel: "Family Expectations" },
    { id: "boundaries", icon: "\uD83D\uDEE1\uFE0F", label: "Boundaries", ariaLabel: "Boundaries" },
    { id: "personalGoals", icon: "\uD83C\uDFAF", label: "Personal Goals", ariaLabel: "Personal Goals" },
    { id: "emergencyGaps", icon: "\uD83D\uDEA8", label: "Emergency Gaps", ariaLabel: "Emergency Gaps" }
  ],
  "Single Parent": [
    { id: "childEssentials", icon: "\uD83E\uDDD2", label: "Child Essentials", ariaLabel: "Child Essentials" },
    { id: "timePressure", icon: "\u23F0", label: "Time Pressure", ariaLabel: "Time Pressure" },
    { id: "emotionalEnergy", icon: "\uD83E\uDDE0", label: "Emotional Energy", ariaLabel: "Emotional Energy" },
    { id: "emergencyRisk", icon: "\uD83D\uDEA8", label: "Emergency Risk", ariaLabel: "Emergency Risk" },
    { id: "schoolCare", icon: "\uD83C\uDF92", label: "School / Care", ariaLabel: "School / Care" },
    { id: "personalSacrifice", icon: "\uD83D\uDEE1\uFE0F", label: "Personal Sacrifice", ariaLabel: "Personal Sacrifice" },
    { id: "futureProtection", icon: "\uD83C\uDF31", label: "Future Protection", ariaLabel: "Future Protection" }
  ],
  "Full-Time Earner": [
    { id: "salaryCycle", icon: "\uD83D\uDCBC", label: "Salary Cycle", ariaLabel: "Salary Cycle" },
    { id: "billsPressure", icon: "\uD83E\uDDFE", label: "Bills Pressure", ariaLabel: "Bills Pressure" },
    { id: "workFatigue", icon: "\uD83E\uDDE0", label: "Work Fatigue", ariaLabel: "Work Fatigue" },
    { id: "familyObligations", icon: "\uD83E\uDD1D", label: "Family Obligations", ariaLabel: "Family Obligations" },
    { id: "lifestyleCreep", icon: "\u2728", label: "Lifestyle Creep", ariaLabel: "Lifestyle Creep" },
    { id: "paydayLeak", icon: "\uD83D\uDCB8", label: "Payday Leak", ariaLabel: "Payday Leak" },
    { id: "futureGoals", icon: "\uD83D\uDCC8", label: "Future Goals", ariaLabel: "Future Goals" }
  ],
  "Freelance Season": [
    { id: "incomeVariability", icon: "\uD83D\uDCB8", label: "Income Variability", ariaLabel: "Income Variability" },
    { id: "clientTiming", icon: "\u23F3", label: "Client Timing", ariaLabel: "Client Timing" },
    { id: "dryWeeks", icon: "\uD83C\uDFDC\uFE0F", label: "Dry Weeks", ariaLabel: "Dry Weeks" },
    { id: "projectPressure", icon: "\uD83E\uDDE0", label: "Project Pressure", ariaLabel: "Project Pressure" },
    { id: "workCosts", icon: "\uD83E\uDDFE", label: "Work Costs", ariaLabel: "Work Costs" },
    { id: "restRisk", icon: "\uD83C\uDF19", label: "Rest Risk", ariaLabel: "Rest Risk" },
    { id: "cashFlowBuffer", icon: "\uD83D\uDEE2\uFE0F", label: "Cash-Flow Buffer", ariaLabel: "Cash-Flow Buffer" }
  ],
  "Business Builder": [
    { id: "cashFlow", icon: "\uD83D\uDCB8", label: "Cash Flow", ariaLabel: "Cash Flow" },
    { id: "reinvestment", icon: "\uD83D\uDCC8", label: "Reinvestment", ariaLabel: "Reinvestment" },
    { id: "operatingCosts", icon: "\uD83E\uDDFE", label: "Operating Costs", ariaLabel: "Operating Costs" },
    { id: "ownerPay", icon: "\uD83D\uDC64", label: "Owner Pay", ariaLabel: "Owner Pay" },
    { id: "growthPressure", icon: "\uD83D\uDE80", label: "Growth Pressure", ariaLabel: "Growth Pressure" },
    { id: "salesTiming", icon: "\u23F3", label: "Sales Timing", ariaLabel: "Sales Timing" },
    { id: "personalBoundary", icon: "\uD83D\uDEE1\uFE0F", label: "Personal Boundary", ariaLabel: "Personal Boundary" }
  ]
};

export const DEFAULT_LIFE_STAGE_SIGNALS = [
  { id: "pressure", icon: "\u23F0", label: "Pressure", ariaLabel: "Pressure" },
  { id: "stability", icon: "\uD83D\uDEE1\uFE0F", label: "Stability", ariaLabel: "Stability" },
  { id: "energy", icon: "\uD83E\uDDE0", label: "Energy", ariaLabel: "Energy" },
  { id: "growth", icon: "\uD83D\uDCC8", label: "Growth", ariaLabel: "Growth" },
  { id: "boundaries", icon: "\uD83E\uDDED", label: "Boundaries", ariaLabel: "Boundaries" }
];

export function getLifeStageSignals(stageKey = getSelectedLifeStageKey()) {
  const normalized = normalizeLifeStageKey(stageKey);
  return LIFE_STAGE_SIGNAL_REGISTRY[normalized] || DEFAULT_LIFE_STAGE_SIGNALS;
}

export function getLifeStageSignal(stageKey, signalId) {
  const list = getLifeStageSignals(stageKey);
  return list.find((item) => item.id === signalId) || list[0];
}

export default LIFE_STAGE_SIGNAL_REGISTRY;
