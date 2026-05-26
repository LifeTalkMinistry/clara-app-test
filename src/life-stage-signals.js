import { getSelectedLifeStageKey, normalizeLifeStageKey } from "./life-stage-flow";
import { LIVING_WITH_PARTNER_STAGE_KEY, getLivingWithPartnerSignals } from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";
import { YOUNG_PROFESSIONAL_STAGE_KEY } from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";

export const LIFE_STAGE_SIGNAL_REGISTRY = {
  "Working Student": [
    { id: "tired", icon: "😴", label: "Tired", ariaLabel: "Tired" },
    { id: "stress", icon: "🧠", label: "Stressed", ariaLabel: "Stressed" },
    { id: "sleepy", icon: "🌙", label: "Sleepy", ariaLabel: "Sleepy" },
    { id: "hungry", icon: "🍜", label: "Hungry", ariaLabel: "Hungry" },
    { id: "pressure", icon: "⏰", label: "Time Pressure", ariaLabel: "Time Pressure" },
    { id: "moneyTiming", icon: "💸", label: "Money Timing", ariaLabel: "Money Timing" },
    { id: "commute", icon: "🚌", label: "Commute Pressure", ariaLabel: "Commute Pressure" }
  ],
  [YOUNG_PROFESSIONAL_STAGE_KEY]: [
    { id: "workPressure", icon: "💼", label: "Work Pressure", ariaLabel: "Work Pressure" },
    { id: "salaryLeak", icon: "💸", label: "Salary Leak", ariaLabel: "Salary Leak" },
    { id: "billsPressure", icon: "🧾", label: "Bills", ariaLabel: "Bills" },
    { id: "careerPressure", icon: "📈", label: "Career", ariaLabel: "Career" },
    { id: "burnoutRisk", icon: "🧠", label: "Burnout", ariaLabel: "Burnout" },
    { id: "familySupportPressure", icon: "🤝", label: "Family Support", ariaLabel: "Family Support" },
    { id: "socialLifestylePressure", icon: "✨", label: "Lifestyle", ariaLabel: "Lifestyle" }
  ],
  [LIVING_WITH_PARTNER_STAGE_KEY]: getLivingWithPartnerSignals().map((signal) => ({
    id: signal.key,
    icon: signal.icon,
    label: signal.label,
    ariaLabel: signal.label,
  })),
  "Family Household": [
    { id: "homeBills", icon: "🧾", label: "Home Bills", ariaLabel: "Home Bills" },
    { id: "foodNeeds", icon: "🍚", label: "Food Needs", ariaLabel: "Food Needs" },
    { id: "supportRequests", icon: "🤝", label: "Support Requests", ariaLabel: "Support Requests" },
    { id: "familyExpectations", icon: "🏠", label: "Family Expectations", ariaLabel: "Family Expectations" },
    { id: "boundaries", icon: "🛡️", label: "Boundaries", ariaLabel: "Boundaries" },
    { id: "personalGoals", icon: "🎯", label: "Personal Goals", ariaLabel: "Personal Goals" },
    { id: "emergencyGaps", icon: "🚨", label: "Emergency Gaps", ariaLabel: "Emergency Gaps" }
  ],
  "Single Parent": [
    { id: "childEssentials", icon: "🧒", label: "Child Essentials", ariaLabel: "Child Essentials" },
    { id: "timePressure", icon: "⏰", label: "Time Pressure", ariaLabel: "Time Pressure" },
    { id: "emotionalEnergy", icon: "🧠", label: "Emotional Energy", ariaLabel: "Emotional Energy" },
    { id: "emergencyRisk", icon: "🚨", label: "Emergency Risk", ariaLabel: "Emergency Risk" },
    { id: "schoolCare", icon: "🎒", label: "School / Care", ariaLabel: "School / Care" },
    { id: "personalSacrifice", icon: "🛡️", label: "Personal Sacrifice", ariaLabel: "Personal Sacrifice" },
    { id: "futureProtection", icon: "🌱", label: "Future Protection", ariaLabel: "Future Protection" }
  ],
  "Full-Time Earner": [
    { id: "salaryCycle", icon: "💼", label: "Salary Cycle", ariaLabel: "Salary Cycle" },
    { id: "billsPressure", icon: "🧾", label: "Bills Pressure", ariaLabel: "Bills Pressure" },
    { id: "workFatigue", icon: "🧠", label: "Work Fatigue", ariaLabel: "Work Fatigue" },
    { id: "familyObligations", icon: "🤝", label: "Family Obligations", ariaLabel: "Family Obligations" },
    { id: "lifestyleCreep", icon: "✨", label: "Lifestyle Creep", ariaLabel: "Lifestyle Creep" },
    { id: "paydayLeak", icon: "💸", label: "Payday Leak", ariaLabel: "Payday Leak" },
    { id: "futureGoals", icon: "📈", label: "Future Goals", ariaLabel: "Future Goals" }
  ],
  "Freelance Season": [
    { id: "incomeVariability", icon: "💸", label: "Income Variability", ariaLabel: "Income Variability" },
    { id: "clientTiming", icon: "⏳", label: "Client Timing", ariaLabel: "Client Timing" },
    { id: "dryWeeks", icon: "🏜️", label: "Dry Weeks", ariaLabel: "Dry Weeks" },
    { id: "projectPressure", icon: "🧠", label: "Project Pressure", ariaLabel: "Project Pressure" },
    { id: "workCosts", icon: "🧾", label: "Work Costs", ariaLabel: "Work Costs" },
    { id: "restRisk", icon: "🌙", label: "Rest Risk", ariaLabel: "Rest Risk" },
    { id: "cashFlowBuffer", icon: "🛟", label: "Cash-Flow Buffer", ariaLabel: "Cash-Flow Buffer" }
  ]
};

export const DEFAULT_LIFE_STAGE_SIGNALS = [
  { id: "pressure", icon: "⏰", label: "Pressure", ariaLabel: "Pressure" },
  { id: "stability", icon: "🛡️", label: "Stability", ariaLabel: "Stability" },
  { id: "energy", icon: "🧠", label: "Energy", ariaLabel: "Energy" },
  { id: "growth", icon: "📈", label: "Growth", ariaLabel: "Growth" },
  { id: "boundaries", icon: "🧭", label: "Boundaries", ariaLabel: "Boundaries" }
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
