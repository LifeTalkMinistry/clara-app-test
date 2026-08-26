from pathlib import Path


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = text.find(start_marker)
    end = text.find(end_marker, start if start >= 0 else 0)
    if start < 0 or end < 0:
        raise SystemExit(f"{label} structural markers not found")
    return text[:start] + replacement + text[end:]


gate_path = Path("src/lib/clara-buy-check-conversation-gate.js")
gate_path.write_text(
    '''const cleanText = (value) => String(value ?? "").trim();

const MOTIVE_KEYS = ["purpose", "currentSituation"];
const CONSEQUENCE_KEYS = ["urgency", "alternatives", "timing", "constraints"];

export function getClaraBuyCheckDiscoveryState(evidence = {}) {
  const source = evidence && typeof evidence === "object" ? evidence : {};
  const item = cleanText(source.item);
  const price = Number(source.price);
  const motiveSignals = MOTIVE_KEYS.filter((key) => cleanText(source[key]));
  const consequenceSignals = CONSEQUENCE_KEYS.filter((key) => cleanText(source[key]));

  const hasPurchase = Boolean(item && Number.isFinite(price) && price > 0);
  const hasMotive = motiveSignals.length > 0;
  const hasSecondDecisionSignal = consequenceSignals.length > 0 || motiveSignals.length >= 2;
  const mature = Boolean(hasPurchase && hasMotive && hasSecondDecisionSignal);

  return {
    hasPurchase,
    hasMotive,
    hasSecondDecisionSignal,
    mature,
    motiveSignals,
    consequenceSignals,
  };
}

export function buildClaraBuyCheckDiscoveryQuestion(evidence = {}) {
  const source = evidence && typeof evidence === "object" ? evidence : {};
  const item = cleanText(source.item);
  const price = Number(source.price);
  const state = getClaraBuyCheckDiscoveryState(source);

  if (!item) return "What are you thinking of buying?";
  if (!Number.isFinite(price) || price <= 0) return `How much is the ${item}?`;
  if (!state.hasMotive) return "What’s making you want to buy it today?";
  if (!state.hasSecondDecisionSignal) {
    return "If you skip it today, would anything important actually be affected?";
  }
  return "";
}

export function shouldRevealClaraBuyCheckMeans(action = "", evidence = {}) {
  const state = getClaraBuyCheckDiscoveryState(evidence);
  const normalizedAction = cleanText(action).toLowerCase();
  return Boolean(state.mature && (normalizedAction === "ready" || normalizedAction === "reassess"));
}
''',
    encoding="utf-8",
)

test_path = Path("tests/buy-check-conversation-gate.test.mjs")
test_path.write_text(
    '''import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClaraBuyCheckDiscoveryQuestion,
  getClaraBuyCheckDiscoveryState,
  shouldRevealClaraBuyCheckMeans,
} from "../src/lib/clara-buy-check-conversation-gate.js";

test("item and price alone stay in discovery", () => {
  const evidence = { item: "T-shirt", price: 1000 };
  assert.equal(getClaraBuyCheckDiscoveryState(evidence).mature, false);
  assert.equal(buildClaraBuyCheckDiscoveryQuestion(evidence), "What’s making you want to buy it today?");
  assert.equal(shouldRevealClaraBuyCheckMeans("ready", evidence), false);
});

test("one motive answer still asks one more meaningful question", () => {
  const evidence = { item: "T-shirt", price: 1000, purpose: "I like the design" };
  assert.equal(getClaraBuyCheckDiscoveryState(evidence).mature, false);
  assert.equal(
    buildClaraBuyCheckDiscoveryQuestion(evidence),
    "If you skip it today, would anything important actually be affected?",
  );
});

test("motive plus urgency is mature enough for a decision", () => {
  const evidence = {
    item: "Work shoes",
    price: 1000,
    purpose: "Replacing my work shoes",
    urgency: "Mine broke and I need them tomorrow",
  };
  assert.equal(getClaraBuyCheckDiscoveryState(evidence).mature, true);
  assert.equal(shouldRevealClaraBuyCheckMeans("ready", evidence), true);
});

test("purpose plus concrete current situation can be mature immediately", () => {
  const evidence = {
    item: "Work shoes",
    price: 1000,
    purpose: "Need shoes for work",
    currentSituation: "My only pair is damaged",
  };
  assert.equal(getClaraBuyCheckDiscoveryState(evidence).mature, true);
});

test("Means stays hidden on probe even when context is mature", () => {
  const evidence = {
    item: "Work shoes",
    price: 1000,
    purpose: "Need shoes for work",
    urgency: "Need them tomorrow",
  };
  assert.equal(shouldRevealClaraBuyCheckMeans("probe", evidence), false);
  assert.equal(shouldRevealClaraBuyCheckMeans("reassess", evidence), true);
});
''',
    encoding="utf-8",
)

path = Path("src/lib/clara-buy-check-expert-ai.js")
text = path.read_text(encoding="utf-8")

metric_import = '''import {
  buildClaraPurchaseMetricImpact,
  formatClaraMetricImpactLine,
} from "./clara-buy-check-metric-impact.js";'''
gate_import = '''import {
  buildClaraBuyCheckDiscoveryQuestion,
  getClaraBuyCheckDiscoveryState,
  shouldRevealClaraBuyCheckMeans,
} from "./clara-buy-check-conversation-gate.js";'''
if gate_import not in text:
    if metric_import not in text:
        raise SystemExit("metric import marker not found")
    text = text.replace(metric_import, metric_import + "\n" + gate_import, 1)

phase_gate = '''
CONVERSATION PHASE GATE — DISCOVERY BEFORE VERDICT
- Item + price is NOT enough context for a normal Ask Before You Spend decision.
- For a thin request such as "Can I buy a T-shirt for ₱1,000?", do NOT reveal the Means Score, projected score, score movement, protection-line position, or a buy/wait verdict yet.
- First understand WHY the user wants or needs the purchase. Ask one natural decision-relevant question.
- If the first answer gives only one decision signal, normally ask one more useful question about urgency, the real consequence of waiting, current situation, timing, constraints, or a realistic alternative.
- The normal target is roughly TWO meaningful clarification turns before the financial consequence is revealed. This is not a rigid questionnaire.
- Do NOT force extra questions when the user already supplied rich context up front. Purpose plus a concrete situation, urgency, timing, or constraint may be enough to move directly to the decision phase.
- Never ask a question whose answer is already present in recent conversation or PURCHASE EVIDENCE ALREADY UNDERSTOOD.
- Means may be calculated and used internally from turn one, but it must remain invisible during discovery.
- Only once purchase context is mature should CLARA reveal the deterministic Means consequence, interpret it naturally, give guidance, and move toward the user's final choice.
'''
if "CONVERSATION PHASE GATE — DISCOVERY BEFORE VERDICT" not in text:
    marker = "\nSAFETY BOUNDARY\n"
    if marker not in text:
        raise SystemExit("safety marker not found")
    text = text.replace(marker, phase_gate + marker, 1)

fallback_start = '  const means = buildCanonicalMeansContext(current.price, assistantContext, current);'
fallback_end = '  return {\n    action: "ready",\n    reply: "Got it. Will you still buy it?",'
fallback_replacement = '''  const discoveryState = getClaraBuyCheckDiscoveryState(current);
  if (!discoveryState.mature) {
    return {
      action: "probe",
      reply: buildClaraBuyCheckDiscoveryQuestion(current),
      evidence: current,
      readinessConfidence: discoveryState.hasMotive ? 0.68 : 0.55,
      source: "discovery-gate-fallback",
    };
  }

  const means = buildCanonicalMeansContext(current.price, assistantContext, current);
  if (means?.purchaseSimulationApplied && means.projectedScoreAfterPurchase !== null) {
    const after = Number(means.projectedScoreAfterPurchase);
    const guidance = after >= 100
      ? "You'd still be above your 100 protection line."
      : "That would put you below your 100 protection line, so I'd wait or reduce the amount.";

    const metricLine = formatClaraMetricImpactLine(means);
    return {
      action: "ready",
      reply: `${metricLine} ${guidance} Will you still buy it?`.trim(),
      evidence: current,
      readinessConfidence: 0.9,
      source: "means-fallback",
    };
  }

'''
text = replace_between(text, fallback_start, fallback_end, fallback_replacement, "fallback")

response_start = '    const mergedEvidence = mergeEvidence(promptEvidence, json?.evidence);'
response_end = '    if (!reply) {'
response_replacement = '''    const mergedEvidence = mergeEvidence(promptEvidence, json?.evidence);
    const requestedAction = clean(json?.action).toLowerCase();
    const action = ACTIONS.has(requestedAction) ? requestedAction : fallback.action;
    let reply = clean(json?.reply).slice(0, 720);
    const discoveryState = getClaraBuyCheckDiscoveryState(mergedEvidence);

    // Item + price can start internal Means reasoning, but cannot end discovery.
    // If Gemini tries to finish before enough purchase context exists, the app
    // forces one useful clarification and keeps all Means values out of sight.
    if (action === "ready" && !discoveryState.mature) {
      return {
        action: "probe",
        reply: buildClaraBuyCheckDiscoveryQuestion(mergedEvidence),
        evidence: mergedEvidence,
        readinessConfidence: Math.min(0.7, Math.max(0, Number(json?.readinessConfidence || 0))),
        source: "conversation-gate",
        model,
      };
    }

    // The application, not Gemini, owns the financial math. Reveal the exact
    // consequence only after discovery has matured into a decision-phase turn.
    if (shouldRevealClaraBuyCheckMeans(action, mergedEvidence)) {
      const authoritativeMeans = buildCanonicalMeansContext(
        mergedEvidence.price,
        assistantContext,
        mergedEvidence,
      );
      if (
        authoritativeMeans?.purchaseSimulationApplied &&
        authoritativeMeans.projectedScoreAfterPurchase !== null
      ) {
        const metricLine = formatClaraMetricImpactLine(authoritativeMeans);
        if (metricLine && !reply.startsWith(metricLine)) {
          reply = `${metricLine} ${reply}`.trim().slice(0, 720);
        }
      }
    }

    const readinessConfidence = Math.max(0, Math.min(1, Number(json?.readinessConfidence || 0)));
    const readyEnough = Boolean(
      discoveryState.mature && transactionReasonFromEvidence(mergedEvidence),
    );

    if (action === "ready" && !readyEnough) {
      return { ...fallbackTurn(message, mergedEvidence, assistantContext), model };
    }

'''
text = replace_between(text, response_start, response_end, response_replacement, "response assembly")

style_marker = "- Treat this as one continuous natural conversation, not a form or questionnaire."
style_rule = "- During discovery, ask before judging: do not expose Means math or a financial verdict until the purchase context is mature."
if style_rule not in text:
    if style_marker not in text:
        raise SystemExit("conversation style marker not found")
    text = text.replace(style_marker, style_marker + "\n" + style_rule, 1)

ready_marker = "- Stay engaged. Do not announce that another analysis is about to run."
ready_rule = "- Do not use ready until the purchase context is mature under the discovery-before-verdict rule."
if ready_rule not in text:
    if ready_marker not in text:
        raise SystemExit("ready marker not found")
    text = text.replace(ready_marker, ready_rule + "\n" + ready_marker, 1)

path.write_text(text, encoding="utf-8")
