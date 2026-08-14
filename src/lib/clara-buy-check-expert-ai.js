import { requestGeminiJson } from "./clara-gemini-json-utils";
import { clean, parsePrice } from "./clara-buy-check-budget-core.js";

const ACTIONS = new Set(["chat", "probe", "ready"]);
const EVIDENCE_KEYS = [
  "item",
  "purpose",
  "currentSituation",
  "urgency",
  "alternatives",
  "timing",
  "constraints",
  "readinessSummary",
];

function normalizePrice(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return parsePrice(value || "");
}

function isStandaloneGreeting(value = "") {
  return /^(hi|hello|hey|yo|good\s+(morning|afternoon|evening)|kumusta|kamusta)[!.\s]*$/i.test(clean(value));
}

function isGenericPurchaseIntent(value = "") {
  const text = clean(value).toLowerCase().replace(/[.!]+$/g, "").trim();
  if (!text) return true;
  if (/^(?:something|anything|stuff|things?|item|an?\s+item|purchase|a\s+purchase|whatever|one)$/i.test(text)) return true;
  return /^(?:i\s+)?(?:just\s+)?(?:want|wanna|need|plan|planning|hope|trying|thinking|considering|would\s+like)(?:\s+to|\s+about)?\s+(?:buy|purchase|get|buying|purchasing|getting)(?:\s+(?:something|anything|stuff|things?|an?\s+item|a\s+purchase))?$/i.test(text);
}

function hasPurchaseIntent(value = "") {
  return /\b(?:want|wanna|need|plan|planning|hope|trying|thinking|considering|would\s+like)\b[\s\S]{0,32}\b(?:buy|purchase|get|buying|purchasing|getting)\b/i.test(clean(value));
}

function stripItemAnswer(value = "") {
  let item = clean(value);
  if (!item || isGenericPurchaseIntent(item)) return "";

  item = item
    .replace(/^(?:h+m+|hmm+|uh+|umm*|erm+|well|actually|probably|maybe)[,.:;\-\s]*/i, "")
    .replace(/^(?:no[,.:;\-\s]+)?(?:i\s+(?:already\s+)?said|i\s+mean|it(?:'s| is)|just)\s+/i, "")
    .replace(/^(?:i(?:'m| am)\s+)?(?:thinking|considering|planning)\s+(?:about\s+)?(?:buying|purchasing|getting)\s+/i, "")
    .replace(/^(?:i\s+)?(?:want|wanna|would\s+like|need|plan|hope|trying)\s+(?:to\s+)?(?:buy|purchase|get)\s+/i, "")
    .replace(/^(?:i(?:'m| am)\s+)?(?:buying|purchasing|getting)\s+/i, "")
    .replace(/^(?:some|a|an)\s+/i, "")
    .trim();

  if (!item || isGenericPurchaseIntent(item)) return "";
  if (/^(?:idk|i don'?t know|not sure|nothing|no idea|skip|pass|maybe later)$/i.test(item)) return "";
  if (item.includes("?") || item.length > 120) return "";
  return item.slice(0, 120);
}

function sanitizeEvidence(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const evidence = {};

  EVIDENCE_KEYS.forEach((key) => {
    const text = clean(source[key]);
    if (!text) return;
    if (key === "item") {
      const item = stripItemAnswer(text);
      if (item) evidence.item = item;
      return;
    }
    evidence[key] = text.slice(0, 320);
  });

  const price = normalizePrice(source.price);
  if (price > 0) evidence.price = price;
  return evidence;
}

function mergeEvidence(previous = {}, incoming = {}) {
  return { ...sanitizeEvidence(previous), ...sanitizeEvidence(incoming) };
}

function transcript(history = []) {
  const lines = (Array.isArray(history) ? history.slice(-12) : [])
    .map((message) => {
      const text = clean(message?.text || message?.content || "");
      if (!text) return "";
      return `${message?.role === "user" ? "User" : "CLARA"}: ${text}`;
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : "No earlier messages yet.";
}

function lastClaraMessage(history = []) {
  const list = Array.isArray(history) ? history : [];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const message = list[index];
    if (message?.role === "user") continue;
    const text = clean(message?.text || message?.content || "");
    if (text) return text;
  }
  return "";
}

function lastQuestionTopic(history = []) {
  const text = lastClaraMessage(history);
  if (!text) return "";
  if (/what.*(?:buying|purchase)|what.*considering|what.*thinking about/i.test(text)) return "item";
  if (/how much|what(?:'s| is) the price|what price|cost|expecting to pay/i.test(text)) return "price";
  if (/why.*(?:buy|purchase|need|want)|what makes|important.*right now|what happened|replac(?:e|ing)/i.test(text)) return "reason";
  return "";
}

function isUsefulReasonAnswer(value = "") {
  const text = clean(value);
  if (!text || text.includes("?") || text.length < 3) return false;
  return !/^(?:idk|i don'?t know|not sure|no idea|nothing|skip|pass)$/i.test(text);
}

function inferEvidenceFromTurn(message = "", history = [], evidence = {}) {
  const inferred = sanitizeEvidence(evidence);
  const answer = clean(message);
  const topic = lastQuestionTopic(history);
  const explicitItemCorrection = /^(?:no[,.:;\-\s]+)?(?:i\s+(?:already\s+)?said|i\s+mean)\b/i.test(answer);

  if (topic === "item" || explicitItemCorrection || hasPurchaseIntent(answer)) {
    const item = stripItemAnswer(answer);
    if (item) inferred.item = item;
  }

  if (!inferred.price && topic === "price") {
    const price = normalizePrice(answer);
    if (price > 0) inferred.price = price;
  }

  if (inferred.item && !inferred.purpose && !inferred.currentSituation && topic === "reason" && isUsefulReasonAnswer(answer)) {
    inferred.currentSituation = answer.slice(0, 320);
  }

  return inferred;
}

function reasonFromEvidence(evidence = {}) {
  return clean(evidence.currentSituation || evidence.purpose || evidence.readinessSummary || "");
}

function replyRepeatsKnownQuestion(reply = "", evidence = {}) {
  const text = clean(reply);
  const current = sanitizeEvidence(evidence);
  if (current.item && /what.*(?:buying|purchase)|what.*considering|what.*thinking about/i.test(text)) return true;
  if (current.price && /how much|what(?:'s| is) the price|what price|cost|expecting to pay/i.test(text)) return true;
  if (reasonFromEvidence(current) && /why.*(?:buy|purchase|need|want)|what makes|important.*right now/i.test(text)) return true;
  return false;
}

function userNameFromContext(context = {}) {
  return clean(
    context.userName ||
      context.name ||
      context.profile?.name ||
      context.me?.name ||
      context.lifeProfile?.name ||
      context.user?.user_metadata?.full_name ||
      context.user?.user_metadata?.name ||
      ""
  );
}

function buildPrompt({ message, history = [], evidence = {}, assistantContext = {} } = {}) {
  const userName = userNameFromContext(assistantContext) || "the user";
  const currentEvidence = sanitizeEvidence(evidence);

  return `You are CLARA, an economist-informed personal spending decision expert inside Ask Before You Spend.
You are speaking with ${userName}.

This turn is PURCHASE INTAKE, not the final financial verdict.
Your job is to understand what the user wants to buy well enough for CLARA to assemble verified financial context and run one final spending decision later.

Recent conversation:
${transcript(history)}

Latest user message:
${clean(message)}

Purchase evidence already understood:
${JSON.stringify(currentEvidence, null, 2)}

Rules:
- There is no fixed questionnaire and no mandatory item -> price -> reason -> urgency sequence.
- Understand useful information in any order.
- Track what was already answered and never ask the same thing twice.
- Ask only when missing information could materially change the later spending decision.
- Ask one focused question at a time.
- Do not interrogate the user.
- At minimum, before readiness, understand the actual item, a usable price or estimate, and a concrete reason/current situation.
- A generic statement like "I want to buy something" is not an item.
- If the user gives a correction, trust the correction and update the evidence.
- Match the user's language style; Taglish is fine when natural.
- Never invent wallet balances, budgets, income, debts, obligations, savings, goals, dates, or other financial facts.
- Do not decide BUY, WAIT, or PAUSE in this intake turn. The final Gemini spending-decision service does that only after verified CLARA financial facts are assembled.
- When enough purchase information is present, use action "ready" and briefly confirm the purchase meaning before asking permission to run the money check.

Return valid JSON only:
{
  "action": "chat" | "probe" | "ready",
  "reply": "the exact natural response CLARA should show",
  "evidence": {
    "item": "",
    "price": 0,
    "purpose": "",
    "currentSituation": "",
    "urgency": "",
    "alternatives": "",
    "timing": "",
    "constraints": "",
    "readinessSummary": ""
  },
  "readinessConfidence": 0.0
}`;
}

function fallbackTurn(message = "", evidence = {}) {
  const current = sanitizeEvidence(evidence);

  if (isStandaloneGreeting(message) && !current.item) {
    return {
      action: "chat",
      reply: "Hi. What are you thinking about buying?",
      evidence: current,
      readinessConfidence: 0,
      source: "fallback",
    };
  }

  if (!current.item) {
    return {
      action: "probe",
      reply: "What are you considering buying?",
      evidence: current,
      readinessConfidence: 0.25,
      source: "fallback",
    };
  }

  if (!current.price) {
    return {
      action: "probe",
      reply: `About how much do you expect to pay for the ${current.item}?`,
      evidence: current,
      readinessConfidence: 0.45,
      source: "fallback",
    };
  }

  if (!reasonFromEvidence(current)) {
    return {
      action: "probe",
      reply: "What makes this purchase matter right now?",
      evidence: current,
      readinessConfidence: 0.65,
      source: "fallback",
    };
  }

  return {
    action: "ready",
    reply: "I understand what you’re considering and why. Want me to run the money check using your CLARA financial data?",
    evidence: current,
    readinessConfidence: 0.85,
    source: "fallback",
  };
}

export async function runClaraBuyCheckExpertTurn({
  message,
  history = [],
  evidence = {},
  assistantContext = {},
} = {}) {
  const previousEvidence = sanitizeEvidence(evidence);
  const seededEvidence = inferEvidenceFromTurn(message, history, evidence);
  const fallback = fallbackTurn(message, seededEvidence);
  const greetingOnly = isStandaloneGreeting(message) && !previousEvidence.item && !previousEvidence.price;

  try {
    const { json, model } = await requestGeminiJson({
      prompt: buildPrompt({ message, history, evidence: seededEvidence, assistantContext }),
      temperature: 0.3,
      maxOutputTokens: 480,
      timeoutMs: 12000,
      label: "CLARA adaptive Buy Check expert",
    });

    const mergedEvidence = mergeEvidence(seededEvidence, json?.evidence);
    const action = ACTIONS.has(clean(json?.action).toLowerCase()) ? clean(json.action).toLowerCase() : fallback.action;
    const reply = clean(json?.reply).slice(0, 520);
    const readinessConfidence = Math.max(0, Math.min(1, Number(json?.readinessConfidence || 0)));

    if (greetingOnly) {
      return {
        action: "chat",
        reply: reply && !/\b(cost|price|amount|how much)\b/i.test(reply) ? reply : "Hi. What are you thinking about buying?",
        evidence: previousEvidence,
        readinessConfidence: 0,
        source: "ai",
        model,
      };
    }

    const readyEnough = Boolean(mergedEvidence.item && Number(mergedEvidence.price) > 0 && reasonFromEvidence(mergedEvidence));
    if (action === "ready" && !readyEnough) {
      return { ...fallbackTurn(message, mergedEvidence), model };
    }

    if (!reply || replyRepeatsKnownQuestion(reply, mergedEvidence)) {
      return { ...fallbackTurn(message, mergedEvidence), model };
    }

    return {
      action,
      reply,
      evidence: mergedEvidence,
      readinessConfidence,
      source: "ai",
      model,
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Adaptive expert fallback used.", error);
    return fallback;
  }
}

export { inferEvidenceFromTurn, mergeEvidence, sanitizeEvidence };
