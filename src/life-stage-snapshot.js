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

  const staticStage = LIFE_STAGE_SNAPSHOT[normalized];
  if (staticStage?.cards?.length) return staticStage;
  return fromDefinition(normalized);
}

export default LIFE_STAGE_SNAPSHOT;
