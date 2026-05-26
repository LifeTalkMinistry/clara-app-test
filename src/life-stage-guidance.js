import { getStageDefinition } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";
import { getSelectedLifeStageKey, normalizeLifeStageKey } from "./life-stage-flow";
import { LIVING_WITH_PARTNER_STAGE_KEY, getLivingWithPartnerSupportCopy, getLivingWithPartnerSignalCopy } from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";
import { YOUNG_PROFESSIONAL_STAGE_KEY, getYoungProfessionalSupportCopy } from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";
import { getYoungProfessionalRotatingSignalCopy } from "./young-professional-signal-copy";

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
    signals: {
      tired: {
        awareness: { title: "Energy pressure is showing up.", body: "Heavy days can trigger shortcuts, comfort buys, or skipped tracking." },
        guidance: { title: "Make tired days easier.", body: "Use one low-effort rule: fare ready, food limit, or one quick check." },
      },
      stress: {
        awareness: { title: "Stress may be asking for relief.", body: "Buying can feel like control when school, work, commute, and deadlines stack up." },
        guidance: { title: "Name the pressure first.", body: "Separate the feeling from the purchase, then set a small relief limit." },
      },
      sleepy: {
        awareness: { title: "Low sleep weakens control.", body: "Sleepy days can trigger caffeine runs, auto-spending, and convenience choices." },
        guidance: { title: "Delay bigger decisions.", body: "Save the decision, rest first, then choose when your mind is clearer." },
      },
      hungry: {
        awareness: { title: "Hunger can trigger impulse spending.", body: "Delayed meals can turn snacks, drinks, and treats into bigger spending." },
        guidance: { title: "Protect a small food buffer.", body: "Eat on time when possible so hunger does not decide the price later." },
      },
      pressure: {
        awareness: { title: "Time pressure becomes money pressure.", body: "Rushing can add fare, food, supplies, and last-minute school costs." },
        guidance: { title: "Prepare one thing early.", body: "Pick one predictable pressure and prepare it before the rush begins." },
      },
      moneyTiming: {
        awareness: { title: "Money timing can create pressure.", body: "Late money can make food, fare, load, and school costs feel heavier." },
        guidance: { title: "Protect the waiting period.", body: "Protect fare, food, load, and school needs until the next money comes." },
      },
      commute: {
        awareness: { title: "Commute pressure affects spending.", body: "Long travel can quietly add fare, food, drinks, and comfort stops." },
        guidance: { title: "Plan the travel cost early.", body: "Set aside fare first before optional spending starts." },
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

function getFamilyHouseholdSupportCopy(profile = {}) {
  const text = combineProfileText(profile);
  if (hasAny(text, ["breadwinner", "everyone depends", "main contributor"])) {
    return { title: "Home is leaning on you.", body: "A household role can become heavy when food, bills, and family needs start depending on the same income." };
  }
  if (hasAny(text, ["requests", "emergency", "rescue", "cover gaps", "borrow for family"])) {
    return { title: "Family needs can shift the month.", body: "Support often comes from care, but sudden requests can quickly change what is left for your own stability." };
  }
  if (hasAny(text, ["boundar", "guilty", "limits", "personal goals delayed"])) {
    return { title: "Boundaries are part of stability.", body: "Helping at home works better when your own needs, goals, and safety buffer still have a protected place." };
  }
  return { title: "Home support needs structure.", body: "Family household money can feel shared before it feels personal, so clear limits help support stay sustainable." };
}

const FAMILY_HOUSEHOLD_SIGNAL_COPY = {
  homeBills: { awarenessTitle: "Home bills are pulling first.", guidanceTitle: "Protect fixed costs first.", awareness: "Rent, utilities, internet, and household basics can quietly decide how much freedom the rest of the month has.", guidance: "Separate the next home bill first before flexible spending or family requests enter the budget." },
  foodNeeds: { awarenessTitle: "Food needs can shift the week.", guidanceTitle: "Give food a clear lane.", awareness: "Groceries, meals, shared food, and daily needs can grow fast when everyone pulls from the same household rhythm.", guidance: "Set one food amount for the week so meals stay protected without quietly draining other priorities." },
  supportRequests: { awarenessTitle: "Support requests can change the month.", guidanceTitle: "Help with a boundary.", awareness: "Family requests often come from real need, but they can quickly affect bills, food, savings, and your own stability.", guidance: "Choose one safe support limit before saying yes, so helping does not empty the money meant to protect the home." },
  familyExpectations: { awarenessTitle: "Expectations can become pressure.", guidanceTitle: "Name what is realistic.", awareness: "Household expectations can make money feel shared before your own needs and limits are clearly seen.", guidance: "Clarify one realistic contribution instead of trying to carry every expectation silently." },
  boundaries: { awarenessTitle: "Boundaries protect the household too.", guidanceTitle: "Set one kind limit.", awareness: "Without boundaries, care can turn into pressure and support can quietly weaken your own stability.", guidance: "Create one kind but clear rule around what you can give, delay, or protect this week." },
  personalGoals: { awarenessTitle: "Personal goals can get pushed back.", guidanceTitle: "Keep one goal visible.", awareness: "When home needs feel urgent, savings, growth, rest, and personal plans can disappear from the budget.", guidance: "Protect even a small amount for one personal goal so home support does not erase your future direction." },
  emergencyGaps: { awarenessTitle: "Emergency gaps create stress fast.", guidanceTitle: "Build a small safety layer.", awareness: "One surprise cost can affect the whole household when bills, food, and family needs are already connected.", guidance: "Start with a tiny emergency buffer before waiting for the perfect amount to save." },
};

function getFamilyHouseholdSignalCopy(signalId, mode = "awareness") {
  const signal = FAMILY_HOUSEHOLD_SIGNAL_COPY[signalId] || FAMILY_HOUSEHOLD_SIGNAL_COPY.homeBills;
  return { title: mode === "guidance" ? signal.guidanceTitle : signal.awarenessTitle, body: mode === "guidance" ? signal.guidance : signal.awareness };
}

function getSingleParentSupportCopy(profile = {}) {
  const text = combineProfileText(profile);
  if (hasAny(text, ["child essentials", "school", "childcare", "child needs", "child stability", "future"])) return { title: "Your priority is protection.", body: "Child needs can make every money decision feel important because food, school, health, and routine all connect to stability." };
  if (hasAny(text, ["emergency", "health", "weak safety", "borrow", "debt"])) return { title: "The safety gap is the pressure.", body: "When one surprise can disrupt the whole month, even small buffers can matter more than big plans." };
  if (hasAny(text, ["guilt", "sacrifice", "own needs", "exhausted", "care and work", "busy"])) return { title: "Care is costing energy too.", body: "Parenting pressure can make personal needs feel optional, but energy and stability are part of protecting the household." };
  return { title: "You’re carrying a protective role.", body: "Single-parent money decisions often carry both practical and emotional weight because the margin for mistakes can feel small." };
}

const SINGLE_PARENT_SIGNAL_COPY = {
  childEssentials: { awarenessTitle: "Child essentials are pulling first.", guidanceTitle: "Protect the basics first.", awareness: "Food, school needs, health, transport, and daily care can make every money decision feel urgent.", guidance: "Separate the child’s essentials first before flexible spending or optional purchases enter the budget." },
  timePressure: { awarenessTitle: "Time pressure affects money decisions.", guidanceTitle: "Simplify the next move.", awareness: "Busy days can lead to quick spending because planning energy is already stretched.", guidance: "Choose one simple rule for today: protect food, transport, school needs, or emergency money first." },
  emotionalEnergy: { awarenessTitle: "Emotional energy is part of the budget.", guidanceTitle: "Lower the decision load.", awareness: "Parenting pressure can make spending feel like relief, convenience, or a way to keep the day moving.", guidance: "Pick one low-effort money boundary so tiredness does not decide the next purchase for you." },
  emergencyRisk: { awarenessTitle: "Emergency risk can feel heavy.", guidanceTitle: "Start with a small safety layer.", awareness: "One surprise cost can affect the whole month when the margin is already small.", guidance: "Protect even a tiny emergency amount before waiting for a perfect savings plan." },
  schoolCare: { awarenessTitle: "School and care costs need visibility.", guidanceTitle: "List the next child-related cost.", awareness: "School, childcare, supplies, activities, or health needs can appear before the budget is ready.", guidance: "Write down the next expected child-related cost and give it a place before optional spending." },
  personalSacrifice: { awarenessTitle: "Personal sacrifice can become invisible.", guidanceTitle: "Protect one need for yourself.", awareness: "Single parents often delay their own needs so the child’s needs stay protected.", guidance: "Choose one small personal need to protect this week, because your stability also protects the household." },
  futureProtection: { awarenessTitle: "Future protection is quietly important.", guidanceTitle: "Fund one small future step.", awareness: "Long-term goals can feel far away when daily survival needs take most of the attention.", guidance: "Set aside even a small amount for one future goal so today’s pressure does not erase tomorrow’s protection." },
};

function getSingleParentSignalCopy(signalId, mode = "awareness") {
  const signal = SINGLE_PARENT_SIGNAL_COPY[signalId] || SINGLE_PARENT_SIGNAL_COPY.childEssentials;
  return { title: mode === "guidance" ? signal.guidanceTitle : signal.awarenessTitle, body: mode === "guidance" ? signal.guidance : signal.awareness };
}

function getFullTimeEarnerSupportCopy(profile = {}) {
  const text = combineProfileText(profile);
  if (hasAny(text, ["payday", "cutoff", "salary", "bills arrive", "strong then fades"])) return { title: "Salary needs a rhythm.", body: "Stable income can still feel tight when payday, bills, food, subscriptions, and daily spending do not move in the same direction." };
  if (hasAny(text, ["reward", "convenience", "stress spending", "tired", "burnout", "shift", "commute"])) return { title: "Routine fatigue is showing up.", body: "Work can make spending feel like recovery, especially when the day leaves little energy for planning." };
  if (hasAny(text, ["family", "support others", "obligations", "household"])) return { title: "Your income is carrying more than you.", body: "A full-time salary can look stable, but family or household obligations can quietly reduce the space for savings." };
  return { title: "Stable income still needs protection.", body: "Full-time earning gives structure, but small leaks, bills, and routine pressure can still weaken the month." };
}

const FULL_TIME_EARNER_SIGNAL_COPY = {
  salaryCycle: { awarenessTitle: "Salary cycles shape the month.", guidanceTitle: "Give salary a first job.", awareness: "Stable income can still feel unstable when payday, bills, daily spending, and cutoff timing do not move together.", guidance: "Assign the first part of salary to essentials before rewards, convenience spending, or flexible purchases begin." },
  billsPressure: { awarenessTitle: "Bills are pulling from the same paycheck.", guidanceTitle: "Make bills visible first.", awareness: "Rent, utilities, subscriptions, debt, and regular payments can quietly shrink the salary before the month feels started.", guidance: "List the fixed bills first so the remaining money is real, not just what the balance seems to show." },
  workFatigue: { awarenessTitle: "Work fatigue can affect spending.", guidanceTitle: "Lower the decision load.", awareness: "Tired workdays can make convenience, delivery, transport upgrades, and small rewards feel easier than planning.", guidance: "Create one tired-day rule so fatigue does not decide every purchase after work." },
  familyObligations: { awarenessTitle: "Your income may be carrying more than you.", guidanceTitle: "Support with a clear limit.", awareness: "Family help, household support, and shared responsibilities can quietly reduce the space for savings and personal stability.", guidance: "Choose one safe support amount before saying yes, so helping others does not erase your own protection." },
  lifestyleCreep: { awarenessTitle: "Lifestyle creep can feel normal.", guidanceTitle: "Pause before upgrading.", awareness: "When income becomes steady, small upgrades can slowly become the new baseline without being noticed.", guidance: "Before upgrading a habit, protect bills, savings, and one future goal first." },
  paydayLeak: { awarenessTitle: "Payday leaks can happen fast.", guidanceTitle: "Protect the first 24 hours.", awareness: "The first day after salary can create fast spending because the balance looks stronger than it really is.", guidance: "Delay non-essential spending for one day after payday and let CLARA help you see what is actually safe." },
  futureGoals: { awarenessTitle: "Future goals need a place now.", guidanceTitle: "Fund one future step.", awareness: "Savings, debt freedom, emergency funds, and personal growth can get delayed when the present paycheck feels crowded.", guidance: "Set aside even a small fixed amount for one future goal before flexible spending begins." },
};

function getFullTimeEarnerSignalCopy(signalId, mode = "awareness") {
  const signal = FULL_TIME_EARNER_SIGNAL_COPY[signalId] || FULL_TIME_EARNER_SIGNAL_COPY.salaryCycle;
  return { title: mode === "guidance" ? signal.guidanceTitle : signal.awarenessTitle, body: mode === "guidance" ? signal.guidance : signal.awareness };
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

  if (normalized === "Working Student" && !signalId && mode !== "guidance") return getWorkingStudentSupportCopy(profile || {});
  if (normalized === YOUNG_PROFESSIONAL_STAGE_KEY && signalId) return getYoungProfessionalRotatingSignalCopy(signalId, mode);
  if (normalized === YOUNG_PROFESSIONAL_STAGE_KEY && mode !== "guidance") return getYoungProfessionalSupportCopy(profile || {});
  if (normalized === LIVING_WITH_PARTNER_STAGE_KEY && signalId) return getLivingWithPartnerSignalCopy(signalId, mode);
  if (normalized === LIVING_WITH_PARTNER_STAGE_KEY && mode !== "guidance") return getLivingWithPartnerSupportCopy(profile || {});
  if (normalized === "Family Household" && signalId) return getFamilyHouseholdSignalCopy(signalId, mode);
  if (normalized === "Single Parent" && signalId) return getSingleParentSignalCopy(signalId, mode);
  if (normalized === "Full-Time Earner" && signalId) return getFullTimeEarnerSignalCopy(signalId, mode);
  if (signalId && stage.signals?.[signalId]) return stage.signals[signalId][mode] || stage.signals[signalId].awareness;
  if (mode === "guidance") return stage.defaultGuidance || stage.defaultAwareness;
  return stage.defaultAwareness;
}

export default LIFE_STAGE_GUIDANCE;
