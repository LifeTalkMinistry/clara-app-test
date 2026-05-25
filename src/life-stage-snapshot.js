import { getStageDefinition } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";
import { getWorkingStudentBehaviorProfile } from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";
import { YOUNG_PROFESSIONAL_STAGE_KEY, getYoungProfessionalBehaviorProfile } from "./components/fresh/main-dashboard/dashboard-panels/me/youngProfessionalLifeStageSource";
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

  const staticStage = LIFE_STAGE_SNAPSHOT[normalized];
  if (staticStage?.cards?.length) return staticStage;
  return fromDefinition(normalized);
}

export default LIFE_STAGE_SNAPSHOT;
