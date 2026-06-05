export const CLARA_BRAINS = Object.freeze({
  CASUAL: 1,
  FINANCE: 2,
  DECISION: 3,
  COACH: 4,
  MEMORY: 5,
  SCHEDULE: 6,
});

export const CLARA_BRAIN_KEYS = Object.freeze({
  [CLARA_BRAINS.CASUAL]: "casual",
  [CLARA_BRAINS.FINANCE]: "finance",
  [CLARA_BRAINS.DECISION]: "decision",
  [CLARA_BRAINS.COACH]: "coach",
  [CLARA_BRAINS.MEMORY]: "memory",
  [CLARA_BRAINS.SCHEDULE]: "schedule",
});

export const CLARA_BRAIN_LABELS = Object.freeze({
  [CLARA_BRAINS.CASUAL]: "Casual Brain",
  [CLARA_BRAINS.FINANCE]: "Finance Brain",
  [CLARA_BRAINS.DECISION]: "Decision Brain",
  [CLARA_BRAINS.COACH]: "Coach Brain",
  [CLARA_BRAINS.MEMORY]: "Memory Brain",
  [CLARA_BRAINS.SCHEDULE]: "Schedule Brain",
});

export const CLARA_CONTEXTS = Object.freeze({
  CHAT_MEMORY: "chat memory",
  NONE: "none",
  WALLETS: "wallets",
  BUDGET: "budget",
  SAVINGS: "savings",
  DEBT: "debt",
  TRANSACTIONS: "transactions",
  FINANCE: "finance",
  ME_PAGE: "me page",
  SCHEDULE: "schedule",
  MEMORY: "memory",
  RISK: "risk",
  FINANCE_PRESSURE: "finance pressure",
  PREFERENCES: "preferences",
  SPENDING_PATTERNS: "spending patterns",
  GOALS: "goals",
  EMOTIONAL_TRIGGERS: "emotional triggers",
  LIFE_LESSONS: "life lessons",
});

export const FOLLOW_UP_ACTIONS = Object.freeze({
  CHAT_ONLY: "chat_only",
  REFRESH_CONTEXT: "refresh_context",
  SWITCH_BRAIN: "switch_brain",
  NEW_FLOW: "new_flow",
});

const FLOW_TTL_MS = 8 * 60 * 1000;

let activeConversationFlow = null;

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9₱.,?'’\s-]/g, " ")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function hasMoneySignal(text = "") {
  return /\b(wallet|budget|expense|expenses|spend|spent|spending|savings?|save|emergency fund|investment|debt|utang|loan|balance|money|cash|gcash|maya|bank|income|payday|salary|afford|buy|purchase|transaction|transactions|transaction hub|history|transfer|transfers|bills?)\b/.test(text);
}

function hasDecisionSignal(text = "") {
  return /\b(should i|can i afford|can i buy|can i spend|is it okay|is it ok|is this okay|is this ok|worth it|before i buy|before buying|before i purchase|before purchasing|help me decide|safe to spend|safe purchase|safe to buy|i want to buy|i'm planning to buy|im planning to buy|i am planning to buy|i want to spend|planning to buy|planning to purchase|should i use emergency fund|should i spend|should i delay|delay this|buy this|purchase this|go for it)\b/.test(text);
}

function hasCoachSignal(text = "") {
  return /\b(stress|stressed|overwhelmed|anxious|sad|tired|exhausted|pagod|guilty|tempted|craving|burnout|habit|routine|discipline|motivation|mindset|feel|feeling|regret|discouraged)\b/.test(text);
}

function hasMemorySignal(text = "") {
  return /\b(i noticed|i realized|i realise|i learned|lately|recently|pattern|trigger|usually|always|whenever|helps me|helped me|i prefer|my goal|my priority)\b/.test(text);
}

function hasScheduleSignal(text = "") {
  return /\b(schedule|calendar|appointment|appointments|upcoming|coming up|planned|plan|commitment|event|reminder|dentist|doctor|medical|meeting|shift|work|class|tomorrow|today|next week|payday|salary|due date|deadline|service)\b/.test(text);
}

function hasPureScheduleSignal(text = "") {
  return /\b(schedule|appointment|appointments|calendar|upcoming|coming up|event|reminder|dentist|doctor|meeting|shift|class)\b/.test(text);
}

function asksPurchaseOrSpendingDecision(text = "") {
  return hasDecisionSignal(text) || /\b(can i afford|can i buy|can i spend|should i buy|should i spend|before i buy|before buying|worth it|safe to spend|safe purchase|safe to buy|spend|buy|purchase|order)\b/.test(text);
}

const CRISIS_RISK_TERM_CODES = [
  [115, 101, 108, 102, 32, 104, 97, 114, 109],
  [104, 117, 114, 116, 32, 109, 121, 115, 101, 108, 102],
  [115, 117, 105, 99, 105, 100, 101],
  [107, 105, 108, 108, 32, 109, 121, 115, 101, 108, 102],
];

function hasRiskSignal(text = "") {
  const hasCommonRisk = /\b(emergency|urgent|danger|risk|overspend|over budget|short|broke|can't afford|cannot afford|debt|loan|utang|guilty|stressed)\b/.test(text);
  const hasCrisisRisk = CRISIS_RISK_TERM_CODES.some((codes) => text.includes(String.fromCharCode(...codes)));
  return hasCommonRisk || hasCrisisRisk;
}

function hasMePageSignal(text = "") {
  return /\b(my goal|my priority|my situation|my lifestyle|student|working student|breadwinner|family|partner|job|work|salary|habit|trigger|preference)\b/.test(text);
}

export function isPureScheduleIntent(value = "") {
  const text = normalizeText(value);
  return Boolean(text && hasPureScheduleSignal(text) && !asksPurchaseOrSpendingDecision(text));
}

function isCasualOnly(text = "") {
  if (!text) return false;
  if (hasScheduleSignal(text) || hasMoneySignal(text) || hasDecisionSignal(text) || hasCoachSignal(text) || hasMemorySignal(text)) return false;
  return /^(hi|hello|hey|yo|good morning|good afternoon|good evening|kumusta|kamusta|how are you|how r you|what'?s up|thanks|thank you|salamat|nice|great|perfect|awesome|good|got it|gets|okay|ok|cool|haha|hehe|lol)[!?.\s]*$/.test(text);
}

function isAcknowledgementOnly(text = "") {
  if (!text) return false;
  if (hasScheduleSignal(text) || hasMoneySignal(text) || hasDecisionSignal(text) || hasCoachSignal(text) || hasMemorySignal(text) || hasRiskSignal(text)) return false;
  return /^(great|nice|perfect|awesome|good|got it|gets|okay|ok|cool|thanks|thank you|salamat|alright|all right|sige|copy|noted|yup|yep|yes|aha|ah ok|ah okay)[!?.\s]*$/.test(text);
}

function isShortFollowUp(text = "") {
  return /^(why|why not|how come|explain|more|tell me more|what do you mean|really|sure|ok|okay|yes|no|go on|continue|what about it|how about that)[!?.\s]*$/.test(text);
}

function isNewTopicSignal(text = "") {
  return /\b(new topic|another question|different question|anyway|btw|by the way|change topic|forget that)\b/.test(text);
}

function brainFromKey(key = "") {
  const value = normalizeText(key);
  if (value === "casual") return CLARA_BRAINS.CASUAL;
  if (value === "finance") return CLARA_BRAINS.FINANCE;
  if (value === "decision") return CLARA_BRAINS.DECISION;
  if (value === "coach") return CLARA_BRAINS.COACH;
  if (value === "memory") return CLARA_BRAINS.MEMORY;
  if (value === "schedule") return CLARA_BRAINS.SCHEDULE;
  return CLARA_BRAINS.CASUAL;
}

function getInitialContextsForBrain(brain, text = "") {
  if (brain === CLARA_BRAINS.CASUAL) return [];

  if (brain === CLARA_BRAINS.FINANCE) {
    const contexts = [];
    if (/\b(wallet|balance|cash|gcash|maya|bank)\b/.test(text)) contexts.push(CLARA_CONTEXTS.WALLETS);
    if (/\b(budget|category|left|remaining|over budget)\b/.test(text)) contexts.push(CLARA_CONTEXTS.BUDGET);
    if (/\b(saving|savings|goal|emergency fund)\b/.test(text)) contexts.push(CLARA_CONTEXTS.SAVINGS);
    if (/\b(debt|loan|utang|owe|obligation)\b/.test(text)) contexts.push(CLARA_CONTEXTS.DEBT);
    if (/\b(expense|expenses|spent|spending|transaction|transactions|transaction hub|history|transfer|transfers)\b/.test(text)) contexts.push(CLARA_CONTEXTS.TRANSACTIONS);
    return contexts.length ? unique(contexts) : [CLARA_CONTEXTS.WALLETS, CLARA_CONTEXTS.BUDGET];
  }

  if (brain === CLARA_BRAINS.DECISION) {
    const contexts = [];
    if (hasMoneySignal(text) || hasDecisionSignal(text)) contexts.push(CLARA_CONTEXTS.FINANCE);
    if (hasMePageSignal(text)) contexts.push(CLARA_CONTEXTS.ME_PAGE);
    if (hasScheduleSignal(text)) contexts.push(CLARA_CONTEXTS.SCHEDULE);
    if (hasMemorySignal(text) || hasCoachSignal(text)) contexts.push(CLARA_CONTEXTS.MEMORY);
    if (hasRiskSignal(text) || /\b(can i afford|can i buy|can i spend|emergency fund|should i|safe|worth it|buy|purchase|spend)\b/.test(text)) contexts.push(CLARA_CONTEXTS.RISK);
    return unique(contexts.length ? contexts : [CLARA_CONTEXTS.FINANCE]);
  }

  if (brain === CLARA_BRAINS.COACH) {
    const contexts = [];
    if (hasMemorySignal(text) || hasCoachSignal(text)) contexts.push(CLARA_CONTEXTS.MEMORY);
    if (hasMePageSignal(text)) contexts.push(CLARA_CONTEXTS.ME_PAGE);
    if (hasMoneySignal(text)) contexts.push(CLARA_CONTEXTS.FINANCE_PRESSURE);
    if (hasRiskSignal(text)) contexts.push(CLARA_CONTEXTS.RISK);
    if (hasScheduleSignal(text)) contexts.push(CLARA_CONTEXTS.SCHEDULE);
    return contexts.length ? unique(contexts) : [CLARA_CONTEXTS.MEMORY];
  }

  if (brain === CLARA_BRAINS.MEMORY) {
    const contexts = [];
    if (/\b(prefer|preference|style|direct advice|short advice)\b/.test(text)) contexts.push(CLARA_CONTEXTS.PREFERENCES);
    if (/\b(spend|spending|usually|always|pattern|trigger|payday|salary)\b/.test(text)) contexts.push(CLARA_CONTEXTS.SPENDING_PATTERNS);
    if (/\b(goal|priority|dream|target|saving for|protect)\b/.test(text)) contexts.push(CLARA_CONTEXTS.GOALS);
    if (/\b(stress|sad|guilty|tired|exhausted|tempted|regret)\b/.test(text)) contexts.push(CLARA_CONTEXTS.EMOTIONAL_TRIGGERS);
    if (/\b(learned|lesson|realized|noticed|napansin|natutunan)\b/.test(text)) contexts.push(CLARA_CONTEXTS.LIFE_LESSONS);
    return contexts.length ? unique(contexts) : [CLARA_CONTEXTS.SPENDING_PATTERNS];
  }

  if (brain === CLARA_BRAINS.SCHEDULE) {
    const contexts = [CLARA_CONTEXTS.SCHEDULE];
    if (/\b(cost|fee|payment|budget|money|financial|prepare money)\b/.test(text)) contexts.push(CLARA_CONTEXTS.FINANCE_PRESSURE);
    if (hasRiskSignal(text)) contexts.push(CLARA_CONTEXTS.RISK);
    return unique(contexts);
  }

  return [];
}

function createPureScheduleRoute({ action = FOLLOW_UP_ACTIONS.NEW_FLOW, mode = "initial" } = {}) {
  return {
    mode,
    action,
    brain: CLARA_BRAINS.SCHEDULE,
    brainKey: CLARA_BRAIN_KEYS[CLARA_BRAINS.SCHEDULE],
    contexts: [CLARA_CONTEXTS.SCHEDULE],
    globalContexts: [CLARA_CONTEXTS.CHAT_MEMORY],
    confidence: 0.98,
    reason: "Hard schedule override: pure schedule intent detected before finance, decision, follow-up, chat-only, or money fallback routing.",
  };
}

function createCasualAcknowledgementRoute({ mode = "follow_up" } = {}) {
  return {
    mode,
    action: FOLLOW_UP_ACTIONS.SWITCH_BRAIN,
    brain: CLARA_BRAINS.CASUAL,
    brainKey: CLARA_BRAIN_KEYS[CLARA_BRAINS.CASUAL],
    contexts: [],
    globalContexts: [CLARA_CONTEXTS.CHAT_MEMORY],
    confidence: 0.99,
    reason: "User only acknowledged the previous answer; switch to Casual Brain instead of repeating the previous finance context.",
  };
}

export function routeInitialBrainContext({ userMessage = "" } = {}) {
  const text = normalizeText(userMessage);
  let brain = CLARA_BRAINS.CASUAL;
  let confidence = 0.72;
  let reason = "Default casual route.";

  if (isCasualOnly(text)) {
    brain = CLARA_BRAINS.CASUAL;
    confidence = 0.98;
    reason = "Simple casual conversation.";
  } else if (hasDecisionSignal(text)) {
    brain = CLARA_BRAINS.DECISION;
    confidence = 0.94;
    reason = "User is asking for a decision or affordability judgment.";
  } else if (isPureScheduleIntent(text)) {
    brain = CLARA_BRAINS.SCHEDULE;
    confidence = 0.94;
    reason = "User is asking a pure schedule, appointment, or calendar question.";
  } else if (hasMemorySignal(text)) {
    brain = CLARA_BRAINS.MEMORY;
    confidence = 0.88;
    reason = "User shared a pattern or memory-worthy observation.";
  } else if (hasCoachSignal(text)) {
    brain = CLARA_BRAINS.COACH;
    confidence = 0.86;
    reason = "User shared emotional or behavioral context.";
  } else if (hasMoneySignal(text)) {
    brain = CLARA_BRAINS.FINANCE;
    confidence = 0.88;
    reason = "User is asking about money or a finance card.";
  } else if (hasScheduleSignal(text)) {
    brain = CLARA_BRAINS.SCHEDULE;
    confidence = 0.9;
    reason = "User is asking about schedule, appointments, or commitments.";
  }

  const contexts = getInitialContextsForBrain(brain, text);
  return {
    mode: "initial",
    action: FOLLOW_UP_ACTIONS.NEW_FLOW,
    brain,
    brainKey: CLARA_BRAIN_KEYS[brain],
    contexts,
    globalContexts: [CLARA_CONTEXTS.CHAT_MEMORY],
    confidence,
    reason,
  };
}
