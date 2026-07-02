const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const list = (value) => Array.isArray(value) ? value.filter(Boolean).map(clean) : value ? [clean(value)] : [];

const STAGE_PRIORITIES = {
  "working student": ["education", "school", "tuition", "transport", "work", "food"],
  "single parent": ["child", "children", "food", "housing", "health", "school", "utilities"],
  "family household": ["family", "food", "housing", "utilities", "health", "school"],
  "living with partner": ["housing", "shared bills", "utilities", "food", "emergency"],
  "full time earner": ["bills", "emergency", "savings", "transport", "food"],
  "freelance gig worker": ["runway", "emergency", "bills", "work", "income stability"],
  "business builder": ["business", "cash flow", "inventory", "operations", "emergency"],
};

function firstProfile(context = {}) {
  return context.lifeStageContext || context.lifeStageAiContext || context.meLifeStageProfile || context.Me_summary_profile || context.meProfileContext || context.lifeProfile || null;
}

function analyzeLifeStageContext(context = {}, purchase = {}) {
  const profile = firstProfile(context);
  if (!profile || typeof profile !== "object") return { connected: false, hasProfile: false, stage: "", dominantPressures: [], protectedPriorities: [], relevance: "unknown", confidence: "none", explanationBasis: [] };
  const nested = profile.lifeStageContext && typeof profile.lifeStageContext === "object" ? profile.lifeStageContext : profile;
  const stage = clean(nested.lifeStage || nested.stage || nested.selectedLifeStage || nested.profileAnswers?.lifeStage || profile.lifeStage || "");
  const hasProfile = Boolean(nested.hasProfile ?? profile.hasProfile ?? stage);
  const dominantPressures = list(nested.dominantPressures || nested.dominantPressure || profile.dominant_pressure || nested.snapshotTopSignals).slice(0, 5);
  const explicitPriorities = list(nested.protectedPriorities || nested.recommendedNextMoves || profile.recommended_next_moves);
  const fallbackPriorities = STAGE_PRIORITIES[stage.toLowerCase()] || [];
  const protectedPriorities = [...new Set([...explicitPriorities, ...fallbackPriorities])].slice(0, 8);
  const purchaseText = clean(`${purchase.item || ""} ${purchase.reason || ""} ${purchase.category || ""} ${purchase.categoryKey || ""}`).toLowerCase();
  const supports = protectedPriorities.filter((priority) => purchaseText.includes(priority.toLowerCase()));
  const discretionary = /shopping|lifestyle|entertainment|fashion|gaming|dining|want|leisure/.test(purchaseText);
  const pressurePresent = dominantPressures.length > 0;
  const relevance = supports.length ? "supportive" : discretionary && pressurePresent ? "conflicting" : hasProfile ? "neutral" : "unknown";
  return {
    connected: true,
    hasProfile,
    stage,
    dominantPressures,
    protectedPriorities,
    relevance,
    confidence: hasProfile && stage ? "high" : hasProfile ? "medium" : "low",
    explanationBasis: supports.length ? supports.map((item) => `supports:${item}`) : pressurePresent ? dominantPressures.map((item) => `pressure:${item}`) : [],
  };
}

export { analyzeLifeStageContext };
