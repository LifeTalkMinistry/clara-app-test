import { getStageDefinition } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";
import { getSelectedLifeStageKey, normalizeLifeStageKey } from "./life-stage-flow";
import { LIVING_WITH_PARTNER_STAGE_KEY, getLivingWithPartnerSupportCopy } from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";
import { YOUNG_PROFESSIONAL_STAGE_KEY, getYoungProfessionalSupportCopy } from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";
import { getRotatingSignalCopy } from "./life-stage-signal-rotation-copy";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(value, terms) {
  const text = clean(value).toLowerCase();
  return terms.some((term) => text.includes(clean(term).toLowerCase()));
}

function combineProfileText(profile = {}) {
  return [profile.setup, profile.rhythm, profile.workload, profile.pressure, profile.coping, profile.goal].map(clean).join(" ");
}

export const LIFE_STAGE_GUIDANCE = {
  "Working Student": {
    defaultAwareness: {
      title: "Your effort has direction.",
      body: "Many working students quietly build their future while managing school costs, commute, food, mobile data, and pressure.",
    },
    defaultGuidance: {
      title: "Protect one small boundary.",
      body: "Choose one simple money rule that can survive school, work, commute, and tired days.",
    },
    signals: {},
    dailyRotation: { enabled: true, awarenessMessages: [], guidanceMessages: [] },
  },
};

export function getWorkingStudentSupportCopy(profile = {}) {
  const setup = clean(profile.setup);
  const rhythm = clean(profile.rhythm);
  const workload = clean(profile.workload);
  const pressure = clean(profile.pressure);
  const coping = clean(profile.coping);
  const goal = clean(profile.goal);
  const familyScore = (hasAny(setup, ["helping family"]) ? 2 : 0) + (hasAny(pressure, ["family contribution"]) ? 2 : 0) + (hasAny(goal, ["help family"]) ? 2 : 0);
  const debtScore = (hasAny(pressure, ["debt", "borrowed"]) ? 2 : 0) + (hasAny(coping, ["borrow", "delay payments"]) ? 2 : 0) + (hasAny(goal, ["avoid debt"]) ? 1 : 0);
  const survivalScore = (hasAny(setup, ["self-supporting", "school costs"]) ? 2 : 0) + (hasAny(rhythm, ["irregular", "project", "seasonal"]) ? 1 : 0) + (hasAny(workload, ["almost no margin", "survival", "little time to rest"]) ? 2 : 0) + (hasAny(pressure, ["daily food", "transport", "debt", "borrowed"]) ? 1 : 0) + (hasAny(coping, ["cut my needs", "borrow", "avoid checking"]) ? 1 : 0);
  const burnoutScore = (hasAny(workload, ["heavy", "little time", "almost no margin", "survival"]) ? 2 : 0) + (hasAny(pressure, ["schedule conflict", "work-school"]) ? 2 : 0) + (hasAny(goal, ["burning out"]) ? 1 : 0);
  const rewardScore = (hasAny(coping, ["small rewards", "feel okay"]) ? 2 : 0) + (hasAny(goal, ["stress spending"]) ? 2 : 0);
  const stableScore = (hasAny(workload, ["manageable", "tight but still controlled"]) ? 1 : 0) + (hasAny(rhythm, ["fixed", "allowance + work", "mostly allowance"]) ? 1 : 0) + (hasAny(coping, ["ask for help"]) ? 1 : 0) + (hasAny(goal, ["build savings", "finish school"]) ? 1 : 0);
  if (debtScore >= 3) return { title: "Pressure may be stacking.", body: "Borrowing or delayed payments often happen when school fees, food, fare, and income timing do not line up." };
  if (familyScore >= 4) return { title: "You’re carrying shared pressure.", body: "Helping at home can be meaningful, but it still needs limits so school, food, transport, and personal stability stay protected." };
  if (survivalScore >= 5) return { title: "This looks like survival budgeting.", body: "Tuition, meals, commute, load/data, and income timing can squeeze the same week even when spending is not careless." };
  if (burnoutScore >= 4) return { title: "Time pressure becomes money pressure.", body: "When class, work, commute, and deadlines overlap, convenience spending can increase because planning energy is already drained." };
  if (rewardScore >= 2) return { title: "Small rewards can signal fatigue.", body: "This pattern often appears when rest is limited, meals are irregular, and the day feels too heavy to end without relief." };
  if (hasAny(setup, ["self-supporting", "school costs"])) return { title: "Independence needs structure.", body: "Self-supporting students need buffers for food, fare, school deadlines, mobile data, and income gaps." };
  if (stableScore >= 3) return { title: "Build rhythm before pressure grows.", body: "You may still have room for control, but small leaks become harder once school and work get heavier." };
  return LIFE_STAGE_GUIDANCE["Working Student"].defaultAwareness;
}

function getFamilyHouseholdSupportCopy(profile = {}) {
  const text = combineProfileText(profile);
  if (hasAny(text, ["breadwinner", "everyone depends", "main contributor"])) return { title: "Home is leaning on you.", body: "A household role can become heavy when food, bills, and family needs start depending on the same income." };
  if (hasAny(text, ["requests", "emergency", "rescue", "cover gaps", "borrow for family"])) return { title: "Family needs can shift the month.", body: "Support often comes from care, but sudden requests can quickly change what is left for your own stability." };
  if (hasAny(text, ["boundar", "guilty", "limits", "personal goals delayed"])) return { title: "Boundaries are part of stability.", body: "Helping at home works better when your own needs, goals, and safety buffer still have a protected place." };
  return { title: "Home support needs structure.", body: "Family household money can feel shared before it feels personal, so clear limits help support stay sustainable." };
}

function getSingleParentSupportCopy(profile = {}) {
  const text = combineProfileText(profile);
  if (hasAny(text, ["child essentials", "school", "childcare", "child needs", "child stability", "future"])) return { title: "Your priority is protection.", body: "Child needs can make every money decision feel important because food, school, health, and routine all connect to stability." };
  if (hasAny(text, ["emergency", "health", "weak safety", "borrow", "debt"])) return { title: "The safety gap is the pressure.", body: "When one surprise can disrupt the whole month, even small buffers can matter more than big plans." };
  if (hasAny(text, ["guilt", "sacrifice", "own needs", "exhausted", "care and work", "busy"])) return { title: "Care is costing energy too.", body: "Parenting pressure can make personal needs feel optional, but energy and stability are part of protecting the household." };
  return { title: "You’re carrying a protective role.", body: "Single-parent money decisions often carry both practical and emotional weight because the margin for mistakes can feel small." };
}

function getFullTimeEarnerSupportCopy(profile = {}) {
  const text = combineProfileText(profile);
  if (hasAny(text, ["payday", "cutoff", "salary", "bills arrive", "strong then fades"])) return { title: "Salary needs a rhythm.", body: "Stable income can still feel tight when payday, bills, food, subscriptions, and daily spending do not move in the same direction." };
  if (hasAny(text, ["reward", "convenience", "stress spending", "tired", "burnout", "shift", "commute"])) return { title: "Routine fatigue is showing up.", body: "Work can make spending feel like recovery, especially when the day leaves little energy for planning." };
  if (hasAny(text, ["family", "support others", "obligations", "household"])) return { title: "Your income is carrying more than you.", body: "A full-time salary can look stable, but family or household obligations can quietly reduce the space for savings." };
  return { title: "Stable income still needs protection.", body: "Full-time earning gives structure, but small leaks, bills, and routine pressure can still weaken the month." };
}

function getFreelanceSeasonSupportCopy(profile = {}) {
  const text = combineProfileText(profile);
  if (hasAny(text, ["irregular", "dry", "delayed", "client", "feast", "waves"])) return { title: "Income timing is the real pressure.", body: "Freelance money can arrive in waves, so the challenge is keeping essentials safe between strong weeks and dry weeks." };
  if (hasAny(text, ["overwork", "no rest", "too many projects", "client pressure", "rest feels risky"])) return { title: "Freedom can still feel heavy.", body: "Flexible work can blur rest, earning, and pressure until the body carries what the schedule does not show." };
  if (hasAny(text, ["personal/business", "separate", "work costs", "wallets"])) return { title: "The money needs separation.", body: "When personal and work money mix, it becomes harder to see what is income, what is operating cost, and what is safe to spend." };
  return { title: "Flexible income needs a buffer.", body: "Freelance work can create freedom, but it needs a cash rhythm that can survive late payments and uneven client flow." };
}

function getBusinessBuilderSupportCopy(profile = {}) {
  const text = combineProfileText(profile);
  if (hasAny(text, ["reinvest", "growth", "scaling", "chase growth", "capital", "inventory"])) return { title: "Growth is pulling on your money.", body: "Building a business often asks for reinvestment before profit feels stable, so personal stability can get squeezed if there is no boundary." };
  if (hasAny(text, ["cash flow", "sales", "profit arrives late", "expenses happen before sales", "supplier", "customer"])) return { title: "Cash flow needs protection.", body: "Sales and expenses rarely move perfectly together, so the pressure is often timing, not only profit." };
  if (hasAny(text, ["personal/business", "mix", "pay myself", "owner pay", "personal life"])) return { title: "Your money needs clearer lines.", body: "When business and personal money blend together, it becomes harder to know what belongs to growth and what protects your life." };
  return { title: "Building needs boundaries.", body: "Business growth can be exciting, but the system has to protect operating costs, owner pay, and personal stability at the same time." };
}

function getCoreStageSupportCopy(stageKey, profile = {}) {
  switch (normalizeLifeStageKey(stageKey)) {
    case "Family Household": return getFamilyHouseholdSupportCopy(profile);
    case "Single Parent": return getSingleParentSupportCopy(profile);
    case "Full-Time Earner": return getFullTimeEarnerSupportCopy(profile);
    case "Freelance Season": return getFreelanceSeasonSupportCopy(profile);
    case "Business Builder": return getBusinessBuilderSupportCopy(profile);
    default: return null;
  }
}

function getCoreStageGuidanceCopy(stageKey) {
  switch (normalizeLifeStageKey(stageKey)) {
    case "Family Household": return { title: "Protect support with limits.", body: "Choose one boundary that lets you help without emptying your food, bills, or personal buffer." };
    case "Single Parent": return { title: "Protect the essentials first.", body: "Keep food, school, health, and transport visible before flexible spending gets any space." };
    case "Full-Time Earner": return { title: "Give payday a first move.", body: "Set one rule for salary day before rewards, subscriptions, or convenience spending begin." };
    case "Freelance Season": return { title: "Protect the dry-week gap.", body: "Keep a small buffer for essentials before project money turns into flexible spending." };
    case "Business Builder": return { title: "Separate growth from survival.", body: "Keep business costs, owner pay, and personal essentials from pulling from the same invisible pool." };
    default: return null;
  }
}

function getGenericStageGuidance(stageKey, profile = {}) {
  const definition = getStageDefinition(stageKey, profile || {});
  const supportCopy = getCoreStageSupportCopy(stageKey, profile || {});
  const guidanceCopy = getCoreStageGuidanceCopy(stageKey);
  return {
    defaultAwareness: supportCopy || {
      title: definition?.identity?.title || stageKey,
      body: definition?.identity?.overview || "CLARA is reading this stage as one connected money pattern.",
    },
    defaultGuidance: guidanceCopy || {
      title: "Choose one protection rule.",
      body: definition?.recommendations?.[0] || "Protect essentials first, then allow flexible spending after the boundary is clear.",
    },
    signals: {},
    dailyRotation: { enabled: false, awarenessMessages: [], guidanceMessages: [] },
  };
}

export function getLifeStageGuidance(stageKey = getSelectedLifeStageKey(), options = {}) {
  const { signalId = null, mode = "awareness", profile = null } = options;
  const normalized = normalizeLifeStageKey(stageKey);
  const stage = LIFE_STAGE_GUIDANCE[normalized] || getGenericStageGuidance(normalized, profile || {});

  if (signalId) {
    const rotatingCopy = getRotatingSignalCopy(normalized, signalId, mode);
    if (rotatingCopy) return rotatingCopy;
  }

  if (normalized === "Working Student" && !signalId && mode !== "guidance") return getWorkingStudentSupportCopy(profile || {});
  if (normalized === YOUNG_PROFESSIONAL_STAGE_KEY && mode !== "guidance") return getYoungProfessionalSupportCopy(profile || {});
  if (normalized === LIVING_WITH_PARTNER_STAGE_KEY && mode !== "guidance") return getLivingWithPartnerSupportCopy(profile || {});

  if (mode === "guidance") return stage.defaultGuidance || stage.defaultAwareness;
  return stage.defaultAwareness;
}

export default LIFE_STAGE_GUIDANCE;
