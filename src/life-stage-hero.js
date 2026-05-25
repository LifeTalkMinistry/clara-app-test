import { getLifeStageImage } from "./config/lifeStageImages";
import { getStageDefinition } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";
import { getSelectedLifeStageKey, normalizeLifeStageKey, LIFE_STAGE_CONTEXT_BOARD } from "./life-stage-flow";

function hero(stageKey, mood, shortDescription) {
  const key = normalizeLifeStageKey(stageKey);
  const definition = getStageDefinition(key, {});
  return {
    key,
    title: key,
    label: "YOUR LIFE STAGE",
    shortDescription: shortDescription || definition?.identity?.caption || "CLARA is reading this life stage with care.",
    contextText: LIFE_STAGE_CONTEXT_BOARD[key] || definition?.identity?.overview || "CLARA is preparing this stage context.",
    heroImage: getLifeStageImage(key),
    visual: {
      accent: "cyan-violet",
      mood,
      overlay: "premium-dark-glass",
    },
  };
}

export const LIFE_STAGE_HERO = {
  "Young Professional": hero("Young Professional", "career-building", "Early independence, career identity, lifestyle pressure, and first real money systems are forming."),
  "Working Student": hero("Working Student", "night-study", "There is still planning capacity, boundary-setting, or a strength-based control signal."),
  "Living With Partner": hero("Living With Partner", "shared-life", "Shared life, shared costs, and emotional boundaries are shaping money decisions."),
  "Family Household": hero("Family Household", "home-responsibility", "Home routines, contribution expectations, family needs, and personal boundaries influence money behavior."),
  "Single Parent": hero("Single Parent", "protective-season", "Child-centered essentials, time pressure, emotional energy, and emergency safety need careful protection."),
  "Full-Time Earner": hero("Full-Time Earner", "routine-earning", "Stable work, salary cycles, family responsibility, fatigue, and lifestyle creep become the quiet patterns to watch."),
  "Freelance Season": hero("Freelance Season", "flexible-income", "Income timing, client flow, dry months, boundaries, and buffers matter more than perfect planning."),
  "Business Builder": hero("Business Builder", "building-season", "Operating costs, reinvestment, sales swings, personal income, and decision pressure can easily mix."),
};

export function getLifeStageHero(stageKey = getSelectedLifeStageKey()) {
  const normalized = normalizeLifeStageKey(stageKey);
  return LIFE_STAGE_HERO[normalized] || LIFE_STAGE_HERO["Young Professional"] || LIFE_STAGE_HERO["Working Student"];
}

export default LIFE_STAGE_HERO;
