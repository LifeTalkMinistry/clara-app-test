import { requestGeminiJson } from "./clara-gemini-json-utils";
import {
  buildClaraPurchaseMetricImpact,
  formatClaraMetricImpactLine,
} from "./clara-buy-check-metric-impact.js";
import {
  CLARA_BUY_CHECK_PHASE,
  applyLocalPurchaseFacts,
  compactClaraPurchaseContext,
  hasConfirmedClaraPurchasePrice,
  isClaraPurchaseContextMature,
  mergeClaraPurchaseEvidence,
  routeClaraBuyCheckPhase,
  sanitizeClaraPurchaseEvidence,
  transactionReasonFromClaraEvidence,
} from "./clara-buy-check-intelligence-router.js";

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const ASK_MORE_PATTERN = /\b(ask\s+more|more\s+before\s+deciding|still\s+unsure|not\s+sure|explain\s+more)\b/i;

function firstName(value = "") {
  return clean(value).split(/\s+/).filter(Boolean)[0] || "";
}

function userNameFromContext(context = {}) {
  return clean(
    context.userName ||
      context.name ||
      context.profile?.name ||
      context.profile?.full_name ||
      context.profile?.first_name ||
      context.me?.name ||
      context.user?.name ||
      context.user?.full_name ||
      context.user?.first_name ||
      context.user?.user_metadata?.full_name ||
      context.user?.user_metadata?.name ||
      context.user?.user_metadata?.first_name ||
      "",
  );
}

function peso(value = 0) {
  const amount = Number(value);
  return `₱${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function transcript(history = [], limit = 4) {
  const lines = (Array.isArray(history) ? history.slice(-limit) : [])
    .map((message) => {
      const text = clean(message?.text || message?.content || "");
      if (!text) return "";
      return `${message?.role === "user" ? "User" : "CLARA"}: ${text}`;
    })
    .filter(Boolean);
  return lines.length ? lines.join("\n") : "No earlier conversation.";
}

function basePrompt() {
  return `FEATURE: ASK BEFORE YOU SPEND / BUY CHECK
You are CLARA, a personal money accountability companion.
Be warm, direct, human, and brief.
Ask one question at a time.
Never lecture or sound like a report.
Never invent a financial fact.
The application owns every financial calculation.
All unlabelled purchase amounts are Philippine pesos (₱). Never render a peso amount with $.`;
}

export function buildEstablishPrompt({ message = "", history = [], evidence = {}, userName = "" } = {}) {
  const name = firstName(userName);
  return `${basePrompt()}

PHASE 1 — ESTABLISH
This is the first CLARA response in this Buy Check session.
Establish connection in seconds, not through length.
Acknowledge what the user already said, then ask ONE useful question.
If they already named an item or price, do not ask for it again.
If they entered directly with a purchase, greet naturally while acknowledging it.
Do not mention Means Score, affordability, wallets, schedules, debts, savings, or a verdict.
Visible reply: 10–25 words.

User name: ${name || "unknown"}
Known purchase facts from the app:
${JSON.stringify(compactClaraPurchaseContext(evidence), null, 2)}

Recent conversation:
${transcript(history, 2)}

Latest user message:
${clean(message)}

Extract only purchase facts the user actually stated or clearly confirmed.
If the message contains multiple amounts, discounts, vouchers, installments, deposits, or another ambiguous payable amount, you may propose the actual payable amount as priceCandidate but set priceNeedsConfirmation=true. Never declare that candidate confirmed yourself.

Return JSON only:
{
  "reply": "short natural response",
  "evidence": {
    "item": "",
    "priceCandidate": 0,
    "priceNeedsConfirmation": false,
    "purpose": "",
    "currentSituation": "",
    "urgency": "",
    "consequenceOfWaiting": "",
    "alternatives": "",
    "timing": "",
    "constraints": "",
    "readinessSummary": ""
  }
}`;
}

export function buildDiscoveryPrompt({ message = "", history = [], evidence = {} } = {}) {
  return `${basePrompt()}

PHASE 2 — UNDERSTAND
Do not discuss the user's financial position yet.
Your only job is to understand whether this purchase actually matters enough to make a useful decision.
Ask ONE short question only when information is still missing.
Useful missing signals include purpose, current situation, urgency, what happens if they wait, timing, a constraint, or a realistic alternative.
Do not ask something already answered.
If the payable amount is ambiguous, confirm the exact amount before anything financial is calculated.
If the latest answer completes the needed context, do not pad the conversation or ask another unnecessary question. A short acknowledgment is enough; the application may immediately move to the metric phase after your evidence is returned.
Visible reply: 8–20 words.

Purchase context already known:
${JSON.stringify(compactClaraPurchaseContext(evidence), null, 2)}

Recent conversation:
${transcript(history, 4)}

Latest user message:
${clean(message)}

Extract only newly supported facts. For an ambiguous payable amount, set priceCandidate and priceNeedsConfirmation=true. Gemini never confirms money by itself.

Return JSON only:
{
  "reply": "short response or one short question",
  "evidence": {
    "item": "",
    "priceCandidate": 0,
    "priceNeedsConfirmation": false,
    "purpose": "",
    "currentSituation": "",
    "urgency": "",
    "consequenceOfWaiting": "",
    "alternatives": "",
    "timing": "",
    "constraints": "",
    "readinessSummary": ""
  }
}`;
}

export function buildMetricPrompt({ evidence = {}, metric = {} } = {}) {
  return `${basePrompt()}

PHASE 3 — METRIC DECISION
The application has already calculated the financial effect. Do NOT recalculate it.
Use the authoritative consequence sentence exactly once.
Then give ONE short practical interpretation or recommendation based on the purchase reason and the result.
Protect the Means Score 100 line without automatically discouraging harmless wants.
End with a short natural version of: "Still buying it?"
Visible reply: normally 20–45 words, maximum 2 short sentences.
Never use labels like "Means impact", "New pressure", arrows, or parenthetical score deltas.

Purchase context:
${JSON.stringify(compactClaraPurchaseContext(evidence), null, 2)}

CLARA CALCULATION — AUTHORITATIVE:
${JSON.stringify(metric, null, 2)}

AUTHORITATIVE CONSEQUENCE SENTENCE:
${clean(metric.metricSentence)}

Return JSON only:
{
  "reply": "short decision-stage reply",
  "recommendation": "buy" | "wait" | "reconsider"
}`;
}

function normalizeModelEvidence(value = {}, current = {}) {
  const source = value && typeof value === "object" ? value : {};
  const next = sanitizeClaraPurchaseEvidence({ ...current, ...source });
  const candidate = Number(source.priceCandidate);
  const needsConfirmation = source.priceNeedsConfirmation === true;

  if (!hasConfirmedClaraPurchasePrice(current) && needsConfirmation && Number.isFinite(candidate) && candidate > 0) {
    delete next.price;
    delete next.priceSource;
    next.priceCandidate = candidate;
    next.priceStatus = "needs_confirmation";
  }

  return next;
}

function metricPacket(impact = {}) {
  return {
    scoreBefore: impact?.currentScore ?? null,
    scoreAfter: impact?.projectedScoreAfterPurchase ?? null,
    incrementalImpact: Number(impact?.incrementalImpact || 0),
    alreadyAccounted: Number(impact?.alreadyAccountedAmount || 0),
    crossesProtectionLine: Boolean(impact?.crossesProtectionLine),
    protectionLine: 100,
    metricSentence: formatClaraMetricImpactLine(impact),
  };
}

function buildMetricImpact(evidence = {}, assistantContext = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (!hasConfirmedClaraPurchasePrice(source)) return null;
  return buildClaraPurchaseMetricImpact({
    purchasePrice: Number(source.price),
    item: clean(source.item),
    assistantContext,
  });
}

async function requestPhaseJson(prompt, phase, signal) {
  return requestGeminiJson({
    feature: "ask-before-you-spend",
    prompt,
    temperature: phase === CLARA_BUY_CHECK_PHASE.METRIC ? 0.2 : 0.35,
    maxOutputTokens: 220,
    label: `CLARA Buy Check ${phase}`,
    signal,
  });
}

function fallbackEstablish({ evidence = {}, assistantContext = {} } = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  const name = firstName(userNameFromContext(assistantContext));
  const hello = `Hey${name ? ` ${name}` : ""} 👋`;
  if (!source.item) return `${hello} What are you thinking about buying?`;
  if (!hasConfirmedClaraPurchasePrice(source)) return `${hello} Got you—the ${source.item}. How much will you actually pay for it?`;
  return `${hello} Got you—the ${source.item} at ${peso(source.price)}. What’s making you want it?`;
}

function fallbackDiscovery(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.priceStatus === "needs_confirmation") {
    if (Number(source.priceCandidate) > 0) return `Just to confirm, you’ll actually pay ${peso(source.priceCandidate)}, right?`;
    return "What’s the exact amount you’ll actually pay after everything?";
  }
  if (!source.item) return "What are you thinking about buying?";
  if (!hasConfirmedClaraPurchasePrice(source)) return `How much will you actually pay for the ${source.item}?`;
  if (!clean(source.purpose)) return "What’s making you want or need it?";
  return "If you wait, would anything important actually be affected?";
}

function fallbackMetric(evidence = {}, impact = {}) {
  const metric = metricPacket(impact);
  const after = Number(metric.scoreAfter);
  if (!metric.metricSentence) return "I understand the purchase, but I can’t verify the Means impact yet.";
  if (Number.isFinite(after) && after < 100) {
    return `${metric.metricSentence} That puts you below 100, so I’d wait or reduce the cost. Still buying it?`;
  }
  return `${metric.metricSentence} You’d still be above 100, so you have room for it. Still buying it?`;
}

async function runMetricTurn({ evidence, assistantContext, signal } = {}) {
  const impact = buildMetricImpact(evidence, assistantContext);
  if (!impact?.purchaseSimulationApplied || impact?.projectedScoreAfterPurchase == null) {
    return {
      action: "probe",
      reply: "I understand the purchase, but I can’t verify its Means impact yet. Try again in a moment.",
      evidence,
      readinessConfidence: 0.7,
      source: "metric-unavailable",
      phase: CLARA_BUY_CHECK_PHASE.METRIC,
    };
  }

  const metric = metricPacket(impact);
  try {
    const { json, model } = await requestPhaseJson(
      buildMetricPrompt({ evidence, metric }),
      CLARA_BUY_CHECK_PHASE.METRIC,
      signal,
    );
    const reply = clean(json?.reply);
    return {
      action: "ready",
      reply: reply || fallbackMetric(evidence, impact),
      evidence,
      readinessConfidence: 0.95,
      recommendation: clean(json?.recommendation),
      metric,
      source: "ai-metric",
      model,
      phase: CLARA_BUY_CHECK_PHASE.METRIC,
    };
  } catch (error) {
    if (error?.code === "CLARA_AI_CANCELLED" || error?.name === "AbortError") throw error;
    console.warn("[CLARA Buy Check] Metric conversation fallback used.", error);
    return {
      action: "ready",
      reply: fallbackMetric(evidence, impact),
      evidence,
      readinessConfidence: 0.9,
      metric,
      source: "metric-fallback",
      phase: CLARA_BUY_CHECK_PHASE.METRIC,
    };
  }
}

export async function runClaraBuyCheckExpertTurn({
  message,
  history = [],
  evidence = {},
  assistantContext = {},
  connected = false,
  signal,
} = {}) {
  const previous = sanitizeClaraPurchaseEvidence(evidence);
  const locallyUpdated = applyLocalPurchaseFacts(message, previous);
  const askMore = ASK_MORE_PATTERN.test(clean(message));
  const phase = askMore
    ? CLARA_BUY_CHECK_PHASE.DISCOVER
    : routeClaraBuyCheckPhase({ connected, evidence: locallyUpdated });

  if (phase === CLARA_BUY_CHECK_PHASE.METRIC) {
    return runMetricTurn({ evidence: locallyUpdated, assistantContext, signal });
  }

  const userName = userNameFromContext(assistantContext);
  const prompt = phase === CLARA_BUY_CHECK_PHASE.ESTABLISH
    ? buildEstablishPrompt({ message, history, evidence: locallyUpdated, userName })
    : buildDiscoveryPrompt({ message, history, evidence: locallyUpdated });

  try {
    const { json, model } = await requestPhaseJson(prompt, phase, signal);
    const modelEvidence = normalizeModelEvidence(json?.evidence, locallyUpdated);
    const mergedEvidence = mergeClaraPurchaseEvidence(locallyUpdated, modelEvidence);

    // The discovery Gemini call supplies language understanding only. Once that
    // evidence completes the decision context, the app calculates Means locally
    // and sends only the compact result into the metric Gemini prompt.
    if (phase === CLARA_BUY_CHECK_PHASE.DISCOVER && !askMore && isClaraPurchaseContextMature(mergedEvidence)) {
      return runMetricTurn({ evidence: mergedEvidence, assistantContext, signal });
    }

    const reply = clean(json?.reply) || (phase === CLARA_BUY_CHECK_PHASE.ESTABLISH
      ? fallbackEstablish({ evidence: mergedEvidence, assistantContext })
      : askMore && isClaraPurchaseContextMature(mergedEvidence)
        ? "Sure. What are you still unsure about?"
        : fallbackDiscovery(mergedEvidence));

    return {
      action: "probe",
      reply,
      evidence: mergedEvidence,
      readinessConfidence: isClaraPurchaseContextMature(mergedEvidence) ? 0.82 : 0.55,
      source: phase === CLARA_BUY_CHECK_PHASE.ESTABLISH ? "ai-establish" : "ai-discovery",
      model,
      phase,
    };
  } catch (error) {
    if (error?.code === "CLARA_AI_CANCELLED" || error?.name === "AbortError") throw error;
    console.warn(`[CLARA Buy Check] ${phase} conversation fallback used.`, error);
    return {
      action: "probe",
      reply: phase === CLARA_BUY_CHECK_PHASE.ESTABLISH
        ? fallbackEstablish({ evidence: locallyUpdated, assistantContext })
        : fallbackDiscovery(locallyUpdated),
      evidence: locallyUpdated,
      readinessConfidence: 0.45,
      source: `${phase}-fallback`,
      phase,
    };
  }
}

export function sanitizeEvidence(value = {}) {
  return sanitizeClaraPurchaseEvidence(value);
}

export function mergeEvidence(previous = {}, incoming = {}) {
  return mergeClaraPurchaseEvidence(previous, incoming);
}

export function transactionReasonFromEvidence(evidence = {}) {
  return transactionReasonFromClaraEvidence(evidence);
}

export function buildPrompt(args = {}) {
  const phase = routeClaraBuyCheckPhase({ connected: Boolean(args.connected), evidence: args.evidence });
  if (phase === CLARA_BUY_CHECK_PHASE.ESTABLISH) {
    return buildEstablishPrompt({ ...args, userName: args.userName || userNameFromContext(args.assistantContext || {}) });
  }
  if (phase === CLARA_BUY_CHECK_PHASE.DISCOVER) return buildDiscoveryPrompt(args);
  const impact = buildMetricImpact(args.evidence, args.assistantContext || {});
  return buildMetricPrompt({ evidence: args.evidence, metric: metricPacket(impact || {}) });
}
