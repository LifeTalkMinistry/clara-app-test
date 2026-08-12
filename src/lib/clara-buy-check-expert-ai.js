import { requestGeminiJson } from "./clara-gemini-json-utils";
import { clean, money, parsePrice } from "./clara-buy-check-budget-core.js";

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

function sanitizeEvidence(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const evidence = {};
  EVIDENCE_KEYS.forEach((key) => {
    const text = clean(source[key]);
    if (text) evidence[key] = text.slice(0, 320);
  });
  const price = normalizePrice(source.price);
  if (price > 0) evidence.price = price;
  return evidence;
}

function mergeEvidence(previous = {}, incoming = {}) {
  const prior = sanitizeEvidence(previous);
  const next = sanitizeEvidence(incoming);
  return { ...prior, ...next };
}

function transcript(history = []) {
  const list = Array.isArray(history) ? history.slice(-18) : [];
  const lines = list
    .map((message) => {
      const text = clean(message?.text || message?.content || "");
      if (!text) return "";
      return `${message?.role === "user" ? "User" : "CLARA"}: ${text}`;
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : "No earlier messages yet.";
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

  return `You are CLARA, an expert pre-purchase money coach inside Ask Before You Spend.
You are speaking with ${userName}.

You CONTROL the conversation. There is no fixed questionnaire and no fixed sequence such as item -> price -> reason -> confirmation. Your job is to understand the purchase well enough to responsibly hand it to a separate deterministic financial engine.

Recent conversation:
${transcript(history)}

Latest user message:
${clean(message)}

Evidence already understood:
${JSON.stringify(currentEvidence, null, 2)}

Core behavior:
- Be conversational first. Greetings, thanks, filler, corrections, jokes, and side comments are NOT purchase data unless context clearly makes them purchase data.
- Example: if the user says "Hi" at the start, greet them naturally and ask what they are considering buying. NEVER treat "Hi" as an item.
- Extract every useful fact the user gives in any order. A single message can contain item, price, purpose, urgency, condition of an existing item, timing, alternatives, or constraints.
- Never ask for information the user already gave.
- Ask ONE focused question at a time, chosen because the answer could materially improve the eventual decision.
- You may probe as many turns as genuinely needed. There is NO arbitrary question limit.
- Do not interrogate. Once the situation is clear enough, stop probing.
- You do NOT need every possible evidence field. Only gather what is relevant to this specific purchase.
- At minimum before readiness: know the actual purchase item, a usable price or estimate, and a concrete reason/current situation. A vague category word alone such as replacement, reward, work, health, hobby, need, or planned is not enough if it leaves the real situation unclear.
- If a vague answer matters, probe adaptively. Example: for replacement shoes, ask what happened to the current pair or why replacement matters now.
- If the user supplies a concrete answer such as "my work shoes are falling apart," understand the meaning and do not repeat that sentence verbatim.
- Paraphrase meaning naturally. Never build robotic text such as "You are considering X for Y because Z."
- Do not quote the user's typo-filled wording back to them unless necessary for clarification.
- Match the user's language style. Taglish is okay when appropriate.
- Do not decide affordability, approval, risk, or verdict. The deterministic engine does that later.
- Do not invent money facts, budgets, wallets, obligations, or personal history.

Choose exactly one action:
- "chat": normal conversational response; purchase evidence is not yet meaningfully advancing or the user is greeting/asking something conversational.
- "probe": ask the single most useful next question because more purchase understanding is needed.
- "ready": you are satisfied that the purchase context is sufficiently understood for a responsible financial check.

When action is "ready":
- The evidence MUST include a real item, price > 0, and a concrete purpose/current situation.
- Your reply should naturally summarize the meaning in fresh wording and ask permission to run the full Buy Check.
- Do not echo the user's raw sentence.

Return ONLY valid JSON in this exact shape:
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
  if (isStandaloneGreeting(message)) {
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
      readinessConfidence: 0.1,
      source: "fallback",
    };
  }

  if (!current.price) {
    return {
      action: "probe",
      reply: `About how much would ${current.item} cost?`,
      evidence: current,
      readinessConfidence: 0.25,
      source: "fallback",
    };
  }

  if (!current.purpose && !current.currentSituation) {
    return {
      action: "probe",
      reply: "What makes this purchase important to you right now?",
      evidence: current,
      readinessConfidence: 0.45,
      source: "fallback",
    };
  }

  return {
    action: "ready",
    reply: `I understand the situation well enough now. Want me to run the full Buy Check for ${current.item} at ${money(current.price)}?`,
    evidence: current,
    readinessConfidence: 0.75,
    source: "fallback",
  };
}

export async function runClaraBuyCheckExpertTurn({
  message,
  history = [],
  evidence = {},
  assistantContext = {},
} = {}) {
  const fallback = fallbackTurn(message, evidence);
  const previousEvidence = sanitizeEvidence(evidence);
  const greetingOnly = isStandaloneGreeting(message) && !previousEvidence.item && !previousEvidence.price;

  try {
    const { json, model } = await requestGeminiJson({
      prompt: buildPrompt({ message, history, evidence, assistantContext }),
      temperature: 0.42,
      maxOutputTokens: 520,
      timeoutMs: 12000,
      label: "CLARA adaptive Buy Check expert",
    });

    const rawReply = clean(json?.reply).slice(0, 520);
    if (greetingOnly) {
      const safeGreetingReply = rawReply && !/\b(cost|price|amount|how much)\b/i.test(rawReply)
        ? rawReply
        : "Hi. What are you thinking about buying?";
      return {
        action: "chat",
        reply: safeGreetingReply,
        evidence: previousEvidence,
        readinessConfidence: 0,
        source: "ai",
        model,
      };
    }

    const action = ACTIONS.has(clean(json?.action).toLowerCase())
      ? clean(json?.action).toLowerCase()
      : fallback.action;
    const mergedEvidence = mergeEvidence(evidence, json?.evidence);
    const reply = rawReply || fallback.reply;
    const confidenceRaw = Number(json?.readinessConfidence);
    const readinessConfidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : fallback.readinessConfidence;

    const hasCoreEvidence = Boolean(
      clean(mergedEvidence.item) &&
      normalizePrice(mergedEvidence.price) > 0 &&
      (clean(mergedEvidence.purpose) || clean(mergedEvidence.currentSituation))
    );

    return {
      action: action === "ready" && !hasCoreEvidence ? "probe" : action,
      reply: action === "ready" && !hasCoreEvidence
        ? fallbackTurn(message, mergedEvidence).reply
        : reply,
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

export { mergeEvidence, sanitizeEvidence };
