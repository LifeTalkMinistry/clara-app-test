import { requestGeminiJson } from "./clara-gemini-json-utils";
import {
  buildClaraBuyCheckPaymentImpact,
  formatClaraBuyCheckPaymentImpactLine,
} from "./clara-buy-check-payment-impact.js";
import {
  CLARA_BUY_CHECK_PHASE,
  applyLocalPurchaseFacts,
  claraPaymentAmountDueNow,
  compactClaraPurchaseContext,
  getClaraBuyCheckMissingDecisionField,
  hasConfirmedClaraPaymentStructure,
  isClaraPurchaseContextMature,
  mergeClaraPurchaseEvidence,
  routeClaraBuyCheckPhase,
  sanitizeClaraPurchaseEvidence,
  transactionReasonFromClaraEvidence,
} from "./clara-buy-check-intelligence-router.js";

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const ASK_MORE_PATTERN = /\b(ask\s+more|more\s+before\s+deciding|still\s+unsure|not\s+sure|explain\s+more)\b/i;
const READINESS_CLAIM_PATTERN = /\b(i have everything i need|we(?:'re| are) ready to calculate|i can evaluate this now|ready to calculate|ready for the metric)\b/i;
const POSITIVE_OPENING_BIAS_PATTERN = /\b(sounds nice|sounds great|sounds exciting|that sounds nice|that sounds great|exciting purchase)\b/i;
const PERMISSION_BIAS_PATTERN = /\b(go for it|plenty of cushion|you can afford it|you can afford this|you have room for it|safe to buy|no problem buying)\b/i;
const NEED_PATTERN = /\b(need|necessary|replace|replacement|broken|broke|unusable|work|school|medical|required|must)\b/i;
const WANT_PATTERN = /\b(just like|design|want it|looks good|nice to have|already have enough|nothing happens|can wait|not urgent)\b/i;

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
  return `₱${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-PH", {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  })}`;
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
Be warm, neutral, direct, human, and brief.
Never praise or emotionally validate a purchase before evaluating it.
Ask at most ONE decision-seeking question in a reply.
Never join two separate unknowns with "and".
Never lecture or sound like a report.
Never invent a financial fact.
The application owns every financial calculation and every readiness decision.
Gemini only extracts language evidence and explains application-calculated results.
Never say "I have everything I need", "we're ready to calculate", or similar readiness claims.
All unlabelled purchase amounts are Philippine pesos (₱). Never render a peso amount with $.`;
}

export function buildEstablishPrompt({ message = "", history = [], evidence = {}, userName = "" } = {}) {
  const name = firstName(userName);
  return `${basePrompt()}

PHASE 1 — ESTABLISH
This is the first CLARA response in this Buy Check session.
Establish connection in seconds, not through length.
Acknowledge the purchase neutrally: "Got it—a ..." is good.
Do NOT say an item sounds nice, exciting, great, or worth buying.
Extract every decision-relevant fact the user already supplied before deciding whether a question is useful.
Do not ask a question merely because this is the first turn.
If one critical fact is still missing, ask only the single question whose answer could change the decision most.
If the payment amount or payment structure is ambiguous, resolving the money takes priority over motivation.
Do not ask about style, category, occasion, or other trivia when need/urgency is already clear.
Do not mention Means Score, affordability, wallets, schedules, debts, savings, or a verdict.
Visible reply: 8–25 words.

User name: ${name || "unknown"}
Known purchase facts from the app:
${JSON.stringify(compactClaraPurchaseContext(evidence), null, 2)}

Recent conversation:
${transcript(history, 2)}

Latest user message:
${clean(message)}

Extract only purchase facts and decision context the user actually stated.
For ambiguous discounts/installments, Gemini may propose candidate payment facts, but it must set paymentNeedsConfirmation=true.
Gemini never makes an inferred amount or payment structure authoritative.

Return JSON only:
{
  "reply": "short neutral response or one useful question",
  "evidence": {
    "item": "",
    "priceCandidate": 0,
    "priceNeedsConfirmation": false,
    "purchaseType": "",
    "amountDueNow": 0,
    "paymentAmount": 0,
    "remainingPayments": 0,
    "totalPayments": 0,
    "totalCommitment": 0,
    "frequency": "",
    "fees": 0,
    "paymentNeedsConfirmation": false,
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
Your job is to extract decision evidence and ask only what could materially change the recommendation.
Decision-relevant unknowns are: need, urgency, current situation, consequence of waiting, realistic alternatives, timing, meaningful constraint, or authoritative payable structure.
Never ask lifestyle trivia.
Never ask something already answered.
If the payable amount or payment structure is ambiguous, confirm that before motivation.
Ask AT MOST ONE decision-seeking question.
If the latest answer completes the decision context, do not invent another question. A short acknowledgment is enough; the application alone decides whether Metric unlocks.
Visible reply: 6–20 words.

Purchase context already known:
${JSON.stringify(compactClaraPurchaseContext(evidence), null, 2)}

Recent conversation:
${transcript(history, 4)}

Latest user message:
${clean(message)}

Extract only newly supported facts.
For ambiguous money, return a candidate with priceNeedsConfirmation/paymentNeedsConfirmation=true.
Gemini never confirms money and never declares readiness.

Return JSON only:
{
  "reply": "short response or one short question",
  "evidence": {
    "item": "",
    "priceCandidate": 0,
    "priceNeedsConfirmation": false,
    "purchaseType": "",
    "amountDueNow": 0,
    "paymentAmount": 0,
    "remainingPayments": 0,
    "totalPayments": 0,
    "totalCommitment": 0,
    "frequency": "",
    "fees": 0,
    "paymentNeedsConfirmation": false,
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

GOVERNING RULE:
100 IS A PROTECTION LINE, NOT A PERMISSION LINE.
"I can absorb this" is NOT the same as "this is a good use of my money."

Use the authoritative consequence sentence exactly once.
Then make ONE short accountability interpretation using:
- necessity
- urgency
- current situation
- consequence of waiting
- existing alternatives
- value of the purchase
- any future installment commitment already calculated by the application

For unnecessary wants, generally lean toward preserving financial room.
For genuine needs, you may be supportive while still communicating the consequence.
If the protection line is crossed, become materially more cautious.
Do not be moralistic.
Do not automatically discourage spending.
Do not automatically permit spending.
Never say "go for it", "plenty of cushion", "you can afford it", or "you have room for it" merely because the projected score stays above 100.
End with one short user-choice question such as "Still buying it?"
Visible reply: normally 20–55 words, maximum 2 short sentences.
Never use labels like "Means impact", "New pressure", arrows, or parenthetical score deltas.

Purchase context:
${JSON.stringify(compactClaraPurchaseContext(evidence), null, 2)}

CLARA CALCULATION — AUTHORITATIVE:
${JSON.stringify(metric, null, 2)}

AUTHORITATIVE CONSEQUENCE SENTENCE:
${clean(metric.metricSentence)}

Return JSON only:
{
  "reply": "short accountability decision-stage reply",
  "recommendation": "buy" | "wait" | "reconsider"
}`;
}

function normalizeModelEvidence(value = {}, current = {}) {
  const source = value && typeof value === "object" ? value : {};
  const languageOnly = {
    ...current,
    item: clean(source.item) || current.item,
    purpose: clean(source.purpose) || current.purpose,
    currentSituation: clean(source.currentSituation) || current.currentSituation,
    urgency: clean(source.urgency) || current.urgency,
    consequenceOfWaiting: clean(source.consequenceOfWaiting) || current.consequenceOfWaiting,
    alternatives: clean(source.alternatives) || current.alternatives,
    timing: clean(source.timing) || current.timing,
    constraints: clean(source.constraints) || current.constraints,
    readinessSummary: clean(source.readinessSummary) || current.readinessSummary,
  };
  let next = sanitizeClaraPurchaseEvidence(languageOnly);

  if (!hasConfirmedClaraPaymentStructure(current)) {
    const priceCandidate = Number(source.priceCandidate);
    if (source.priceNeedsConfirmation === true && Number.isFinite(priceCandidate) && priceCandidate > 0) {
      next = sanitizeClaraPurchaseEvidence({
        ...next,
        purchaseType: "one_time",
        priceCandidate,
        priceStatus: "needs_confirmation",
      });
    }

    if (clean(source.purchaseType).toLowerCase() === "installment" && source.paymentNeedsConfirmation === true) {
      next = sanitizeClaraPurchaseEvidence({
        ...next,
        purchaseType: "installment",
        amountDueNow: Number(source.amountDueNow || 0),
        paymentAmount: Number(source.paymentAmount || 0),
        remainingPayments: Number(source.remainingPayments || 0),
        totalPayments: Number(source.totalPayments || 0),
        totalCommitment: Number(source.totalCommitment || 0),
        frequency: clean(source.frequency || "monthly"),
        fees: Number(source.fees || 0),
        paymentStructureStatus: "needs_confirmation",
        paymentStructureSource: "gemini_candidate",
      });
    }
  }

  return next;
}

function metricPacket(impact = {}) {
  return {
    scoreBefore: impact?.currentScore ?? null,
    scoreAfter: impact?.projectedScoreAfterPurchase ?? null,
    incrementalImpact: Number(impact?.incrementalImpact || 0),
    currentCashImpact: Number(impact?.currentCashImpact ?? impact?.purchasePrice ?? 0),
    alreadyAccounted: Number(impact?.alreadyAccountedAmount || 0),
    futureRequiredCommitment: Number(impact?.futureRequiredCommitment || 0),
    totalCommitment: Number(impact?.totalCommitment ?? impact?.purchasePrice ?? 0),
    futureCommitmentIncludedInCurrentScore: Boolean(impact?.futureCommitmentIncludedInCurrentScore),
    crossesProtectionLine: Boolean(impact?.crossesProtectionLine),
    protectionLine: 100,
    metricSentence: formatClaraBuyCheckPaymentImpactLine(impact),
  };
}

function paymentStructureForMetric(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.purchaseType !== "installment") return null;
  return {
    purchaseType: "installment",
    amountDueNow: Number(source.amountDueNow || 0),
    paymentAmount: Number(source.paymentAmount || 0),
    remainingPayments: Number(source.remainingPayments || 0),
    totalPayments: Number(source.totalPayments || 0),
    totalCommitment: Number(source.totalCommitment || 0),
    frequency: source.frequency || "monthly",
    fees: Number(source.fees || 0),
  };
}

function buildMetricImpact(evidence = {}, assistantContext = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (!hasConfirmedClaraPaymentStructure(source)) return null;
  const amountDueNow = claraPaymentAmountDueNow(source);
  if (!(amountDueNow > 0)) return null;
  return buildClaraBuyCheckPaymentImpact({
    purchasePrice: amountDueNow,
    item: clean(source.item),
    paymentStructure: paymentStructureForMetric(source),
    assistantContext,
  });
}

async function requestPhaseJson(prompt, phase, signal) {
  return requestGeminiJson({
    feature: "ask-before-you-spend",
    prompt,
    temperature: phase === CLARA_BUY_CHECK_PHASE.METRIC ? 0.2 : 0.3,
    maxOutputTokens: 240,
    label: `CLARA Buy Check ${phase}`,
    signal,
  });
}

function paymentConfirmationQuestion(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.purchaseType === "installment") {
    const dueNow = Number(source.amountDueNow || 0);
    const payment = Number(source.paymentAmount || 0);
    const remaining = Number(source.remainingPayments);
    const total = Number(source.totalCommitment || 0);
    if (dueNow > 0 && payment > 0 && Number.isInteger(remaining) && remaining >= 0 && total > 0) {
      const future = remaining
        ? `, then ${remaining} more ${source.frequency || "monthly"} payment${remaining === 1 ? "" : "s"} of ${peso(payment)}`
        : "";
      return `Just to confirm: ${peso(dueNow)} is due now${future}, for ${peso(total)} total, right?`;
    }
    return "What’s the exact installment structure, including what’s due now and the remaining payments?";
  }
  if (Number(source.priceCandidate) > 0) {
    return `So you’ll actually pay ${peso(source.priceCandidate)}, right?`;
  }
  return "What’s the exact amount you’ll actually pay after everything?";
}

function fallbackDiscovery(evidence = {}, { assistantContext = {}, establishing = false } = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  const missing = getClaraBuyCheckMissingDecisionField(source);
  const name = firstName(userNameFromContext(assistantContext));
  const hello = establishing ? `Hey${name ? ` ${name}` : ""}! ` : "";

  if (missing === "item") return `${hello}What are you thinking about buying?`;
  if (missing === "payment") {
    const question = paymentConfirmationQuestion(source);
    return establishing && source.item ? `${hello}Got it—the ${source.item}. ${question}` : question;
  }

  const amount = claraPaymentAmountDueNow(source);
  const purchase = source.item
    ? `${amount > 0 ? `${peso(amount)} ` : ""}${source.item}`
    : "purchase";

  if (missing === "purpose") {
    return `${hello}Got it—a ${purchase}. What’s making you want or need it?`;
  }
  if (missing === "decision_signal") {
    return "Would anything important happen if you waited?";
  }
  return `${hello}Got it.`;
}

function isSafeModelDiscoveryReply(reply = "", missing = "") {
  const text = clean(reply);
  if (!text) return false;
  if (READINESS_CLAIM_PATTERN.test(text) || POSITIVE_OPENING_BIAS_PATTERN.test(text)) return false;
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 1) return false;
  if (missing && questionCount === 0) return false;
  if (missing === "payment") return false;
  return true;
}

function looksLikeGenuineNeed(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return NEED_PATTERN.test(
    [source.purpose, source.currentSituation, source.urgency].filter(Boolean).join(" "),
  );
}

function looksLikePureWant(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  return WANT_PATTERN.test(
    [source.purpose, source.currentSituation, source.consequenceOfWaiting, source.alternatives]
      .filter(Boolean)
      .join(" "),
  );
}

function fallbackMetric(evidence = {}, impact = {}) {
  const metric = metricPacket(impact);
  const after = Number(metric.scoreAfter);
  const sentence = clean(metric.metricSentence);
  if (!sentence) return "I understand the purchase, but I can’t verify the Means impact yet.";

  if (Number.isFinite(after) && after < 100) {
    if (looksLikeGenuineNeed(evidence)) {
      return `${sentence} That crosses the 100 protection line, so if this is necessary, I’d first look for a cheaper way to cover the need. Still buying it?`;
    }
    return `${sentence} That crosses the 100 protection line, so I’d wait or reduce the cost rather than give up that runway for this purchase. Still buying it?`;
  }

  if (looksLikeGenuineNeed(evidence)) {
    return `${sentence} Given what you’ve told me, this looks like a necessary purchase rather than just a want. Still buying it?`;
  }

  if (looksLikePureWant(evidence)) {
    return `${sentence} Since waiting doesn’t cost you anything, I’d preserve that financial room unless this is genuinely worth the money to you. Still buying it?`;
  }

  return `${sentence} Staying above 100 means your runway can absorb it, but that alone doesn’t make it a good use of your money. Still buying it?`;
}

function isSafeMetricReply(reply = "", metric = {}) {
  const text = clean(reply);
  if (!text || PERMISSION_BIAS_PATTERN.test(text) || READINESS_CLAIM_PATTERN.test(text)) return false;
  if ((text.match(/\?/g) || []).length > 1) return false;
  if (Number(metric.scoreAfter) < 100 && /\b(go ahead|buy it|recommend buying|good to buy)\b/i.test(text)) return false;
  return true;
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
    const modelReply = clean(json?.reply);
    const reply = isSafeMetricReply(modelReply, metric)
      ? modelReply
      : fallbackMetric(evidence, impact);
    return {
      action: "ready",
      reply,
      evidence,
      readinessConfidence: 0.95,
      recommendation: clean(json?.recommendation),
      metric,
      source: isSafeMetricReply(modelReply, metric) ? "ai-metric" : "metric-guardrail",
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

    // Gemini only supplies language evidence. The application merges it and
    // deterministically decides whether the Metric phase is actually unlocked.
    if (!askMore && isClaraPurchaseContextMature(mergedEvidence)) {
      return runMetricTurn({ evidence: mergedEvidence, assistantContext, signal });
    }

    const missing = getClaraBuyCheckMissingDecisionField(mergedEvidence);
    const deterministicReply = askMore && !missing
      ? "Sure. What are you still unsure about?"
      : fallbackDiscovery(mergedEvidence, {
          assistantContext,
          establishing: phase === CLARA_BUY_CHECK_PHASE.ESTABLISH,
        });
    const modelReply = clean(json?.reply);
    const reply = isSafeModelDiscoveryReply(modelReply, missing)
      ? modelReply
      : deterministicReply;

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

    if (!askMore && isClaraPurchaseContextMature(locallyUpdated)) {
      return runMetricTurn({ evidence: locallyUpdated, assistantContext, signal });
    }

    return {
      action: "probe",
      reply: fallbackDiscovery(locallyUpdated, {
        assistantContext,
        establishing: phase === CLARA_BUY_CHECK_PHASE.ESTABLISH,
      }),
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
  const phase = routeClaraBuyCheckPhase({
    connected: Boolean(args.connected),
    evidence: args.evidence,
  });
  if (phase === CLARA_BUY_CHECK_PHASE.ESTABLISH) {
    return buildEstablishPrompt({
      ...args,
      userName: args.userName || userNameFromContext(args.assistantContext || {}),
    });
  }
  if (phase === CLARA_BUY_CHECK_PHASE.DISCOVER) return buildDiscoveryPrompt(args);
  const impact = buildMetricImpact(args.evidence, args.assistantContext || {});
  return buildMetricPrompt({
    evidence: args.evidence,
    metric: metricPacket(impact || {}),
  });
}
