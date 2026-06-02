export const CLARA_BRAINS = Object.freeze({
  CASUAL: 1,
  FINANCE: 2,
  DECISION: 3,
  COACH: 4,
  MEMORY: 5,
});

export const CLARA_BRAIN_LABELS = Object.freeze({
  [CLARA_BRAINS.CASUAL]: "Casual Brain",
  [CLARA_BRAINS.FINANCE]: "Finance Brain",
  [CLARA_BRAINS.DECISION]: "Decision Brain",
  [CLARA_BRAINS.COACH]: "Coach Brain",
  [CLARA_BRAINS.MEMORY]: "Memory Brain",
});

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9₱.,?'’\s-]/g, " ")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMoneySignal(text = "") {
  return /\b(wallet|budget|expense|expenses|spend|spent|spending|savings?|save|emergency fund|investment|debt|utang|loan|balance|money|cash|gcash|maya|bank|income|payday|afford|buy|purchase|transfer|bills?)\b/.test(text);
}

function hasDecisionSignal(text = "") {
  return /\b(should i|can i afford|can i buy|can i spend|is it okay|is it ok|is this okay|is this ok|worth it|before i buy|before buying|before i purchase|before purchasing|help me decide|safe to spend|safe purchase|safe to buy|i want to buy|i'm planning to buy|im planning to buy|i am planning to buy|i want to spend|planning to buy|planning to purchase|should i use emergency fund|should i spend|should i delay|delay this|buy this|purchase this|go for it)\b/.test(text);
}

function hasCoachSignal(text = "") {
  return /\b(stress|stressed|overwhelmed|anxious|sad|tired|pagod|guilty|tempted|craving|burnout|habit|routine|discipline|motivation|mindset|feel|feeling)\b/.test(text);
}

function hasMemorySignal(text = "") {
  return /\b(i noticed|i realized|i realise|i learned|lately|recently|pattern|trigger|usually|always|whenever|helps me|helped me)\b/.test(text);
}

function isCasualOnly(text = "") {
  if (!text) return false;
  if (hasMoneySignal(text) || hasDecisionSignal(text) || hasCoachSignal(text) || hasMemorySignal(text)) return false;
  return /^(hi|hello|hey|yo|good morning|good afternoon|good evening|kumusta|kamusta|how are you|how r you|what'?s up|thanks|thank you|salamat|nice|okay|ok|cool|haha|hehe|lol)[!?.\s]*$/.test(text);
}

export function routeClaraBrain({ userMessage = "", recentConversation = [] } = {}) {
  const text = normalizeText(userMessage);

  if (isCasualOnly(text)) {
    return { brain: CLARA_BRAINS.CASUAL, confidence: 0.98, reason: "Simple casual conversation." };
  }

  if (hasDecisionSignal(text)) {
    return { brain: CLARA_BRAINS.DECISION, confidence: 0.94, reason: "User is asking for a decision or affordability judgment." };
  }

  if (hasMemorySignal(text)) {
    return { brain: CLARA_BRAINS.MEMORY, confidence: 0.88, reason: "User shared a pattern or memory-worthy observation." };
  }

  if (hasCoachSignal(text)) {
    return { brain: CLARA_BRAINS.COACH, confidence: 0.86, reason: "User shared emotional or behavioral context." };
  }

  if (hasMoneySignal(text)) {
    return { brain: CLARA_BRAINS.FINANCE, confidence: 0.88, reason: "User is asking about money or a finance card." };
  }

  const recentText = (Array.isArray(recentConversation) ? recentConversation : [])
    .slice(-4)
    .map((message) => String(message?.text || message?.content || ""))
    .join(" ")
    .toLowerCase();

  if (!hasMoneySignal(recentText) && !hasCoachSignal(recentText)) {
    return { brain: CLARA_BRAINS.CASUAL, confidence: 0.72, reason: "No finance or coaching signal in the latest chatbox conversation." };
  }

  return { brain: CLARA_BRAINS.COACH, confidence: 0.55, reason: "Fallback to coaching when intent is unclear." };
}

export function getBrainLabel(brain) {
  return CLARA_BRAIN_LABELS[brain] || "Unknown Brain";
}
