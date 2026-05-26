export const LIVING_WITH_PARTNER_STAGE_KEY = "Living with Partner";

export const LIVING_WITH_PARTNER_QUESTION_ORDER = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];

export const LIVING_WITH_PARTNER_ROOTS = [
  "Newly living together",
  "Long-term live-in",
  "Living with one family",
  "Planning to move in",
  "One income supports both",
  "Sharing space but still adjusting",
  "Committed relationship, finances still separate",
];

const BASE_BRANCH = {
  rhythm: [
    "Still learning shared rhythm",
    "Shared bills monthly",
    "Split expenses clearly",
    "Comfort spending happens often",
  ],
  workload: [
    "Adjusting roles",
    "Money talks feel sensitive",
    "One person carries more",
    "Small costs surprise us",
  ],
  pressure: [
    "Rent and utilities",
    "Uneven contribution",
    "Future planning pressure",
    "Money communication",
  ],
  coping: [
    "We avoid detailed money talks",
    "One partner covers small gaps",
    "We say yes before checking",
    "We review money together",
  ],
  goal: [
    "Set shared money rules",
    "Make bills visible",
    "Build a small shared buffer",
    "Keep bonding affordable",
  ],
};

export const LIVING_WITH_PARTNER_BRANCHES = {
  "Newly living together": BASE_BRANCH,

  "Long-term live-in": {
    rhythm: [
      "Shared bills already have a pattern",
      "Separate money but shared routines",
      "Some bills are clear, some are assumed",
      "Future goals are starting to matter",
    ],
    workload: [
      "Calm and cooperative",
      "Old habits repeat quietly",
      "One person manages most details",
      "Money talks happen only when needed",
    ],
    pressure: [
      "Future planning pressure",
      "Assumed bill responsibility",
      "Shared routine spending",
      "Emergency buffer gap",
    ],
    coping: [
      "We rely on habit instead of planning",
      "One partner reminds the other",
      "We delay bigger money talks",
      "We review money together",
    ],
    goal: [
      "Update shared money rules",
      "Protect future plans",
      "Build savings together",
      "Clarify assumed responsibilities",
    ],
  },

  "Living with one family": {
    rhythm: [
      "Household contribution is shared",
      "One family covers some costs",
      "Support requests appear suddenly",
      "Couple money mixes with home needs",
    ],
    workload: [
      "Family expectations affect decisions",
      "Privacy and money boundaries overlap",
      "One partner feels more exposed",
      "Household roles are not always clear",
    ],
    pressure: [
      "Family boundaries",
      "Household contribution",
      "Partner fairness",
      "Shared privacy and future plans",
    ],
    coping: [
      "We say yes to keep peace",
      "One partner absorbs family pressure",
      "We avoid disagreeing in the household",
      "We decide support limits together",
    ],
    goal: [
      "Agree before giving support",
      "Protect bills before family requests",
      "Set a household boundary",
      "Keep the couple plan visible",
    ],
  },

  "Planning to move in": {
    rhythm: [
      "Saving for move-in costs",
      "Estimating rent and utilities",
      "Buying things little by little",
      "Still unsure how we will split costs",
    ],
    workload: [
      "Future planning feels exciting but unclear",
      "Costs are easy to underestimate",
      "Money talks are still theoretical",
      "One partner plans more than the other",
    ],
    pressure: [
      "Move-in cost pressure",
      "Future planning pressure",
      "Bill split expectations",
      "Emergency buffer before moving",
    ],
    coping: [
      "We talk about dreams more than numbers",
      "We delay the exact split",
      "We buy things before the full plan",
      "We list costs together",
    ],
    goal: [
      "Create a move-in budget",
      "Agree on bill split early",
      "Build a move-in buffer",
      "Protect the future plan",
    ],
  },

  "One income supports both": {
    rhythm: [
      "One income covers most bills",
      "One partner is temporarily dependent",
      "Income mismatch affects choices",
      "Shared needs rely on one payday",
    ],
    workload: [
      "One person carries more pressure",
      "Fairness feels sensitive",
      "The supported partner feels guilt",
      "Both people depend on one rhythm",
    ],
    pressure: [
      "Uneven contribution",
      "Payday dependency",
      "Emergency buffer gap",
      "Emotional fairness pressure",
    ],
    coping: [
      "One partner covers gaps",
      "We avoid naming the imbalance",
      "We cut personal needs quietly",
      "We plan around one payday",
    ],
    goal: [
      "Protect fairness and dignity",
      "Create one-income rules",
      "Build a shared emergency buffer",
      "Make support temporary or clear",
    ],
  },

  "Sharing space but still adjusting": {
    rhythm: [
      "Daily costs are still unpredictable",
      "Split rules keep changing",
      "Shared routines are not settled",
      "Personal habits affect shared money",
    ],
    workload: [
      "Adjusting roles",
      "Small misunderstandings happen often",
      "Personal space and money overlap",
      "One partner adapts faster",
    ],
    pressure: [
      "Unclear shared boundaries",
      "Money communication",
      "Daily household costs",
      "Fairness while adjusting",
    ],
    coping: [
      "We avoid making it awkward",
      "One partner adjusts silently",
      "We handle issues after tension",
      "We set small rules together",
    ],
    goal: [
      "Create simple shared rules",
      "Make daily costs visible",
      "Reduce silent adjustment",
      "Protect peace while adjusting",
    ],
  },

  "Committed relationship, finances still separate": {
    rhythm: [
      "Separate wallets, shared expectations",
      "We split only obvious costs",
      "Future plans are discussed but unfunded",
      "Personal money choices affect us both",
    ],
    workload: [
      "Money boundaries are still personal",
      "Future talks feel delicate",
      "Shared expectations are not fully named",
      "Independence still matters",
    ],
    pressure: [
      "Future planning pressure",
      "Unclear money boundaries",
      "Separate spending with shared impact",
      "Commitment expectations",
    ],
    coping: [
      "We avoid deeper money talks",
      "We protect independence first",
      "We assume the other understands",
      "We define shared goals together",
    ],
    goal: [
      "Define what stays personal vs shared",
      "Fund one shared goal",
      "Talk about future expectations",
      "Keep independence with clarity",
    ],
  },
};

export const LIVING_WITH_PARTNER_FIELDS = {
  setup: LIVING_WITH_PARTNER_ROOTS,
  ...BASE_BRANCH,
};

export const LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS = {
  sharedBills: {
    key: "sharedBills",
    icon: "🧾",
    label: "Shared Bills",
    category: "pressure",
    trendType: "wave",
    awarenessTitle: "Shared bills need clarity.",
    guidanceTitle: "Make the split visible.",
    awareness: "Shared rent, utilities, food, or daily costs need clarity before both budgets adjust.",
    guidance: "Write the split before the next shared purchase so neither person silently carries more than expected.",
    note: "Shared expenses are strongly shaping the relationship money rhythm.",
    insight: "The risk is unclear responsibility repeating every month.",
    action: "List the next shared bill and decide who covers what.",
  },

  fairness: {
    key: "fairness",
    icon: "⚖️",
    label: "Fairness",
    category: "stability",
    trendType: "volatile",
    awarenessTitle: "Fairness pressure can build quietly.",
    guidanceTitle: "Talk before resentment grows.",
    awareness: "Uneven contribution can become emotional when one partner quietly carries more.",
    guidance: "Name one unfair-feeling pattern gently and agree on one adjustment both people can follow.",
    note: "Fairness is shaping how safe or heavy the shared money setup feels.",
    insight: "Unclear fairness can turn small expenses into emotional pressure.",
    action: "Choose one shared cost to rebalance.",
  },

  moneyTalks: {
    key: "moneyTalks",
    icon: "💬",
    label: "Money Talks",
    category: "communication",
    trendType: "spike",
    awarenessTitle: "Avoided money talks create fog.",
    guidanceTitle: "Make one topic safe.",
    awareness: "When money talks feel sensitive, both people may avoid the topic until pressure appears.",
    guidance: "Discuss one simple topic only: bills, food, savings, or debt. Keep the goal clarity, not blame.",
    note: "Communication is becoming a financial stability signal in this shared-life season.",
    insight: "Avoidance can make the numbers less clear and the emotion louder.",
    action: "Set a short money check-in with one question: what needs to be protected this week?",
  },

  comfortSpending: {
    key: "comfortSpending",
    icon: "🍽️",
    label: "Comfort Spending",
    category: "spending",
    trendType: "spike",
    awarenessTitle: "Comfort spending can become bonding.",
    guidanceTitle: "Keep bonding affordable.",
    awareness: "Food, dates, delivery, treats, and convenience can feel like love or peace.",
    guidance: "Keep the experience, but choose the limit together before comfort becomes an unplanned pattern.",
    note: "Shared comfort may be helping the relationship feel lighter while affecting the budget.",
    insight: "The problem is not bonding; it is bonding with no agreed boundary.",
    action: "Pick one affordable bonding option for the week and avoid open-ended comfort spending.",
  },

  familyBoundaries: {
    key: "familyBoundaries",
    icon: "🏠",
    label: "Family Boundaries",
    category: "pressure",
    trendType: "wave",
    awarenessTitle: "Family boundaries affect both wallets.",
    guidanceTitle: "Agree before giving.",
    awareness: "Household expectations or support requests can affect the shared budget.",
    guidance: "Decide together what support is safe before saying yes.",
    note: "Outside pressure may be entering the couple’s financial rhythm.",
    insight: "A request can become a couple issue when it changes shared stability.",
    action: "Create one support boundary that protects bills, food, and emergency money first.",
  },

  futurePlans: {
    key: "futurePlans",
    icon: "🏡",
    label: "Future Plans",
    category: "growth",
    trendType: "upward",
    awarenessTitle: "Future plans shape today’s spending.",
    guidanceTitle: "Protect the shared direction.",
    awareness: "Moving, marriage plans, savings, or long-term goals can make small spending matter more.",
    guidance: "Choose one shared priority before optional spending so the future plan has a place in today’s budget.",
    note: "The relationship has future-building potential, but the plan needs visible protection.",
    insight: "Shared goals stay stronger when funded before convenience competes with them.",
    action: "Name one future goal and give it even a small fixed amount this cycle.",
  },

  emergencyBuffer: {
    key: "emergencyBuffer",
    icon: "🛟",
    label: "Emergency Buffer",
    category: "protection",
    trendType: "stable",
    awarenessTitle: "Shared life needs a buffer.",
    guidanceTitle: "Build a small safety layer.",
    awareness: "One unexpected cost can affect both people when bills, food, and rent are connected.",
    guidance: "Start with a small shared emergency target before chasing a perfect savings system.",
    note: "Emergency protection keeps one surprise from becoming conflict.",
    insight: "Without a buffer, the relationship may handle emergencies emotionally instead of structurally.",
    action: "Set a tiny shared emergency amount and treat it as protected money.",
  },
};

const FALLBACK_SIGNALS = { sharedBills: 16, moneyTalks: 12, fairness: 10, emergencyBuffer: 8 };
const LIVING_WITH_PARTNER_DOCK_SIGNAL_ORDER = [
  "sharedBills",
  "moneyTalks",
  "fairness",
  "comfortSpending",
  "familyBoundaries",
  "futurePlans",
  "emergencyBuffer",
];

export function cleanLivingWithPartnerValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getBranch(profile = {}) {
  return LIVING_WITH_PARTNER_BRANCHES[cleanLivingWithPartnerValue(profile.setup)] || BASE_BRANCH;
}

export function getLivingWithPartnerOptions(profile = {}, key = "setup") {
  if (key === "setup") return LIVING_WITH_PARTNER_ROOTS;
  return getBranch(profile)[key] || BASE_BRANCH[key] || [];
}

function pickValid(value, options = []) {
  const cleaned = cleanLivingWithPartnerValue(value);
  return options.includes(cleaned) ? cleaned : options[0];
}

export function completeLivingWithPartnerDraft(profile = {}) {
  const setup = pickValid(profile.setup, LIVING_WITH_PARTNER_ROOTS);
  const branch = getBranch({ setup });

  return {
    stage: LIVING_WITH_PARTNER_STAGE_KEY,
    setup,
    rhythm: pickValid(profile.rhythm, branch.rhythm),
    workload: pickValid(profile.workload, branch.workload),
    pressure: pickValid(profile.pressure, branch.pressure),
    coping: pickValid(profile.coping, branch.coping),
    goal: pickValid(profile.goal, branch.goal),
  };
}

export function buildLivingWithPartnerDraft(previous = {}) {
  return completeLivingWithPartnerDraft(previous);
}

export function getLivingWithPartnerDisplayLabel(value) {
  return cleanLivingWithPartnerValue(value);
}

function signalWeightsFor(text = "") {
  const value = cleanLivingWithPartnerValue(text).toLowerCase();
  const weights = {};
  const add = (key, amount) => {
    weights[key] = (weights[key] || 0) + amount;
  };

  if (/bill|rent|utilit|food|daily|cost|split|contribution|payday/.test(value)) add("sharedBills", 14);
  if (/uneven|fair|guilt|imbalance|dependent|gap|silent|carries/.test(value)) add("fairness", 16);
  if (/talk|communication|avoid|assume|sensitive|unclear|clarity|awkward/.test(value)) add("moneyTalks", 16);
  if (/comfort|date|delivery|bonding|peace|treat/.test(value)) add("comfortSpending", 14);
  if (/family|household|support|outside/.test(value)) add("familyBoundaries", 18);
  if (/future|move|marriage|plan|goal|saving|expectation/.test(value)) add("futurePlans", 14);
  if (/emergency|buffer|surprise|safety|protect/.test(value)) add("emergencyBuffer", 14);

  return Object.keys(weights).length ? weights : FALLBACK_SIGNALS;
}

function addSignals(target, source = {}) {
  Object.entries(source).forEach(([key, amount]) => {
    if (!LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS[key]) return;
    target[key] = (target[key] || 0) + Math.max(0, Number(amount) || 0);
  });
}

function collectSignals(profile = {}) {
  const draft = completeLivingWithPartnerDraft(profile);
  const signalMap = {};

  LIVING_WITH_PARTNER_QUESTION_ORDER.forEach((key) => {
    addSignals(signalMap, signalWeightsFor(draft[key]));
  });

  return signalMap;
}

function statusFor(value) {
  if (value >= 34) return "Primary pressure";
  if (value >= 24) return "Strong signal";
  if (value >= 16) return "Active pattern";
  return "Support signal";
}

function normalizeDistribution(signalMap = {}, limit = 4) {
  const rows = Object.entries(signalMap)
    .map(([key, raw]) => ({
      key,
      raw: Math.max(0, Number(raw) || 0),
      ...LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS[key],
    }))
    .filter((item) => item.raw > 0 && item.label)
    .sort((a, b) => b.raw - a.raw)
    .slice(0, limit);

  const total = rows.reduce((sum, item) => sum + item.raw, 0) || 1;
  let used = 0;

  return rows.map((item, index) => {
    const value = index === rows.length - 1 ? Math.max(1, 100 - used) : Math.max(1, Math.round((item.raw / total) * 100));
    used += value;

    return {
      key: item.key,
      category: item.category,
      label: item.label,
      value,
      status: statusFor(value),
      note: item.note,
      insight: item.insight,
      action: item.action,
      trendType: item.trendType,
    };
  });
}

export function getLivingWithPartnerOptionProfile(value, key = "setup") {
  const selected = cleanLivingWithPartnerValue(value);
  const signals = signalWeightsFor(selected);
  const dominantKey = Object.entries(signals).sort((a, b) => b[1] - a[1])[0]?.[0] || "sharedBills";
  const dominant = LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS[dominantKey] || LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS.sharedBills;

  return {
    title: selected || "Shared-life signal",
    meaning: `Choosing "${selected}" helps CLARA understand this part of the shared-life setup. It connects to ${dominant.label.toLowerCase()} because ${dominant.insight.toLowerCase()}`,
    signals,
    tags: [key, dominantKey, dominant.category].filter(Boolean),
    pressureType: dominant.category,
    emotionalTone: dominant.label,
    financialInterpretation: dominant.insight,
    coachingDirection: dominant.action,
  };
}

export function getLivingWithPartnerQuestionContext(questionKey, value, draft = {}) {
  const profile = getLivingWithPartnerOptionProfile(value, questionKey);

  return {
    title: profile.title,
    chip: getLivingWithPartnerDisplayLabel(value),
    summary: `${profile.meaning} CLARA will connect this with previous answers so the profile evolves instead of feeling like separate survey items.`,
  };
}

export function getLivingWithPartnerBehaviorProfile(profile = {}) {
  const draft = completeLivingWithPartnerDraft(profile);
  const signalMap = collectSignals(draft);
  const snapshotDistribution = normalizeDistribution(signalMap, 4);
  const topSignal = snapshotDistribution[0] || {
    ...LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS.sharedBills,
    value: 40,
    status: "Primary pressure",
  };

  return {
    stage: LIVING_WITH_PARTNER_STAGE_KEY,
    draft,
    selectedPath: LIVING_WITH_PARTNER_QUESTION_ORDER.map((key) => draft[key]),
    signalMap,
    snapshotDistribution,
    topSignal,
    title: "Shared-life season",
    caption: "Shared routines, emotional expectations, bills, boundaries, and future plans shape money decisions.",
    overview:
      "Living with a partner means money is no longer only personal. CLARA watches fairness, shared bills, communication, family boundaries, comfort spending, future plans, and emergency protection together.",
    struggles: ["shared expenses", "uneven contribution", "future planning pressure", "comfort spending together", "money communication", "family boundaries"],
    recommendations: ["Shared Money Rules", "Emergency Fund", "Future Planning", "Spending Communication"],
  };
}

export function getLivingWithPartnerSnapshot(profile = {}) {
  const behavior = getLivingWithPartnerBehaviorProfile(profile);

  return {
    title: behavior.title,
    caption: behavior.caption,
    overview: behavior.overview,
    indicators: behavior.snapshotDistribution,
    struggles: behavior.struggles,
    recommendations: behavior.recommendations,
    supportBody: behavior.topSignal?.note || "Shared-life money pressure is forming from your selected answers.",
  };
}

export function getLivingWithPartnerSupportCopy(profile = {}) {
  const signal = getLivingWithPartnerBehaviorProfile(profile).topSignal;

  return {
    title: signal.awarenessTitle || "Shared life needs shared clarity.",
    body: signal.note || "Money now carries bills, emotion, fairness, future plans, and relationship peace at the same time.",
  };
}

export function getLivingWithPartnerSignals() {
  return LIVING_WITH_PARTNER_DOCK_SIGNAL_ORDER
    .map((key) => LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS[key])
    .filter(Boolean);
}

export function getLivingWithPartnerSignalCopy(id, mode = "awareness") {
  const signal = LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS[id] || LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS.sharedBills;

  return {
    title: mode === "guidance" ? signal.guidanceTitle : signal.awarenessTitle,
    body: mode === "guidance" ? signal.guidance : signal.awareness,
  };
}

export default {
  stage: LIVING_WITH_PARTNER_STAGE_KEY,
  fields: LIVING_WITH_PARTNER_FIELDS,
  branches: LIVING_WITH_PARTNER_BRANCHES,
  signals: LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS,
  getOptions: getLivingWithPartnerOptions,
  getSnapshot: getLivingWithPartnerSnapshot,
  getBehaviorProfile: getLivingWithPartnerBehaviorProfile,
};
