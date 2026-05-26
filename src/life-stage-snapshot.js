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
};

const LIVING_WITH_PARTNER_SNAPSHOT_KEYS = [
  "sharedBills",
  "moneyTalks",
  "fairness",
  "comfortSpending",
  "emergencyBuffer",
];

const LIVING_WITH_PARTNER_BASE_WEIGHTS = {
  sharedBills: 28,
  moneyTalks: 22,
  fairness: 20,
  comfortSpending: 16,
  emergencyBuffer: 14,
};

const FAMILY_HOUSEHOLD_SNAPSHOT_KEYS = [
  "homeBills",
  "foodNeeds",
  "supportRequests",
  "boundaries",
  "emergencyGaps",
];

const FAMILY_HOUSEHOLD_BASE_WEIGHTS = {
  homeBills: 28,
  foodNeeds: 23,
  supportRequests: 20,
  boundaries: 16,
  emergencyGaps: 13,
};

const FAMILY_HOUSEHOLD_DEFINITIONS = {
  homeBills: {
    label: "Home Bills",
    category: "pressure",
    trendType: "wave",
    note: "Rent, utilities, shared bills, and household contribution are taking real space in the month.",
    insight: "Home stability can look normal on the outside while quietly using the money meant for personal progress.",
    action: "List the fixed home costs first before deciding what can still be flexible.",
  },
  foodNeeds: {
    label: "Food Needs",
    category: "essentials",
    trendType: "stable",
    note: "Food, groceries, and daily household needs may be shaping most weekly decisions.",
    insight: "When food needs are not planned, small store runs can become the hidden leak of the household budget.",
    action: "Set one weekly food amount and separate it from flexible spending.",
  },
  supportRequests: {
    label: "Support Requests",
    category: "family",
    trendType: "spike",
    note: "Family requests or sudden home needs can interrupt the original money plan.",
    insight: "Helping matters, but unplanned support can make one person carry pressure that belongs to the whole household.",
    action: "Decide the safe support limit before requests appear.",
  },
  boundaries: {
    label: "Boundaries",
    category: "stability",
    trendType: "volatile",
    note: "Personal limits may be hard to protect when home needs feel urgent or emotional.",
    insight: "Without a clear boundary, guilt can become the system that decides where money goes.",
    action: "Protect one personal need or savings amount before giving extra support.",
  },
  emergencyGaps: {
    label: "Emergency Gaps",
    category: "protection",
    trendType: "upward",
    note: "Unexpected medical, school, repair, or household costs may have no protected buffer yet.",
    insight: "A weak emergency layer can turn one family need into debt, delay, or personal sacrifice.",
    action: "Start a small household emergency buffer even if the first amount is tiny.",
  },
};

const SINGLE_PARENT_SNAPSHOT_KEYS = [
  "childEssentials",
  "timePressure",
  "emergencyRisk",
  "personalSacrifice",
  "futureProtection",
];

const SINGLE_PARENT_BASE_WEIGHTS = {
  childEssentials: 30,
  timePressure: 22,
  emergencyRisk: 20,
  personalSacrifice: 16,
  futureProtection: 12,
};

const SINGLE_PARENT_DEFINITIONS = {
  childEssentials: {
    label: "Child Essentials",
    category: "essentials",
    trendType: "stable",
    note: "Food, school, childcare, health, and daily needs may be taking priority before everything else.",
    insight: "When essentials are heavy, one missed plan can affect both the child’s stability and the parent’s peace.",
    action: "Separate the child-essential amount first before any flexible spending starts.",
  },
  timePressure: {
    label: "Time Pressure",
    category: "energy",
    trendType: "downward",
    note: "Work, caregiving, errands, and limited rest may be reducing the energy available for planning.",
    insight: "When time is tight, convenience spending can become a survival tool instead of a choice.",
    action: "Choose one repeatable routine that saves time without quietly draining money.",
  },
  emergencyRisk: {
    label: "Emergency Risk",
    category: "protection",
    trendType: "spike",
    note: "Unexpected health, school, transport, or home costs can disrupt the whole month quickly.",
    insight: "A small emergency can feel bigger when one income or one person carries most of the recovery.",
    action: "Build a tiny emergency layer before chasing a perfect savings target.",
  },
  personalSacrifice: {
    label: "Personal Sacrifice",
    category: "pressure",
    trendType: "volatile",
    note: "Personal needs may be delayed because the child’s needs feel more urgent and non-negotiable.",
    insight: "Sacrifice can protect the child short term, but repeated self-neglect can weaken the parent’s stability.",
    action: "Protect one small personal need as part of the family stability plan.",
  },
  futureProtection: {
    label: "Future Protection",
    category: "growth",
    trendType: "upward",
    note: "Education, safety, insurance, and long-term security may be important but hard to fund consistently.",
    insight: "Future protection grows through small protected actions, not one perfect big plan.",
    action: "Assign even a small fixed amount toward the child’s future or protection goal.",
  },
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
    return {
      key,
      raw: (LIVING_WITH_PARTNER_BASE_WEIGHTS[key] || 12) + Math.max(0, Number(signalMap[key]) || 0),
      label: definition.label,
      category: definition.category || "stability",
      note: definition.note,
      insight: definition.insight,
      action: definition.action,
      trendType: definition.trendType || "wave",
    };
  });

  return normalizeRows(rows)
    .sort((a, b) => b.value - a.value || LIVING_WITH_PARTNER_SNAPSHOT_KEYS.indexOf(a.key) - LIVING_WITH_PARTNER_SNAPSHOT_KEYS.indexOf(b.key))
    .map((row, index) => ({
      key: row.key,
      label: row.label,
      value: row.value,
      status: pressureStatus(row.value, index),
      trendType: row.trendType,
      category: row.category,
      note: row.note,
      insight: row.insight,
      action: row.action,
    }));
}

function stageText(profile = {}) {
  return [profile.setup, profile.rhythm, profile.workload, profile.pressure, profile.coping, profile.goal]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function familyHouseholdSignalScores(profile = {}) {
  const text = stageText(profile);
  const scores = { ...FAMILY_HOUSEHOLD_BASE_WEIGHTS };
  const add = (key, amount) => {
    scores[key] = (scores[key] || 0) + amount;
  };

  if (/bill|bills|rent|utilit|contribution|shared|household|home/.test(text)) add("homeBills", 22);
  if (/food|grocery|groceries|daily|essential|needs/.test(text)) add("foodNeeds", 18);
  if (/request|support|help|relative|parents|family|medical|education/.test(text)) add("supportRequests", 22);
  if (/boundary|boundaries|guilt|delay|tight|personal|hide|limit|limits/.test(text)) add("boundaries", 20);
  if (/emergency|emergencies|buffer|surprise|rescue|stability|protect/.test(text)) add("emergencyGaps", 18);

  return scores;
}

function buildFamilyHouseholdSnapshotCards(profile = {}) {
  const scores = familyHouseholdSignalScores(profile || {});
  const rows = FAMILY_HOUSEHOLD_SNAPSHOT_KEYS.map((key) => ({
    key,
    raw: scores[key] || FAMILY_HOUSEHOLD_BASE_WEIGHTS[key] || 12,
    ...FAMILY_HOUSEHOLD_DEFINITIONS[key],
  }));

  return normalizeRows(rows)
    .sort((a, b) => b.value - a.value || FAMILY_HOUSEHOLD_SNAPSHOT_KEYS.indexOf(a.key) - FAMILY_HOUSEHOLD_SNAPSHOT_KEYS.indexOf(b.key))
    .map((row, index) => ({
      key: row.key,
      label: row.label,
      value: row.value,
      status: pressureStatus(row.value, index),
      trendType: row.trendType,
      category: row.category,
      note: row.note,
      insight: row.insight,
      action: row.action,
    }));
}

function singleParentSignalScores(profile = {}) {
  const text = stageText(profile);
  const scores = { ...SINGLE_PARENT_BASE_WEIGHTS };
  const add = (key, amount) => {
    scores[key] = (scores[key] || 0) + amount;
  };

  if (/child|school|childcare|food|daily|essential|essentials|health|education/.test(text)) add("childEssentials", 24);
  if (/time|busy|care|work|overlap|limited|always|exhausted|support/.test(text)) add("timePressure", 20);
  if (/emergency|health|urgent|borrow|debt|unexpected|risk|cost/.test(text)) add("emergencyRisk", 22);
  if (/sacrifice|guilt|personal|own needs|avoid|comfort|stretch/.test(text)) add("personalSacrifice", 18);
  if (/future|protect|stability|buffer|secure|insurance|safety/.test(text)) add("futureProtection", 18);

  return scores;
}

function buildSingleParentSnapshotCards(profile = {}) {
  const scores = singleParentSignalScores(profile || {});
  const rows = SINGLE_PARENT_SNAPSHOT_KEYS.map((key) => ({
    key,
    raw: scores[key] || SINGLE_PARENT_BASE_WEIGHTS[key] || 12,
    ...SINGLE_PARENT_DEFINITIONS[key],
  }));

  return normalizeRows(rows)
    .sort((a, b) => b.value - a.value || SINGLE_PARENT_SNAPSHOT_KEYS.indexOf(a.key) - SINGLE_PARENT_SNAPSHOT_KEYS.indexOf(b.key))
    .map((row, index) => ({
      key: row.key,
      label: row.label,
      value: row.value,
      status: pressureStatus(row.value, index),
      trendType: row.trendType,
      category: row.category,
      note: row.note,
      insight: row.insight,
      action: row.action,
    }));
}

function fromDefinition(stageKey) {
  const definition = getStageDefinition(stageKey, {});
  const cards = (definition?.indicators || []).map((item, index) => ({
    key: toKey(item.label, index),
    label: item.label || "Stage Signal",
    value: Number(item.value) || 0,
    status: item.status || statusFromValue(item.value),
    trendType: item.trendType || (index % 2 === 0 ? "wave" : "stable"),
    category: item.category || "stability",
    note: item.note || definition?.identity?.caption || "CLARA is reading this stage signal.",
    insight: item.insight || item.note || definition?.identity?.overview || "This pattern is part of the current life stage reading.",
    action: item.action || definition?.recommendations?.[index] || "Choose one smaller next step before pressure gets heavier.",
  }));

  return {
    model: `${String(stageKey || "life-stage").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-stage-engine`,
    subtitle: `100% split of your current ${stageKey} pressure.`,
    cards,
  };
}

export function getLifeStageSnapshot(stageKey = getSelectedLifeStageKey(), profile = null) {
  const normalized = normalizeLifeStageKey(stageKey);

  if (normalized === "Working Student") {
    const behavior = getWorkingStudentBehaviorProfile(profile || {});
    return {
      model: "working-student-canonical-engine",
      subtitle: "100% split of your current Working Student pressure.",
      cards: behavior.snapshotDistribution || [],
    };
  }

  if (normalized === YOUNG_PROFESSIONAL_STAGE_KEY) {
    const behavior = getYoungProfessionalBehaviorProfile(profile || {});
    return {
      model: "young-professional-canonical-engine",
      subtitle: "100% split of your current Young Professional pressure.",
      cards: behavior.snapshotDistribution || [],
    };
  }

  if (normalized === LIVING_WITH_PARTNER_STAGE_KEY || normalized === "Living With Partner") {
    return {
      model: "living-with-partner-canonical-engine",
      subtitle: "100% split of your current Living With Partner pressure.",
      cards: buildLivingWithPartnerSnapshotCards(profile || {}),
    };
  }

  if (normalized === "Family Household") {
    return {
      model: "family-household-canonical-engine",
      subtitle: "100% split of your current Family Household pressure.",
      cards: buildFamilyHouseholdSnapshotCards(profile || {}),
    };
  }

  if (normalized === "Single Parent") {
    return {
      model: "single-parent-canonical-engine",
      subtitle: "100% split of your current Single Parent pressure.",
      cards: buildSingleParentSnapshotCards(profile || {}),
    };
  }

  const staticStage = LIFE_STAGE_SNAPSHOT[normalized];
  if (staticStage?.cards?.length) return staticStage;
  return fromDefinition(normalized);
}

export default LIFE_STAGE_SNAPSHOT;
