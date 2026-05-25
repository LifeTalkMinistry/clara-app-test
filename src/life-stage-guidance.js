import { getStageDefinition } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";
import { getSelectedLifeStageKey, normalizeLifeStageKey } from "./life-stage-flow";
import { LIVING_WITH_PARTNER_STAGE_KEY, getLivingWithPartnerSupportCopy, getLivingWithPartnerSignalCopy } from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(value, terms) {
  const text = clean(value).toLowerCase();
  return terms.some((term) => text.includes(clean(term).toLowerCase()));
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
    signals: {
      tired: {
        awareness: { title: "Energy pressure is showing up.", body: "A heavy day can make shortcuts, comfort buys, or skipped tracking feel more reasonable than usual." },
        guidance: { title: "Make tired days easier.", body: "Choose one low-effort rule: fare ready, food limit set, or one quick expense check." },
      },
      stress: {
        awareness: { title: "Stress may be asking for relief.", body: "Buying can feel like control when school, work, commute, deadlines, or family needs crowd the mind." },
        guidance: { title: "Name the pressure first.", body: "Separate the feeling from the purchase, then set a small limit if you still need relief." },
      },
      sleepy: {
        awareness: { title: "Low sleep weakens control.", body: "Sleepy days can increase automatic spending, caffeine runs, and convenience choices." },
        guidance: { title: "Delay bigger decisions.", body: "Save the decision, rest first, then choose when your mind is clearer." },
      },
      hungry: {
        awareness: { title: "Hunger can trigger impulse spending.", body: "Delayed meals can turn snacks, drinks, and treats into bigger spending." },
        guidance: { title: "Protect a small food buffer.", body: "Eat on time when possible so hunger does not decide the price later." },
      },
      pressure: {
        awareness: { title: "Time pressure becomes money pressure.", body: "Rushing can increase transport, food, forgotten supplies, and last-minute school costs." },
        guidance: { title: "Prepare one thing early.", body: "Pick one predictable pressure today and prepare it before the rush begins." },
      },
      moneyTiming: {
        awareness: { title: "Money timing can create pressure.", body: "When money arrives late, even small costs feel heavier." },
        guidance: { title: "Protect the waiting period.", body: "Protect fare, food, load, and school needs until the next money comes." },
      },
      commute: {
        awareness: { title: "Commute pressure affects spending.", body: "Long travel can quietly add fare, food, drinks, and comfort stops." },
        guidance: { title: "Plan the travel cost early.", body: "Set aside fare first before optional spending starts." },
      },
    },
    dailyRotation: { enabled: true, awarenessMessages: [], guidanceMessages: [] },
  },
  "Young Professional": {
    defaultAwareness: {
      title: "Independence is forming.",
      body: "Salary rhythm, bills, work days, social pressure, and future goals are starting to compete for the same money.",
    },
    defaultGuidance: {
      title: "Assign the paycheck first.",
      body: "Separate bills, savings, food, commute, and lifestyle before the month starts spending for you.",
    },
    signals: {
      ypWorkStress: {
        awareness: { title: "Work pressure can affect spending.", body: "Long days can make convenience and reward spending feel like recovery." },
        guidance: { title: "Create a workday boundary.", body: "Choose one limit before the shift starts so the tired version of you does not decide later." },
      },
      ypBills: {
        awareness: { title: "Bills can create quiet pressure.", body: "Salary can feel already assigned when due dates, food, commute, and subscriptions stack close together." },
        guidance: { title: "Protect fixed costs first.", body: "Move bill money away before optional spending begins." },
      },
      ypLifestyle: {
        awareness: { title: "Lifestyle pressure can grow quietly.", body: "Food, outfits, gadgets, events, and social expectations can normalize spending faster than savings grows." },
        guidance: { title: "Choose comfort with a limit.", body: "Keep the experience, but set the amount before the pressure starts." },
      },
      ypCareer: {
        awareness: { title: "Career pressure can change choices.", body: "Tools, clothes, courses, and networking can feel urgent when you are trying to grow." },
        guidance: { title: "Invest without panic.", body: "Pick one career move that truly helps now, then delay the rest until the budget is safer." },
      },
      ypBurnout: {
        awareness: { title: "Burnout can weaken money control.", body: "When work drains your energy, spending may become the fastest form of escape or reset." },
        guidance: { title: "Lower the decision load.", body: "Use one rule simple enough to follow even on a draining day." },
      },
      moneyTiming: {
        awareness: { title: "Money timing affects discipline.", body: "Payday can create a false feeling of extra money before essentials are assigned." },
        guidance: { title: "Assign money before spending.", body: "Bills, savings, food, commute, then lifestyle. Spend only from what remains." },
      },
      commute: {
        awareness: { title: "Commute pressure affects spending.", body: "Daily travel can add fare, food, drinks, and convenience costs to a professional routine." },
        guidance: { title: "Plan travel cost early.", body: "Separate commute money before lifestyle spending so movement pressure does not borrow from essentials." },
      },
    },
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

function getGenericStageGuidance(stageKey) {
  const definition = getStageDefinition(stageKey, {});
  return {
    defaultAwareness: {
      title: definition?.identity?.title || stageKey,
      body: definition?.identity?.overview || "CLARA is reading this stage as one connected money pattern.",
    },
    defaultGuidance: {
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
  const stage = LIFE_STAGE_GUIDANCE[normalized] || getGenericStageGuidance(normalized);

  if (normalized === "Working Student" && !signalId && mode !== "guidance") return getWorkingStudentSupportCopy(profile || {});
  if (normalized === LIVING_WITH_PARTNER_STAGE_KEY && signalId) return getLivingWithPartnerSignalCopy(signalId, mode);
  if (normalized === LIVING_WITH_PARTNER_STAGE_KEY && mode !== "guidance") return getLivingWithPartnerSupportCopy(profile || {});
  if (signalId && stage.signals?.[signalId]) return stage.signals[signalId][mode] || stage.signals[signalId].awareness;
  if (mode === "guidance") return stage.defaultGuidance || stage.defaultAwareness;
  return stage.defaultAwareness;
}

export default LIFE_STAGE_GUIDANCE;
