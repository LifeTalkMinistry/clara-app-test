import { AI_INTENTS, WRITE_INTENTS } from "@/lib/ai-command/command-parser";

export const CLARA_ROUTE_LANES = Object.freeze({
  ACTION: "ACTION",
  READ_MONEY: "READ_MONEY",
  DECISION: "DECISION",
  LIFE_CONTEXT: "LIFE_CONTEXT",
  SMALL_TALK: "SMALL_TALK",
  GENERAL: "GENERAL",
  UNKNOWN: "UNKNOWN",
});

const MONEY_READ_INTENTS = new Set([
  AI_INTENTS.GET_LAST_EXPENSE,
  AI_INTENTS.CHECK_BALANCE,
  AI_INTENTS.READ_SPENDING,
  AI_INTENTS.READ_WALLET_HISTORY,
  AI_INTENTS.READ_BUDGET_STATUS,
  AI_INTENTS.READ_SAVINGS_STATUS,
  AI_INTENTS.ANALYZE_SPENDING,
  AI_INTENTS.SUGGEST_SAVINGS,
  AI_INTENTS.PLAN_SPENDING,
  AI_INTENTS.EMERGENCY_FUND_PLAN,
]);

const GUIDANCE_INTENTS = new Set([
  AI_INTENTS.DECISION_GUIDANCE,
  AI_INTENTS.DAILY_PLANNING,
  AI_INTENTS.HABIT_TRACKING,
  AI_INTENTS.PRODUCTIVITY_COACHING,
  AI_INTENTS.GOAL_PLANNING,
  AI_INTENTS.LIFESTYLE_GUIDANCE,
  AI_INTENTS.EMOTIONAL_GUIDANCE,
  AI_INTENTS.GENERAL_GUIDANCE,
]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function score(command, fallback = 0.5) {
  const value = Number(command?.confidence);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function route(lane, options = {}) {
  return {
    lane,
    confidence: Number.isFinite(Number(options.confidence)) ? Math.max(0, Math.min(1, Number(options.confidence))) : 0.5,
    reason: options.reason || "Matched CLARA router rule.",
    needsGemini: Boolean(options.needsGemini),
    contextNeeded: Array.from(new Set(options.contextNeeded || [])),
    canWrite: Boolean(options.canWrite),
    shouldAskConfirmation: Boolean(options.shouldAskConfirmation),
    preferAssistantMessage: Boolean(options.preferAssistantMessage),
  };
}

function isSmallTalk(text) {
  return /^(hi|hello|hey|yo|good morning|good afternoon|good evening|kumusta|kamusta|how are you|thanks|thank you)[!?.\s]*$/.test(text);
}

function isDecision(text) {
  return /\b(should i|can i afford|can i buy|is it okay|worth it|before i buy|before buying|help me decide|safe to spend)\b/.test(text);
}

function isLifeContext(text) {
  return /\b(i feel|i felt|i noticed|i realized|lately|recently|routine|habit|pattern|stress|stressed|tired|tempted|craving|after work|sleep|basketball|gym|family|relationship)\b/.test(text);
}

function isFinanceTopic(text) {
  return /\b(wallet|balance|budget|expense|spent|spending|savings?|emergency fund|transfer|money left|available money|cash|gcash|maya|bank)\b/.test(text);
}

export function routeAssistantInput({ text = "", session = null, localCommand = null } = {}) {
  const input = normalize(text);
  const previous = session?.currentCommand || null;
  const intent = localCommand?.intent || AI_INTENTS.UNKNOWN;
  const confidence = score(localCommand, 0.5);

  if (!input) return route(CLARA_ROUTE_LANES.UNKNOWN, { confidence: 0.1, needsGemini: false, reason: "Empty message." });

  if (previous?.status === "collecting_missing_fields" || previous?.status === "awaiting_confirmation") {
    return route(CLARA_ROUTE_LANES.ACTION, {
      confidence: 0.95,
      reason: "Continuing the active command.",
      contextNeeded: ["finance", "wallets"],
      canWrite: WRITE_INTENTS.has(previous.intent),
      shouldAskConfirmation: previous.status === "awaiting_confirmation",
      needsGemini: false,
    });
  }

  if (WRITE_INTENTS.has(intent)) {
    return route(CLARA_ROUTE_LANES.ACTION, {
      confidence: Math.max(confidence, 0.82),
      reason: `Detected write intent: ${intent}.`,
      contextNeeded: ["finance", "wallets", "budgets"],
      canWrite: true,
      shouldAskConfirmation: true,
      needsGemini: false,
    });
  }

  if (MONEY_READ_INTENTS.has(intent)) {
    return route(CLARA_ROUTE_LANES.READ_MONEY, {
      confidence: Math.max(confidence, 0.78),
      reason: `Detected money read intent: ${intent}.`,
      contextNeeded: ["finance", "wallets", "budgets", "expenses", "savingsGoals"],
      needsGemini: false,
    });
  }

  if (isDecision(input) || intent === AI_INTENTS.DECISION_GUIDANCE) {
    return route(CLARA_ROUTE_LANES.DECISION, {
      confidence: Math.max(confidence, 0.84),
      reason: "User is asking for decision guidance.",
      contextNeeded: ["finance", "wallets", "budgets", "expenses", "savingsGoals", "emergencyFund", "memoryStory"],
      needsGemini: true,
      preferAssistantMessage: true,
    });
  }

  if (isLifeContext(input) || intent === AI_INTENTS.EMOTIONAL_GUIDANCE) {
    return route(CLARA_ROUTE_LANES.LIFE_CONTEXT, {
      confidence: Math.max(confidence, 0.78),
      reason: "User shared personal context that may affect spending guidance.",
      contextNeeded: ["memoryStory", "recentHistory", "lifeContext", "finance"],
      needsGemini: true,
      preferAssistantMessage: true,
    });
  }

  if (isSmallTalk(input)) {
    return route(CLARA_ROUTE_LANES.SMALL_TALK, {
      confidence: 0.95,
      reason: "Small talk can be handled locally.",
      needsGemini: false,
    });
  }

  if (GUIDANCE_INTENTS.has(intent)) {
    return route(CLARA_ROUTE_LANES.GENERAL, {
      confidence: Math.max(confidence, 0.65),
      reason: `Detected broad guidance intent: ${intent}.`,
      contextNeeded: ["finance", "memoryStory", "recentHistory"],
      needsGemini: true,
      preferAssistantMessage: true,
    });
  }

  if (isFinanceTopic(input)) {
    return route(CLARA_ROUTE_LANES.READ_MONEY, {
      confidence: 0.62,
      reason: "Message mentions money but needs better classification.",
      contextNeeded: ["finance", "wallets", "budgets", "expenses"],
      needsGemini: true,
      preferAssistantMessage: true,
    });
  }

  return route(CLARA_ROUTE_LANES.UNKNOWN, {
    confidence,
    reason: "No strong local route matched.",
    contextNeeded: ["recentHistory", "memoryStory"],
    needsGemini: true,
    preferAssistantMessage: true,
  });
}

export function shouldUseGeminiForRoute(routeResult, localCommand = null) {
  if (!routeResult) return !localCommand || localCommand.intent === AI_INTENTS.UNKNOWN;
  if (routeResult.lane === CLARA_ROUTE_LANES.SMALL_TALK) return false;
  if (routeResult.lane === CLARA_ROUTE_LANES.ACTION && localCommand?.intent !== AI_INTENTS.UNKNOWN) return false;
  if (routeResult.lane === CLARA_ROUTE_LANES.READ_MONEY && MONEY_READ_INTENTS.has(localCommand?.intent)) return false;
  if (WRITE_INTENTS.has(localCommand?.intent)) return false;
  return Boolean(routeResult.needsGemini || localCommand?.intent === AI_INTENTS.UNKNOWN);
}

export function attachRouteToCommand(command, routeResult) {
  if (!command) return command;
  return { ...command, route: routeResult };
}
