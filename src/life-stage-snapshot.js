import { getStageDefinition } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";
import { getWorkingStudentBehaviorProfile } from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";
import { YOUNG_PROFESSIONAL_STAGE_KEY, getYoungProfessionalBehaviorProfile } from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";
import {
  LIVING_WITH_PARTNER_STAGE_KEY,
  LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS,
  getLivingWithPartnerBehaviorProfile,
} from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";
import { getSelectedLifeStageKey, normalizeLifeStageKey } from "./life-stage-flow";

export const LIFE_STAGE_SNAPSHOT = {
  "Working Student": {
    model: "working-student-canonical-engine",
    subtitle: "100% split of your current Working Student pressure.",
    cards: [],
  },
  [YOUNG_PROFESSIONAL_STAGE_KEY]: {
    model: "young-professional-canonical-engine",
    subtitle: "100% split of your current Young Professional pressure.",
    cards: [],
  },
  [LIVING_WITH_PARTNER_STAGE_KEY]: {
    model: "living-with-partner-canonical-engine",
    subtitle: "100% split of your current Living With Partner pressure.",
    cards: [],
  },
  "Family Household": {
    model: "family-household-canonical-engine",
    subtitle: "100% split of your current Family Household pressure.",
    cards: [],
  },
  "Single Parent": {
    model: "single-parent-canonical-engine",
    subtitle: "100% split of your current Single Parent pressure.",
    cards: [],
  },
  "Full-Time Earner": {
    model: "full-time-earner-canonical-engine",
    subtitle: "100% split of your current Full-Time Earner pressure.",
    cards: [],
  },
  "Freelance Season": {
    model: "freelance-season-canonical-engine",
    subtitle: "100% split of your current Freelance Season pressure.",
    cards: [],
  },
  "Business Builder": {
    model: "business-builder-canonical-engine",
    subtitle: "100% split of your current Business Builder pressure.",
    cards: [],
  },
};

const LIVING_WITH_PARTNER_SNAPSHOT_KEYS = ["sharedBills", "moneyTalks", "fairness", "comfortSpending", "emergencyBuffer"];
const LIVING_WITH_PARTNER_BASE_WEIGHTS = { sharedBills: 28, moneyTalks: 22, fairness: 20, comfortSpending: 16, emergencyBuffer: 14 };

const FAMILY_HOUSEHOLD_SNAPSHOT_KEYS = ["homeBills", "foodNeeds", "supportRequests", "boundaries", "emergencyGaps"];
const FAMILY_HOUSEHOLD_BASE_WEIGHTS = { homeBills: 28, foodNeeds: 23, supportRequests: 20, boundaries: 16, emergencyGaps: 13 };
const FAMILY_HOUSEHOLD_DEFINITIONS = {
  homeBills: { label: "Home Bills", category: "pressure", trendType: "wave", note: "Rent, utilities, shared bills, and household contribution are taking real space in the month.", insight: "Home stability can look normal on the outside while quietly using the money meant for personal progress.", action: "List the fixed home costs first before deciding what can still be flexible." },
  foodNeeds: { label: "Food Needs", category: "essentials", trendType: "stable", note: "Food, groceries, and daily household needs may be shaping most weekly decisions.", insight: "When food needs are not planned, small store runs can become the hidden leak of the household budget.", action: "Set one weekly food amount and separate it from flexible spending." },
  supportRequests: { label: "Support Requests", category: "family", trendType: "spike", note: "Family requests or sudden home needs can interrupt the original money plan.", insight: "Helping matters, but unplanned support can make one person carry pressure that belongs to the whole household.", action: "Decide the safe support limit before requests appear." },
  boundaries: { label: "Boundaries", category: "stability", trendType: "volatile", note: "Personal limits may be hard to protect when home needs feel urgent or emotional.", insight: "Without a clear boundary, guilt can become the system that decides where money goes.", action: "Protect one personal need or savings amount before giving extra support." },
  emergencyGaps: { label: "Emergency Gaps", category: "protection", trendType: "upward", note: "Unexpected medical, school, repair, or household costs may have no protected buffer yet.", insight: "A weak emergency layer can turn one family need into debt, delay, or personal sacrifice.", action: "Start a small household emergency buffer even if the first amount is tiny." },
};

const SINGLE_PARENT_SNAPSHOT_KEYS = ["childEssentials", "timePressure", "emergencyRisk", "personalSacrifice", "futureProtection"];
const SINGLE_PARENT_BASE_WEIGHTS = { childEssentials: 30, timePressure: 22, emergencyRisk: 20, personalSacrifice: 16, futureProtection: 12 };
const SINGLE_PARENT_DEFINITIONS = {
  childEssentials: { label: "Child Essentials", category: "essentials", trendType: "stable", note: "Food, school, childcare, health, and daily needs may be taking priority before everything else.", insight: "When essentials are heavy, one missed plan can affect both the child’s stability and the parent’s peace.", action: "Separate the child-essential amount first before any flexible spending starts." },
  timePressure: { label: "Time Pressure", category: "energy", trendType: "downward", note: "Work, caregiving, errands, and limited rest may be reducing the energy available for planning.", insight: "When time is tight, convenience spending can become a survival tool instead of a choice.", action: "Choose one repeatable routine that saves time without quietly draining money." },
  emergencyRisk: { label: "Emergency Risk", category: "protection", trendType: "spike", note: "Unexpected health, school, transport, or home costs can disrupt the whole month quickly.", insight: "A small emergency can feel bigger when one income or one person carries most of the recovery.", action: "Build a tiny emergency layer before chasing a perfect savings target." },
  personalSacrifice: { label: "Personal Sacrifice", category: "pressure", trendType: "volatile", note: "Personal needs may be delayed because the child’s needs feel more urgent and non-negotiable.", insight: "Sacrifice can protect the child short term, but repeated self-neglect can weaken the parent’s stability.", action: "Protect one small personal need as part of the family stability plan." },
  futureProtection: { label: "Future Protection", category: "growth", trendType: "upward", note: "Education, safety, insurance, and long-term security may be important but hard to fund consistently.", insight: "Future protection grows through small protected actions, not one perfect big plan.", action: "Assign even a small fixed amount toward the child’s future or protection goal." },
};

const FULL_TIME_EARNER_SNAPSHOT_KEYS = ["salaryCycle", "billsPressure", "paydayLeak", "workFatigue", "futureGoals"];
const FULL_TIME_EARNER_BASE_WEIGHTS = { salaryCycle: 28, billsPressure: 24, paydayLeak: 20, workFatigue: 16, futureGoals: 12 };
const FULL_TIME_EARNER_DEFINITIONS = {
  salaryCycle: { label: "Salary Cycle", category: "stability", trendType: "wave", note: "Salary timing, cutoff rhythm, and payday habits may be shaping the whole month.", insight: "A stable income can still feel unstable when the salary is not assigned before spending begins.", action: "Create a simple payday split before the first flexible purchase happens." },
  billsPressure: { label: "Bills Pressure", category: "pressure", trendType: "stable", note: "Bills, subscriptions, installments, and fixed obligations may be stacking quietly.", insight: "Predictable bills become heavy when they are remembered only after lifestyle spending starts.", action: "List every fixed bill and separate that amount immediately after payday." },
  paydayLeak: { label: "Payday Leak", category: "spending", trendType: "spike", note: "Reward spending, small upgrades, and convenience purchases may be strongest after payday.", insight: "The leak often happens when payday feels like freedom before the month’s real limits are visible.", action: "Delay one reward purchase until bills, savings, and food money are already protected." },
  workFatigue: { label: "Work Fatigue", category: "energy", trendType: "downward", note: "Long work hours, shift rhythm, commute, or routine burnout may be affecting spending choices.", insight: "When energy is low, spending can become the easiest shortcut for comfort, food, or convenience.", action: "Choose one low-cost recovery option before the work week drains your discipline." },
  futureGoals: { label: "Future Goals", category: "growth", trendType: "upward", note: "Savings, emergency fund, debt freedom, or long-term plans may need stronger protection.", insight: "Stable income creates opportunity only when future money is separated before lifestyle pressure grows.", action: "Automate or manually move a small goal amount every payday before optional spending." },
};

const FREELANCE_SEASON_SNAPSHOT_KEYS = ["incomeVariability", "clientTiming", "dryWeeks", "projectPressure", "cashFlowBuffer"];
const FREELANCE_SEASON_BASE_WEIGHTS = { incomeVariability: 30, clientTiming: 24, dryWeeks: 18, projectPressure: 16, cashFlowBuffer: 12 };
const FREELANCE_SEASON_DEFINITIONS = {
  incomeVariability: { label: "Income Variability", category: "income", trendType: "volatile", note: "Income can shift by client, project, week, or season instead of arriving in one predictable rhythm.", insight: "Freelance money feels strong during paid weeks but risky when the next payment is unclear.", action: "Base spending on the lowest safe income estimate, not the best recent payment." },
  clientTiming: { label: "Client Timing", category: "timing", trendType: "wave", note: "Client approvals, invoices, delayed payments, or project starts may be shaping cash flow.", insight: "The work may be real, but timing gaps can still make the month feel unstable.", action: "Track expected payment dates and keep spending conservative until money actually arrives." },
  dryWeeks: { label: "Dry Weeks", category: "protection", trendType: "downward", note: "Low-client weeks or no-project gaps can pressure bills, food, and personal needs quickly.", insight: "Dry weeks are easier to survive when they are expected as part of the system, not treated as failure.", action: "Build a small dry-week fund from every paid project before flexible spending." },
  projectPressure: { label: "Project Pressure", category: "energy", trendType: "spike", note: "Deadlines, revisions, unstable workload, and client demands may affect money choices and rest.", insight: "When pressure is high, overworking or underpricing can feel like the only way to stay safe.", action: "Set one boundary around pricing, deadline, or revision scope before accepting more work." },
  cashFlowBuffer: { label: "Cash Flow Buffer", category: "stability", trendType: "upward", note: "A buffer can separate business survival, personal bills, and future dry weeks.", insight: "Freelance freedom becomes safer when each payment protects both today and the next gap.", action: "Split each payment into bills, tax/ops, buffer, and personal spending before using it." },
};

const BUSINESS_BUILDER_SNAPSHOT_KEYS = ["cashFlow", "reinvestment", "operatingCosts", "ownerPay", "growthPressure"];
const BUSINESS_BUILDER_BASE_WEIGHTS = { cashFlow: 32, reinvestment: 24, operatingCosts: 18, ownerPay: 14, growthPressure: 12 };
const BUSINESS_BUILDER_DEFINITIONS = {
  cashFlow: { label: "Cash Flow", category: "stability", trendType: "volatile", note: "Sales, collections, expenses, and timing may be deciding how safe the business feels right now.", insight: "A business can look active but still feel unstable when cash arrives after costs are already due.", action: "Separate incoming money by bills, operating costs, buffer, and usable cash before spending." },
  reinvestment: { label: "Reinvestment", category: "growth", trendType: "upward", note: "New tools, stock, marketing, upgrades, or expansion may be competing with short-term stability.", insight: "Reinvestment helps growth only when it does not quietly weaken survival money.", action: "Choose one reinvestment limit before buying more inventory, tools, ads, or upgrades." },
  operatingCosts: { label: "Operating Costs", category: "pressure", trendType: "wave", note: "Inventory, supplies, platform fees, transport, rent, subscriptions, or delivery costs may be stacking.", insight: "Operating costs can hide inside normal activity until profit becomes unclear.", action: "List the recurring business costs and subtract them before reading the business as profitable." },
  ownerPay: { label: "Owner Pay", category: "income", trendType: "stable", note: "Personal needs and business money may be overlapping without a clear owner-pay rule.", insight: "When the owner is paid randomly, the business and personal budget both become harder to read.", action: "Set a simple owner-pay amount or percentage before using business cash personally." },
  growthPressure: { label: "Growth Pressure", category: "energy", trendType: "spike", note: "More customers, bigger goals, competition, or social proof may be creating pressure to scale quickly.", insight: "Growth pressure can push spending, overwork, and risky decisions before the business is structurally ready.", action: "Pick one growth move that does not damage cash flow, rest, or operating stability." },
};

function toKey(value, index = 0) {
  return String(value || `snapshot-${index}`).replace(/[^a-z0-9]+/gi, "");
}

function statusFromValue(value) {
  const number = Number(value) || 0;
  if (number >= 75) return "Dominant";
  if (number >= 55) return "Heavy Presence";
  if (number >= 35) return "Growing Pressure";
  if (number >= 15) return "Emerging Pattern";
  return "Minor Presence";
}

function pressureStatus(value, index = 0) {
  if (index === 0 || value >= 28) return "Dominant";
  if (value >= 22) return "Heavy Presence";
  if (value >= 16) return "Growing Pressure";
  if (value >= 10) return "Supporting";
  return "Watch";
}

function normalizeRows(rows = []) {
  const safeRows = rows.map((row, index) => ({ ...row, index, raw: Math.max(1, Number(row.raw) || 1) }));
  const total = safeRows.reduce((sum, row) => sum + row.raw, 0) || 1;
  const mapped = safeRows.map((row) => {
    const exact = (row.raw / total) * 100;
    return { ...row, value: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = 100 - mapped.reduce((sum, row) => sum + row.value, 0);
  mapped.slice().sort((a, b) => b.rest - a.rest || a.index - b.index).forEach((row) => {
    if (left <= 0) return;
    row.value += 1;
    left -= 1;
  });
  return mapped.map(({ raw, rest, index, ...row }) => row);
}

function buildLivingWithPartnerSnapshotCards(profile = {}) {
  const behavior = getLivingWithPartnerBehaviorProfile(profile || {});
  const signalMap = behavior.signalMap || {};
  const rows = LIVING_WITH_PARTNER_SNAPSHOT_KEYS.map((key) => {
    const definition = LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS[key] || {};
    return { key, raw: (LIVING_WITH_PARTNER_BASE_WEIGHTS[key] || 12) + Math.max(0, Number(signalMap[key]) || 0), label: definition.label, category: definition.category || "stability", note: definition.note, insight: definition.insight, action: definition.action, trendType: definition.trendType || "wave" };
  });
  return normalizeRows(rows).sort((a, b) => b.value - a.value || LIVING_WITH_PARTNER_SNAPSHOT_KEYS.indexOf(a.key) - LIVING_WITH_PARTNER_SNAPSHOT_KEYS.indexOf(b.key)).map((row, index) => ({ key: row.key, label: row.label, value: row.value, status: pressureStatus(row.value, index), trendType: row.trendType, category: row.category, note: row.note, insight: row.insight, action: row.action }));
}

function stageText(profile = {}) {
  return [profile.setup, profile.rhythm, profile.workload, profile.pressure, profile.coping, profile.goal].filter(Boolean).join(" ").toLowerCase();
}

function makeSignalScores(profile = {}, baseWeights = {}, rules = []) {
  const text = stageText(profile);
  const scores = { ...baseWeights };
  const add = (key, amount) => {
    scores[key] = (scores[key] || 0) + amount;
  };
  rules.forEach(([pattern, key, amount]) => {
    if (pattern.test(text)) add(key, amount);
  });
  return scores;
}

function buildGenericSnapshotCards(profile = {}, keys = [], baseWeights = {}, definitions = {}, rules = []) {
  const scores = makeSignalScores(profile, baseWeights, rules);
  const rows = keys.map((key) => ({ key, raw: scores[key] || baseWeights[key] || 12, ...definitions[key] }));
  return normalizeRows(rows).sort((a, b) => b.value - a.value || keys.indexOf(a.key) - keys.indexOf(b.key)).map((row, index) => ({ key: row.key, label: row.label, value: row.value, status: pressureStatus(row.value, index), trendType: row.trendType, category: row.category, note: row.note, insight: row.insight, action: row.action }));
}

function buildFamilyHouseholdSnapshotCards(profile = {}) {
  return buildGenericSnapshotCards(profile, FAMILY_HOUSEHOLD_SNAPSHOT_KEYS, FAMILY_HOUSEHOLD_BASE_WEIGHTS, FAMILY_HOUSEHOLD_DEFINITIONS, [
    [/bill|bills|rent|utilit|contribution|shared|household|home/, "homeBills", 22],
    [/food|grocery|groceries|daily|essential|needs/, "foodNeeds", 18],
    [/request|support|help|relative|parents|family|medical|education/, "supportRequests", 22],
    [/boundary|boundaries|guilt|delay|tight|personal|hide|limit|limits/, "boundaries", 20],
    [/emergency|emergencies|buffer|surprise|rescue|stability|protect/, "emergencyGaps", 18],
  ]);
}

function buildSingleParentSnapshotCards(profile = {}) {
  return buildGenericSnapshotCards(profile, SINGLE_PARENT_SNAPSHOT_KEYS, SINGLE_PARENT_BASE_WEIGHTS, SINGLE_PARENT_DEFINITIONS, [
    [/child|school|childcare|food|daily|essential|essentials|health|education/, "childEssentials", 24],
    [/time|busy|care|work|overlap|limited|always|exhausted|support/, "timePressure", 20],
    [/emergency|health|urgent|borrow|debt|unexpected|risk|cost/, "emergencyRisk", 22],
    [/sacrifice|guilt|personal|own needs|avoid|comfort|stretch/, "personalSacrifice", 18],
    [/future|protect|stability|buffer|secure|insurance|safety/, "futureProtection", 18],
  ]);
}

function buildFullTimeEarnerSnapshotCards(profile = {}) {
  return buildGenericSnapshotCards(profile, FULL_TIME_EARNER_SNAPSHOT_KEYS, FULL_TIME_EARNER_BASE_WEIGHTS, FULL_TIME_EARNER_DEFINITIONS, [
    [/salary|cutoff|payday|fixed|monthly|stable|income|routine/, "salaryCycle", 22],
    [/bill|bills|subscription|subscriptions|installment|installments|debt|obligation|family|support/, "billsPressure", 22],
    [/reward|spending|convenience|lifestyle|leak|upgrade|small|fades/, "paydayLeak", 20],
    [/fatigue|tired|shift|work|hours|burnout|commute|stress/, "workFatigue", 18],
    [/save|savings|emergency|future|goal|goals|automation|control/, "futureGoals", 18],
  ]);
}

function buildFreelanceSeasonSnapshotCards(profile = {}) {
  return buildGenericSnapshotCards(profile, FREELANCE_SEASON_SNAPSHOT_KEYS, FREELANCE_SEASON_BASE_WEIGHTS, FREELANCE_SEASON_DEFINITIONS, [
    [/irregular|income|variability|variable|feast|famine|strong weeks|no fixed|payment/, "incomeVariability", 24],
    [/client|clients|late|delay|delayed|invoice|approval|timing|recurring/, "clientTiming", 22],
    [/dry|gap|buffer|emergency|risk|survive|low-client/, "dryWeeks", 20],
    [/project|deadline|revision|overwork|overworked|underprice|scope|pressure|anxious/, "projectPressure", 18],
    [/cash flow|cashflow|personal|business|mixing|stability|split|tax|ops|freedom/, "cashFlowBuffer", 18],
  ]);
}

function buildBusinessBuilderSnapshotCards(profile = {}) {
  return buildGenericSnapshotCards(profile, BUSINESS_BUILDER_SNAPSHOT_KEYS, BUSINESS_BUILDER_BASE_WEIGHTS, BUSINESS_BUILDER_DEFINITIONS, [
    [/cash|flow|sales|collection|collections|income|revenue|timing/, "cashFlow", 26],
    [/reinvest|reinvestment|inventory|tools|marketing|upgrade|ads|stock|expansion/, "reinvestment", 22],
    [/operating|cost|costs|supplies|platform|transport|rent|subscription|delivery|fees/, "operatingCosts", 20],
    [/owner|pay|personal|salary|draw|profit|paid|income/, "ownerPay", 18],
    [/growth|scale|customers|competition|pressure|proof|bigger|overwork/, "growthPressure", 18],
  ]);
}

function fromDefinition(stageKey) {
  const definition = getStageDefinition(stageKey, {});
  const cards = (definition?.indicators || []).map((item, index) => ({ key: toKey(item.label, index), label: item.label || "Stage Signal", value: Number(item.value) || 0, status: item.status || statusFromValue(item.value), trendType: item.trendType || (index % 2 === 0 ? "wave" : "stable"), category: item.category || "stability", note: item.note || definition?.identity?.caption || "CLARA is reading this stage signal.", insight: item.insight || item.note || definition?.identity?.overview || "This pattern is part of the current life stage reading.", action: item.action || definition?.recommendations?.[index] || "Choose one smaller next step before pressure gets heavier." }));
  return { model: `${String(stageKey || "life-stage").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-stage-engine`, subtitle: `100% split of your current ${stageKey} pressure.`, cards };
}

export function getLifeStageSnapshot(stageKey = getSelectedLifeStageKey(), profile = null) {
  const normalized = normalizeLifeStageKey(stageKey);

  if (normalized === "Working Student") {
    const behavior = getWorkingStudentBehaviorProfile(profile || {});
    return { model: "working-student-canonical-engine", subtitle: "100% split of your current Working Student pressure.", cards: behavior.snapshotDistribution || [] };
  }

  if (normalized === YOUNG_PROFESSIONAL_STAGE_KEY) {
    const behavior = getYoungProfessionalBehaviorProfile(profile || {});
    return { model: "young-professional-canonical-engine", subtitle: "100% split of your current Young Professional pressure.", cards: behavior.snapshotDistribution || [] };
  }

  if (normalized === LIVING_WITH_PARTNER_STAGE_KEY || normalized === "Living With Partner") {
    return { model: "living-with-partner-canonical-engine", subtitle: "100% split of your current Living With Partner pressure.", cards: buildLivingWithPartnerSnapshotCards(profile || {}) };
  }

  if (normalized === "Family Household") {
    return { model: "family-household-canonical-engine", subtitle: "100% split of your current Family Household pressure.", cards: buildFamilyHouseholdSnapshotCards(profile || {}) };
  }

  if (normalized === "Single Parent") {
    return { model: "single-parent-canonical-engine", subtitle: "100% split of your current Single Parent pressure.", cards: buildSingleParentSnapshotCards(profile || {}) };
  }

  if (normalized === "Full-Time Earner") {
    return { model: "full-time-earner-canonical-engine", subtitle: "100% split of your current Full-Time Earner pressure.", cards: buildFullTimeEarnerSnapshotCards(profile || {}) };
  }

  if (normalized === "Freelance Season") {
    return { model: "freelance-season-canonical-engine", subtitle: "100% split of your current Freelance Season pressure.", cards: buildFreelanceSeasonSnapshotCards(profile || {}) };
  }

  if (normalized === "Business Builder") {
    return { model: "business-builder-canonical-engine", subtitle: "100% split of your current Business Builder pressure.", cards: buildBusinessBuilderSnapshotCards(profile || {}) };
  }

  const staticStage = LIFE_STAGE_SNAPSHOT[normalized];
  if (staticStage?.cards?.length) return staticStage;
  return fromDefinition(normalized);
}

export default LIFE_STAGE_SNAPSHOT;
