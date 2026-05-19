import { LOCAL_FINANCE_STORES, upsertLocalRecord } from "./localFinanceStore";

export const LIFE_STAGE_SNAPSHOT_KEY = "clara_life_stage_snapshot_v1";
export const LIFE_STAGE_MEMORY_KEY = "clara_life_stage_ai_memory_v1";
export const LIFE_STAGE_PROFILE_RECORD_ID = "clara_life_stage_profile_current";
export const LIFE_STAGE_MEMORY_RECORD_ID = "clara_life_stage_memory_current";

const LOCAL_USER_KEY = "clara_local_user_id";
const FALLBACK_LOCAL_USER_ID = "local-user";
const QUESTION_KEYS = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];

const STAGE_BASE = {
  "Young Professional": {
    financialPressure: 54,
    burnoutRisk: 48,
    emotionalSpendingRisk: 54,
    debtVulnerability: 42,
    incomeInstability: 34,
    routineInstability: 42,
    futurePotential: 74,
  },
  "Working Student": {
    financialPressure: 64,
    burnoutRisk: 68,
    emotionalSpendingRisk: 56,
    debtVulnerability: 44,
    incomeInstability: 48,
    routineInstability: 56,
    futurePotential: 84,
  },
  "Living with Partner": {
    financialPressure: 56,
    burnoutRisk: 44,
    emotionalSpendingRisk: 48,
    debtVulnerability: 38,
    incomeInstability: 32,
    routineInstability: 40,
    futurePotential: 76,
  },
  "Family Household": {
    financialPressure: 66,
    burnoutRisk: 58,
    emotionalSpendingRisk: 52,
    debtVulnerability: 46,
    incomeInstability: 36,
    routineInstability: 48,
    futurePotential: 72,
  },
  "Single Parent": {
    financialPressure: 74,
    burnoutRisk: 70,
    emotionalSpendingRisk: 50,
    debtVulnerability: 52,
    incomeInstability: 42,
    routineInstability: 56,
    futurePotential: 82,
  },
  "Full-Time Earner": {
    financialPressure: 52,
    burnoutRisk: 56,
    emotionalSpendingRisk: 58,
    debtVulnerability: 42,
    incomeInstability: 24,
    routineInstability: 36,
    futurePotential: 74,
  },
  "Freelance Season": {
    financialPressure: 68,
    burnoutRisk: 58,
    emotionalSpendingRisk: 52,
    debtVulnerability: 46,
    incomeInstability: 72,
    routineInstability: 64,
    futurePotential: 82,
  },
  "Business Builder": {
    financialPressure: 70,
    burnoutRisk: 66,
    emotionalSpendingRisk: 48,
    debtVulnerability: 54,
    incomeInstability: 62,
    routineInstability: 58,
    futurePotential: 86,
  },
};

const STAGE_ARCHETYPE = {
  "Young Professional": "Building independence",
  "Working Student": "Stretched but resilient",
  "Living with Partner": "Shared life, shared pressure",
  "Family Household": "Responsible at home",
  "Single Parent": "Protective and pressured",
  "Full-Time Earner": "Stable but stretched",
  "Freelance Season": "Flexible but exposed",
  "Business Builder": "Building with pressure",
};

const RULES = [
  {
    match: /(survival|burnout|exhausted|draining|no rest|long work|long operating|everyone depends|emotionally heavy|constant tension)/i,
    weights: { burnoutRisk: 18, routineInstability: 12, emotionalSpendingRisk: 8 },
    tag: "low recovery capacity",
  },
  {
    match: /(irregular|unstable|delayed|dry month|feast|famine|cash flow swings|sales not steady|income mismatch|overtime-dependent|seasonal|project waves)/i,
    weights: { incomeInstability: 20, financialPressure: 10, routineInstability: 10 },
    tag: "income timing risk",
  },
  {
    match: /(debt|borrow|credit|pay later|delayed-pressure|loan)/i,
    weights: { debtVulnerability: 22, financialPressure: 12, emotionalSpendingRisk: 5 },
    tag: "debt vulnerability",
  },
  {
    match: /(family|supporting|contribution|parents|siblings|household|child|children|co-parenting|solo|partner covers|one income)/i,
    weights: { financialPressure: 12, burnoutRisk: 8, routineInstability: 6 },
    tag: "responsibility pressure",
  },
  {
    match: /(tuition|school|childcare|education|medical|emergency|health|food|bills|transport|rent|operating costs|inventory|capital)/i,
    weights: { financialPressure: 14, debtVulnerability: 6 },
    tag: "essential cost pressure",
  },
  {
    match: /(reward|comfort|overspend|spend after|payday|lifestyle|socially|convenience|escape stress|sales are good)/i,
    weights: { emotionalSpendingRisk: 18, financialPressure: 5 },
    tag: "emotional spending pattern",
  },
  {
    match: /(avoid|ignore|hide|not checking|avoid checking)/i,
    weights: { emotionalSpendingRisk: 12, debtVulnerability: 8, routineInstability: 8 },
    tag: "money avoidance pattern",
  },
  {
    match: /(cut back|over-restrict|over-sacrifice|sacrifice my own|delay my own needs|delay self-care)/i,
    weights: { burnoutRisk: 12, emotionalSpendingRisk: 6 },
    tag: "over-sacrifice risk",
  },
  {
    match: /(stable|fixed|monthly salary|recurring|manageable|calm|track|separate|plan together|review together|set limits|set boundaries|ask for support)/i,
    weights: { incomeInstability: -10, routineInstability: -10, debtVulnerability: -5, burnoutRisk: -4 },
    tag: "protective structure present",
  },
  {
    match: /(save|emergency fund|buffer|runway|separate wallets|pay myself|grow sustainably|graduate safely|protect essentials|future)/i,
    weights: { futurePotential: 10, debtVulnerability: -4 },
    tag: "clear protection priority",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function unique(list) {
  return [...new Set((list || []).filter(Boolean))];
}

function normalizeProfile(profile = {}) {
  const stage = String(profile.stage || "Young Professional").trim() || "Young Professional";
  const answers = QUESTION_KEYS.reduce((acc, key) => {
    acc[key] = String(profile[key] || "").trim();
    return acc;
  }, {});

  return {
    stage,
    answers,
    raw: {
      stage,
      ...answers,
      createdAt: profile.createdAt || profile.created_at || null,
      updatedAt: profile.updatedAt || profile.updated_at || nowIso(),
    },
  };
}

function applyRules(profile) {
  const base = STAGE_BASE[profile.stage] || STAGE_BASE["Young Professional"];
  const scores = { ...base };
  const tags = [profile.stage.toLowerCase().replace(/\s+/g, "_")];
  const evidence = [];

  Object.entries(profile.answers).forEach(([key, value]) => {
    const text = String(value || "");
    if (!text) return;

    RULES.forEach((rule) => {
      if (!rule.match.test(text)) return;
      Object.entries(rule.weights).forEach(([scoreKey, amount]) => {
        scores[scoreKey] = (scores[scoreKey] || 0) + amount;
      });
      tags.push(rule.tag);
      evidence.push({ question: key, answer: value, tag: rule.tag });
    });
  });

  const burnoutRisk = clamp(scores.burnoutRisk);
  const financialPressure = clamp(scores.financialPressure);
  const emotionalSpendingRisk = clamp(scores.emotionalSpendingRisk);
  const debtVulnerability = clamp(scores.debtVulnerability);
  const incomeInstability = clamp(scores.incomeInstability);
  const routineInstability = clamp(scores.routineInstability);
  const routineStability = clamp(100 - routineInstability);
  const incomeStability = clamp(100 - incomeInstability);
  const recoveryCapacity = clamp(100 - burnoutRisk + (routineStability > 55 ? 8 : 0));
  const futurePotential = clamp(scores.futurePotential);
  const survivalPressure = clamp((financialPressure * 0.55) + (burnoutRisk * 0.25) + (debtVulnerability * 0.2));

  return {
    metrics: {
      financialPressure,
      burnoutRisk,
      emotionalSpendingRisk,
      debtVulnerability,
      incomeInstability,
      incomeStability,
      routineInstability,
      routineStability,
      recoveryCapacity,
      futurePotential,
      survivalPressure,
    },
    tags: unique(tags),
    evidence,
  };
}

function labelScore(value, highPositive = false) {
  if (highPositive) {
    if (value >= 75) return "Strong";
    if (value >= 55) return "Building";
    if (value >= 35) return "Fragile";
    return "Low";
  }

  if (value >= 75) return "High";
  if (value >= 55) return "Moderate";
  if (value >= 35) return "Watch";
  return "Low";
}

function derivePrimaryRisk(metrics) {
  const candidates = [
    ["Financial pressure", metrics.financialPressure],
    ["Burnout pressure", metrics.burnoutRisk],
    ["Emotional spending", metrics.emotionalSpendingRisk],
    ["Debt vulnerability", metrics.debtVulnerability],
    ["Income instability", metrics.incomeInstability],
  ];
  return candidates.sort((a, b) => b[1] - a[1])[0]?.[0] || "Pressure risk";
}

function derivePrimaryStrength(profile, metrics) {
  if (metrics.futurePotential >= 80) return "Strong growth potential";
  if (/stable|fixed|monthly|recurring/i.test(profile.answers.rhythm)) return "Predictable rhythm";
  if (/ask|support|plan|track|separate|boundaries/i.test(profile.answers.coping)) return "Protective habit";
  return "Awareness and willingness to plan";
}

function deriveStatusBadge(metrics) {
  if (metrics.financialPressure >= 75 && metrics.futurePotential >= 78) return "High Pressure / Strong Potential";
  if (metrics.burnoutRisk >= 75) return "Recovery Needed";
  if (metrics.incomeInstability >= 70) return "Cash Flow Unstable";
  if (metrics.emotionalSpendingRisk >= 70) return "Stress Spending Watch";
  if (metrics.routineStability >= 65) return "Stable but Watchful";
  return "Protection Mode Active";
}

function deriveFinancialEnvironment(profile, metrics) {
  if (metrics.survivalPressure >= 75) return "High-pressure survival environment";
  if (metrics.incomeInstability >= 70) return "Unstable cash-flow environment";
  if (metrics.routineStability >= 65) return "Structured but still pressure-sensitive environment";
  if (/partner/i.test(profile.stage)) return "Shared financial environment";
  if (/business/i.test(profile.stage)) return "Business-personal boundary environment";
  return "Developing financial environment";
}

function deriveFirstAction(profile, metrics) {
  const goal = profile.answers.goal || "Build stable habits";
  const pressure = profile.answers.pressure || "current pressure";

  if (/debt|borrow|credit/i.test(goal + pressure)) {
    return "Protect debt payments first, then add a tiny buffer before any flexible spending.";
  }
  if (/emergency|buffer|runway|dry month/i.test(goal + pressure)) {
    return "Create a small automatic buffer before spending from the next available income.";
  }
  if (/stress|reward|comfort|lifestyle|payday/i.test(goal + pressure + profile.answers.coping)) {
    return "Set a small planned reward limit so relief spending does not become hidden pressure.";
  }
  if (/family|child|household|essentials/i.test(goal + pressure)) {
    return "Protect essentials and responsibilities first, then define what can safely wait.";
  }
  if (/business|separate|operating|inventory/i.test(goal + pressure)) {
    return "Separate personal money from operating money before making the next growth decision.";
  }
  if (/partner|shared|together/i.test(goal + pressure)) {
    return "Agree on one shared money rule before the next bill or major purchase.";
  }

  return "Protect the most repeated weekly expense first, then review flexible spending after.";
}

function buildSummary(profile, metrics, primaryRisk, primaryStrength) {
  const pressure = profile.answers.pressure || "your main pressure";
  const rhythm = profile.answers.rhythm || "your money rhythm";
  const coping = profile.answers.coping || "your coping pattern";

  return `CLARA sees a ${profile.stage.toLowerCase()} season where ${pressure.toLowerCase()} and ${rhythm.toLowerCase()} are shaping your decisions. Your main risk is ${primaryRisk.toLowerCase()}, while your strongest signal is ${primaryStrength.toLowerCase()}. The goal is to guide the money around your real life, not judge the spending alone.`;
}

function buildSnapshotIndicators(metrics) {
  return [
    {
      category: "pressure",
      label: "Financial Pressure",
      value: metrics.financialPressure,
      note: "How strongly this life stage can squeeze the month through responsibilities, costs, or timing gaps.",
    },
    {
      category: "energy",
      label: "Burnout Risk",
      value: metrics.burnoutRisk,
      note: "How much the routine, workload, and emotional load may reduce recovery and decision quality.",
    },
    {
      category: "stability",
      label: "Routine Stability",
      value: metrics.routineStability,
      note: "How predictable the user’s rhythm is for planning, saving, and avoiding surprise pressure.",
    },
    {
      category: "stability",
      label: "Emotional Spending",
      value: metrics.emotionalSpendingRisk,
      note: "How likely spending may become relief, avoidance, reward, or survival response under pressure.",
    },
    {
      category: "growth",
      label: "Future Potential",
      value: metrics.futurePotential,
      note: "How much this stage can still support growth if CLARA protects the right pressure points.",
    },
  ];
}

function buildBehaviorProfile(profile, analysis, primaryRisk, primaryStrength) {
  const { metrics, tags, evidence } = analysis;

  return {
    lifeStage: profile.stage,
    interpretedTags: tags,
    financialEnvironment: deriveFinancialEnvironment(profile, metrics),
    routineStability: labelScore(metrics.routineStability, true),
    incomeStability: labelScore(metrics.incomeStability, true),
    emotionalRiskPattern: primaryRisk,
    protectionNeed: profile.answers.goal || "Build a safer money rhythm",
    primaryStrength,
    evidence,
  };
}

function buildConfidence(profile, evidence) {
  const answered = QUESTION_KEYS.filter((key) => profile.answers[key]).length;
  const completion = answered / QUESTION_KEYS.length;
  const evidenceScore = Math.min(1, evidence.length / 8);
  return Math.max(0.35, Math.min(0.88, Number((0.45 + completion * 0.3 + evidenceScore * 0.13).toFixed(2))));
}

export function buildLifeStageIntelligence(profileInput = {}, definition = null) {
  const profile = normalizeProfile(profileInput);
  const analysis = applyRules(profile);
  const primaryRisk = derivePrimaryRisk(analysis.metrics);
  const primaryStrength = derivePrimaryStrength(profile, analysis.metrics);
  const confidenceScore = buildConfidence(profile, analysis.evidence);
  const timestamp = nowIso();

  const behaviorProfile = buildBehaviorProfile(profile, analysis, primaryRisk, primaryStrength);
  const snapshot = {
    id: `life_snapshot_${profile.stage.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    stage: profile.stage,
    archetype: STAGE_ARCHETYPE[profile.stage] || definition?.identity?.title || "Current life season",
    title: STAGE_ARCHETYPE[profile.stage] || definition?.identity?.title || profile.stage,
    statusBadge: deriveStatusBadge(analysis.metrics),
    summary: buildSummary(profile, analysis.metrics, primaryRisk, primaryStrength),
    metrics: analysis.metrics,
    indicators: buildSnapshotIndicators(analysis.metrics),
    strengths: unique([primaryStrength, "Context awareness", analysis.metrics.futurePotential >= 75 ? "Growth potential" : null]),
    riskFlags: unique([primaryRisk, ...analysis.tags.filter((tag) => tag !== profile.stage.toLowerCase().replace(/\s+/g, "_")).slice(0, 4)]),
    protectionPriority: profile.answers.goal || "Build a safer money rhythm",
    firstAction: deriveFirstAction(profile, analysis.metrics),
    confidenceScore,
    confidenceLabel: confidenceScore >= 0.78 ? "Strong" : confidenceScore >= 0.62 ? "Good" : "Learning",
    generatedBy: "local_life_stage_engine_v1",
    updatedAt: timestamp,
  };

  return {
    id: LIFE_STAGE_PROFILE_RECORD_ID,
    version: 1,
    stage: profile.stage,
    answers: profile.answers,
    rawProfile: profile.raw,
    behaviorProfile,
    snapshot,
    generatedAt: timestamp,
    nextRefreshReason: "local_snapshot_ready_for_world_context",
  };
}

function resolveLocalUserId(localUserIdInput) {
  if (localUserIdInput) return String(localUserIdInput).trim() || FALLBACK_LOCAL_USER_ID;
  if (typeof window === "undefined") return FALLBACK_LOCAL_USER_ID;
  return String(window.localStorage.getItem(LOCAL_USER_KEY) || FALLBACK_LOCAL_USER_ID).trim() || FALLBACK_LOCAL_USER_ID;
}

export function readCachedLifeStageIntelligence() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_SNAPSHOT_KEY) || "null");
  } catch {
    return null;
  }
}

export async function saveLifeStageIntelligence(intelligence, options = {}) {
  if (!intelligence) return null;

  const timestamp = nowIso();
  const localUserId = resolveLocalUserId(options.localUserId);
  const event = {
    id: `life_stage_event_${Date.now()}`,
    type: options.reason || "life_stage_snapshot_generated",
    stage: intelligence.stage,
    snapshotTitle: intelligence.snapshot?.title,
    createdAt: timestamp,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LIFE_STAGE_SNAPSHOT_KEY, JSON.stringify(intelligence));

    const previousMemory = (() => {
      try {
        return JSON.parse(window.localStorage.getItem(LIFE_STAGE_MEMORY_KEY) || "{}");
      } catch {
        return {};
      }
    })();

    const events = [event, ...(previousMemory.events || [])].slice(0, 20);
    window.localStorage.setItem(
      LIFE_STAGE_MEMORY_KEY,
      JSON.stringify({ current: intelligence, events, updatedAt: timestamp })
    );
    window.dispatchEvent(new CustomEvent("clara:life-stage-intelligence-updated", { detail: intelligence }));
  }

  try {
    await upsertLocalRecord(
      LOCAL_FINANCE_STORES.lifeProfile,
      {
        id: LIFE_STAGE_PROFILE_RECORD_ID,
        type: "life_stage_intelligence",
        profileType: "life_stage",
        stage: intelligence.stage,
        answers: intelligence.answers,
        rawProfile: intelligence.rawProfile,
        behaviorProfile: intelligence.behaviorProfile,
        snapshot: intelligence.snapshot,
        updatedAt: timestamp,
      },
      localUserId
    );

    await upsertLocalRecord(
      LOCAL_FINANCE_STORES.aiFinancialMemory,
      {
        id: LIFE_STAGE_MEMORY_RECORD_ID,
        memoryType: "life_stage_intelligence",
        stage: intelligence.stage,
        summary: intelligence.snapshot?.summary,
        tags: intelligence.behaviorProfile?.interpretedTags || [],
        snapshot: intelligence.snapshot,
        event,
        updatedAt: timestamp,
      },
      localUserId
    );
  } catch (error) {
    console.warn("CLARA Life Stage IndexedDB save skipped:", error);
  }

  return intelligence;
}
