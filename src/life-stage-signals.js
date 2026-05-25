import { getSelectedLifeStageKey, normalizeLifeStageKey } from "./life-stage-flow";

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
  "Young Professional": [
    { id: "ypWorkStress", icon: "💼", label: "Work Stress", ariaLabel: "Work Stress" },
    { id: "ypBills", icon: "🧾", label: "Bills", ariaLabel: "Bills" },
    { id: "ypLifestyle", icon: "🛋️", label: "Lifestyle", ariaLabel: "Lifestyle" },
    { id: "ypCareer", icon: "📈", label: "Career Pressure", ariaLabel: "Career Pressure" },
    { id: "ypBurnout", icon: "😵", label: "Burnout", ariaLabel: "Burnout" },
    { id: "moneyTiming", icon: "💸", label: "Money Timing", ariaLabel: "Money Timing" },
    { id: "commute", icon: "🚌", label: "Commute Pressure", ariaLabel: "Commute Pressure" }
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
