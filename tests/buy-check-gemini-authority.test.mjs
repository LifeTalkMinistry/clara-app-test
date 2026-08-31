import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Ask Before You Spend is now an application-owned strict state machine", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /ITEM: "item"/);
  assert.match(flow, /CONFIRM_ITEM: "confirm_item"/);
  assert.match(flow, /REASON_PERMISSION: "reason_permission"/);
  assert.match(flow, /REASON: "reason"/);
  assert.match(flow, /PRICE: "price"/);
  assert.match(flow, /CONFIRM_PRICE: "confirm_price"/);
  assert.match(flow, /CONFIRM: "confirm"/);
  assert.match(flow, /COMPLETE: "complete"/);
  assert.doesNotMatch(flow, /runClaraBuyCheckExpertTurn/);
  assert.doesNotMatch(flow, /routeClaraBuyCheckPhase/);
});

test("bare item answers are documented directly instead of inferred by Gemini", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /mergeClaraPurchaseEvidence\(snapshot\.evidence, \{ item: answer \}\)/);
  assert.match(flow, /`Got it — \$\{answer\}\. Is that the exact item\?`/);
  assert.doesNotMatch(flow, /inferItem\(/);
});

test("item, reason permission, and price confirmation are Yes or No application steps", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV3.jsx");

  assert.match(overlay, /"confirm_item"/);
  assert.match(overlay, /"reason_permission"/);
  assert.match(overlay, /"confirm_price"/);
  assert.match(overlay, /grid grid-cols-2/);
  assert.match(overlay, />\s*Yes\s*</);
  assert.match(overlay, />\s*No\s*</);
  assert.doesNotMatch(overlay, />\s*Ask more\s*</);
});

test("opening greeting is local and has ten variants", async () => {
  const overlay = await source("src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV3.jsx");
  const greetingBlock = overlay.match(/const BUY_CHECK_GREETINGS = \[([\s\S]*?)\];/)?.[1] || "";
  const greetingCount = (greetingBlock.match(/^\s*"/gm) || []).length;

  assert.equal(greetingCount, 10);
  assert.match(overlay, /Please type the exact item you want to buy\./);
  assert.doesNotMatch(overlay, /requestGeminiJson/);
});

test("choosing No to sharing a reason skips Gemini completely", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /reasonPermission: false/);
  assert.match(flow, /const shouldUseAi = Boolean\(snapshot\.reasonPermission === true && reason && !snapshot\.aiAdviceUsed\)/);
  assert.match(flow, /if \(!shouldUseAi\)/);
  assert.match(flow, /finalDecisionReply\(\{ impact \}\)/);
});

test("choosing Yes records the reason locally before any optional AI call", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /reasonPermission: true/);
  assert.match(flow, /mergeClaraPurchaseEvidence\(snapshot\.evidence, \{ purpose: answer \}\)/);
  assert.match(flow, /reason: answer/);
  assert.match(flow, /step: CLARA_BUY_CHECK_STEP\.PRICE/);
});

test("price and payment structure remain application-authoritative", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const router = await source("src/lib/clara-buy-check-intelligence-router.js");

  assert.match(flow, /applyLocalPurchaseFacts\(answer, snapshot\.evidence\)/);
  assert.match(flow, /hasConfirmedClaraPaymentStructure/);
  assert.match(flow, /claraPaymentAmountDueNow/);
  assert.match(router, /paymentStructureStatus === "confirmed"/);
  assert.match(router, /user_direct/);
  assert.match(router, /user_confirmation/);
});

test("the application calculates Means impact before the optional AI request", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const paymentImpact = await source("src/lib/clara-buy-check-payment-impact.js");

  const buildImpactIndex = flow.indexOf("const impact = buildImpact(evidence, assistantContext)");
  const aiCallIndex = flow.indexOf("requestClaraBuyCheckAlternative({");
  assert.ok(buildImpactIndex >= 0);
  assert.ok(aiCallIndex > buildImpactIndex);
  assert.match(flow, /buildClaraBuyCheckPaymentImpact/);
  assert.match(flow, /formatClaraBuyCheckPaymentImpactLine/);
  assert.match(paymentImpact, /buildClaraPurchaseMetricImpact/);
  assert.match(paymentImpact, /futureCommitmentIncludedInCurrentScore: false/);
});

test("Gemini receives only the compact purchase packet and app-calculated impact", async () => {
  const ai = await source("src/lib/clara-buy-check-alternative-ai.js");

  assert.match(ai, /PURCHASE PACKET — THIS IS THE ONLY USER CONTEXT YOU RECEIVE/);
  assert.match(ai, /item:/);
  assert.match(ai, /reason:/);
  assert.match(ai, /price:/);
  assert.match(ai, /financialImpact: compactImpact\(impact\)/);
  assert.match(ai, /meansScoreBefore/);
  assert.match(ai, /meansScoreAfter/);
  assert.doesNotMatch(ai, /history\.slice/);
  assert.doesNotMatch(ai, /wallets\./);
  assert.doesNotMatch(ai, /moneySchedule\./);
  assert.doesNotMatch(ai, /transactionHistory/);
  assert.doesNotMatch(ai, /lifeProfile/);
});

test("Gemini has one narrow job: one practical alternative without follow-up", async () => {
  const ai = await source("src/lib/clara-buy-check-alternative-ai.js");

  assert.match(ai, /Give at most ONE practical alternative/);
  assert.match(ai, /do not invent one/);
  assert.match(ai, /Do NOT ask a follow-up question/);
  assert.match(ai, /Do NOT request more user context/);
  assert.match(ai, /Do NOT calculate affordability, Means Score, Wall Bill/);
  assert.match(ai, /Do NOT automatically discourage spending/);
  assert.match(ai, /Do NOT automatically permit spending/);
});

test("each Buy Check session can spend at most one optional AI advice call", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /aiAdviceUsed: false/);
  assert.match(flow, /!snapshot\.aiAdviceUsed/);
  assert.match(flow, /aiAdviceUsed: true/);
  assert.match(flow, /activeGeminiRequestRef/);
  assert.match(flow, /if \(activeGeminiRequestRef\.current\) return false/);
  assert.equal((flow.match(/requestClaraBuyCheckAlternative\(\{/g) || []).length, 1);
});

test("AI failure cannot block the locally calculated final decision", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");

  assert.match(flow, /Optional alternative AI skipped safely/);
  assert.match(flow, /const reply = finalDecisionReply\(\{ impact \}\)/);
  assert.match(flow, /step: CLARA_BUY_CHECK_STEP\.CONFIRM/);
});

test("Gemini transport remains server-owned and restricted to Ask Before You Spend", async () => {
  const core = await source("api/clara-gemini-core.js");
  const proxy = await source("src/lib/clara-gemini-proxy-client.js");
  const ai = await source("src/lib/clara-buy-check-alternative-ai.js");

  assert.match(core, /process\.env\.GEMINI_API_KEY/);
  assert.match(core, /RATE_LIMIT_MAX_REQUESTS = 30/);
  assert.match(core, /DUPLICATE_WINDOW_MS = 2500/);
  assert.doesNotMatch(proxy, /VITE_GEMINI_API_KEY/);
  assert.match(ai, /feature: "ask-before-you-spend"/);
});

test("hypothetical installment simulation still cannot mutate money before safe recording", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");
  const installmentGuard = finalization.indexOf('if (decision.choice === "buy" && paymentStructure)');
  const obligationWrite = finalization.indexOf("await upsertDebtObligation");
  const oneTimeExpenseWrite = finalization.indexOf("await addBuyCheckExpense");

  assert.ok(installmentGuard >= 0, "installment safety guard must exist");
  assert.ok(obligationWrite > installmentGuard, "installments must use the obligation ledger");
  assert.ok(oneTimeExpenseWrite > obligationWrite, "installment handling must finish before one-time expense mutation");
  assert.match(finalization, /No wallet money was deducted yet/);
});

test("No remains a non-spending path and post-choice saving spends no Gemini call", async () => {
  const finalization = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js");

  assert.doesNotMatch(finalization, /requestClaraGemini/);
  assert.doesNotMatch(finalization, /requestGeminiJson/);
  assert.match(finalization, /source: "buy_check_not_buy"/);
  assert.match(finalization, /saveAvoidedSpendingDecision/);
});

test("old free-form expert layer is no longer imported by the active Buy Check flow", async () => {
  const flow = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckExpertFlow.js");
  const budget = await source("src/components/fresh/main-dashboard/assistant/useClaraBuyCheckBudgetFlow.js");

  assert.match(budget, /useClaraBuyCheckExpertFlow\.js/);
  assert.doesNotMatch(flow, /clara-buy-check-expert-ai/);
  assert.match(flow, /clara-buy-check-alternative-ai/);
});
