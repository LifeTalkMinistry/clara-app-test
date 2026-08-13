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

function isGenericPurchaseIntent(value = "") {
  const text = clean(value)
    .toLowerCase()
    .replace(/[.!]+$/g, "")
    .trim();

  if (!text) return true;

  if (/^(?:something|anything|stuff|things?|item|an?\s+item|purchase|a\s+purchase|whatever|one)$/i.test(text)) {
    return true;
  }

  return /^(?:i\s+)?(?:just\s+)?(?:want|wanna|need|plan|planning|hope|trying|thinking|considering|would\s+like)(?:\s+to|\s+about)?\s+(?:buy|purchase|get|buying|purchasing|getting)(?:\s+(?:something|anything|stuff|things?|an?\s+item|a\s+purchase))?$/i.test(text);
}

function hasPurchaseIntent(value = "") {
  const text = clean(value);
  return /\b(?:want|wanna|need|plan|planning|hope|trying|thinking|considering|would\s+like)\b[\s\S]{0,32}\b(?:buy|purchase|get|buying|purchasing|getting)\b/i.test(text);
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
    .replace(/^(?:i\s+)?(?:want|need)\s+(?:some|a|an)\s+/i, "")
    .replace(/^(?:some|a|an)\s+/i, "")
    .trim();

  if (!item || isGenericPurchaseIntent(item)) return "";
  if (/^(?:idk|i don'?t know|not sure|nothing|no idea|skip|pass|maybe later)$/i.test(item)) return "";
  if (item.includes("?") || item.length > 120) return "";
  return item.slice(0, 120);
}

function looksLikeBareItemAnswer(value = "") {
  const text = clean(value);
  const item = stripItemAnswer(text);
  if (!item || item.length > 60) return false;

  const words = item.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 6) return false;

  if (/^(?:because|for|so\s+that|to\s+replace|replacing|replace|my\s+current|the\s+current|mainly|mostly|just\s+because)\b/i.test(text)) {
    return false;
  }

  return true;
}

function sanitizeEvidence(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const evidence = {};
  EVIDENCE_KEYS.forEach((key) => {
    const text = clean(source[key]);
    if (!text) return;

    if (key === "item") {
      const item = stripItemAnswer(text);
      if (item) evidence.item = item.slice(0, 120);
      return;
    }

    evidence[key] = text.slice(0, 320);
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

  if (
    /(?:what|which).*(?:thinking about|considering|planning to|trying to).*(?:buy|purchase|get)/i.test(text) ||
    /what.*(?:buying|purchase)/i.test(text)
  ) return "item";

  if (/how much|what(?:'s| is) the price|what price|cost|expecting to pay/i.test(text)) return "price";

  if (
    /what makes|why.*(?:buy|purchase|need|want)|important.*right now|driving.*purchase|replac(?:e|ing)|current pair|current one|what happened/i.test(text)
  ) return "reason";

  return "";
}

function isUsefulReasonAnswer(value = "") {
  const text = clean(value);
  if (!text || text.includes("?") || text.length < 3) return false;
  return !/^(?:idk|i don'?t know|not sure|no idea|nothing|skip|pass)$/i.test(text);
}

function inferEvidenceFromTurn(message = "", history = [], evidence = {}) {
  const rawPriorItem = clean(evidence?.item);
  const priorItemWasGeneric = Boolean(rawPriorItem && !stripItemAnswer(rawPriorItem));
  const inferred = sanitizeEvidence(evidence);
  const answer = clean(message);
  const topic = lastQuestionTopic(history);
  const explicitItemCorrection = /^(?:no[,.:;\-\s]+)?(?:i\s+(?:already\s+)?said|i\s+mean)\b/i.test(answer);
  const itemIntent = hasPurchaseIntent(answer);
  const genericRecoveryItem = priorItemWasGeneric && looksLikeBareItemAnswer(answer);
  const shouldReadAsItem = topic === "item" || explicitItemCorrection || itemIntent || genericRecoveryItem;

  if (shouldReadAsItem) {
    const item = stripItemAnswer(answer);
    if (item && (!inferred.item || topic === "item" || explicitItemCorrection || genericRecoveryItem)) {
      inferred.item = item;
    }
  }

  if (!inferred.price && topic === "price") {
    const price = normalizePrice(answer);
    if (price > 0) inferred.price = price;
  }

  if (
    inferred.item &&
    !inferred.purpose &&
    !inferred.currentSituation &&
    topic === "reason" &&
    !genericRecoveryItem &&
    isUsefulReasonAnswer(answer)
  ) {
    inferred.currentSituation = answer.slice(0, 320);
  }

  return inferred;
}

function replyRepeatsKnownQuestion(reply = "", evidence = {}) {
  const text = clean(reply);
  if (!text) return false;
  const current = sanitizeEvidence(evidence);

  if (
    current.item &&
    (/(?:what|which).*(?:thinking about|considering|planning to|trying to).*(?:buy|purchase|get)/i.test(text) ||
      /what.*(?:buying|purchase)/i.test(text))
  ) return true;

  if (current.price && /how much|what(?:'s| is) the price|what price|cost|expecting to pay/i.test(text)) return true;

  if (
    (current.purpose || current.currentSituation) &&
    /what makes|why.*(?:buy|purchase|need|want)|important.*right now|driving.*purchase/i.test(text)
  ) return true;

  return false;
}

function itemLabel(value = "") {
  const text = clean(value);
  if (!text) return "that purchase";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function purposeProbe(item = "") {
  const label = itemLabel(item);
  if (/\b(?:shoe|shoes|sneaker|sneakers|sandals?|slippers?|boots?)\b/i.test(item)) {
    return `${label} — got it. Before we talk price, what job do they need to do: replace a worn-out pair, cover work/school or a specific activity, or are they mainly an extra pair you want?`;
  }
  return `${label} — got it. Before we talk price, what is driving the purchase right now: replacing something, solving a specific need, or mainly wanting it?`;
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

  return `You are CLARA, an expert pre-purchase money coach and senior Buy Check supervisor inside Ask Before You Spend.
You are speaking with ${userName}.

You CONTROL the conversation. There is no fixed questionnaire and no fixed sequence such as item -> price -> reason -> confirmation. Your job is to understand the purchase well enough to responsibly hand it to a separate deterministic financial engine.

Recent conversation:
${transcript(history)}

Latest user message:
${clean(message)}

Evidence already understood:
${JSON.stringify(currentEvidence, null, 2)}

Core behavior:
- Think like a senior purchase supervisor, not a scripted chatbot. Track what was already answered, interpret short answers in context, and move the conversation forward.
- FIRST inspect the immediately previous CLARA question and the latest user answer together. A direct answer to your previous question is authoritative evidence even when it is short, casual, typo-filled, or prefaced with filler.
- Example: if you asked what they are buying and the user says "Hmmm shoes", understand item = "shoes". If they say "I said shoes", treat that as a correction/confirmation that the item is shoes. NEVER ask what they are buying again.
- Generic intent is NOT an item. Statements such as "I want to buy something", "I wanna buy something", "I need to buy something", "something", or "an item" only mean the user wants to make a purchase. Ask for the actual item instead of saving those words as item evidence.
- If weak/generic item evidence somehow exists and the user then gives a concrete item such as "shoes", replace the weak evidence with the concrete item and continue. Never preserve a generic placeholder over a specific correction.
- Before asking any question, verify that its answer is not already present in the transcript, latest message, or evidence. Never ask the same information twice.
- Be conversational first. Greetings, thanks, filler, corrections, jokes, and side comments are NOT purchase data unless context clearly makes them purchase data.
- Example: if the user says "Hi" at the start, greet them naturally and ask what they are considering buying. NEVER treat "Hi" as an item.
- Extract every useful fact the user gives in any order. A single message can contain item, price, purpose, urgency, condition of an existing item, timing, alternatives, or constraints.
- Never ask for information the user already gave.
- Ask ONE focused question at a time, chosen because the answer could materially improve the eventual decision.
- Challenge the purchase intelligently. For common discretionary or replacement items such as shoes, clothes, phones, gadgets, and accessories, understand what job the purchase needs to do, whether it replaces something, and why it matters now instead of accepting desire as sufficient context.
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

  if (!current.purpose && !current.currentSituation) {
    return {
      action: "probe",
      reply: purposeProbe(current.item),
      evidence: current,
      readinessConfidence: 0.35,
      source: "fallback",
    };
  }

  if (!current.price) {
    return {
      action: "probe",
      reply: `What price are you actually looking at for ${current.item}?`,
      evidence: current,
      readinessConfidence: 0.55,
      source: "fallback",
    };
  }

  return {
    action: "ready",
    reply: `I understand the situation well enough now. Want me to run the full Buy Check for ${current.item} at ${money(current.price)}?`,
    evidence: current,
    readinessConfidence: 0.8,
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
      temperature: 0.32,
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

    let action = ACTIONS.has(clean(json?.action).toLowerCase())
      ? clean(json?.action).toLowerCase()
      : fallback.action;
    const mergedEvidence = mergeEvidence(seededEvidence, json?.evidence);
    let reply = rawReply || fallback.reply;
    const confidenceRaw = Number(json?.readinessConfidence);
    let readinessConfidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : fallback.readinessConfidence;

    const hasCoreEvidence = Boolean(
      clean(mergedEvidence.item) &&
      normalizePrice(mergedEvidence.price) > 0 &&
      (clean(mergedEvidence.purpose) || clean(mergedEvidence.currentSituation))
    );

    if (replyRepeatsKnownQuestion(reply, mergedEvidence)) {
      const recovery = fallbackTurn("", mergedEvidence);
      action = recovery.action;
      reply = recovery.reply;
      readinessConfidence = Math.max(readinessConfidence, recovery.readinessConfidence);
    }

    if (action !== "ready" && !hasCoreEvidence && !reply.includes("?")) {
      const recovery = fallbackTurn("", mergedEvidence);
      action = recovery.action;
      reply = recovery.reply;
      readinessConfidence = Math.max(readinessConfidence, recovery.readinessConfidence);
    }

    if (action === "ready" && !hasCoreEvidence) {
      const recovery = fallbackTurn("", mergedEvidence);
      action = recovery.action;
      reply = recovery.reply;
      readinessConfidence = Math.max(readinessConfidence, recovery.readinessConfidence);
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
