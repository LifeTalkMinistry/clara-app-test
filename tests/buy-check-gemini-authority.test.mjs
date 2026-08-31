import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Ask Before You Spend keeps the three progressive phases", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /PHASE 1 — ESTABLISH/);
  assert.match(expert, /PHASE 2 — UNDERSTAND/);
  assert.match(expert, /PHASE 3 — METRIC DECISION/);
  assert.match(expert, /FEATURE: ASK BEFORE YOU SPEND \/ BUY CHECK/);
  assert.match(expert, /routeClaraBuyCheckPhase/);
  assert.match(expert, /CLARA_BUY_CHECK_PHASE\.ESTABLISH/);
  assert.match(expert, /CLARA_BUY_CHECK_PHASE\.DISCOVER/);
  assert.match(expert, /CLARA_BUY_CHECK_PHASE\.METRIC/);
});

test("connection and discovery prompts do not receive raw financial context", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.doesNotMatch(expert, /buildContextPackage/);
  assert.doesNotMatch(expert, /buildBudgetMetadata/);
  assert.doesNotMatch(expert, /buildClaraLifeContextStatement/);
  assert.match(expert, /Do not mention Means Score, affordability, wallets, schedules, debts, savings, or a verdict/);
  assert.match(expert, /Do not discuss the user's financial position yet/);
});

test("opening judgment is neutral and blocks positive purchase bias", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /Be warm, neutral, direct, human, and brief/);
  assert.match(expert, /Never praise or emotionally validate a purchase before evaluating it/);
  assert.match(expert, /Acknowledge the purchase neutrally/);
  assert.match(expert, /POSITIVE_OPENING_BIAS_PATTERN/);
  assert.match(expert, /sounds nice\|sounds great\|sounds exciting/);
});

test("discovery is limited to one decision-seeking question", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /Ask at most ONE decision-seeking question in a reply/);
  assert.match(expert, /Ask AT MOST ONE decision-seeking question/);
  assert.match(expert, /const questionCount = \(text\.match\(\/\\\?\/g\) \|\| \[\]\)\.length/);
  assert.match(expert, /if \(questionCount > 1\) return false/);
  assert.match(expert, /Never ask lifestyle trivia/);
  assert.match(expert, /Never ask something already answered/);
});

test("the application owns readiness and Gemini cannot declare the metric ready", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const router = await source("src/lib/clara-buy-check-intelligence-router.js");

  assert.match(expert, /The application owns every financial calculation and every readiness decision/);
  assert.match(expert, /Gemini only extracts language evidence and explains application-calculated results/);
  assert.match(expert, /Never say "I have everything I need"/);
  assert.match(expert, /isClaraPurchaseContextMature\(mergedEvidence\)/);
  assert.match(expert, /if \(!askMore && isClaraPurchaseContextMature\(mergedEvidence\)\)/);
  assert.match(router, /if \(isClaraPurchaseContextMature\(evidence\)\) return CLARA_BUY_CHECK_PHASE\.METRIC/);
});

test("a mature rich first message can move to Metric without forced Discovery", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /if \(!askMore && isClaraPurchaseContextMature\(mergedEvidence\)\) \{/);
  assert.match(expert, /return runMetricTurn\(\{ evidence: mergedEvidence, assistantContext, signal \}\)/);
  assert.doesNotMatch(expert, /phase === CLARA_BUY_CHECK_PHASE\.DISCOVER && !askMore && isClaraPurchaseContextMature/);
});

test("payment structure must be application-confirmed before Means calculation", async () => {
  const router = await source("src/lib/clara-buy-check-intelligence-router.js");
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(router, /hasConfirmedClaraPaymentStructure/);
  assert.match(router, /paymentStructureStatus === "confirmed"/);
  assert.match(router, /needs_confirmation/);
  assert.match(router, /user_direct/);
  assert.match(router, /user_confirmation/);
  assert.match(expert, /Gemini never makes an inferred amount or payment structure authoritative/);
  assert.match(expert, /if \(!hasConfirmedClaraPaymentStructure\(source\)\) return null/);
});

test("the app calculates Means locally and sends only a compact consequence to metric Gemini", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const paymentImpact = await source("src/lib/clara-buy-check-payment-impact.js");

  assert.match(expert, /buildClaraBuyCheckPaymentImpact/);
  assert.match(expert, /metricPacket/);
  assert.match(expert, /CLARA CALCULATION — AUTHORITATIVE/);
  assert.match(expert, /The application has already calculated the financial effect\. Do NOT recalculate it/);
  assert.match(expert, /AUTHORITATIVE CONSEQUENCE SENTENCE/);
  assert.match(paymentImpact, /buildClaraPurchaseMetricImpact/);
  assert.match(paymentImpact, /futureCommitmentIncludedInCurrentScore: false/);
  assert.doesNotMatch(expert, /wallets\.spendableMoney/);
  assert.doesNotMatch(expert, /moneySchedule\.remainingAssumedRoutineSpending/);
});

test("Means 100 is a protection line rather than automatic permission", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(expert, /100 IS A PROTECTION LINE, NOT A PERMISSION LINE/);
  assert.match(expert, /"I can absorb this" is NOT the same as "this is a good use of my money\."/);
  assert.match(expert, /For unnecessary wants, generally lean toward preserving financial room/);
  assert.match(expert, /For genuine needs, you may be supportive while still communicating the consequence/);
  assert.match(expert, /Never say "go for it", "plenty of cushion", "you can afford it", or "you have room for it"/);
  assert.match(expert, /Staying above 100 means your runway can absorb it, but that alone doesn’t make it a good use of your money/);
  assert.match(expert, /if \(Number\.isFinite\(after\) && after < 100\)/);
  assert.match(expert, /That crosses the 100 protection line/);
});

test("ready means user choice and does not introduce another verdict service", async () => {
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(expert, /action: "ready"/);
  assert.match(expert, /Still buying it\?/);
  assert.match(flow, /const isReadyForChoice = Boolean/);
  assert.match(flow, /hasConfirmedClaraPaymentStructure\(evidence\)/);
  assert.match(flow, /step: isReadyForChoice \? "confirm" : "conversation"/);
  assert.doesNotMatch(flow, /runClaraSpendingDecision/);
});

test("user still has Yes, No, and Ask more choices and Ask more preserves evidence", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx");
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(overlay, />\s*Yes\s*</);
  assert.match(overlay, />\s*No\s*</);
  assert.match(overlay, />\s*Ask more\s*</);
  assert.match(flow, /return submitAnswer\("I want to ask more before deciding\."\)/);
  assert.match(flow, /evidence: snapshot\.evidence/);
});

test("hypothetical installment simulation cannot mutate money before safe recording exists", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");
  const installmentGuard = finalization.indexOf('if (decision.choice === "buy" && paymentStructure)');
  const obligationWrite = finalization.indexOf("await upsertDebtObligation");
  const oneTimeExpenseWrite = finalization.indexOf("await addBuyCheckExpense");

  assert.ok(installmentGuard >= 0, "installment safety guard must exist");
  assert.ok(obligationWrite > installmentGuard, "installments must use the obligation ledger");
  assert.ok(oneTimeExpenseWrite > obligationWrite, "installment handling must finish before one-time expense mutation");
  assert.match(finalization, /No wallet money was deducted yet/);
  assert.match(finalization, /Record each actual payment from Debt \/ Obligations when you pay it/);
});

test("No remains a non-spending path and post-choice saving does not spend another Gemini call", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.doesNotMatch(finalization, /requestClaraGemini/);
  assert.doesNotMatch(finalization, /requestGeminiJson/);
  assert.doesNotMatch(finalization, /runClaraSpendingDecision/);
  assert.match(finalization, /if \(decision\.choice === "buy"\) \{/);
  assert.match(finalization, /source: "buy_check_not_buy"/);
  assert.match(finalization, /saveAvoidedSpendingDecision/);
});

test("CLARA suggested reason still becomes Transaction Hub reason for supported one-time recording", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.match(finalization, /const conversationReason =\s*clean\(decision\.explanation\) \|\| preparedReason\(base\.state\)/);
  assert.match(finalization, /reason: conversationReason/);
  assert.match(finalization, /addBuyCheckExpense/);
});

test("duplicate Gemini requests remain guarded", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const core = await source("api/clara-gemini-core.js");

  assert.match(flow, /activeGeminiRequestRef/);
  assert.match(flow, /if \(activeGeminiRequestRef\.current\) return false/);
  assert.match(core, /RATE_LIMIT_MAX_REQUESTS = 30/);
  assert.match(core, /DUPLICATE_WINDOW_MS = 2500/);
});

test("Gemini secret and cost controls remain server-owned", async () => {
  const core = await source("api/clara-gemini-core.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const expert = await source("src/lib/clara-buy-check-expert-ai.js");

  assert.match(core, /process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(proxy, /VITE_GEMINI_API_KEY/);
  assert.match(expert, /feature: "ask-before-you-spend"/);
  assert.match(expert, /history\.slice\(-limit\)/);
});

test("old separate spending verdict service remains removed", async () => {
  await assert.rejects(() => source("src/lib/clara-spending-decision-ai.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/lib/clara-buy-check-diagnosis-v5.js"), { code: "ENOENT" });
  await assert.rejects(() => source("src/lib/clara-buy-check-decision-core.js"), { code: "ENOENT" });
});
