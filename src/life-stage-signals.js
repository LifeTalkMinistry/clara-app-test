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
  }))
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
