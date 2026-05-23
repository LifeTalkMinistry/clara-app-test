export const LIVING_WITH_PARTNER_STAGE_KEY = "Living with Partner";

export const LIVING_WITH_PARTNER_QUESTION_ORDER = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];

export const LIVING_WITH_PARTNER_FIELDS = {
  setup: ["Newly living together", "Long-term live-in", "Living with one family", "Planning to move in", "One income supports both"],
  rhythm: ["Shared bills monthly", "Split expenses clearly", "Split expenses unevenly", "Income mismatch", "Still learning shared rhythm"],
  workload: ["Calm and cooperative", "Adjusting roles", "Money talks feel sensitive", "One person carries more", "Constant tension over decisions"],
  pressure: ["Rent and utilities", "Uneven contribution", "Future planning pressure", "Family boundaries", "Money communication"],
  coping: ["We avoid money talks", "We comfort-spend together", "One partner covers gaps", "We argue then ignore it", "We review money together"],
  goal: ["Set shared money rules", "Build savings together", "Emergency fund first", "Plan our future", "Reduce money conflict"],
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
    awareness: "When two lives share rent, utilities, food, or daily costs, money can feel normal even before both budgets adjust.",
    guidance: "Write the bill split clearly before the next shared purchase so neither person silently carries more than expected.",
    note: "Shared expenses are becoming one of the strongest forces in the relationship money rhythm.",
    insight: "The risk is not only the bill itself; it is unclear responsibility repeating every month.",
    action: "List the next shared bill and decide who covers what before the due date arrives.",
  },
  fairness: {
    key: "fairness",
    icon: "⚖️",
    label: "Fairness",
    category: "stability",
    trendType: "volatile",
    awarenessTitle: "Fairness pressure can build quietly.",
    guidanceTitle: "Talk before resentment grows.",
    awareness: "Uneven contribution can become emotional when one partner feels they are covering more, asking more, or sacrificing silently.",
    guidance: "Name one unfair-feeling pattern gently and agree on one adjustment both people can actually follow.",
    note: "Fairness is shaping how safe or heavy the shared money setup feels.",
    insight: "When fairness is unclear, small expenses can become symbols of effort, respect, or pressure.",
    action: "Choose one shared cost to rebalance instead of trying to fix every money issue at once.",
  },
  moneyTalks: {
    key: "moneyTalks",
    icon: "💬",
    label: "Money Talks",
    category: "communication",
    trendType: "spike",
    awarenessTitle: "Avoided money talks create fog.",
    guidanceTitle: "Make one topic safe.",
    awareness: "When money talks feel sensitive, both people may avoid the topic until a bill, request, or purchase creates pressure.",
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
    awareness: "Food, dates, delivery, treats, and convenience can feel like love or peace when shared life gets tiring.",
    guidance: "Keep the experience, but choose the limit together before comfort becomes an unplanned pattern.",
    note: "Shared comfort may be helping the relationship feel lighter while quietly affecting the budget.",
    insight: "The problem is not bonding; it is when bonding has no agreed boundary.",
    action: "Pick one affordable bonding option for the week and avoid open-ended comfort spending.",
  },
  familyBoundaries: {
    key: "familyBoundaries",
    icon: "👨‍👩‍👧",
    label: "Family Boundaries",
    category: "pressure",
    trendType: "wave",
    awarenessTitle: "Family boundaries affect both wallets.",
    guidanceTitle: "Agree before giving.",
    awareness: "Family expectations, living arrangements, or support requests can affect the shared budget even when only one partner is directly asked.",
    guidance: "Decide together what support is safe before saying yes, especially when the money affects shared bills or savings.",
    note: "Outside-family pressure may be entering the couple’s financial rhythm.",
    insight: "A family request can become a couple issue when it changes shared stability.",
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
    awareness: "Moving, marriage plans, children, savings, or long-term goals can make small spending feel more important than it looks.",
    guidance: "Choose one shared priority before optional spending so the future plan has a place in today’s budget.",
    note: "The relationship has future-building potential, but the plan needs visible protection.",
    insight: "Shared goals stay stronger when they are funded before convenience and comfort decisions compete with them.",
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
    awareness: "One unexpected cost can affect both people when bills, food, rent, and support are already connected.",
    guidance: "Start with a small shared emergency target before chasing a perfect savings system.",
    note: "Emergency protection is the stabilizer that can keep one surprise from becoming conflict.",
    insight: "Without a buffer, the relationship may handle emergencies emotionally instead of structurally.",
    action: "Set a tiny shared emergency amount and treat it as protected money.",
  },
};

const OPTION_SIGNAL_WEIGHTS = {
  "Newly living together": { sharedBills: 16, moneyTalks: 10, comfortSpending: 8 },
  "Long-term live-in": { futurePlans: 12, sharedBills: 10, emergencyBuffer: 8 },
  "Living with one family": { familyBoundaries: 22, fairness: 10, moneyTalks: 8 },
  "Planning to move in": { futurePlans: 20, sharedBills: 8, emergencyBuffer: 8 },
  "One income supports both": { fairness: 22, sharedBills: 12, emergencyBuffer: 10 },

  "Shared bills monthly": { sharedBills: 18, emergencyBuffer: 8 },
  "Split expenses clearly": { sharedBills: 8, futurePlans: 10, emergencyBuffer: 8 },
  "Split expenses unevenly": { fairness: 24, moneyTalks: 10, sharedBills: 8 },
  "Income mismatch": { fairness: 22, sharedBills: 12, emergencyBuffer: 8 },
  "Still learning shared rhythm": { moneyTalks: 18, sharedBills: 10, comfortSpending: 8 },

  "Calm and cooperative": { futurePlans: 12, emergencyBuffer: 10 },
  "Adjusting roles": { moneyTalks: 12, fairness: 10, sharedBills: 8 },
  "Money talks feel sensitive": { moneyTalks: 26, fairness: 10 },
  "One person carries more": { fairness: 26, sharedBills: 10, familyBoundaries: 6 },
  "Constant tension over decisions": { moneyTalks: 18, fairness: 18, comfortSpending: 6 },

  "Rent and utilities": { sharedBills: 24, emergencyBuffer: 8 },
  "Uneven contribution": { fairness: 28, moneyTalks: 10 },
  "Future planning pressure": { futurePlans: 24, emergencyBuffer: 8 },
  "Family boundaries": { familyBoundaries: 28, fairness: 8 },
  "Money communication": { moneyTalks: 24, fairness: 8 },

  "We avoid money talks": { moneyTalks: 28, fairness: 10 },
  "We comfort-spend together": { comfortSpending: 28, sharedBills: 6 },
  "One partner covers gaps": { fairness: 22, emergencyBuffer: 10, sharedBills: 8 },
  "We argue then ignore it": { moneyTalks: 24, fairness: 14 },
  "We review money together": { futurePlans: 12, emergencyBuffer: 12, moneyTalks: 6 },

  "Set shared money rules": { sharedBills: 10, moneyTalks: 10, fairness: 6 },
  "Build savings together": { futurePlans: 16, emergencyBuffer: 16 },
  "Emergency fund first": { emergencyBuffer: 26, sharedBills: 6 },
  "Plan our future": { futurePlans: 28, emergencyBuffer: 8 },
  "Reduce money conflict": { moneyTalks: 18, fairness: 16 },
};

const FALLBACK_SIGNALS = { sharedBills: 16, moneyTalks: 12, fairness: 10, emergencyBuffer: 8 };

export function cleanLivingWithPartnerValue(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function getLivingWithPartnerDisplayLabel(value) {
  return cleanLivingWithPartnerValue(value);
}

export function completeLivingWithPartnerDraft(profile = {}) {
  return {
    stage: LIVING_WITH_PARTNER_STAGE_KEY,
    setup: cleanLivingWithPartnerValue(profile.setup) || "Newly living together",
    rhythm: cleanLivingWithPartnerValue(profile.rhythm) || "Still learning shared rhythm",
    workload: cleanLivingWithPartnerValue(profile.workload) || "Adjusting roles",
    pressure: cleanLivingWithPartnerValue(profile.pressure) || "Money communication",
    coping: cleanLivingWithPartnerValue(profile.coping) || "We avoid money talks",
    goal: cleanLivingWithPartnerValue(profile.goal) || "Set shared money rules",
  };
}

export function getLivingWithPartnerOptions(_profile = {}, key = "setup") {
  return LIVING_WITH_PARTNER_FIELDS[key] || [];
}

function addSignals(target, source = {}) {
  Object.entries(source).forEach(([key, value]) => {
    if (!LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS[key]) return;
    target[key] = (target[key] || 0) + Math.max(0, Number(value) || 0);
  });
}

function collectSignals(profile = {}) {
  const draft = completeLivingWithPartnerDraft(profile);
  const signalMap = {};
  LIVING_WITH_PARTNER_QUESTION_ORDER.forEach((key) => {
    addSignals(signalMap, OPTION_SIGNAL_WEIGHTS[draft[key]] || {});
  });
  if (!Object.keys(signalMap).length) addSignals(signalMap, FALLBACK_SIGNALS);
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
    .map(([key, raw]) => ({ key, raw: Math.max(0, Number(raw) || 0), ...LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS[key] }))
    .filter((item) => item.raw > 0 && item.label)
    .sort((a, b) => b.raw - a.raw || a.label.localeCompare(b.label))
    .slice(0, limit);

  if (!rows.length) return [];

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

function path(profile = {}) {
  const draft = completeLivingWithPartnerDraft(profile);
  return LIVING_WITH_PARTNER_QUESTION_ORDER.map((key) => draft[key]).filter(Boolean);
}

function topSignal(profile = {}) {
  const distribution = normalizeDistribution(collectSignals(profile), 4);
  return distribution[0] || {
    key: "sharedBills",
    label: "Shared Bills",
    value: 40,
    status: "Primary pressure",
    note: LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS.sharedBills.note,
    insight: LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS.sharedBills.insight,
    action: LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS.sharedBills.action,
    trendType: "wave",
  };
}

export function getLivingWithPartnerBehaviorProfile(profile = {}) {
  const draft = completeLivingWithPartnerDraft(profile);
  const signalMap = collectSignals(draft);
  const snapshotDistribution = normalizeDistribution(signalMap, 4);
  const dominant = snapshotDistribution[0] || topSignal(draft);
  return {
    stage: LIVING_WITH_PARTNER_STAGE_KEY,
    draft,
    selectedPath: path(draft),
    signalMap,
    snapshotDistribution,
    topSignal: dominant,
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
  const behavior = getLivingWithPartnerBehaviorProfile(profile);
  const signal = behavior.topSignal;
  const draft = behavior.draft;

  if (signal.key === "fairness") {
    return {
      title: "Fairness is becoming part of the money story.",
      body: "When one person carries more, even small expenses can feel emotional. The goal is clarity before resentment builds.",
    };
  }

  if (signal.key === "moneyTalks") {
    return {
      title: "The money conversation needs a safer space.",
      body: "Avoided money talks can make bills, spending, and future plans feel heavier than they need to be.",
    };
  }

  if (signal.key === "comfortSpending") {
    return {
      title: "Comfort spending may be acting as bonding.",
      body: "Food, dates, and convenience can help the relationship feel lighter, but they still need a shared limit.",
    };
  }

  if (signal.key === "familyBoundaries") {
    return {
      title: "Outside pressure may be entering your shared budget.",
      body: "Family requests or living arrangements can affect both people when the money is already connected.",
    };
  }

  if (signal.key === "futurePlans") {
    return {
      title: "Your future plans need visible protection.",
      body: "Moving, savings, and long-term goals become easier when both people agree what gets protected first.",
    };
  }

  if (signal.key === "emergencyBuffer") {
    return {
      title: "A shared safety layer matters here.",
      body: "One unexpected cost can affect both people, so even a small emergency buffer can protect peace and stability.",
    };
  }

  if (draft.pressure === "Rent and utilities") {
    return {
      title: "Shared bills are setting the rhythm.",
      body: "Rent, utilities, food, and daily costs need clear roles so the relationship does not rely on guessing.",
    };
  }

  return {
    title: "Shared life needs shared clarity.",
    body: "Money now carries bills, emotion, fairness, future plans, and relationship peace at the same time.",
  };
}

export function getLivingWithPartnerSignals() {
  return Object.values(LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS);
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
  signals: LIVING_WITH_PARTNER_SIGNAL_DEFINITIONS,
  getSnapshot: getLivingWithPartnerSnapshot,
  getBehaviorProfile: getLivingWithPartnerBehaviorProfile,
};
